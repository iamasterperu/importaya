// Prueba de punta a punta: el Worker real contra una base SQLite en memoria (hace las veces de D1).
// Requiere Node 22 o superior (usa node:sqlite). npm test
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { DatabaseSync } from 'node:sqlite';

// El Worker importa schema.sql como texto (lo hace wrangler al desplegar). Aquí lo emulamos.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
export async function load(url, ctx, next) {
  if (url.endsWith('.sql')) return { format: 'module', shortCircuit: true, source: 'export default ' + JSON.stringify(readFileSync(fileURLToPath(url), 'utf8')) };
  return next(url, ctx);
}`),
  import.meta.url
);
const { default: worker } = await import('../src/worker.js');

// ── D1 simulado ──
class Sentencia {
  constructor(db, sql, args = []) { this.db = db; this.sql = sql; this.args = args; }
  bind(...args) { return new Sentencia(this.db, this.sql, args); }
  async all() { return { results: this.db.prepare(this.sql).all(...this.args), meta: { changes: 0 } }; }
  async first() { return this.db.prepare(this.sql).get(...this.args) ?? null; }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args);
    return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
  ejecutar() { return /^\s*(select|with)/i.test(this.sql) ? this.all() : this.run(); }
}
function crearD1() {
  const db = new DatabaseSync(':memory:');
  return {
    prepare: (sql) => new Sentencia(db, sql),
    async batch(lista) {
      db.exec('BEGIN');
      try {
        const out = [];
        for (const s of lista) out.push(await s.ejecutar());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
  };
}

const BASE = 'https://importaya.test';
const env = {
  DB: crearD1(),
  ASSETS: { fetch: async () => new Response('no encontrado', { status: 404 }) },
  SITE_NAME: 'ImportaYa',
  ADMIN_PASSWORD: 'clave-de-prueba-123',
};
const ctx = { waitUntil: (p) => Promise.resolve(p).catch(() => {}) };
let cookie = '';

function pedir(ruta, { metodo = 'GET', cuerpo, cabeceras = {} } = {}) {
  const init = { method: metodo, headers: { ...cabeceras } };
  if (cuerpo !== undefined) {
    init.body = JSON.stringify(cuerpo);
    init.headers['content-type'] = 'application/json';
  }
  if (metodo !== 'GET') init.headers.origin = BASE;
  if (cookie) init.headers.cookie = cookie;
  return worker.fetch(new Request(BASE + ruta, init), env, ctx);
}
const admin = (ruta, cuerpo) => pedir('/api/admin/' + ruta, cuerpo === undefined ? {} : { metodo: 'POST', cuerpo });

before(async () => {
  const r = await pedir('/api/admin/ingresar', { metodo: 'POST', cuerpo: { password: env.ADMIN_PASSWORD } });
  assert.equal(r.status, 200);
  cookie = r.headers.get('set-cookie').split(';')[0];
});

test('Las páginas nuevas cargan y el menú trae Herramientas', async () => {
  for (const [ruta, texto] of [
    ['/', 'Herramientas'],
    ['/herramientas', 'Herramientas para operaciones y pricing'],
    ['/herramientas/carga', 'Calculadoras de carga'],
    ['/herramientas/cotizador', 'Cotizador para clientes'],
    ['/herramientas/partidas', 'Buscador de partidas'],
    ['/herramientas/guias', 'Incoterms'],
    ['/directorio', 'Directorio de empresas'],
  ]) {
    const r = await pedir(ruta);
    assert.equal(r.status, 200, ruta);
    const html = await r.text();
    assert.ok(html.includes(texto), `${ruta} debería decir “${texto}”`);
    assert.ok(r.headers.get('content-security-policy'), 'lleva política de seguridad');
    assert.equal(/\son[a-z]+="/.test(html), false, `${ruta} no debe tener manejadores inline (los bloquea la CSP)`);
  }
});

test('Guías: trae los 11 Incoterms y enlaces externos seguros', async () => {
  const html = await (await pedir('/herramientas/guias')).text();
  for (const sigla of ['EXW', 'FCA', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP', 'FAS', 'FOB', 'CFR', 'CIF']) assert.ok(html.includes(`<b>${sigla}</b>`), sigla);
  assert.ok(html.includes('rel="noopener nofollow"'));
});

test('El sitemap incluye las páginas nuevas', async () => {
  const xml = await (await pedir('/sitemap.xml')).text();
  for (const r of ['/herramientas/carga', '/herramientas/cotizador', '/herramientas/partidas', '/herramientas/guias', '/directorio']) assert.ok(xml.includes(r), r);
});

test('Partidas: vacío al inicio; el panel las carga; la búsqueda las encuentra', async () => {
  let d = await (await pedir('/api/partidas?q=audifonos')).json();
  assert.equal(d.vacia, true);

  const lineas = [
    'Partida;Descripción;Ad valorem;Notas',
    '8518.30.00.00;Auriculares, incluso combinados con micrófono;0',
    '8517.13.00.00;Teléfonos inteligentes (smartphones);0',
    '6403.99.00.00;Calzado con suela de caucho, plástico, cuero natural;11;Verificar material',
    '8518.21.00.00;Altavoz (altoparlante) montado en su caja;6',
    'basura sin formato',
  ].join('\n');
  const imp = await (await admin('partidas-importar', { texto: lineas, reemplazar: true })).json();
  assert.equal(imp.ok, true);
  assert.equal(imp.guardadas, 4);
  assert.equal(imp.descartadas, 2); // encabezado y línea sin formato

  d = await (await pedir('/api/partidas?q=Audífonos')).json();
  assert.equal(d.vacia, false);
  assert.equal(d.resultados.length, 1); // el arancel dice “Auriculares”: se encuentra por sinónimo
  assert.equal(d.resultados[0].codigo, '8518300000');
  // La búsqueda por palabra del arancel y por plural/sin tilde
  d = await (await pedir('/api/partidas?q=auriculares')).json();
  assert.equal(d.resultados[0].formato, '8518.30.00.00');
  d = await (await pedir('/api/partidas?q=celulares')).json(); // celular ≈ teléfono
  assert.equal(d.resultados[0].codigo, '8517130000');
  d = await (await pedir('/api/partidas?q=telefonos')).json();
  assert.equal(d.resultados[0].codigo, '8517130000');
  d = await (await pedir('/api/partidas?q=8518')).json();
  assert.deepEqual(d.resultados.map((r) => r.codigo), ['8518210000', '8518300000']);
  d = await (await pedir('/api/partidas?q=calzado%20caucho')).json();
  assert.equal(d.resultados[0].advalorem, 11);
  d = await (await pedir('/api/partidas?q=%25')).json(); // un comodín de SQL no debe devolver todo
  assert.equal(d.resultados.length, 0);

  const resumen = await (await admin('partidas')).json();
  assert.equal(resumen.total, 4);
});

test('Directorio: valida, queda pendiente, se publica al aprobar y no muestra el correo', async () => {
  const valido = { razon_social: 'Agencia Pacífico S.A.C.', ruc: '20131312955', tipo: 'agencia', rubro: 'Agenciamiento de aduana', ciudad: 'Callao', telefono: '987654321', email: 'privado@pacifico.pe', web: 'pacifico.pe', autorizo: true };
  const enviar = (extra) => pedir('/api/directorio', { metodo: 'POST', cuerpo: { ...valido, ...extra } });

  assert.equal((await enviar({ ruc: '20131312954' })).status, 400); // dígito verificador mal
  assert.equal((await enviar({ ruc: '10131312955' })).status, 400); // persona natural: no se publica
  assert.equal((await enviar({ autorizo: false })).status, 400);
  assert.equal((await enviar({ tipo: 'otro' })).status, 400);
  assert.equal((await enviar({ email: 'sin-arroba' })).status, 400);

  assert.equal((await enviar({})).status, 200);
  const repetido = await enviar({});
  assert.equal(repetido.status, 400); // mismo RUC

  let html = await (await pedir('/directorio')).text();
  assert.equal(html.includes('Agencia Pacífico'), false, 'pendiente: no se ve en público');

  const { empresas } = await (await admin('empresas')).json();
  assert.equal(empresas.length, 1);
  assert.equal(empresas[0].estado, 'pendiente');
  assert.equal(empresas[0].web, 'https://pacifico.pe/');

  await admin('empresas-estado', { id: empresas[0].id, estado: 'aprobada' });
  html = await (await pedir('/directorio')).text();
  assert.ok(html.includes('Agencia Pacífico S.A.C.'));
  assert.ok(html.includes('20131312955'));
  assert.equal(html.includes('privado@pacifico.pe'), false, 'el correo es privado');

  html = await (await pedir('/directorio?tipo=carga')).text();
  assert.equal(html.includes('Agencia Pacífico S.A.C.'), false);
  html = await (await pedir('/directorio?q=callao')).text();
  assert.ok(html.includes('Agencia Pacífico S.A.C.'));
});

test('Directorio: el administrador importa empresas y se buscan por RUC o por nombre', async () => {
  const lineas = '20100070970;SUPERMERCADOS PERUANOS S.A.;importador;Retail;Lima;;;alimentos\n20131312955;AGRO EXPORT DEL SUR S.A.C.;exportador;Agro;Ica;987654321;agroexport.pe;uvas y paltas\n12345;MAL RUC;importador;;;;;\n';
  const r = await (await admin('empresas-importar', { texto: lineas })).json();
  assert.equal(r.guardadas, 2);
  assert.equal(r.descartadas, 1);
  let html = await (await pedir('/directorio?q=20131312955')).text();
  assert.ok(html.includes('AGRO EXPORT DEL SUR'));
  assert.equal(html.includes('SUPERMERCADOS PERUANOS'), false);
  html = await (await pedir('/directorio?q=201000')).text(); // primeros dígitos del RUC
  assert.ok(html.includes('SUPERMERCADOS PERUANOS'));
  html = await (await pedir('/directorio?q=agro%20export')).text(); // por nombre
  assert.ok(html.includes('AGRO EXPORT DEL SUR'));
  assert.match(html, /importadoras y exportadoras/);
});

test('Directorio: la trampa para robots y un cuerpo roto no guardan nada', async () => {
  const r = await pedir('/api/directorio', { metodo: 'POST', cuerpo: { razon_social: 'Spam', ruc: '20100070970', tipo: 'importador', email: 'a@b.pe', autorizo: true, sitio_extra: 'x' } });
  assert.equal((await r.json()).ok, true);
  const { empresas } = await (await admin('empresas')).json();
  assert.equal(empresas.some((e) => e.razon_social === 'Spam'), false);
  const roto = await worker.fetch(new Request(BASE + '/api/directorio', { method: 'POST', headers: { origin: BASE, 'content-type': 'application/json' }, body: '{no es json' }), env, ctx);
  assert.equal(roto.status, 400);
});

test('Las acciones del panel exigen sesión', async () => {
  const guardada = cookie;
  cookie = '';
  for (const ruta of ['partidas-importar', 'empresas-estado', 'empresas-borrar', 'partidas-vaciar', 'empresas-importar']) {
    const r = await admin(ruta, { id: 1, estado: 'aprobada', texto: 'x' });
    assert.equal(r.status, 401, ruta);
  }
  assert.equal((await admin('empresas')).status, 401);
  cookie = guardada;
});

// ── Filtro de temas en noticias y videos ──
const RSS = `<?xml version="1.0"?><rss><channel>
<item><title>Exportaciones peruanas de uva crecen 12% en septiembre</title><link>https://ejemplo.pe/uva</link><pubDate>${new Date().toUTCString()}</pubDate><description>El sector agroexportador reporta mayores envíos a China y Estados Unidos durante el mes.</description></item>
<item><title>Capturan a sicarios que asesinaron a un chofer en Los Olivos</title><link>https://ejemplo.pe/sicarios</link><pubDate>${new Date().toUTCString()}</pubDate><description>La policía informó de la captura de dos jóvenes sicarios tras el ataque.</description></item>
<item><title>Alianza Lima venció 2-0 en la Liga 1 y se acerca al título</title><link>https://ejemplo.pe/futbol</link><pubDate>${new Date().toUTCString()}</pubDate><description>El equipo íntimo ganó con goles en el segundo tiempo en el torneo clausura.</description></item>
<item><title>Lo más importante de los deportes del fin de semana</title><link>https://ejemplo.pe/deportes</link><pubDate>${new Date().toUTCString()}</pubDate><description>Resumen de la fecha deportiva con reportajes de todas las disciplinas del país.</description></item>
<item><title>SUNAT cambia las reglas del courier para compras en línea</title><link>https://ejemplo.pe/courier</link><pubDate>${new Date().toUTCString()}</pubDate><description>Nuevas reglas para envíos de entrega rápida y pago de aranceles en aduanas.</description></item>
</channel></rss>`;
const YT = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015">
<entry><yt:videoId>aaaaaaaaaaa</yt:videoId><title>Aranceles de EE.UU. golpean a las exportaciones peruanas</title><link rel="alternate" href="https://www.youtube.com/watch?v=aaaaaaaaaaa"/><published>2026-10-14T12:00:00+00:00</published></entry>
<entry><yt:videoId>bbbbbbbbbbb</yt:videoId><title>Si la Liga 1 terminara hoy: así quedaría la tabla</title><link rel="alternate" href="https://www.youtube.com/watch?v=bbbbbbbbbbb"/><published>2026-10-14T12:01:00+00:00</published></entry>
<entry><yt:videoId>ccccccccccc</yt:videoId><title>Delincuente asesinado a balazos tras intentar robo</title><link rel="alternate" href="https://www.youtube.com/watch?v=ccccccccccc"/><published>2026-10-14T12:02:00+00:00</published></entry>
<entry><yt:videoId>ddddddddddd</yt:videoId><title>Precio del dólar hoy: tipo de cambio en Perú</title><link rel="alternate" href="https://www.youtube.com/watch?v=ddddddddddd"/><published>2026-10-14T12:03:00+00:00</published></entry>
</feed>`;

const fetchOriginal = globalThis.fetch;
after(() => { globalThis.fetch = fetchOriginal; });

test('Filtro: al traer noticias solo entran las de comercio exterior y economía', async () => {
  globalThis.fetch = async (url) => (String(url).includes('youtube.com') ? new Response(YT) : new Response(RSS));
  const r = await (await admin('ejecutar', { tarea: 'noticias' })).json();
  assert.equal(r.ok, true, r.resultado);
  const { results } = await env.DB.prepare('SELECT titulo FROM noticias ORDER BY titulo').all();
  const titulos = results.map((x) => x.titulo);
  assert.deepEqual(titulos, ['Exportaciones peruanas de uva crecen 12% en septiembre', 'SUNAT cambia las reglas del courier para compras en línea']);
});

test('Filtro: al traer videos solo se guardan los de comercio exterior y economía', async () => {
  globalThis.fetch = async () => new Response(YT);
  // Un canal con ID ya resuelto, para no depender de YouTube
  await env.DB.prepare("UPDATE canales SET channel_id = 'UC' || substr('0000000000000000000000' || id, -22) WHERE channel_id IS NULL").run();
  const r = await (await admin('ejecutar', { tarea: 'videos' })).json();
  assert.equal(r.ok, true, r.resultado);
  const { results } = await env.DB.prepare('SELECT DISTINCT video_id FROM videos ORDER BY video_id').all();
  assert.deepEqual(results.map((x) => x.video_id), ['aaaaaaaaaaa', 'ddddddddddd']);
});

test('Filtro: la tarea de limpieza retira lo que ya estaba guardado y respeta lo destacado', async () => {
  const ahora = new Date().toISOString();
  const poner = (url, titulo, destacada) =>
    env.DB.prepare(
      `INSERT INTO noticias (url, titulo_norm, titulo, titulo_original, descripcion, pais, idioma, publicado, creado, destacada) VALUES (?, ?, ?, ?, '', 'PE', 'es', ?, ?, ?)`
    ).bind(url, titulo.toLowerCase(), titulo, titulo, ahora, ahora, destacada).run();
  await poner('https://x.pe/1', 'Asesinan a comerciante en el mercado central', 0);
  await poner('https://x.pe/2', 'Selección peruana convoca a nuevos jugadores para la fecha FIFA', 0);
  await poner('https://x.pe/3', 'Partido de fútbol destacado por el administrador', 1);
  await poner('https://x.pe/4', 'Importaciones de China crecen 20% en el año', 0);
  await env.DB.prepare("INSERT INTO videos (video_id, canal_id, canal_nombre, titulo, publicado) VALUES ('eeeeeeeeeee', 1, 'RPP', 'Papa León XIV vuelve a caminar', ?)").bind(ahora).run();

  const r = await (await admin('ejecutar', { tarea: 'filtro' })).json();
  assert.equal(r.ok, true, r.resultado);
  const { results } = await env.DB.prepare('SELECT titulo FROM noticias').all();
  const titulos = results.map((x) => x.titulo);
  assert.equal(titulos.includes('Asesinan a comerciante en el mercado central'), false);
  assert.equal(titulos.includes('Selección peruana convoca a nuevos jugadores para la fecha FIFA'), false);
  assert.equal(titulos.includes('Partido de fútbol destacado por el administrador'), true, 'lo destacado a mano se respeta');
  assert.equal(titulos.includes('Importaciones de China crecen 20% en el año'), true);
  const v = await env.DB.prepare("SELECT COUNT(*) AS n FROM videos WHERE video_id = 'eeeeeeeeeee'").first();
  assert.equal(v.n, 0);
});

test('Ajustes: se pueden guardar palabras extra y descartadas', async () => {
  const r = await (await admin('config', { palabras_extra: 'aguaymanto', palabras_excluidas: 'bitcoin' })).json();
  assert.equal(r.ok, true);
  const { config } = await (await admin('config')).json();
  assert.equal(config.palabras_extra, 'aguaymanto');
  assert.equal(config.palabras_excluidas, 'bitcoin');
});

// ── Anúnciate: PDF, esquemas y correos automáticos ──
test('Anúnciate muestra el esquema de cada espacio y el botón del PDF', async () => {
  const r = await worker.fetch(new Request(`${BASE}/anunciate`), env, ctx);
  const h = await r.text();
  assert.equal(r.status, 200);
  assert.equal((h.match(/class="mapa-web"/g) || []).length, 6);
  assert.match(h, /Publicidad-ImportaYa\.pdf/);
  assert.match(h, /mw-activo/);
});

test('El PDF de publicidad se descarga con medidas, precios y cuentas', async () => {
  const r = await worker.fetch(new Request(`${BASE}/anunciate/Publicidad-ImportaYa.pdf`), env, ctx);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'application/pdf');
  const b = Buffer.from(await r.arrayBuffer());
  assert.equal(b.subarray(0, 5).toString(), '%PDF-');
  assert.match(b.subarray(-8).toString(), /%%EOF/);
  const texto = b.toString('latin1');
  assert.match(texto, /1200 \xD7 150 px/);
  assert.match(texto, /19440084898094/);
  assert.match(texto, /00219414008489809493/);
  assert.match(texto, /iamasterperu@gmail\.com/);
});

test('El formulario avisa al dueño y responde solo con precios, PDF y cuenta (una vez por correo al día)', async () => {
  const enviados = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://puente.test')) {
      enviados.push(JSON.parse(init.body));
      return new Response('{"ok":true}');
    }
    return fetchOriginal(url, init);
  };
  const envCorreo = { ...env, CORREO_URL: 'https://puente.test/exec', CORREO_CLAVE: 'clave-puente' };
  const pedidos = [];
  const ctxEspera = { waitUntil: (p) => pedidos.push(Promise.resolve(p)) };
  const enviar = async (email) => {
    const r = await worker.fetch(
      new Request(`${BASE}/api/contacto`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: BASE, 'cf-connecting-ip': '8.8.4.4' },
        body: JSON.stringify({ nombre: 'Ana Pérez', empresa: 'Logística SAC', email, telefono: '999111222', espacio: 'lateral', mensaje: 'Quiero precios' }),
      }),
      envCorreo,
      ctxEspera
    );
    await Promise.all(pedidos.splice(0));
    return r;
  };
  try {
    assert.equal((await enviar('ana@ejemplo.com')).status, 200);
    assert.equal(enviados.length, 2);
    const [aviso, respuesta] = enviados;
    assert.equal(aviso.clave, 'clave-puente');
    assert.equal(aviso.para, 'iamasterperu@gmail.com');
    assert.match(aviso.asunto, /Formulario web/);
    assert.match(aviso.html, /página web de ImportaYa/);
    assert.match(aviso.html, /Ana Pérez/);
    assert.equal(aviso.responder_a, 'ana@ejemplo.com');
    assert.equal(respuesta.para, 'ana@ejemplo.com');
    assert.match(respuesta.html, /19440084898094/);
    assert.match(respuesta.html, /00219414008489809493/);
    assert.match(respuesta.html, /S\/ 400 al mes/);
    assert.match(respuesta.html, /anunciate\/pagar/);
    assert.match(respuesta.html, /992644771/);
    assert.match(respuesta.html, /yape-color\.png/);
    assert.match(respuesta.html, /bcp-color\.png/);
    assert.match(respuesta.html, /logo-importaya\.png/);
    assert.equal(respuesta.pdf_url, `${BASE}/anunciate/Publicidad-ImportaYa.pdf`);
    // El mismo correo otra vez: solo se avisa al dueño, no se repite la respuesta automática
    enviados.length = 0;
    await enviar('ana@ejemplo.com');
    assert.equal(enviados.length, 1);
    assert.equal(enviados[0].para, 'iamasterperu@gmail.com');
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test('Sin puente de correo configurado, el mensaje igual se guarda', async () => {
  const r = await worker.fetch(
    new Request(`${BASE}/api/contacto`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: BASE, 'cf-connecting-ip': '8.8.8.9' },
      body: JSON.stringify({ nombre: 'Luis', email: 'luis@ejemplo.com', mensaje: 'Hola' }),
    }),
    env,
    ctx
  );
  assert.equal(r.status, 200);
});

test('Pagar: la página muestra Yape y BCP, y "Ya pagué" avisa al dueño y confirma al cliente', async () => {
  const pagina = await (await pedir('/anunciate/pagar')).text();
  assert.match(pagina, /992644771/);
  assert.match(pagina, /19440084898094/);
  assert.match(pagina, /00219414008489809493/);
  assert.match(pagina, /yape-qr\.png/);
  assert.match(pagina, /bcp-azul\.png/);

  const enviados = [];
  const fetchOriginal = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://puente.test')) {
      enviados.push(JSON.parse(init.body));
      return new Response('{"ok":true}');
    }
    return fetchOriginal(url, init);
  };
  const envCorreo = { ...env, CORREO_URL: 'https://puente.test/exec', CORREO_CLAVE: 'clave-puente' };
  const pedidos = [];
  const ctxEspera = { waitUntil: (p) => pedidos.push(Promise.resolve(p)) };
  const avisar = async (cuerpo) => {
    const r = await worker.fetch(
      new Request(`${BASE}/api/pago`, { method: 'POST', headers: { 'content-type': 'application/json', origin: BASE, 'cf-connecting-ip': '7.7.7.7' }, body: JSON.stringify(cuerpo) }),
      envCorreo,
      ctxEspera
    );
    await Promise.all(pedidos.splice(0));
    return r;
  };
  try {
    const bueno = { nombre: 'Rosa Díaz', empresa: 'Aduanas del Sur SAC', email: 'rosa@aduanas.pe', telefono: '999000111', espacio: 'cabecera', metodo: 'yape', operacion: '123456' };
    assert.equal((await avisar({ ...bueno, email: 'malo' })).status, 400);
    assert.equal((await avisar({ ...bueno, espacio: 'x' })).status, 400);
    assert.equal(enviados.length, 0);
    assert.equal((await avisar(bueno)).status, 200);
    assert.equal(enviados.length, 2);
    const [dueno, cliente] = enviados;
    assert.equal(dueno.para, 'iamasterperu@gmail.com');
    assert.match(dueno.asunto, /Aduanas del Sur SAC ya pagó/);
    assert.equal(cliente.para, 'rosa@aduanas.pe');
    assert.match(cliente.html, /PNG o JPG/);
    assert.match(cliente.html, /1200 × 150 px/);
    assert.match(cliente.html, /dentro de 2 horas/);
    assert.match(cliente.html, /link/);
    assert.equal(cliente.pdf_url, `${BASE}/anunciate/Publicidad-ImportaYa.pdf`);
  } finally {
    globalThis.fetch = fetchOriginal;
  }
});

test('La página principal y el PDF dicen que son para importadores y exportadores', async () => {
  const h = await (await pedir('/')).text();
  assert.match(h, /importadores y exportadores/);
  const pdf = Buffer.from(await (await pedir('/anunciate/Publicidad-ImportaYa.pdf')).arrayBuffer()).toString('latin1');
  assert.match(pdf, /importadores y exportadores/);
  assert.match(pdf, /992644771/);
});

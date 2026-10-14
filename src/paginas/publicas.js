// Páginas públicas de ImportaYa.
import { html, mesLima, mesAnterior, fechaLima, esBot } from '../lib/http.js';
import { esc, recortar, fechaLarga, nombreMes, terminoLimpio, slug, PAISES } from '../lib/texto.js';
import { espacio, ESPACIOS } from '../lib/anuncios.js';
import { svgEsquema } from '../lib/mapa-web.js';
import { NOMBRE_PDF } from '../lib/correos-ventas.js';
import { historialTipoCambio } from '../tareas/tipo-cambio.js';
import { topTerminos } from '../tareas/mantenimiento.js';
import { registrarBusqueda } from '../api/publica.js';
import {
  pagina,
  listaNoticias,
  tarjetaNoticia,
  tarjetaVideo,
  videoGrande,
  urlNoticia,
  grafico,
} from './plantilla.js';

const CAMPOS_NOTA = 'id, titulo, resumen, descripcion, imagen, fuente_nombre, pais, publicado';

async function noticias(db, { pais = null, limite = 12, offset = 0, q = '' } = {}) {
  const where = ['oculta = 0'];
  const vals = [];
  if (pais) {
    where.push('pais = ?');
    vals.push(pais);
  }
  if (q) {
    where.push('(titulo LIKE ? OR resumen LIKE ? OR descripcion LIKE ?)');
    const like = `%${q.replace(/[%_]/g, '')}%`;
    vals.push(like, like, like);
  }
  const { results } = await db
    .prepare(`SELECT ${CAMPOS_NOTA} FROM noticias WHERE ${where.join(' AND ')} ORDER BY destacada DESC, publicado DESC LIMIT ? OFFSET ?`)
    .bind(...vals, limite, offset)
    .all();
  return results;
}

async function videoPrincipal(db) {
  return db
    .prepare(
      `SELECT v.* FROM videos v JOIN canales c ON c.id = v.canal_id
        WHERE c.principal = 1 AND c.activo = 1 AND v.oculto = 0
        ORDER BY v.es_short ASC, v.publicado DESC LIMIT 1`
    )
    .first()
    .then(
      (v) =>
        v ||
        db.prepare('SELECT * FROM videos WHERE oculto = 0 ORDER BY es_short ASC, publicado DESC LIMIT 1').first()
    );
}

async function ultimosVideos(db, limite = 8, canal = null, excluir = '') {
  const { results } = await db
    .prepare(
      `SELECT v.* FROM videos v JOIN canales c ON c.id = v.canal_id
        WHERE v.oculto = 0 AND c.activo = 1 AND v.video_id <> ? ${canal ? 'AND v.canal_id = ?' : ''}
        ORDER BY v.publicado DESC LIMIT ?`
    )
    .bind(excluir, ...(canal ? [canal, limite] : [limite]))
    .all();
  return results;
}

function bloqueTendencias(top, mes, enVivo) {
  if (!top.length) {
    return `<p class="vacio">Aún no hay búsquedas este mes. ¡Usa la <a href="/calculadora">calculadora</a> y aparece aquí!</p>`;
  }
  return `<ol class="ranking">${top
    .map((t) => `<li><a href="/noticias?q=${encodeURIComponent(t.termino)}">${esc(t.termino)}</a><span>${t.cantidad}</span></li>`)
    .join('')}</ol>
  <p class="nota-meta">${enVivo ? 'En vivo · ' : ''}${nombreMes(mes)}</p>`;
}

async function tendenciasActuales(db, limite = 10) {
  const mes = mesLima();
  let top = await topTerminos(db, mes, limite);
  if (top.length >= 3) return { top, mes, enVivo: true };
  const ant = mesAnterior(mes);
  const prev = await topTerminos(db, ant, limite);
  return prev.length ? { top: prev, mes: ant, enVivo: false } : { top, mes, enVivo: true };
}

// ─────────────────────────── Inicio ───────────────────────────
export async function inicio(ctx) {
  const db = ctx.env.DB;
  const [ultimas, china, mundo, principal, historial, tend, masLeidas] = await Promise.all([
    noticias(db, { limite: 13 }),
    noticias(db, { pais: 'CN', limite: 4 }),
    db.prepare(`SELECT ${CAMPOS_NOTA} FROM noticias WHERE oculta = 0 AND pais IN ('US','MUNDO') ORDER BY publicado DESC LIMIT 4`).all().then((r) => r.results),
    videoPrincipal(db),
    historialTipoCambio(db, 30),
    tendenciasActuales(db, 8),
    db
      .prepare(`SELECT id, titulo FROM noticias WHERE oculta = 0 AND visitas > 0 AND publicado > ? ORDER BY visitas DESC LIMIT 5`)
      .bind(new Date(Date.now() - 7 * 86400 * 1000).toISOString())
      .all()
      .then((r) => r.results),
  ]);
  const videos = await ultimosVideos(db, 8, null, principal?.video_id || '');
  const [destacada, ...resto] = ultimas;
  const tc = ctx.tc;

  const cuerpo = `
<section class="portada">
  <div class="portada-texto">
    <h1>Todo lo que un importador necesita saber hoy</h1>
    <p>Noticias de Perú 🇵🇪, China 🇨🇳 y el mundo 🌎 actualizadas cada hora, el dólar del día y la calculadora de impuestos de importación. <b>Gratis.</b></p>
    <div class="portada-botones">
      <a class="btn btn-naranja" href="/calculadora">🧮 ¿Cuánto pago de aduana?</a>
      <a class="btn btn-claro" href="/noticias">Ver noticias</a>
    </div>
  </div>
  <a class="tarjeta-tc" href="/calculadora">
    <span class="tc-titulo">Tipo de cambio ${tc ? esc(tc.fuente.startsWith('SUNAT') ? 'SUNAT' : 'referencial') : ''} hoy</span>
    ${
      tc
        ? `<div class="tc-valores"><div><small>Compra</small><b>S/ ${tc.compra.toFixed(3)}</b></div><div><small>Venta</small><b>S/ ${tc.venta.toFixed(3)}</b></div></div>
           ${grafico(historial)}<small class="tc-fecha">Actualizado: ${esc(tc.fecha)} · Fuente: ${esc(tc.fuente)}</small>`
        : '<p>El tipo de cambio aparecerá en unos minutos.</p>'
    }
  </a>
</section>

<div class="columnas">
  <div class="columna-principal">
    <section>
      <div class="titulo-seccion"><h2>📺 Noticias en video</h2><a href="/videos">Ver todos</a></div>
      ${videoGrande(principal)}
      ${espacio('videos', ctx.anuncios, ctx.cfg)}
    </section>

    <section>
      <div class="titulo-seccion"><h2>📰 Últimas noticias</h2><a href="/noticias">Ver todas</a></div>
      <nav class="pestanas"><a href="/noticias" aria-current="page">Todas</a><a href="/noticias?pais=PE">🇵🇪 Perú</a><a href="/noticias?pais=CN">🇨🇳 China</a><a href="/noticias?pais=US">🇺🇸 EE. UU.</a><a href="/noticias?pais=MUNDO">🌎 Mundo</a></nav>
      ${destacada ? tarjetaNoticia(destacada, { grande: Boolean(destacada.imagen) }) : ''}
      ${listaNoticias(resto, ctx)}
    </section>
  </div>

  <aside class="columna-lateral">
    ${espacio('lateral', ctx.anuncios, ctx.cfg)}
    <section class="caja">
      <h2>🔥 Lo más buscado</h2>
      ${bloqueTendencias(tend.top, tend.mes, tend.enVivo)}
      <a class="enlace-mas" href="/tendencias">Ver ranking completo →</a>
    </section>
    <section class="caja caja-calculadora">
      <h2>🧮 Calcula tus impuestos</h2>
      <p>Pon el valor de tu compra y el flete, y descubre cuánto pagas en aduana (ad valorem, IGV, IPM y percepción).</p>
      <a class="btn btn-naranja btn-bloque" href="/calculadora">Abrir calculadora</a>
      ${espacio('calculadora', ctx.anuncios, ctx.cfg)}
    </section>
    ${
      masLeidas.length
        ? `<section class="caja"><h2>👀 Lo más leído</h2><ol class="ranking ranking-notas">${masLeidas
            .map((n) => `<li><a href="${urlNoticia(n)}">${esc(recortar(n.titulo, 90))}</a></li>`)
            .join('')}</ol></section>`
        : ''
    }
  </aside>
</div>

${
  videos.length
    ? `<section><div class="titulo-seccion"><h2>🎬 Últimos videos de noticias</h2><a href="/videos">Ver más</a></div>
       <div class="rejilla-videos">${videos.map(tarjetaVideo).join('')}</div></section>`
    : ''
}

<div class="dos-columnas">
  <section><div class="titulo-seccion"><h2>🇨🇳 China</h2><a href="/noticias?pais=CN">Más de China</a></div>${listaNoticias(china, ctx, { anuncioCada: 0 })}</section>
  <section><div class="titulo-seccion"><h2>🌎 EE. UU. y el mundo</h2><a href="/noticias?pais=MUNDO">Más del mundo</a></div>${listaNoticias(mundo, ctx, { anuncioCada: 0 })}</section>
</div>`;

  return html(pagina(ctx, { ruta: '/', seccion: 'inicio', cuerpo }));
}

// ─────────────────────────── Noticias ───────────────────────────
const POR_PAGINA = 20;

export async function listaDeNoticias(ctx) {
  const url = new URL(ctx.request.url);
  const pais = PAISES[url.searchParams.get('pais')] ? url.searchParams.get('pais') : null;
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const p = Math.min(Math.max(parseInt(url.searchParams.get('p') || '1', 10) || 1, 1), 50);
  const lista = await noticias(ctx.env.DB, { pais, q, limite: POR_PAGINA + 1, offset: (p - 1) * POR_PAGINA });
  const hayMas = lista.length > POR_PAGINA;
  if (q && p === 1 && !esBot(ctx.request)) {
    const t = terminoLimpio(q);
    if (t) ctx.waitUntil(registrarBusqueda(ctx.env.DB, t, 'buscador'));
  }

  const params = (extra) => {
    const s = new URLSearchParams();
    if (pais) s.set('pais', pais);
    if (q) s.set('q', q);
    for (const [k, v] of Object.entries(extra)) s.set(k, v);
    const t = s.toString();
    return t ? `?${t}` : '';
  };
  const pestana = (codigo, texto) =>
    `<a href="/noticias${codigo ? `?pais=${codigo}` : ''}"${pais === codigo ? ' aria-current="page"' : ''}>${texto}</a>`;
  const nombre = pais ? `${PAISES[pais].bandera} Noticias de ${PAISES[pais].nombre}` : '📰 Noticias de importación y comercio exterior';

  const cuerpo = `
<div class="columnas">
  <div class="columna-principal">
    <h1>${q ? `Resultados para “${esc(q)}”` : nombre}</h1>
    <form class="buscador" action="/noticias" method="get" role="search">
      ${pais ? `<input type="hidden" name="pais" value="${esc(pais)}">` : ''}
      <input type="search" name="q" value="${esc(q)}" placeholder="Buscar: China, aranceles, celulares, Chancay…" aria-label="Buscar noticias" maxlength="60">
      <button class="btn btn-naranja" type="submit">Buscar</button>
    </form>
    <nav class="pestanas">${pestana(null, 'Todas')}${pestana('PE', '🇵🇪 Perú')}${pestana('CN', '🇨🇳 China')}${pestana('US', '🇺🇸 EE. UU.')}${pestana('MUNDO', '🌎 Mundo')}</nav>
    ${listaNoticias(lista.slice(0, POR_PAGINA), ctx)}
    <nav class="paginacion">
      ${p > 1 ? `<a class="btn btn-claro" href="/noticias${params({ p: p - 1 })}">← Más recientes</a>` : '<span></span>'}
      ${hayMas ? `<a class="btn btn-claro" href="/noticias${params({ p: p + 1 })}">Anteriores →</a>` : ''}
    </nav>
  </div>
  <aside class="columna-lateral">
    ${espacio('lateral', ctx.anuncios, ctx.cfg)}
    <section class="caja caja-calculadora">
      <h2>🧮 ¿Cuánto pagas de aduana?</h2>
      <a class="btn btn-naranja btn-bloque" href="/calculadora">Calcular gratis</a>
      ${espacio('calculadora', ctx.anuncios, ctx.cfg)}
    </section>
  </aside>
</div>`;
  return html(
    pagina(ctx, {
      titulo: q ? `Noticias sobre ${q}` : pais ? `Noticias de importación de ${PAISES[pais].nombre}` : 'Noticias de importación y comercio exterior',
      descripcion: 'Noticias de importación, exportación, aduanas, fletes y aranceles de Perú, China, EE. UU. y el mundo, actualizadas cada hora.',
      ruta: '/noticias' + params(p > 1 ? { p } : {}),
      seccion: 'noticias',
      cuerpo,
      noindex: Boolean(q),
    })
  );
}

export async function detalleNoticia(ctx, id, slugUrl) {
  const db = ctx.env.DB;
  const n = await db.prepare('SELECT * FROM noticias WHERE id = ? AND oculta = 0').bind(id).first();
  if (!n) return null;
  const canonica = urlNoticia(n);
  if (`/n/${id}/${slugUrl || ''}` !== canonica) return Response.redirect(ctx.base + canonica, 301);
  if (!esBot(ctx.request)) ctx.waitUntil(db.prepare('UPDATE noticias SET visitas = visitas + 1 WHERE id = ?').bind(id).run());

  const { results: relacionadas } = await db
    .prepare(`SELECT ${CAMPOS_NOTA} FROM noticias WHERE oculta = 0 AND pais = ? AND id <> ? ORDER BY publicado DESC LIMIT 6`)
    .bind(n.pais, id)
    .all();
  const p = PAISES[n.pais] || PAISES.MUNDO;
  const enlaceCompleto = ctx.base + canonica;
  const compartir = encodeURIComponent(`${n.titulo} ${enlaceCompleto}`);
  const texto = n.resumen
    ? `<div class="resumen"><span class="resumen-etiqueta">Resumen ImportaYa${n.resumen_ia ? ' · hecho con IA a partir de la fuente' : ''}</span><p>${esc(n.resumen)}</p></div>`
    : n.descripcion
      ? `<div class="resumen"><span class="resumen-etiqueta">Extracto de ${esc(n.fuente_nombre)}</span><p>${esc(n.descripcion)}</p></div>`
      : '';
  const ld = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: recortar(n.titulo, 110),
    datePublished: n.publicado,
    image: n.imagen ? [n.imagen] : undefined,
    publisher: { '@type': 'Organization', name: ctx.env.SITE_NAME || 'ImportaYa' },
    isBasedOn: n.url,
  }).replace(/</g, '\\u003c');

  const cuerpo = `
<div class="columnas">
  <article class="columna-principal articulo">
    <nav class="migas"><a href="/">Inicio</a> › <a href="/noticias?pais=${esc(n.pais)}">${p.bandera} ${p.nombre}</a></nav>
    <h1>${esc(n.titulo)}</h1>
    ${n.titulo_original && n.titulo_original !== n.titulo ? `<p class="titulo-original">Título original: ${esc(n.titulo_original)}</p>` : ''}
    <p class="nota-meta"><span>Fuente: <b>${esc(n.fuente_nombre)}</b></span><time datetime="${esc(n.publicado)}">${fechaLarga(n.publicado)}</time></p>
    ${n.imagen ? `<img class="articulo-imagen" src="${esc(n.imagen)}" alt="" referrerpolicy="no-referrer">` : ''}
    ${texto}
    <a class="btn btn-naranja btn-grande" href="${esc(n.url)}" target="_blank" rel="noopener nofollow">Leer la noticia completa en ${esc(n.fuente_nombre)} ↗</a>
    <div class="compartir">
      <span>Compartir:</span>
      <a href="https://wa.me/?text=${compartir}" target="_blank" rel="noopener">WhatsApp</a>
      <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(enlaceCompleto)}" target="_blank" rel="noopener">Facebook</a>
      <a href="https://x.com/intent/post?text=${compartir}" target="_blank" rel="noopener">X</a>
      <a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(enlaceCompleto)}" target="_blank" rel="noopener">LinkedIn</a>
    </div>
    ${espacio('noticias', ctx.anuncios, ctx.cfg)}
    ${relacionadas.length ? `<h2>Más noticias de ${p.nombre}</h2>${listaNoticias(relacionadas, ctx, { anuncioCada: 0 })}` : ''}
  </article>
  <aside class="columna-lateral">
    ${espacio('lateral', ctx.anuncios, ctx.cfg)}
    <section class="caja caja-calculadora">
      <h2>🧮 ¿Vas a importar?</h2>
      <p>Calcula en segundos cuánto pagarás de impuestos en aduana.</p>
      <a class="btn btn-naranja btn-bloque" href="/calculadora">Calcular gratis</a>
      ${espacio('calculadora', ctx.anuncios, ctx.cfg)}
    </section>
  </aside>
</div>`;
  return html(
    pagina(ctx, {
      titulo: n.titulo,
      descripcion: n.resumen || n.descripcion || `${n.titulo}. Noticia de ${n.fuente_nombre}.`,
      ruta: canonica,
      seccion: 'noticias',
      imagen: n.imagen,
      cuerpo,
      extraHead: `<script type="application/ld+json">${ld}</script>`,
    })
  );
}

// ─────────────────────────── Videos ───────────────────────────
export async function paginaVideos(ctx) {
  const db = ctx.env.DB;
  const url = new URL(ctx.request.url);
  const canal = parseInt(url.searchParams.get('canal') || '', 10) || null;
  const [principal, { results: canales }] = await Promise.all([
    canal
      ? db.prepare('SELECT * FROM videos WHERE canal_id = ? AND oculto = 0 ORDER BY es_short ASC, publicado DESC LIMIT 1').bind(canal).first()
      : videoPrincipal(db),
    db.prepare('SELECT id, nombre FROM canales WHERE activo = 1 ORDER BY principal DESC, nombre').all(),
  ]);
  const videos = await ultimosVideos(db, 24, canal, principal?.video_id || '');
  const pestanas = [`<a href="/videos"${canal ? '' : ' aria-current="page"'}>Todos</a>`]
    .concat(canales.map((c) => `<a href="/videos?canal=${c.id}"${c.id === canal ? ' aria-current="page"' : ''}>${esc(c.nombre)}</a>`))
    .join('');
  const cuerpo = `
<h1>📺 Noticias en video</h1>
<p class="bajada">Se actualiza solo: en cuanto los canales suben un video nuevo, aparece aquí.</p>
<nav class="pestanas pestanas-scroll">${pestanas}</nav>
${videoGrande(principal)}
${espacio('videos', ctx.anuncios, ctx.cfg)}
<div class="rejilla-videos">${videos.map(tarjetaVideo).join('') || '<p class="vacio">Aún no hay videos.</p>'}</div>`;
  return html(
    pagina(ctx, {
      titulo: 'Noticias en video de Perú y el mundo',
      descripcion: 'Los últimos videos de noticias de Perú, China y el mundo, actualizados automáticamente.',
      ruta: '/videos' + (canal ? `?canal=${canal}` : ''),
      seccion: 'videos',
      cuerpo,
    })
  );
}

// ─────────────────────────── Calculadora ───────────────────────────
export async function calculadora(ctx) {
  const { cfg, tc } = ctx;
  let percepciones;
  try {
    percepciones = JSON.parse(cfg.percepciones);
  } catch {
    percepciones = [{ v: 3.5, t: '3.5 %' }];
  }
  const datos = {
    igv: Number(cfg.igv) || 16,
    ipm: Number(cfg.ipm) || 2,
    seguro: Number(cfg.seguro_pct) || 0,
    tc: tc ? tc.venta : 3.75,
    tcFecha: tc ? tc.fecha : '',
  };
  const advalorem = String(cfg.advalorem)
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((x) => !isNaN(x));

  const cuerpo = `
<div class="columnas">
  <div class="columna-principal">
    <h1>🧮 Calculadora de impuestos de importación (Perú)</h1>
    <p class="bajada">Calcula gratis cuánto pagarás en aduana: ad valorem, IGV, IPM y percepción. Usa el tipo de cambio de hoy.</p>
    ${espacio('calculadora', ctx.anuncios, ctx.cfg)}
    <form class="calculadora" id="calculadora" novalidate>
      <script type="application/json" id="datos-calculadora">${JSON.stringify(datos).replace(/</g, '\\u003c')}</script>
      <label class="campo campo-ancho">¿Qué producto vas a importar? <small>(opcional)</small>
        <input name="producto" maxlength="50" placeholder="Ej.: audífonos, zapatillas, repuestos" autocomplete="off">
      </label>
      <label class="campo">Valor de la mercadería (FOB) en US$
        <input name="fob" type="number" inputmode="decimal" min="0" step="0.01" required placeholder="1000">
      </label>
      <label class="campo">Flete internacional en US$
        <input name="flete" type="number" inputmode="decimal" min="0" step="0.01" placeholder="200">
      </label>
      <label class="campo">Seguro en US$ <small>(vacío = estimado ${esc(cfg.seguro_pct)} % del FOB)</small>
        <input name="seguro" type="number" inputmode="decimal" min="0" step="0.01" placeholder="Automático">
      </label>
      <label class="campo">Cantidad de unidades <small>(opcional)</small>
        <input name="unidades" type="number" inputmode="numeric" min="1" step="1" placeholder="100">
      </label>
      <label class="campo">Ad valorem (según la partida)
        <select name="advalorem">${advalorem.map((v) => `<option value="${v}"${v === 6 ? ' selected' : ''}>${v} %</option>`).join('')}</select>
      </label>
      <label class="campo">Percepción del IGV
        <select name="percepcion">${percepciones.map((p, i) => `<option value="${Number(p.v)}"${i === 0 ? ' selected' : ''}>${esc(p.t)}</option>`).join('')}</select>
      </label>
      <label class="campo">Tipo de cambio (venta)
        <input name="tc" type="number" inputmode="decimal" min="1" step="0.001" value="${datos.tc.toFixed(3)}">
      </label>
      <button class="btn btn-naranja btn-grande campo-ancho" type="submit">Calcular</button>
    </form>
    <section class="resultado" id="resultado" hidden aria-live="polite"></section>

    <section class="explicacion">
      <h2>¿Cómo se calculan los impuestos de importación en Perú?</h2>
      <ol>
        <li><b>Valor CIF</b> = valor FOB + flete + seguro. Es la base de todos los impuestos.</li>
        <li><b>Ad valorem</b> = CIF × 0 %, 6 % u 11 %, según la partida arancelaria del producto.</li>
        <li><b>IGV (${esc(cfg.igv)} %)</b> e <b>IPM (${esc(cfg.ipm)} %)</b> = se calculan sobre CIF + ad valorem.</li>
        <li><b>Percepción</b> = un adelanto del IGV que se calcula sobre CIF + todos los impuestos. Si tienes RUC, después la puedes usar a tu favor.</li>
      </ol>
      <p class="aviso">⚠️ Resultado <b>referencial</b>. No incluye ISC, derechos antidumping, tasa de despacho ni costos del agente de aduana, almacén o transporte local. Confirma la partida y las tasas con tu agente de aduana o en SUNAT.</p>
    </section>
  </div>
  <aside class="columna-lateral">
    ${espacio('lateral', ctx.anuncios, ctx.cfg)}
    <section class="caja">
      <h2>💵 Dólar hoy</h2>
      ${tc ? `<p>Compra <b>S/ ${tc.compra.toFixed(3)}</b><br>Venta <b>S/ ${tc.venta.toFixed(3)}</b></p><p class="nota-meta">${esc(tc.fecha)} · ${esc(tc.fuente)}</p>` : '<p>Pronto disponible.</p>'}
    </section>
  </aside>
</div>
<script src="/js/calculadora.js?v=1" defer></script>`;
  return html(
    pagina(ctx, {
      titulo: 'Calculadora de impuestos de importación Perú (gratis)',
      descripcion: '¿Cuánto pago de aduana? Calcula gratis el ad valorem, IGV, IPM y percepción de tu importación con el tipo de cambio de hoy.',
      ruta: '/calculadora',
      seccion: 'calculadora',
      cuerpo,
    })
  );
}

// ─────────────────────────── Tendencias ───────────────────────────
export async function tendencias(ctx, mesUrl) {
  const db = ctx.env.DB;
  const actual = mesLima();
  const mes = mesUrl || actual;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) || mes > actual) return null;
  let top;
  if (mes === actual) top = await topTerminos(db, mes, 20);
  else {
    const { results } = await db.prepare('SELECT termino, cantidad FROM ranking_mensual WHERE mes = ? ORDER BY posicion').bind(mes).all();
    top = results.length ? results : await topTerminos(db, mes, 20);
  }
  const { results: meses } = await db.prepare('SELECT DISTINCT mes FROM ranking_mensual ORDER BY mes DESC LIMIT 24').all();
  const cuerpo = `
<div class="columnas">
  <div class="columna-principal">
    <h1>🔥 Lo más buscado para importar ${mes === actual ? 'este mes' : 'en ' + nombreMes(mes)}</h1>
    <p class="bajada">Ranking automático con lo que más calculan y buscan los visitantes de ImportaYa${mes === actual ? '. Se actualiza en vivo y se cierra el día 1 de cada mes' : ''}.</p>
    ${bloqueTendencias(top, mes, mes === actual)}
    ${espacio('noticias', ctx.anuncios, ctx.cfg)}
    ${
      meses.length
        ? `<h2>Meses anteriores</h2><ul class="meses">${meses.map((m) => `<li><a href="/tendencias/${m.mes}">${nombreMes(m.mes)}</a></li>`).join('')}</ul>`
        : ''
    }
  </div>
  <aside class="columna-lateral">${espacio('lateral', ctx.anuncios, ctx.cfg)}</aside>
</div>`;
  return html(
    pagina(ctx, {
      titulo: `Lo más buscado para importar en ${nombreMes(mes)}`,
      descripcion: `Ranking de los productos y temas que más buscan los importadores peruanos en ${nombreMes(mes)}.`,
      ruta: mesUrl ? `/tendencias/${mes}` : '/tendencias',
      seccion: 'tendencias',
      cuerpo,
    })
  );
}

// ─────────────────────────── Anúnciate ───────────────────────────
export async function anunciate(ctx) {
  const db = ctx.env.DB;
  const { cfg } = ctx;
  const url = new URL(ctx.request.url);
  const elegido = ESPACIOS[url.searchParams.get('espacio')] ? url.searchParams.get('espacio') : '';
  const hace30 = fechaLima(new Date(Date.now() - 30 * 86400 * 1000));
  const [visitas, notas, videos] = await Promise.all([
    db.prepare('SELECT COALESCE(SUM(visitas), 0) AS n FROM visitas_dia WHERE fecha >= ?').bind(hace30).first(),
    db.prepare('SELECT COUNT(*) AS n FROM noticias WHERE publicado >= ?').bind(new Date(Date.now() - 30 * 86400 * 1000).toISOString()).first(),
    db.prepare('SELECT COUNT(*) AS n FROM videos').first(),
  ]);
  const num = (n) => Number(n || 0).toLocaleString('es-PE');
  const wsp = cfg.whatsapp
    ? `<a class="btn btn-wsp btn-grande" href="https://wa.me/${esc(cfg.whatsapp.replace(/\D/g, ''))}?text=${encodeURIComponent('Hola, quiero anunciar mi empresa en ImportaYa')}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>`
    : '';
  const cuerpo = `
<section class="portada portada-anuncio">
  <div class="portada-texto">
    <h1>Anuncia tu empresa frente a los importadores del Perú</h1>
    <p>ImportaYa reúne a personas y empresas que importan desde China, EE. UU. y el mundo: el público ideal para agentes de carga, agencias de aduana, couriers, bancos, seguros y almacenes.</p>
    <div class="portada-botones"><a class="btn btn-naranja btn-grande" href="#contacto">Quiero anunciar</a>${wsp}</div>
  </div>
</section>
<section class="cifras">
  ${visitas?.n >= 500 ? `<div><b>${num(visitas.n)}</b><span>visitas en los últimos 30 días</span></div>` : '<div><b>100 %</b><span>público del rubro importador</span></div>'}
  <div><b>${num(notas?.n)}</b><span>noticias publicadas este mes</span></div>
  <div><b>${num(videos?.n)}</b><span>videos de noticias</span></div>
  <div><b>24/7</b><span>actualización automática</span></div>
</section>
<h2>Espacios disponibles</h2>
<p class="ayuda">En cada dibujo, el bloque naranja muestra <b>en qué parte de la página</b> aparecerá tu publicidad.</p>
<p><a class="btn btn-naranja" href="/anunciate/${NOMBRE_PDF}" download>⬇ Descargar PDF con medidas, lugares y precios</a></p>
<div class="rejilla-espacios">
${Object.entries(ESPACIOS)
  .map(
    ([id, e]) => `<article class="espacio-tarjeta${id === elegido ? ' elegido' : ''}" id="espacio-${id}">
  ${svgEsquema(id, 'Dónde aparece: ' + e.nombre)}
  <h3>${esc(e.nombre)}</h3><p>${esc(e.detalle)}</p>
  <p class="nota-meta"><span>Medida: ${esc(e.medida)}</span></p>
  <p class="precio">${esc(cfg['precio_' + id] || 'Consultar')}</p>
  <a class="btn btn-claro" href="?espacio=${id}#contacto">Elegir este espacio</a>
</article>`
  )
  .join('')}
</div>
<p class="oferta">⭐ <b>Plan anual:</b> ${esc(cfg.oferta_anual)} Pago por transferencia o Yape, con comprobante.</p>
<section class="caja contacto" id="contacto">
  <h2>Escríbenos</h2>
  <p>Déjanos tus datos y te respondemos al correo con los precios, el PDF con las medidas y los datos para pagar.</p>
  <form id="form-contacto" class="formulario">
    <label>Tu nombre<input name="nombre" required maxlength="80" autocomplete="name"></label>
    <label>Empresa<input name="empresa" maxlength="100" autocomplete="organization"></label>
    <label>Correo<input name="email" type="email" maxlength="120" autocomplete="email"></label>
    <label>WhatsApp / teléfono<input name="telefono" maxlength="30" autocomplete="tel"></label>
    <label>Espacio de interés
      <select name="espacio"><option value="">No sé todavía</option>${Object.entries(ESPACIOS)
        .map(([id, e]) => `<option value="${id}"${id === elegido ? ' selected' : ''}>${esc(e.nombre)}</option>`)
        .join('')}</select>
    </label>
    <label class="campo-ancho">Mensaje<textarea name="mensaje" rows="3" maxlength="1000"></textarea></label>
    <label class="trampa" aria-hidden="true">No llenar<input name="web" tabindex="-1" autocomplete="off"></label>
    <button class="btn btn-naranja btn-grande" type="submit">Enviar</button>
    <p class="mensaje-form" role="status"></p>
  </form>
  ${cfg.email ? `<p>O escríbenos a <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a></p>` : ''}
</section>`;
  return html(
    pagina(ctx, {
      titulo: 'Anúnciate en ImportaYa',
      descripcion: 'Publicidad para agentes de carga, agencias de aduana, couriers y empresas de comercio exterior. Llega a los importadores del Perú.',
      ruta: '/anunciate',
      seccion: 'anunciate',
      cuerpo,
    })
  );
}

// ─────────────────────────── Otras ───────────────────────────
export function privacidad(ctx) {
  const sitio = esc(ctx.env.SITE_NAME || 'ImportaYa');
  const contacto = ctx.cfg.email ? `<a href="mailto:${esc(ctx.cfg.email)}">${esc(ctx.cfg.email)}</a>` : 'el formulario de la página Anúnciate';
  const cuerpo = `<article class="articulo legal">
<h1>Política de privacidad</h1>
<p>${sitio} es un portal gratuito de noticias y herramientas para importadores. Esta política explica qué datos usamos, conforme a la Ley N.º 29733 de Protección de Datos Personales del Perú.</p>
<h2>Qué datos guardamos</h2>
<ul>
<li><b>Calculadora y buscador:</b> guardamos el nombre del producto o el término que escribes, sin asociarlo a tu identidad, para armar el ranking “Lo más buscado”. Los montos que calculas no salen de tu navegador.</li>
<li><b>Formulario de anunciantes:</b> nombre, empresa, correo, teléfono y mensaje, solo para responder tu solicitud de publicidad.</li>
<li><b>Estadísticas:</b> contamos visitas por sección y día, sin cookies de seguimiento. Tu dirección IP solo se usa de forma temporal para evitar abusos (por ejemplo, envíos masivos del formulario) y se borra en pocas horas.</li>
</ul>
<h2>Noticias y videos</h2>
<p>Las noticias pertenecen a sus medios de origen. Mostramos el titular, un extracto o un resumen propio y el enlace a la fuente original. Los videos se reproducen desde YouTube, que puede aplicar sus propias políticas de privacidad.</p>
<h2>Publicidad</h2>
<p>Los anuncios son de empresas que contratan un espacio. Al hacer clic, sales de ${sitio} hacia el sitio del anunciante.</p>
<h2>Tus derechos</h2>
<p>Puedes pedir el acceso, la corrección o la eliminación de tus datos escribiendo a ${contacto}.</p>
</article>`;
  return html(pagina(ctx, { titulo: 'Política de privacidad', ruta: '/privacidad', cuerpo }));
}

export function noEncontrado(ctx) {
  const cuerpo = `<section class="no-encontrado"><h1>Página no encontrada</h1><p>La página que buscas no existe o la noticia ya fue retirada.</p>
  <a class="btn btn-naranja" href="/">Ir al inicio</a> <a class="btn btn-claro" href="/noticias">Ver noticias</a></section>`;
  return html(pagina(ctx, { titulo: 'No encontrado', ruta: '/404', cuerpo, noindex: true }), 404, { 'cache-control': 'no-store' });
}

export async function sitemap(ctx) {
  const { results } = await ctx.env.DB.prepare('SELECT id, titulo, publicado FROM noticias WHERE oculta = 0 ORDER BY publicado DESC LIMIT 1000').all();
  const fijas = ['/', '/noticias', '/videos', '/calculadora', '/herramientas', '/herramientas/carga', '/herramientas/cotizador', '/herramientas/partidas', '/herramientas/guias', '/directorio', '/tendencias', '/anunciate'];
  const urls = fijas
    .map((u) => `<url><loc>${esc(ctx.base + u)}</loc><changefreq>hourly</changefreq></url>`)
    .concat(results.map((n) => `<url><loc>${esc(ctx.base + `/n/${n.id}/${slug(n.titulo) || 'noticia'}`)}</loc><lastmod>${esc(n.publicado)}</lastmod></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=1800' },
  });
}

export function robots(ctx) {
  return new Response(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /ad/\n\nSitemap: ${ctx.base}/sitemap.xml\n`, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=86400' },
  });
}

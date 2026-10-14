// Herramientas para agencias de aduana, agentes de carga e importadores:
// calculadoras de carga, cotizador, buscador de partidas, guías y directorio de empresas.
import { html } from '../lib/http.js';
import { esc, recortar } from '../lib/texto.js';
import { espacio } from '../lib/anuncios.js';
import { TIPOS_EMPRESA } from '../lib/aduana.js';
import { INCOTERMS, CONTENEDORES, ENLACES, DOCUMENTOS, GLOSARIO, CONCEPTOS_COTIZADOR } from '../lib/datos-aduana.js';
import { pagina } from './plantilla.js';

const jsonSeguro = (v) => JSON.stringify(v).replace(/</g, '\\u003c');

// Estructura común: contenido principal + columna lateral con publicidad y accesos.
function conLateral(ctx, principal) {
  return `<div class="columnas">
  <div class="columna-principal">${principal}</div>
  <aside class="columna-lateral">
    ${espacio('lateral', ctx.anuncios, ctx.cfg)}
    <section class="caja">
      <h2>🧰 Más herramientas</h2>
      <ul class="lista-simple">
        <li><a href="/calculadora">Calculadora de impuestos</a></li>
        <li><a href="/herramientas/carga">Calculadoras de carga</a></li>
        <li><a href="/herramientas/cotizador">Cotizador para clientes</a></li>
        <li><a href="/herramientas/partidas">Buscador de partidas</a></li>
        <li><a href="/herramientas/guias">Guías y enlaces</a></li>
        <li><a href="/directorio">Directorio de empresas</a></li>
      </ul>
    </section>
  </aside>
</div>`;
}

const HERRAMIENTAS = [
  ['/calculadora', '🧮', 'Calculadora de impuestos', 'Ad valorem, IGV, IPM y percepción de una importación, con el dólar del día.'],
  ['/herramientas/carga', '📦', 'Calculadoras de carga', 'CBM, peso volumétrico aéreo, W/M marítimo, contenedores necesarios y conversor de unidades.'],
  ['/herramientas/cotizador', '🧾', 'Cotizador para clientes', 'Arma una cotización con tu nombre, imprímela en PDF o envíala por WhatsApp.'],
  ['/herramientas/partidas', '🔎', 'Buscador de partidas', 'Encuentra la partida arancelaria de un producto y su ad valorem.'],
  ['/herramientas/guias', '📚', 'Guías y enlaces', 'Incoterms 2020, documentos de una importación, glosario y enlaces a SUNAT, VUCE y navieras.'],
  ['/directorio', '🏢', 'Directorio de empresas', 'Importadores, exportadores, agencias de aduana y agentes de carga del Perú.'],
];

export function inicioHerramientas(ctx) {
  const tarjetas = HERRAMIENTAS.map(
    ([href, icono, titulo, texto]) => `<a class="herramienta" href="${href}"><span class="herramienta-icono" aria-hidden="true">${icono}</span><h3>${esc(titulo)}</h3><p>${esc(texto)}</p></a>`
  ).join('');
  const cuerpo = `
<section class="portada portada-anuncio">
  <div class="portada-texto">
    <h1>Herramientas para operaciones y pricing</h1>
    <p>Lo que el equipo de una agencia de aduana o de una empresa importadora usa todos los días, en un solo lugar y gratis.</p>
  </div>
</section>
<div class="rejilla-herramientas">${tarjetas}</div>
${espacio('noticias', ctx.anuncios, ctx.cfg)}`;
  return html(
    pagina(ctx, {
      titulo: 'Herramientas para agencias de aduana e importadores',
      descripcion: 'Calculadoras de carga, cotizador para clientes, buscador de partidas arancelarias, Incoterms y directorio de empresas de comercio exterior del Perú.',
      ruta: '/herramientas',
      seccion: 'herramientas',
      cuerpo,
    })
  );
}

// ── Calculadoras de carga ──
export function herramientaCarga(ctx) {
  const filasContenedor = CONTENEDORES.map(
    (c) => `<tr><td>${esc(c.nombre)}</td><td>${c.largo} × ${c.ancho} × ${c.alto} m</td><td>${c.cbm} m³</td><td>${c.kg.toLocaleString('en-US')} kg</td></tr>`
  ).join('');
  const principal = `
<div id="herramientas-carga">
<h1>📦 Calculadoras de carga</h1>
<p class="bajada">Escribe las medidas de un bulto y obtén al instante el volumen, el peso facturable en avión, el W/M marítimo y los contenedores que necesitas.</p>
<form class="calculadora" id="form-carga" novalidate>
  <label class="campo">Largo del bulto (cm)<input name="largo" type="number" inputmode="decimal" min="0" step="0.1" placeholder="60"></label>
  <label class="campo">Ancho del bulto (cm)<input name="ancho" type="number" inputmode="decimal" min="0" step="0.1" placeholder="40"></label>
  <label class="campo">Alto del bulto (cm)<input name="alto" type="number" inputmode="decimal" min="0" step="0.1" placeholder="40"></label>
  <label class="campo">Número de bultos<input name="bultos" type="number" inputmode="numeric" min="1" step="1" value="1"></label>
  <label class="campo">Peso de cada bulto (kg)<input name="peso" type="number" inputmode="decimal" min="0" step="0.1" placeholder="18"></label>
  <label class="campo">Factor volumétrico aéreo
    <select name="factor"><option value="6000" selected>6000 cm³/kg (estándar IATA)</option><option value="5000">5000 cm³/kg (algunos courier)</option></select>
  </label>
</form>
<section id="salida-carga" aria-live="polite"></section>
<script type="application/json" id="datos-contenedores">${jsonSeguro(CONTENEDORES)}</script>

<section class="caja">
  <h2>🔁 Conversor de unidades</h2>
  <form id="form-conversor" class="conversor" novalidate>
    <label class="campo">Medida
      <select name="tipo"><option value="kg_lb">Peso (kg / lb)</option><option value="cm_in">Longitud (cm / pulgadas)</option><option value="m_ft">Longitud (m / pies)</option><option value="m3_ft3">Volumen (m³ / pies³)</option><option value="l_gal">Líquidos (L / galones)</option></select>
    </label>
    <label class="campo">Sentido<select name="sentido"><option value="a"></option><option value="b"></option></select></label>
    <label class="campo">Valor<input name="valor" type="number" inputmode="decimal" step="any" value="1"></label>
  </form>
  <p id="salida-conversor" class="conversor-salida" aria-live="polite"></p>
</section>

<section class="explicacion">
  <h2>Medidas de los contenedores</h2>
  <div class="resultado"><table><thead><tr><th>Contenedor</th><th>Medidas internas</th><th>Capacidad</th><th>Carga útil</th></tr></thead><tbody>${filasContenedor}</tbody></table></div>
  <p class="aviso">⚠️ Medidas y pesos <b>típicos</b>: cambian según la naviera y el modelo del contenedor. En la práctica no se aprovecha el 100 % del volumen. Confirma con tu agente de carga antes de cotizar.</p>
  <h2>Cómo se cobra la carga</h2>
  <ul>
    <li><b>Aéreo:</b> se cobra el mayor entre el peso real y el volumétrico (largo × ancho × alto en cm ÷ 6000).</li>
    <li><b>Marítimo LCL:</b> se cobra el mayor entre los m³ y las toneladas (1 m³ = 1 tonelada = 1 W/M).</li>
    <li><b>Marítimo FCL:</b> se paga por contenedor, sin importar cuánto lo llenes.</li>
  </ul>
</section>
</div>
<script src="/js/carga.js?v=1" defer></script>`;
  return html(
    pagina(ctx, {
      titulo: 'Calculadora de CBM, peso volumétrico y contenedores',
      descripcion: 'Calcula gratis el CBM, el peso volumétrico aéreo, el W/M marítimo y cuántos contenedores de 20 o 40 pies necesitas. Incluye conversor de unidades.',
      ruta: '/herramientas/carga',
      seccion: 'herramientas',
      cuerpo: conLateral(ctx, principal),
    })
  );
}

// ── Cotizador ──
export function herramientaCotizador(ctx) {
  const datos = { tc: ctx.tc ? ctx.tc.venta : 3.75, igv: 18, conceptos: CONCEPTOS_COTIZADOR };
  const incoterms = INCOTERMS.map((i) => `<option value="${esc(i.sigla)}">${esc(i.sigla)} · ${esc(i.nombre)}</option>`).join('');
  const principal = `
<div class="cotizador-pantalla">
<h1>🧾 Cotizador para clientes</h1>
<p class="bajada">Arma la cotización de tus servicios, imprímela en PDF con el nombre de tu empresa o envíala por WhatsApp. Se guarda en este navegador mientras trabajas.</p>
<form class="calculadora" id="cotizador" novalidate>
  <script type="application/json" id="datos-cotizador">${jsonSeguro(datos)}</script>
  <label class="campo campo-ancho">Tu empresa (sale en la cotización)<input name="agencia" maxlength="80" placeholder="Ej.: Agencia de Aduana Pacífico S.A.C." autocomplete="organization"></label>
  <label class="campo">Cliente<input name="cliente" maxlength="80" placeholder="Nombre o empresa del cliente"></label>
  <label class="campo">Referencia<input name="referencia" maxlength="80" placeholder="Ej.: 20 bultos de repuestos"></label>
  <label class="campo">Origen<input name="origen" maxlength="60" placeholder="Shanghái"></label>
  <label class="campo">Destino<input name="destino" maxlength="60" placeholder="Callao"></label>
  <label class="campo">Incoterm<select name="incoterm"><option value="">—</option>${incoterms}</select></label>
  <label class="campo">Validez (días)<input name="validez" type="number" inputmode="numeric" min="0" step="1"></label>
  <label class="campo">Tipo de cambio (venta)<input name="tc" type="number" inputmode="decimal" min="1" step="0.001"></label>
  <label class="campo">IGV de servicios (%)<input name="igv" type="number" inputmode="decimal" min="0" step="0.1"></label>

  <div class="campo-ancho">
    <h2>Conceptos</h2>
    <div class="presets" id="presets" aria-label="Conceptos frecuentes"></div>
    <div class="tabla-env">
      <table class="tabla-lineas">
        <thead><tr><th>Concepto</th><th>Monto</th><th>Moneda</th><th class="centro">IGV</th><th></th></tr></thead>
        <tbody id="lineas-cuerpo"></tbody>
      </table>
    </div>
    <p><button class="btn btn-claro" type="button" id="agregar-linea">+ Agregar concepto</button></p>
  </div>
  <label class="campo campo-ancho">Notas para el cliente<textarea name="notas" rows="2" maxlength="400" placeholder="Condiciones, días libres, validez de la tarifa…"></textarea></label>
  <div class="campo-ancho botones-fila">
    <button class="btn btn-naranja" type="button" id="imprimir">Imprimir / guardar PDF</button>
    <button class="btn btn-claro" type="button" id="copiar">Copiar texto</button>
    <a class="btn btn-wsp" href="#" id="wsp">Enviar por WhatsApp</a>
    <button class="btn btn-claro" type="button" id="limpiar">Empezar de nuevo</button>
  </div>
</form>
<p class="aviso">⚠️ El IGV de cada concepto depende de su tratamiento tributario (por ejemplo, el flete internacional normalmente no lleva IGV). Marca o desmarca la casilla según corresponda. Esta herramienta es una ayuda de cálculo, no una asesoría tributaria.</p>
</div>
<h2 class="solo-pantalla">Vista previa de la cotización</h2>
<section id="hoja-cotizacion" class="hoja-cotizacion" aria-live="polite"></section>
<script src="/js/cotizador.js?v=1" defer></script>`;
  return html(
    pagina(ctx, {
      titulo: 'Cotizador de servicios de aduana y carga para clientes',
      descripcion: 'Arma una cotización de flete, gastos locales y agenciamiento, imprímela en PDF o envíala por WhatsApp. Gratis para agencias de aduana y agentes de carga.',
      ruta: '/herramientas/cotizador',
      seccion: 'herramientas',
      cuerpo: conLateral(ctx, principal),
    })
  );
}

// ── Buscador de partidas ──
export function herramientaPartidas(ctx) {
  const principal = `
<h1>🔎 Buscador de partidas arancelarias</h1>
<p class="bajada">Escribe el producto (“audífonos”, “zapatillas”, “repuestos”) o los primeros dígitos de la partida y mira su ad valorem. Luego pásalo a la calculadora con un clic.</p>
<form class="buscador" role="search">
  <input type="search" id="q-partida" maxlength="60" placeholder="Producto o partida: audífonos, 8518…" aria-label="Buscar partida arancelaria" autocomplete="off">
</form>
<section id="resultados-partidas" aria-live="polite"><p class="ayuda">Cargando…</p></section>
<p class="aviso">⚠️ La clasificación arancelaria depende de las características exactas del producto. Este buscador orienta, pero la partida definitiva la determina tu agente de aduana según la SUNAT. Puede haber partidas con sobretasas o restricciones que no se muestran aquí.</p>
<script src="/js/partidas.js?v=1" defer></script>`;
  return html(
    pagina(ctx, {
      titulo: 'Buscador de partidas arancelarias del Perú',
      descripcion: 'Busca la partida arancelaria de un producto y consulta su ad valorem. Herramienta gratuita para importadores y agencias de aduana del Perú.',
      ruta: '/herramientas/partidas',
      seccion: 'herramientas',
      cuerpo: conLateral(ctx, principal),
    })
  );
}

// ── Guías y enlaces ──
export function herramientaGuias(ctx) {
  const incoterms = INCOTERMS.map(
    (i) => `<tr><td><b>${esc(i.sigla)}</b></td><td>${esc(i.nombre)}</td><td>${i.mar ? '🚢 Solo marítimo' : '🌐 Cualquier transporte'}</td><td>${esc(i.resumen)}</td></tr>`
  ).join('');
  const enlaces = ENLACES.map(
    (g) => `<h3>${esc(g.grupo)}</h3><ul class="lista-enlaces">${g.items
      .map((e) => `<li><a href="${esc(e.url)}" target="_blank" rel="noopener nofollow">${esc(e.nombre)} ↗</a>${e.nota ? `<small> — ${esc(e.nota)}</small>` : ''}</li>`)
      .join('')}</ul>`
  ).join('');
  const documentos = DOCUMENTOS.map(([t, d]) => `<li><b>${esc(t)}.</b> ${esc(d)}</li>`).join('');
  const glosario = GLOSARIO.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('');
  const principal = `
<h1>📚 Guías y enlaces de comercio exterior</h1>
<p class="bajada">Lo que se consulta todos los días: Incoterms, documentos, siglas y enlaces directos a SUNAT, VUCE, terminales y navieras.</p>
<nav class="pestanas pestanas-scroll"><a href="#incoterms">Incoterms</a><a href="#documentos">Documentos</a><a href="#glosario">Glosario</a><a href="#enlaces">Enlaces</a></nav>

<section id="incoterms">
  <h2>Incoterms® 2020</h2>
  <div class="resultado"><table class="tabla-guia"><thead><tr><th>Sigla</th><th>Nombre</th><th>Transporte</th><th>Qué significa</th></tr></thead><tbody>${incoterms}</tbody></table></div>
  <p class="nota-meta">Resumen orientativo. Las obligaciones exactas están en el texto oficial de la Cámara de Comercio Internacional (ICC).</p>
</section>

<section id="documentos">
  <h2>Documentos habituales de una importación</h2>
  <ul class="explicacion">${documentos}</ul>
  <p class="nota-meta">Orientativo: según el producto y el régimen pueden pedirse otros documentos o permisos.</p>
</section>

<section id="glosario">
  <h2>Glosario de siglas</h2>
  <dl class="glosario">${glosario}</dl>
</section>

<section id="enlaces">
  <h2>Enlaces útiles</h2>
  ${enlaces}
  <p class="nota-meta">Son páginas externas. Si alguna dejó de funcionar, avísanos desde <a href="/anunciate#contacto">el formulario de contacto</a>.</p>
</section>`;
  return html(
    pagina(ctx, {
      titulo: 'Incoterms 2020, glosario y enlaces de comercio exterior',
      descripcion: 'Tabla de Incoterms 2020, documentos de una importación, glosario de siglas (DAM, BL, FCL, LCL, THC) y enlaces a SUNAT, VUCE, terminales y navieras.',
      ruta: '/herramientas/guias',
      seccion: 'herramientas',
      cuerpo: conLateral(ctx, principal),
    })
  );
}

// ── Directorio de empresas ──
const POR_PAGINA_DIR = 20;

export async function directorio(ctx) {
  const db = ctx.env.DB;
  const url = new URL(ctx.request.url);
  const tipo = TIPOS_EMPRESA[url.searchParams.get('tipo')] ? url.searchParams.get('tipo') : null;
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  const p = Math.min(Math.max(parseInt(url.searchParams.get('p') || '1', 10) || 1, 1), 50);

  const donde = ["estado = 'aprobada'"];
  const vals = [];
  if (tipo) { donde.push('tipo = ?'); vals.push(tipo); }
  if (q) {
    donde.push('(razon_social LIKE ? OR rubro LIKE ? OR productos LIKE ? OR ciudad LIKE ?)');
    const like = `%${q.replace(/[%_]/g, '')}%`;
    vals.push(like, like, like, like);
  }
  const { results } = await db
    .prepare(`SELECT id, ruc, razon_social, tipo, rubro, productos, ciudad, web, telefono, descripcion FROM empresas WHERE ${donde.join(' AND ')} ORDER BY razon_social COLLATE NOCASE LIMIT ? OFFSET ?`)
    .bind(...vals, POR_PAGINA_DIR + 1, (p - 1) * POR_PAGINA_DIR)
    .all();
  const hayMas = results.length > POR_PAGINA_DIR;

  const params = (extra) => {
    const s = new URLSearchParams();
    if (tipo) s.set('tipo', tipo);
    if (q) s.set('q', q);
    for (const [k, v] of Object.entries(extra)) s.set(k, v);
    const t = s.toString();
    return t ? `?${t}` : '';
  };
  const pestana = (codigo, texto) => `<a href="/directorio${codigo ? `?tipo=${codigo}` : ''}"${tipo === codigo ? ' aria-current="page"' : ''}>${esc(texto)}</a>`;

  const tarjetas = results.slice(0, POR_PAGINA_DIR).map((e) => {
    const wsp = e.telefono && e.telefono.replace(/\D/g, '').length >= 9
      ? `<a class="btn btn-wsp" href="https://wa.me/${esc(e.telefono.replace(/\D/g, ''))}" target="_blank" rel="noopener nofollow">WhatsApp</a>` : '';
    const web = e.web ? `<a class="btn btn-claro" href="${esc(e.web)}" target="_blank" rel="noopener nofollow ugc">Sitio web ↗</a>` : '';
    return `<article class="empresa">
  <div class="nota-meta"><span class="etiqueta">${esc(TIPOS_EMPRESA[e.tipo] || e.tipo)}</span>${e.ciudad ? `<span>📍 ${esc(e.ciudad)}</span>` : ''}<span>RUC ${esc(e.ruc)}</span></div>
  <h3>${esc(e.razon_social)}</h3>
  ${e.rubro ? `<p><b>Rubro:</b> ${esc(e.rubro)}</p>` : ''}
  ${e.productos ? `<p><b>Productos / servicios:</b> ${esc(e.productos)}</p>` : ''}
  ${e.descripcion ? `<p class="suave">${esc(recortar(e.descripcion, 300))}</p>` : ''}
  ${wsp || web ? `<p class="botones-fila">${wsp}${web}</p>` : ''}
</article>`;
  }).join('');

  const tiposOpciones = Object.entries(TIPOS_EMPRESA).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('');
  const principal = `
<h1>🏢 Directorio de empresas de comercio exterior</h1>
<p class="bajada">Importadores, exportadores, agencias de aduana y agentes de carga del Perú. ¿Tu empresa no está? <a href="#registrar">Regístrala gratis</a>.</p>
<form class="buscador" action="/directorio" method="get" role="search">
  ${tipo ? `<input type="hidden" name="tipo" value="${esc(tipo)}">` : ''}
  <input type="search" name="q" value="${esc(q)}" placeholder="Buscar empresa, rubro, producto o ciudad…" aria-label="Buscar en el directorio" maxlength="60">
  <button class="btn btn-naranja" type="submit">Buscar</button>
</form>
<nav class="pestanas pestanas-scroll">${pestana(null, 'Todas')}${Object.entries(TIPOS_EMPRESA).map(([k, v]) => pestana(k, v)).join('')}</nav>
<div class="lista-empresas">${tarjetas || '<p class="vacio">Todavía no hay empresas publicadas aquí. ¡Sé la primera en registrarte!</p>'}</div>
<nav class="paginacion">
  ${p > 1 ? `<a class="btn btn-claro" href="/directorio${params(p - 1 > 1 ? { p: p - 1 } : {})}">← Anteriores</a>` : '<span></span>'}
  ${hayMas ? `<a class="btn btn-claro" href="/directorio${params({ p: p + 1 })}">Siguientes →</a>` : ''}
</nav>

<section class="caja contacto" id="registrar">
  <h2>Registra tu empresa</h2>
  <p>Es gratis. Revisamos cada solicitud antes de publicarla. Solo se aceptan empresas con RUC que empieza con 20.</p>
  <form id="form-directorio" class="formulario">
    <label>Razón social o nombre comercial<input name="razon_social" required maxlength="120" autocomplete="organization"></label>
    <label>RUC (11 dígitos)<input name="ruc" required inputmode="numeric" maxlength="11" pattern="20[0-9]{9}" autocomplete="off"></label>
    <label>¿A qué se dedica?<select name="tipo" required><option value="">Elige…</option>${tiposOpciones}</select></label>
    <label>Rubro<input name="rubro" maxlength="80" placeholder="Ej.: repuestos automotrices"></label>
    <label class="campo-ancho">Productos o servicios principales<input name="productos" maxlength="200" placeholder="Ej.: importación de autopartes desde China"></label>
    <label>Ciudad<input name="ciudad" maxlength="60" placeholder="Lima"></label>
    <label>Página web<input name="web" maxlength="200" placeholder="www.tuempresa.pe"></label>
    <label>WhatsApp o teléfono (se publica)<input name="telefono" maxlength="30" inputmode="tel" autocomplete="tel"></label>
    <label>Correo (no se publica)<input name="email" type="email" required maxlength="120" autocomplete="email"></label>
    <label class="campo-ancho">Descripción breve<textarea name="descripcion" rows="3" maxlength="400"></textarea></label>
    <label class="trampa" aria-hidden="true">No llenar<input name="sitio_extra" tabindex="-1" autocomplete="off"></label>
    <label class="campo-ancho casilla"><input type="checkbox" name="autorizo" required><span>Autorizo publicar en ImportaYa el nombre, RUC, rubro, ciudad, web y teléfono de mi empresa. Entiendo que el correo no se publica. Puedo pedir que la retiren cuando quiera (<a href="/privacidad">privacidad</a>).</span></label>
    <button class="btn btn-naranja btn-grande" type="submit">Enviar solicitud</button>
    <p class="mensaje-form" role="status"></p>
  </form>
</section>`;
  return html(
    pagina(ctx, {
      titulo: 'Directorio de empresas importadoras y exportadoras del Perú',
      descripcion: 'Directorio gratuito de importadores, exportadores, agencias de aduana y agentes de carga del Perú. Busca por rubro, producto o ciudad.',
      ruta: '/directorio' + params(p > 1 ? { p } : {}),
      seccion: 'herramientas',
      cuerpo: conLateral(ctx, principal),
      noindex: Boolean(q),
    })
  );
}

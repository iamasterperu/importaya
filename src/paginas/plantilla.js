// Estructura común de todas las páginas públicas: cabecera, menú, publicidad y pie.
import { esc, slug, recortar, haceCuanto, PAISES } from '../lib/texto.js';
import { espacio } from '../lib/anuncios.js';

const MENU = [
  ['/', 'Inicio', 'inicio'],
  ['/noticias', 'Noticias', 'noticias'],
  ['/videos', 'Videos', 'videos'],
  ['/calculadora', 'Calculadora', 'calculadora'],
  ['/herramientas', 'Herramientas', 'herramientas'],
  ['/tendencias', 'Lo más buscado', 'tendencias'],
  ['/anunciate', 'Anúnciate', 'anunciate'],
];

export const LOGO = `<svg viewBox="0 0 40 40" aria-hidden="true" class="logo-icono"><rect x="2" y="10" width="36" height="22" rx="4" fill="var(--naranja)"/><path d="M9 14v14M15 14v14M21 14v14M27 14v14M33 14v14" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".85"/><path d="M14 6h12l-3 4h-6z" fill="var(--naranja)"/></svg>`;

export function pagina(ctx, { titulo, descripcion, ruta, seccion, cuerpo, imagen, extraHead = '', noindex = false }) {
  const { env, base, cfg, anuncios, tc } = ctx;
  const sitio = env.SITE_NAME || 'ImportaYa';
  const tituloCompleto = titulo ? `${titulo} | ${sitio}` : `${sitio} · Noticias de importación, tipo de cambio y calculadora de impuestos`;
  const desc =
    descripcion ||
    'Noticias diarias de importación y comercio exterior de Perú, China y el mundo, tipo de cambio SUNAT y calculadora gratis de impuestos de importación.';
  const url = base + (ruta || '/');
  const og = imagen || `${base}/assets/og-importaya.png`;
  const menu = MENU.map(
    ([href, texto, id]) => `<a href="${href}"${id === seccion ? ' aria-current="page"' : ''}>${texto}</a>`
  ).join('');
  const barraTc = tc
    ? `<a class="barra-tc" href="/calculadora" title="Tipo de cambio ${esc(tc.fuente)} del ${esc(tc.fecha)}">
        💵 Dólar hoy: <b>Compra S/ ${tc.compra.toFixed(3)}</b> · <b>Venta S/ ${tc.venta.toFixed(3)}</b></a>`
    : '';
  const whatsapp = cfg.whatsapp
    ? `<a class="btn btn-wsp" href="https://wa.me/${esc(cfg.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>`
    : '';

  return `<!doctype html>
<html lang="es-PE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloCompleto)}</title>
<meta name="description" content="${esc(recortar(desc, 160))}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(sitio)}">
<meta property="og:title" content="${esc(titulo || tituloCompleto)}">
<meta property="og:description" content="${esc(recortar(desc, 200))}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0b2545">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/css/estilos.css?v=1">
${extraHead}
</head>
<body>
${SIMBOLO_MUNDO}
<div class="barra-superior"><div class="contenedor">${barraTc}<span class="barra-fecha">Noticias de comercio exterior actualizadas cada hora</span></div></div>
<header class="cabecera">
  <div class="contenedor cabecera-fila">
    <a class="logo" href="/">${LOGO}<span>Importa<b>Ya</b></span></a>
    <button class="menu-boton" type="button" aria-label="Abrir menú" aria-expanded="false" data-menu>☰</button>
    <nav class="menu" id="menu">${menu}</nav>
  </div>
</header>
<div class="contenedor">${espacio('cabecera', anuncios, cfg)}</div>
<main class="contenedor">
${cuerpo}
</main>
<div class="contenedor">${espacio('pie', anuncios, cfg)}</div>
<footer class="pie">
  <div class="contenedor pie-columnas">
    <div>
      <a class="logo logo-pie" href="/">${LOGO}<span>Importa<b>Ya</b></span></a>
      <p>Noticias de importación y exportación de Perú, China y el mundo, tipo de cambio y herramientas gratis para importadores.</p>
    </div>
    <div>
      <h3>Secciones</h3>
      ${MENU.map(([href, texto]) => `<a href="${href}">${texto}</a>`).join('')}
      <a href="/directorio">Directorio de empresas</a>
    </div>
    <div>
      <h3>Empresas</h3>
      <p>Llega a miles de importadores peruanos cada mes.</p>
      <a class="btn btn-naranja" href="/anunciate">Anúnciate aquí</a> ${whatsapp}
    </div>
  </div>
  <div class="contenedor pie-legal">
    <span>© ${new Date().getUTCFullYear()} ${esc(sitio)}. Las noticias pertenecen a sus medios de origen; mostramos titulares, extractos y resúmenes con enlace a la fuente.</span>
    <a href="/privacidad">Privacidad</a>
  </div>
</footer>
<script src="/js/app.js?v=1" defer></script>
</body>
</html>`;
}


// Dibujo del globo, definido una sola vez por página y reutilizado en cada miniatura.
const SIMBOLO_MUNDO = `<svg class="simbolos" width="0" height="0" aria-hidden="true" focusable="false"><defs>
<radialGradient id="mundo-mar" cx="38%" cy="32%" r="75%"><stop offset="0" stop-color="#4cc3ff"/><stop offset=".55" stop-color="#1f7fe0"/><stop offset="1" stop-color="#0d3f9c"/></radialGradient>
<linearGradient id="mundo-tierra" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ee08a"/><stop offset="1" stop-color="#2fae5d"/></linearGradient>
<symbol id="ico-mundo" viewBox="0 0 120 120">
  <ellipse cx="60" cy="112" rx="34" ry="5" fill="#000" opacity=".28"/>
  <circle cx="60" cy="58" r="50" fill="url(#mundo-mar)"/>
  <g fill="url(#mundo-tierra)"><path d="M26 34c8-9 22-12 30-8 5 3 2 9-3 11-5 2-4 7-9 10-6 4-8 12-14 11-7-1-10-9-9-16 1-4 2-6 5-8z"/><path d="M44 66c7-3 15 0 18 6 3 7-1 13-4 20-3 6-8 7-11 2-4-7-8-11-6-19 1-4 1-8 3-9z"/><path d="M68 30c8-5 20-5 28 2 6 5 5 12-1 15-5 2-6 8-13 7-6-1-6-8-12-10-5-2-8-10-2-14z"/><path d="M74 62c6-2 14 0 17 6 3 6-1 13-7 14-7 1-13-4-12-10 0-4 0-8 2-10z"/></g>
  <g fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1.2"><ellipse cx="60" cy="58" rx="22" ry="50"/><ellipse cx="60" cy="58" rx="42" ry="50"/><path d="M10 58h100M16 36h88M16 80h88"/></g>
  <path d="M22 40c4-14 17-25 33-27" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4" stroke-linecap="round"/>
  <circle cx="60" cy="58" r="50" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="1.5"/>
</symbol></defs></svg>`;

export function miniaturaMundo() {
  return `<div class="nota-mundo" aria-hidden="true"><svg class="nota-mundo-globo" viewBox="0 0 120 120"><use href="#ico-mundo"/></svg><div class="nota-mundo-texto"><b>Noticias Mundiales</b><small>Comercio exterior</small></div></div>`;
}

export function urlNoticia(n) {
  return `/n/${n.id}/${slug(n.titulo) || 'noticia'}`;
}

export function tarjetaNoticia(n, { grande = false } = {}) {
  const p = PAISES[n.pais] || PAISES.MUNDO;
  const texto = n.resumen || n.descripcion || '';
  const img = n.imagen
    ? `<img src="${esc(n.imagen)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : n.pais === 'PE'
      ? `<div class="nota-sin-imagen" aria-hidden="true">${p.bandera}</div>`
      : miniaturaMundo();
  return `<article class="nota${grande ? ' nota-grande' : ''}">
  <a class="nota-imagen" href="${urlNoticia(n)}" tabindex="-1">${img}</a>
  <div class="nota-cuerpo">
    <div class="nota-meta"><span class="etiqueta etiqueta-${esc(n.pais)}">${p.bandera} ${p.nombre}</span><span>${esc(n.fuente_nombre || '')}</span><time datetime="${esc(n.publicado)}">${haceCuanto(n.publicado)}</time></div>
    <h3><a href="${urlNoticia(n)}">${esc(n.titulo)}</a></h3>
    ${texto ? `<p>${esc(recortar(texto, grande ? 260 : 150))}</p>` : ''}
  </div>
</article>`;
}

export function listaNoticias(noticias, ctx, { anuncioCada = 6 } = {}) {
  if (!noticias.length) {
    return `<p class="vacio">Todavía no hay noticias aquí. Las tareas automáticas las traen cada 30 minutos.</p>`;
  }
  let html = '';
  noticias.forEach((n, i) => {
    html += tarjetaNoticia(n);
    if (anuncioCada && i + 1 === anuncioCada && noticias.length > anuncioCada) {
      html += espacio('noticias', ctx.anuncios, ctx.cfg);
    }
  });
  return `<div class="lista-notas">${html}</div>`;
}

export function tarjetaVideo(v) {
  return `<article class="video">
  <a class="video-mini" href="https://www.youtube.com/watch?v=${esc(v.video_id)}" target="_blank" rel="noopener" data-video="${esc(v.video_id)}">
    <img src="https://i.ytimg.com/vi/${esc(v.video_id)}/mqdefault.jpg" alt="" loading="lazy"><span class="play" aria-hidden="true">▶</span>
  </a>
  <h3>${esc(recortar(v.titulo, 90))}</h3>
  <p class="nota-meta"><span>${esc(v.canal_nombre)}</span><time datetime="${esc(v.publicado)}">${haceCuanto(v.publicado)}</time></p>
</article>`;
}

export function videoGrande(v) {
  if (!v) return `<div class="video-principal video-vacio"><p>El video del día aparecerá aquí en cuanto se revisen los canales de YouTube.</p></div>`;
  return `<div class="video-principal">
  <div class="video-marco"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.video_id)}" title="${esc(v.titulo)}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>
  <h3>${esc(v.titulo)}</h3>
  <p class="nota-meta"><span>${esc(v.canal_nombre)}</span><time datetime="${esc(v.publicado)}">${haceCuanto(v.publicado)}</time></p>
</div>`;
}

export function grafico(puntos) {
  if (!puntos || puntos.length < 2) return '';
  const vals = puntos.map((p) => p.venta);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rango = max - min || 0.01;
  const w = 160;
  const h = 40;
  const coords = vals
    .map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - min) / rango) * (h - 8)).toFixed(1)}`)
    .join(' ');
  return `<svg class="grafico" viewBox="0 0 ${w} ${h}" role="img" aria-label="Variación del dólar en los últimos ${vals.length} días: de ${vals[0].toFixed(3)} a ${vals[vals.length - 1].toFixed(3)}"><polyline points="${coords}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

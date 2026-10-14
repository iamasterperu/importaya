// Estructura común de todas las páginas públicas: cabecera, menú, publicidad y pie.
import { esc, slug, recortar, haceCuanto, PAISES } from '../lib/texto.js';
import { espacio } from '../lib/anuncios.js';

const MENU = [
  ['/', 'Inicio', 'inicio'],
  ['/noticias', 'Noticias', 'noticias'],
  ['/videos', 'Videos', 'videos'],
  ['/calculadora', 'Calculadora', 'calculadora'],
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

export function urlNoticia(n) {
  return `/n/${n.id}/${slug(n.titulo) || 'noticia'}`;
}

export function tarjetaNoticia(n, { grande = false } = {}) {
  const p = PAISES[n.pais] || PAISES.MUNDO;
  const texto = n.resumen || n.descripcion || '';
  const img = n.imagen
    ? `<img src="${esc(n.imagen)}" alt="" loading="lazy" referrerpolicy="no-referrer">`
    : `<div class="nota-sin-imagen" aria-hidden="true">${p.bandera}</div>`;
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

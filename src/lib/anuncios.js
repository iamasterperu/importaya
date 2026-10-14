// Espacios publicitarios: definición, elección del anuncio y conteo de impresiones.
import { esc } from './texto.js';
import { fechaLima } from './http.js';

export const ESPACIOS = {
  cabecera: {
    nombre: 'Banner superior',
    medida: '1200 × 150 px',
    detalle: 'Arriba de todas las páginas. Es lo primero que ve cada visitante.',
  },
  lateral: {
    nombre: 'Recuadro lateral',
    medida: '600 × 500 px',
    detalle: 'Al costado de las noticias en computadora y entre secciones en el celular.',
  },
  noticias: {
    nombre: 'Entre noticias',
    medida: '1200 × 300 px',
    detalle: 'Dentro de la lista de noticias, después de las primeras notas.',
  },
  calculadora: {
    nombre: 'Patrocinio de la calculadora',
    medida: 'Logo 400 × 200 px',
    detalle: '“Calculadora patrocinada por…”. Ideal para agentes de carga y agencias de aduana.',
  },
  videos: {
    nombre: 'Banner de videos',
    medida: '1200 × 150 px',
    detalle: 'Debajo del video de noticias del día.',
  },
  pie: {
    nombre: 'Banner inferior',
    medida: '1200 × 150 px',
    detalle: 'Al final de todas las páginas.',
  },
};

// Carga los anuncios vigentes hoy, agrupados por espacio.
export async function cargarAnuncios(db) {
  const hoy = fechaLima();
  const { results } = await db
    .prepare(
      `SELECT id, espacio, empresa, imagen_url, enlace, texto FROM anuncios
        WHERE activo = 1 AND (inicio IS NULL OR inicio = '' OR inicio <= ?1) AND (fin IS NULL OR fin = '' OR fin >= ?1)`
    )
    .bind(hoy)
    .all();
  const porEspacio = {};
  for (const a of results) (porEspacio[a.espacio] ||= []).push(a);
  return { porEspacio, mostrados: [] };
}

// HTML de un espacio. Si no hay anuncio, muestra "Tu marca aquí" (si está activado).
export function espacio(nombre, anuncios, cfg) {
  const lista = anuncios?.porEspacio?.[nombre] || [];
  if (lista.length) {
    const a = lista[Math.floor(Math.random() * lista.length)];
    anuncios.mostrados.push(a.id);
    const img = `<img src="${esc(a.imagen_url)}" alt="${esc(a.texto || 'Publicidad de ' + a.empresa)}" loading="lazy">`;
    if (nombre === 'calculadora') {
      return `<a class="patrocinio" href="/ad/${a.id}" target="_blank" rel="sponsored noopener">
        <span>Calculadora patrocinada por</span>${img}</a>`;
    }
    return `<div class="ad ad-${nombre}"><a href="/ad/${a.id}" target="_blank" rel="sponsored noopener">${img}</a><span class="ad-etiqueta">Publicidad</span></div>`;
  }
  if (cfg?.mostrar_espacios_libres !== '1') return '';
  if (nombre === 'calculadora') {
    return `<a class="patrocinio patrocinio-libre" href="/anunciate?espacio=calculadora">
      <span>¿Tu empresa aquí?</span><strong>Patrocina la calculadora</strong></a>`;
  }
  return bannerLibre(nombre);
}

// Textos de gancho para cada espacio que aún no tiene anunciante.
const GANCHOS = {
  cabecera: { titulo: 'Tu empresa frente a quienes importan y exportan', texto: 'Agencias de aduana, agentes de carga, couriers y negocios internacionales leen ImportaYa todos los días.', boton: 'Anunciar aquí' },
  pie: { titulo: '¿Ofreces servicios de comercio exterior? Que te encuentren primero', texto: 'Tu marca al final de cada página, justo cuando el cliente busca a quién contratar.', boton: 'Quiero mi banner' },
  videos: { titulo: 'Aparece junto a las noticias en video del día', texto: 'Un banner a la vista de quienes siguen el comercio exterior y la economía.', boton: 'Anunciar aquí' },
  noticias: { titulo: 'Anuncia entre las noticias que tus clientes ya leen', texto: 'Importadores, exportadores y agencias de aduana ven tu marca mientras se informan.', boton: 'Ver cómo anunciarme' },
  lateral: {
    titulo: 'Tu marca aquí, frente a tu cliente ideal',
    texto: 'El mejor lugar para llegar a quienes mueven carga y negocios desde y hacia el Perú.',
    puntos: ['Importadores y exportadores peruanos', 'Visible en noticias y herramientas', 'Tu enlace o WhatsApp directo'],
    boton: 'Quiero anunciar aquí',
  },
};

const ICONO_ANUNCIO = '<svg class="ad-icono" viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#f2711c"/><path d="M13 20v8l5 1 14 7V12L18 19l-5 1z" fill="#fff"/><path d="M19 30l2 8h4l-2-7" fill="#ffe2cc"/><path d="M36 19c2 1.5 2 8.5 0 10" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';

function bannerLibre(nombre) {
  const g = GANCHOS[nombre] || GANCHOS.noticias;
  const puntos = g.puntos ? `<ul class="ad-puntos">${g.puntos.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : '';
  return `<a class="ad ad-${nombre} ad-libre" href="/anunciate?espacio=${nombre}">
    ${ICONO_ANUNCIO}
    <span class="ad-cuerpo"><em class="ad-kicker">Espacio publicitario</em><strong>${esc(g.titulo)}</strong><span class="ad-texto">${esc(g.texto)}</span>${puntos}</span>
    <span class="ad-boton">${esc(g.boton)} <b aria-hidden="true">→</b></span></a>`;
}

// Suma las impresiones de los anuncios mostrados (se ejecuta después de responder).
export function registrarImpresiones(db, anuncios) {
  const ids = [...new Set(anuncios?.mostrados || [])];
  if (!ids.length) return null;
  const hoy = fechaLima();
  return db.batch(
    ids.map((id) =>
      db
        .prepare(
          `INSERT INTO anuncio_stats (anuncio_id, fecha, impresiones) VALUES (?, ?, 1)
           ON CONFLICT(anuncio_id, fecha) DO UPDATE SET impresiones = impresiones + 1`
        )
        .bind(id, hoy)
    )
  );
}

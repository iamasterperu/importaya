// Datos iniciales: fuentes de noticias, canales de YouTube y ajustes.
// Solo se cargan la primera vez. Después todo se cambia desde /admin.

const gn = (q) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:7d')}&hl=es-419&gl=PE&ceid=PE:es-419`;
const bing = (q) => `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setlang=es`;

export const FUENTES = [
  // Perú
  { nombre: 'Google Noticias · Importaciones Perú', url: gn('importaciones Perú'), pais: 'PE' },
  { nombre: 'Google Noticias · SUNAT Aduanas', url: gn('SUNAT aduanas'), pais: 'PE' },
  { nombre: 'Google Noticias · Exportaciones Perú', url: gn('exportaciones Perú'), pais: 'PE' },
  { nombre: 'Google Noticias · Puerto de Chancay', url: gn('puerto de Chancay'), pais: 'PE' },
  { nombre: 'Google Noticias · Callao contenedores', url: gn('Callao puerto contenedores'), pais: 'PE' },
  { nombre: 'Google Noticias · Comercio exterior Perú', url: gn('comercio exterior Perú'), pais: 'PE' },
  { nombre: 'Google Noticias · Mincetur', url: gn('Mincetur comercio'), pais: 'PE' },
  { nombre: 'Bing Noticias · Importaciones Perú', url: bing('importaciones Perú'), pais: 'PE' },
  { nombre: 'Gestión · Economía', url: 'https://gestion.pe/arcio/rss/category/economia/', pais: 'PE', filtrar: 1 },
  { nombre: 'El Comercio · Economía', url: 'https://elcomercio.pe/arcio/rss/category/economia/', pais: 'PE', filtrar: 1 },
  // China
  { nombre: 'Google Noticias · China exportaciones', url: gn('China exportaciones'), pais: 'CN' },
  { nombre: 'Google Noticias · China aranceles', url: gn('China aranceles comercio'), pais: 'CN' },
  { nombre: 'Google Noticias · China Perú comercio', url: gn('China Perú comercio'), pais: 'CN' },
  { nombre: 'Bing Noticias · China comercio exterior', url: bing('China comercio exterior'), pais: 'CN' },
  { nombre: 'China Daily · Business', url: 'https://www.chinadaily.com.cn/rss/bizchina_rss.xml', pais: 'CN', idioma: 'en', filtrar: 1 },
  // EE. UU. y el mundo
  { nombre: 'Google Noticias · Aranceles EE. UU.', url: gn('aranceles Estados Unidos importaciones'), pais: 'US' },
  { nombre: 'Google Noticias · Fletes marítimos', url: gn('fletes marítimos contenedores'), pais: 'MUNDO' },
  { nombre: 'Google Noticias · Comercio internacional', url: gn('comercio internacional OMC'), pais: 'MUNDO' },
  { nombre: 'PortalPortuario', url: 'https://portalportuario.cl/feed/', pais: 'MUNDO', filtrar: 1 },
  { nombre: 'gCaptain', url: 'https://gcaptain.com/feed/', pais: 'MUNDO', idioma: 'en' },
  { nombre: 'Splash247', url: 'https://splash247.com/feed/', pais: 'MUNDO', idioma: 'en' },
];

// Canales de YouTube: se escribe el @usuario y la web busca sola su ID.
export const CANALES = [
  { nombre: 'RPP Noticias', entrada: '@rppnoticias', categoria: 'PE', principal: 1 },
  { nombre: 'Latina Noticias', entrada: '@latinanoticias', categoria: 'PE' },
  { nombre: 'TV Perú Noticias', entrada: '@tvperunoticias', categoria: 'PE' },
  { nombre: 'Gestión TV', entrada: '@diariogestionTV', categoria: 'PE' },
  { nombre: 'DW Español', entrada: '@dwespanol', categoria: 'MUNDO' },
  { nombre: 'BBC News Mundo', entrada: '@BBCMundo', categoria: 'MUNDO' },
  { nombre: 'CNN en Español', entrada: '@cnnee', categoria: 'MUNDO' },
];
export const CONFIG = {
  whatsapp: '',
  email: '',
  mostrar_espacios_libres: '1',
  // Palabras que se SUMAN a las que ya trae el filtro de temas (src/lib/filtro.js). Una por coma.
  palabras_extra: '',
  palabras_excluidas: '',
  terminos_ocultos: '',
  ia_activa: '1',
  ia_por_hora: '15',
  // Calculadora de impuestos (porcentajes)
  igv: '16',
  ipm: '2',
  seguro_pct: '1.5',
  advalorem: '0, 6, 11',
  percepciones: JSON.stringify([
    { v: 3.5, t: '3.5 % — Importador con historial (caso general)' },
    { v: 10, t: '10 % — Primera importación, no habido o sin RUC' },
    { v: 5, t: '5 % — Bienes usados' },
    { v: 0, t: '0 % — Exceptuado de percepción' },
  ]),
  // Precios sugeridos de publicidad (se muestran en /anunciate)
  precio_cabecera: 'S/ 400 al mes',
  precio_lateral: 'S/ 250 al mes',
  precio_noticias: 'S/ 200 al mes',
  precio_calculadora: 'S/ 500 al mes',
  precio_videos: 'S/ 250 al mes',
  precio_pie: 'S/ 150 al mes',
  oferta_anual: 'Paga 10 meses y recibe 12 (2 meses gratis).',
};

// Utilidades de texto: escapar HTML, normalizar, slugs y formatos.

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

export function sinAcentos(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Normaliza un título para detectar la misma noticia en varias fuentes.
export function tituloNorm(titulo) {
  return sinAcentos(titulo)
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

export function slug(titulo) {
  return sinAcentos(titulo)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70)
    .replace(/-+$/, '');
}

export function recortar(s, max) {
  s = String(s || '').trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const espacio = corte.lastIndexOf(' ');
  return (espacio > max * 0.6 ? corte.slice(0, espacio) : corte).replace(/[,;:.\s]+$/, '') + '…';
}

// Solo enlaces http(s) válidos.
export function urlSegura(u) {
  try {
    const url = new URL(String(u || '').trim());
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function nombreMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return `${MESES[m - 1]} ${a}`;
}

// "hace 3 horas", "ayer", "12 de octubre"
export function haceCuanto(iso) {
  const d = new Date(iso);
  const seg = (Date.now() - d.getTime()) / 1000;
  if (seg < 60) return 'hace un momento';
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`;
  if (seg < 86400) {
    const h = Math.floor(seg / 3600);
    return `hace ${h} hora${h > 1 ? 's' : ''}`;
  }
  if (seg < 172800) return 'ayer';
  const lima = new Date(d.getTime() - 5 * 3600 * 1000);
  return `${lima.getUTCDate()} de ${MESES[lima.getUTCMonth()]}`;
}

export function fechaLarga(iso) {
  const lima = new Date(new Date(iso).getTime() - 5 * 3600 * 1000);
  const h = String(lima.getUTCHours()).padStart(2, '0');
  const m = String(lima.getUTCMinutes()).padStart(2, '0');
  return `${lima.getUTCDate()} de ${MESES[lima.getUTCMonth()]} de ${lima.getUTCFullYear()}, ${h}:${m}`;
}

export const PAISES = {
  PE: { nombre: 'Perú', bandera: '🇵🇪' },
  CN: { nombre: 'China', bandera: '🇨🇳' },
  US: { nombre: 'EE. UU.', bandera: '🇺🇸' },
  MUNDO: { nombre: 'Mundo', bandera: '🌎' },
};

// Término de búsqueda limpio para el ranking (o null si no sirve).
export function terminoLimpio(t) {
  const s = sinAcentos(t)
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
  if (s.length < 3 || /^\d+$/.test(s) || /(http|www|\.com)/.test(s)) return null;
  return s;
}

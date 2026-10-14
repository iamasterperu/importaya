// Esquema de la página: dónde aparece cada espacio publicitario.
// Los mismos rectángulos se dibujan en la web (SVG) y en el PDF.
export const MAPA = { ancho: 200, alto: 240 };

// Piezas de la página. "espacio" marca el lugar donde va la publicidad.
const PIEZAS = [
  { id: 'menu', x: 0, y: 0, w: 200, h: 14, tipo: 'menu' },
  { id: 'cabecera', x: 8, y: 18, w: 184, h: 14, espacio: 'cabecera' },
  { id: 'portada', x: 8, y: 36, w: 184, h: 30, tipo: 'bloque' },
  { id: 'video', x: 8, y: 70, w: 118, h: 38, tipo: 'bloque' },
  { id: 'videos', x: 8, y: 112, w: 118, h: 12, espacio: 'videos' },
  { id: 'nota1', x: 8, y: 128, w: 118, h: 14, tipo: 'bloque' },
  { id: 'noticias', x: 8, y: 146, w: 118, h: 16, espacio: 'noticias' },
  { id: 'nota2', x: 8, y: 166, w: 118, h: 14, tipo: 'bloque' },
  { id: 'nota3', x: 8, y: 184, w: 118, h: 14, tipo: 'bloque' },
  { id: 'lateral', x: 132, y: 70, w: 60, h: 72, espacio: 'lateral' },
  { id: 'calculadora', x: 132, y: 146, w: 60, h: 22, espacio: 'calculadora' },
  { id: 'lateral2', x: 132, y: 172, w: 60, h: 26, tipo: 'bloque' },
  { id: 'pie', x: 8, y: 204, w: 184, h: 14, espacio: 'pie' },
  { id: 'fin', x: 0, y: 224, w: 200, h: 16, tipo: 'menu' },
];

export function piezasDe(espacioId) {
  return PIEZAS.map((p) => ({ ...p, activa: p.espacio === espacioId, otro: !!p.espacio && p.espacio !== espacioId }));
}

// SVG para la página web. Se adapta a modo claro y oscuro con clases del CSS.
export function svgEsquema(espacioId, titulo) {
  const rects = piezasDe(espacioId)
    .map((p) => {
      const clase = p.activa ? 'mw-activo' : p.otro ? 'mw-otro' : p.tipo === 'menu' ? 'mw-menu' : 'mw-bloque';
      return `<rect class="${clase}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="${p.tipo === 'menu' ? 0 : 2.5}"/>`;
    })
    .join('');
  const a = piezasDe(espacioId).find((p) => p.activa);
  const etiqueta = a
    ? `<text class="mw-texto" x="${a.x + a.w / 2}" y="${a.y + a.h / 2 + 3}" text-anchor="middle">AQUÍ</text>`
    : '';
  return `<svg class="mapa-web" viewBox="0 0 ${MAPA.ancho} ${MAPA.alto}" role="img" aria-label="${titulo}">${rects}${etiqueta}</svg>`;
}

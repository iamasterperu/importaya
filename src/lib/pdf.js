// Generador mínimo de PDF (sin librerías): texto, rectángulos, líneas y una imagen.
// Usa las fuentes básicas de PDF (Helvetica), así que no hace falta incluir tipografías.
import { LOGO_PDF } from './logo-pdf.js';

// Anchos de Helvetica (por 1000) para los caracteres ASCII 32 a 126.
const ANCHOS = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const BASE = { à: 'a', á: 'a', â: 'a', ä: 'a', é: 'e', è: 'e', ê: 'e', í: 'i', ì: 'i', ó: 'o', ò: 'o', ô: 'o', ö: 'o', ú: 'u', ù: 'u', ü: 'u', ñ: 'n', Á: 'A', É: 'E', Í: 'I', Ó: 'O', Ú: 'U', Ñ: 'N', Ü: 'U', '¿': '?', '¡': '!', '×': 'x', '·': '.', '–': '-', '—': '-', '“': '"', '”': '"', '‘': "'", '’': "'" };

const norm = (t) => String(t).replace(/…/g, '...');

export function anchoTexto(texto, tam, negrita = false) {
  texto = norm(texto);
  let total = 0;
  for (const ch of String(texto)) {
    const b = BASE[ch] || ch;
    const c = b.charCodeAt(0);
    total += c >= 32 && c <= 126 ? ANCHOS[c - 32] : 556;
  }
  return (total / 1000) * tam * (negrita ? 1.07 : 1);
}

// Parte un texto en líneas que caben en "ancho" puntos.
export function partirLineas(texto, tam, ancho, negrita = false) {
  const lineas = [];
  for (const parrafo of String(texto).split('\n')) {
    let actual = '';
    for (const palabra of parrafo.split(/\s+/).filter(Boolean)) {
      const prueba = actual ? actual + ' ' + palabra : palabra;
      if (anchoTexto(prueba, tam, negrita) <= ancho || !actual) actual = prueba;
      else { lineas.push(actual); actual = palabra; }
    }
    lineas.push(actual);
  }
  return lineas;
}

const num = (n) => (Math.round(n * 100) / 100).toString();
const color = (hex) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => num(parseInt(h.slice(i, i + 2), 16) / 255)).join(' ');
};
// Texto → bytes Latin-1 (WinAnsi) escapados para PDF.
function cadena(texto) {
  let s = '';
  for (const ch of String(texto)) {
    const c = ch.charCodeAt(0);
    const v = BASE[ch] && c > 255 ? BASE[ch] : ch;
    const k = v.charCodeAt(0);
    if (k > 255) { s += '?'; continue; }
    if (v === '(' || v === ')' || v === '\\') s += '\\' + v;
    else s += v;
  }
  return s;
}

export class Pdf {
  constructor(ancho = 595.28, alto = 841.89) {
    this.ancho = ancho;
    this.alto = alto;
    this.paginas = [];
    this.nuevaPagina();
  }
  nuevaPagina() {
    this.ops = [];
    this.paginas.push(this.ops);
    return this;
  }
  // Coordenadas desde la esquina superior izquierda (como en una página web).
  rect(x, y, w, h, { relleno, borde, grosor = 0.8, radio = 0, guion } = {}) {
    const Y = this.alto - y - h;
    const o = this.ops;
    if (relleno) o.push(`${color(relleno)} rg`);
    if (borde) o.push(`${color(borde)} RG ${num(grosor)} w`);
    o.push(guion ? `[${guion}] 0 d` : '[] 0 d');
    if (radio > 0) {
      const r = Math.min(radio, w / 2, h / 2), k = r * 0.5523;
      o.push(`${num(x + r)} ${num(Y)} m ${num(x + w - r)} ${num(Y)} l ${num(x + w - r + k)} ${num(Y)} ${num(x + w)} ${num(Y + r - k)} ${num(x + w)} ${num(Y + r)} c`);
      o.push(`${num(x + w)} ${num(Y + h - r)} l ${num(x + w)} ${num(Y + h - r + k)} ${num(x + w - r + k)} ${num(Y + h)} ${num(x + w - r)} ${num(Y + h)} c`);
      o.push(`${num(x + r)} ${num(Y + h)} l ${num(x + r - k)} ${num(Y + h)} ${num(x)} ${num(Y + h - r + k)} ${num(x)} ${num(Y + h - r)} c`);
      o.push(`${num(x)} ${num(Y + r)} l ${num(x)} ${num(Y + r - k)} ${num(x + r - k)} ${num(Y)} ${num(x + r)} ${num(Y)} c h`);
    } else {
      o.push(`${num(x)} ${num(Y)} ${num(w)} ${num(h)} re`);
    }
    o.push(relleno && borde ? 'B' : relleno ? 'f' : 'S');
    return this;
  }
  linea(x1, y1, x2, y2, { borde = '#cfd8e6', grosor = 0.8 } = {}) {
    this.ops.push(`${color(borde)} RG ${num(grosor)} w [] 0 d ${num(x1)} ${num(this.alto - y1)} m ${num(x2)} ${num(this.alto - y2)} l S`);
    return this;
  }
  // (x, y) = línea base del texto.
  texto(x, y, texto, { tam = 11, negrita = false, color: c = '#18212f', alinear = 'izq' } = {}) {
    texto = norm(texto);
    let X = x;
    const w = anchoTexto(texto, tam, negrita);
    if (alinear === 'centro') X = x - w / 2;
    else if (alinear === 'der') X = x - w;
    this.ops.push(`BT /${negrita ? 'F2' : 'F1'} ${num(tam)} Tf ${color(c)} rg ${num(X)} ${num(this.alto - y)} Td (${cadena(texto)}) Tj ET`);
    return this;
  }
  // Párrafo con saltos de línea automáticos. Devuelve la y donde termina.
  parrafo(x, y, texto, ancho, { tam = 10.5, interlineado = 1.4, ...resto } = {}) {
    let Y = y;
    texto = norm(texto);
    for (const l of partirLineas(texto, tam, ancho, resto.negrita)) {
      this.texto(x, Y, l, { tam, ...resto });
      Y += tam * interlineado;
    }
    return Y;
  }
  logo(x, y, w) {
    const h = (LOGO_PDF.alto / LOGO_PDF.ancho) * w;
    this.ops.push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(this.alto - y - h)} cm /Logo Do Q`);
    return h;
  }

  async generar({ titulo = 'ImportaYa', autor = 'ImportaYa' } = {}) {
    const enc = new TextEncoder();
    const partes = [];
    const offsets = [];
    let largo = 0;
    const agregar = (x) => {
      const b = typeof x === 'string' ? latin1(x) : x;
      partes.push(b);
      largo += b.length;
    };
    const objeto = (n, cuerpo) => { offsets[n] = largo; agregar(`${n} 0 obj\n`); agregar(cuerpo); agregar('\nendobj\n'); };

    const datosLogo = await descomprimirBase64(LOGO_PDF.datos);
    // Numeración: 1 catálogo, 2 páginas, 3 F1, 4 F2, 5 logo, luego (contenido, página) por cada página
    const nPag = this.paginas.length;
    const ids = this.paginas.map((_, i) => ({ cont: 6 + i * 2, pag: 7 + i * 2 }));
    const infoId = 6 + nPag * 2;
    agregar('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    objeto(1, '<< /Type /Catalog /Pages 2 0 R >>');
    objeto(2, `<< /Type /Pages /Kids [${ids.map((i) => `${i.pag} 0 R`).join(' ')}] /Count ${nPag} >>`);
    objeto(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objeto(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    // La imagen: bytes ya comprimidos con zlib (FlateDecode)
    offsets[5] = largo;
    agregar(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${LOGO_PDF.ancho} /Height ${LOGO_PDF.alto} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${datosLogo.length} >>\nstream\n`);
    agregar(datosLogo);
    agregar('\nendstream\nendobj\n');
    this.paginas.forEach((ops, i) => {
      const flujo = ops.join('\n');
      objeto(ids[i].cont, `<< /Length ${latin1(flujo).length} >>\nstream\n${flujo}\nendstream`);
      objeto(ids[i].pag, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(this.ancho)} ${num(this.alto)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /Logo 5 0 R >> >> /Contents ${ids[i].cont} 0 R >>`);
    });
    objeto(infoId, `<< /Title (${cadena(titulo)}) /Author (${cadena(autor)}) /Producer (ImportaYa) >>`);
    const xref = largo;
    let tabla = `xref\n0 ${infoId + 1}\n0000000000 65535 f \n`;
    for (let n = 1; n <= infoId; n++) tabla += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    agregar(tabla);
    agregar(`trailer\n<< /Size ${infoId + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const salida = new Uint8Array(largo);
    let p = 0;
    for (const b of partes) { salida.set(b, p); p += b.length; }
    return salida;
  }
}

function latin1(texto) {
  const b = new Uint8Array(texto.length);
  for (let i = 0; i < texto.length; i++) b[i] = texto.charCodeAt(i) & 255;
  return b;
}

// Los datos del logo ya están en zlib (lo que pide FlateDecode): solo se pasa de base64 a bytes.
async function descomprimirBase64(b64) {
  const bin = atob(b64);
  const b = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i);
  return b;
}

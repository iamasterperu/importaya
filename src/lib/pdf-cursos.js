// Genera el PDF de un curso (máximo 4 hojas) con el logo, subtítulos, listas y cajas de ayuda.
import { Pdf, anchoTexto } from './pdf.js';
import { LOGO_PDF } from './logo-pdf.js';

const AZUL = '#13315c';
const NARANJA = '#f2711c';
const M = 40;
const TAM = 11;
const INTER = 1.42;

const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

// Texto con **negrita** → segmentos [{t, b}]
function segmentos(texto) {
  return String(texto)
    .split('**')
    .map((t, i) => ({ t, b: i % 2 === 1 }))
    .filter((s) => s.t);
}

// Parte segmentos en líneas que caben en "ancho". Una "palabra" puede tener varias partes (p. ej. negrita pegada a un signo).
function lineas(segs, tam, ancho) {
  const palabras = [];
  let abierta = false; // la palabra anterior no terminó en espacio
  for (const s of segs) {
    const partes = s.t.split(/(\s+)/);
    for (const parte of partes) {
      if (!parte) continue;
      if (/^\s+$/.test(parte)) { abierta = false; continue; }
      if (abierta) palabras[palabras.length - 1].push({ w: parte, b: s.b });
      else palabras.push([{ w: parte, b: s.b }]);
      abierta = true;
    }
  }
  const sp = anchoTexto(' ', tam);
  const ancho1 = (p) => p.reduce((a, x) => a + anchoTexto(x.w, tam, x.b), 0);
  const res = [];
  let act = [];
  let largo = 0;
  for (const p of palabras) {
    const w = ancho1(p);
    if (act.length && largo + sp + w > ancho) { res.push(act); act = []; largo = 0; }
    largo += (act.length ? sp : 0) + w;
    act.push(p);
  }
  if (act.length) res.push(act);
  return res;
}

function dibujarLineas(pdf, x, y, ls, tam, color) {
  const sp = anchoTexto(' ', tam);
  let Y = y;
  for (const l of ls) {
    let X = x;
    for (const palabra of l) {
      for (const p of palabra) {
        pdf.texto(X, Y, p.w, { tam, negrita: p.b, color });
        X += anchoTexto(p.w, tam, p.b);
      }
      X += sp;
    }
    Y += tam * INTER;
  }
  return Y;
}

export async function pdfCurso(curso, { sitio = 'importaya', cfg = {} } = {}) {
  const correo = cfg.correo_ventas || 'iamasterperu@gmail.com';
  const dibujar = (total) => {
    const pdf = new Pdf();
    const ANCHO = pdf.ancho - M * 2;
    const LIM = pdf.alto - 62;
    let n = 1;
    const fondo = hex(LOGO_PDF.fondo);

    const cabeceraPrimera = () => {
      pdf.rect(0, 0, pdf.ancho, 60, { relleno: fondo });
      pdf.logo(M - 6, (60 - (LOGO_PDF.alto / LOGO_PDF.ancho) * 160) / 2, 160);
      pdf.texto(pdf.ancho - M, 27, 'CURSO GRATIS', { tam: 11, negrita: true, color: '#ffffff', alinear: 'der' });
      pdf.texto(pdf.ancho - M, 42, 'Para importadores y exportadores', { tam: 9, color: '#ffc999', alinear: 'der' });
      pdf.rect(0, 60, pdf.ancho, 3, { relleno: NARANJA });
      let y = 90;
      const t = lineas([{ t: curso.titulo, b: true }], 19, ANCHO);
      y = dibujarLineas(pdf, M, y, t, 19, AZUL) + 2;
      y += 0;
      const sub = lineas(segmentos(curso.subtitulo), 10.5, ANCHO);
      y = dibujarLineas(pdf, M, y, sub, 10.5, '#5b6779');
      pdf.rect(M, y + 2, 54, 3, { relleno: NARANJA });
      return y + 22;
    };
    const cabeceraSiguiente = () => {
      pdf.rect(0, 0, pdf.ancho, 36, { relleno: fondo });
      pdf.logo(M - 6, (36 - (LOGO_PDF.alto / LOGO_PDF.ancho) * 100) / 2, 100);
      pdf.texto(pdf.ancho - M, 22, curso.titulo.length > 62 ? curso.titulo.slice(0, 60) + '...' : curso.titulo, { tam: 8.5, color: '#ffffff', alinear: 'der' });
      pdf.rect(0, 36, pdf.ancho, 2, { relleno: NARANJA });
      return 62;
    };
    const pie = () => {
      pdf.linea(M, pdf.alto - 38, pdf.ancho - M, pdf.alto - 38, { borde: '#dde4ef' });
      pdf.texto(M, pdf.alto - 23, `${sitio} · Cursos gratis para importadores y exportadores`, { tam: 8, color: '#5b6779' });
      pdf.texto(pdf.ancho - M, pdf.alto - 23, `${n} / ${total}`, { tam: 8, color: '#5b6779', alinear: 'der' });
    };

    let y = cabeceraPrimera();
    const asegurar = (alto) => {
      if (y + alto > LIM) {
        pie();
        pdf.nuevaPagina();
        n++;
        y = cabeceraSiguiente();
      }
    };

    for (const b of curso.bloques) {
      if (b.h) {
        asegurar(60);
        y += 6;
        pdf.rect(M, y - 12, 4, 17, { relleno: NARANJA, radio: 2 });
        pdf.texto(M + 12, y, b.h, { tam: 12.5, negrita: true, color: AZUL });
        y += 20;
      } else if (b.p) {
        const ls = lineas(segmentos(b.p), TAM, ANCHO);
        asegurar(Math.min(ls.length, 3) * TAM * INTER);
        for (const l of ls) {
          asegurar(TAM * INTER);
          y = dibujarLineas(pdf, M, y, [l], TAM, '#18212f');
        }
        y += 6;
      } else if (b.ul) {
        for (const [t, d] of b.ul) {
          const ls = lineas(segmentos(`**${t}:** ${d}`), TAM, ANCHO - 16);
          asegurar(Math.min(ls.length, 2) * TAM * INTER + 4);
          pdf.rect(M + 3, y - 6.5, 4.5, 4.5, { relleno: NARANJA, radio: 1 });
          for (const l of ls) {
            asegurar(TAM * INTER);
            y = dibujarLineas(pdf, M + 16, y, [l], TAM, '#18212f');
          }
          y += 3;
        }
        y += 4;
      } else if (b.frase) {
        const ls = lineas([{ t: `"${b.frase}"`, b: false }], TAM + 0.5, ANCHO - 28);
        const alto = 16 + ls.length * (TAM + 0.5) * INTER + 12;
        asegurar(alto + 6);
        pdf.rect(M, y - 4, ANCHO, alto, { relleno: '#fff3e8', borde: '#f5b98a', radio: 7 });
        pdf.texto(M + 14, y + 8, b.etiqueta || 'DILO ASÍ', { tam: 7.5, negrita: true, color: '#b34a08' });
        dibujarLineas(pdf, M + 14, y + 22, ls, TAM + 0.5, '#7a3a0a');
        y += alto + 6;
      } else if (b.caja) {
        const filas = b.items.map((i) => lineas(segmentos(i), TAM, ANCHO - 52));
        const alto = 34 + filas.reduce((a, l) => a + l.length * TAM * INTER + 5, 0) + 6;
        asegurar(alto + 6);
        pdf.rect(M, y - 4, ANCHO, alto, { relleno: '#eef3fb', borde: '#c8d3e6', radio: 8 });
        pdf.texto(M + 16, y + 14, b.caja.toUpperCase(), { tam: 8.5, negrita: true, color: AZUL });
        let Y = y + 34;
        for (const l of filas) {
          pdf.rect(M + 16, Y - 8, 10, 10, { relleno: '#ffffff', borde: AZUL, grosor: 1, radio: 2 });
          Y = dibujarLineas(pdf, M + 36, Y, l, TAM, '#18212f') + 5;
        }
        y += alto + 10;
      } else if (b.nota) {
        const ls = lineas([{ t: b.nota, b: false }], 8, ANCHO);
        asegurar(ls.length * 8 * INTER + 6);
        y += 2;
        y = dibujarLineas(pdf, M, y, ls, 8, '#6b7789');
      }
    }
    pie();
    return { pdf, paginas: n };
  };
  const primera = dibujar(1);
  const final = dibujar(primera.paginas);
  const bytes = await final.pdf.generar({ titulo: `${curso.titulo} · ImportaYa` });
  return { bytes, paginas: final.paginas };
}

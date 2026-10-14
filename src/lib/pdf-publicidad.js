// PDF "Publicidad en ImportaYa": medidas, lugar, precios, esquema de la página y cómo contratar.
import { Pdf, anchoTexto } from './pdf.js';
import { LOGO_PDF } from './logo-pdf.js';
import { ESPACIOS } from './anuncios.js';
import { piezasDe, MAPA } from './mapa-web.js';

const AZUL = '#13315c';
const NARANJA = '#f2711c';
const MARGEN = 36;

function cabecera(pdf, grande) {
  const alto = grande ? 78 : 56;
  const [r, g, b] = LOGO_PDF.fondo;
  const fondo = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  pdf.rect(0, 0, pdf.ancho, alto, { relleno: fondo });
  const w = grande ? 205 : 150;
  const h = pdf.logo(MARGEN - 6, (alto - (LOGO_PDF.alto / LOGO_PDF.ancho) * w) / 2, w);
  pdf.texto(pdf.ancho - MARGEN, alto / 2 + 4, 'Publicidad para empresas de comercio exterior', { tam: 10, color: '#ffc999', alinear: 'der' });
  pdf.rect(0, alto, pdf.ancho, 3, { relleno: NARANJA });
  return alto + 3;
}

function pie(pdf, sitio, correo, n, total) {
  pdf.linea(MARGEN, pdf.alto - 40, pdf.ancho - MARGEN, pdf.alto - 40, { borde: '#dde4ef' });
  pdf.texto(MARGEN, pdf.alto - 24, `${sitio}  ·  ${correo}  ·  Precios en soles (S/)`, { tam: 8.5, color: '#5b6779' });
  pdf.texto(pdf.ancho - MARGEN, pdf.alto - 24, `${n} / ${total}`, { tam: 8.5, color: '#5b6779', alinear: 'der' });
}

// Dibuja el esquema de la página con el espacio resaltado.
function dibujarMapa(pdf, x, y, escala, espacioId) {
  pdf.rect(x - 2, y - 2, MAPA.ancho * escala + 4, MAPA.alto * escala + 4, { relleno: '#ffffff', borde: '#b9c5d9', grosor: 0.8, radio: 4 });
  for (const p of piezasDe(espacioId)) {
    const X = x + p.x * escala, Y = y + p.y * escala, W = p.w * escala, H = p.h * escala;
    if (p.activa) pdf.rect(X, Y, W, H, { relleno: NARANJA, borde: '#b34a08', grosor: 1, radio: 2 });
    else if (p.tipo === 'menu') pdf.rect(X, Y, W, H, { relleno: AZUL });
    else if (p.otro) pdf.rect(X, Y, W, H, { relleno: '#ffe7d3', borde: '#f5b98a', grosor: 0.5, radio: 2, guion: '2 1.5' });
    else pdf.rect(X, Y, W, H, { relleno: '#e6ecf5', radio: 2 });
    if (p.activa) pdf.texto(X + W / 2, Y + H / 2 + 3, 'AQUÍ', { tam: Math.min(10, H * 0.55), negrita: true, color: '#ffffff', alinear: 'centro' });
  }
}

function tarjeta(pdf, y, id, e, precio) {
  const alto = 160;
  pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, alto, { relleno: '#ffffff', borde: '#dde4ef', radio: 8 });
  dibujarMapa(pdf, MARGEN + 14, y + 12, 0.56, id);
  const x = MARGEN + 14 + MAPA.ancho * 0.56 + 22;
  const ancho = pdf.ancho - MARGEN - 14 - x;
  pdf.texto(x, y + 30, e.nombre, { tam: 15, negrita: true, color: AZUL });
  pdf.texto(x, y + 50, 'DÓNDE APARECE', { tam: 7.5, negrita: true, color: NARANJA });
  const fin = pdf.parrafo(x, y + 63, e.detalle, ancho, { tam: 10, color: '#18212f' });
  pdf.texto(x, fin + 8, 'MEDIDA DEL BANNER', { tam: 7.5, negrita: true, color: NARANJA });
  pdf.texto(x, fin + 24, e.medida, { tam: 12, negrita: true, color: '#18212f' });
  pdf.rect(x, y + alto - 38, Math.min(ancho, anchoTexto(precio, 12, true) + 28), 26, { relleno: AZUL, radio: 13 });
  pdf.texto(x + 14, y + alto - 20.5, precio, { tam: 12, negrita: true, color: '#ffffff' });
}

export async function pdfPublicidad(cfg, { sitio = 'importaya', correo = 'iamasterperu@gmail.com' } = {}) {
  const pdf = new Pdf();
  const ids = Object.keys(ESPACIOS);
  const total = 3;

  // ── Página 1 ──
  let y = cabecera(pdf, true) + 26;
  pdf.texto(MARGEN, y + 6, 'Espacios publicitarios', { tam: 22, negrita: true, color: AZUL });
  y = pdf.parrafo(MARGEN, y + 28, 'Tu marca frente a importadores, exportadores, agencias de aduana, agentes de carga y couriers. En cada dibujo, el bloque naranja muestra en qué parte de la página web aparecerá tu publicidad.', pdf.ancho - MARGEN * 2, { tam: 10.5, color: '#3b475a' });
  y += 6;
  ids.slice(0, 3).forEach((id) => {
    tarjeta(pdf, y, id, ESPACIOS[id], cfg['precio_' + id] || 'Consultar');
    y += 172;
  });
  pie(pdf, sitio, correo, 1, total);

  // ── Página 2 ──
  pdf.nuevaPagina();
  y = cabecera(pdf, false) + 20;
  ids.slice(3).forEach((id) => {
    tarjeta(pdf, y, id, ESPACIOS[id], cfg['precio_' + id] || 'Consultar');
    y += 172;
  });
  if (cfg.oferta_anual) {
    pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 34, { relleno: '#fff3e8', borde: '#f5b98a', radio: 8 });
    pdf.texto(MARGEN + 14, y + 21, `Plan anual: ${cfg.oferta_anual}`, { tam: 10.5, negrita: true, color: '#b34a08' });
    y += 46;
  }
  pie(pdf, sitio, correo, 2, total);

  // ── Página 3 ──
  pdf.nuevaPagina();
  y = cabecera(pdf, false) + 34;
  pdf.texto(MARGEN, y + 12, 'Cómo contratar', { tam: 16, negrita: true, color: AZUL });
  y += 32;
  const pasos = [
    ['1', 'Elige tu espacio', 'Escríbenos por el formulario de la página Anúnciate o a nuestro correo.'],
    ['2', 'Realiza el pago en soles', `Cuenta BCP Soles: ${cfg.cuenta_bcp}\nCuenta interbancaria (CCI): ${cfg.cuenta_cci}`],
    ['3', 'Envía tu voucher y tu diseño', `Manda el voucher de pago y el diseño de tu banner, con la medida exacta de tu espacio, a ${correo}`],
    ['4', 'Publicamos tu anuncio', 'Revisamos tu diseño y lo publicamos en el espacio elegido.'],
  ];
  for (const [n, t, d] of pasos) {
    pdf.rect(MARGEN, y - 12, 24, 24, { relleno: NARANJA, radio: 12 });
    pdf.texto(MARGEN + 12, y + 4, n, { tam: 12, negrita: true, color: '#ffffff', alinear: 'centro' });
    pdf.texto(MARGEN + 38, y - 1, t, { tam: 11.5, negrita: true, color: '#18212f' });
    const fin = pdf.parrafo(MARGEN + 38, y + 14, d, pdf.ancho - MARGEN * 2 - 38, { tam: 10, color: '#3b475a' });
    y = Math.max(fin, y + 30) + 14;
  }
  pie(pdf, sitio, correo, 3, total);
  return pdf.generar({ titulo: 'Publicidad en ImportaYa: espacios, medidas y precios' });
}

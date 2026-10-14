// PDF "Publicidad en ImportaYa": medidas, lugar, precios, esquema de la página, formas de pago y qué enviar.
import { Pdf, anchoTexto } from './pdf.js';
import { LOGO_PDF } from './logo-pdf.js';
import { FONDO_AZUL_BCP, FONDO_MORADO_YAPE, IMAGENES_PDF } from './imagenes-pdf.js';
import { ESPACIOS } from './anuncios.js';
import { piezasDe, MAPA } from './mapa-web.js';

const AZUL = '#13315c';
const NARANJA = '#f2711c';
const MARGEN = 36;
import { HORAS_PUBLICACION } from './correos-ventas.js';
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');

function cabecera(pdf, grande) {
  const alto = grande ? 78 : 56;
  pdf.rect(0, 0, pdf.ancho, alto, { relleno: hex(LOGO_PDF.fondo) });
  const w = grande ? 205 : 150;
  pdf.logo(MARGEN - 6, (alto - (LOGO_PDF.alto / LOGO_PDF.ancho) * w) / 2, w);
  pdf.texto(pdf.ancho - MARGEN, alto / 2 - 1, 'Para importadores y exportadores', { tam: 11, negrita: true, color: '#ffffff', alinear: 'der' });
  pdf.texto(pdf.ancho - MARGEN, alto / 2 + 13, 'Publicidad para empresas de comercio exterior', { tam: 9, color: '#ffc999', alinear: 'der' });
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

// Panel de pago con Yape (fondo morado: se usa la imagen del QR, que ya trae el logo blanco de Yape).
function panelYape(pdf, x, y, w, cfg) {
  const morado = hex(FONDO_MORADO_YAPE);
  const imgW = w - 40;
  const imgH = (IMAGENES_PDF.yapeQr.alto / IMAGENES_PDF.yapeQr.ancho) * imgW;
  const alto = 34 + imgH + 54;
  pdf.rect(x, y, w, alto, { relleno: morado, radio: 10 });
  pdf.texto(x + w / 2, y + 24, 'Paga con Yape', { tam: 13, negrita: true, color: '#ffffff', alinear: 'centro' });
  pdf.imagen('YapeQr', x + 20, y + 30, imgW);
  pdf.texto(x + w / 2, y + 30 + imgH + 18, 'o yapea al número', { tam: 9.5, color: '#e9c8f2', alinear: 'centro' });
  pdf.texto(x + w / 2, y + 30 + imgH + 38, cfg.yape_numero, { tam: 20, negrita: true, color: '#ffffff', alinear: 'centro' });
  return alto;
}

// Panel BCP: franja azul con el logo blanco y datos sobre fondo blanco.
function panelBcp(pdf, x, y, w, cfg) {
  const azul = hex(FONDO_AZUL_BCP);
  const cab = 78;
  pdf.rect(x, y, w, cab + 8, { relleno: azul, radio: 10 });
  pdf.rect(x, y + cab - 6, w, 14, { relleno: '#ffffff' });
  pdf.rect(x, y + cab, w, 150, { relleno: '#ffffff', borde: '#c8d3e6', radio: 0 });
  pdf.rect(x, y, w, cab, { relleno: azul, radio: 10 });
  pdf.rect(x, y + cab - 12, w, 12, { relleno: azul });
  const lw = w * 0.5;
  const lh = (IMAGENES_PDF.bcpAzul.alto / IMAGENES_PDF.bcpAzul.ancho) * lw;
  pdf.imagen('BcpAzul', x + (w - lw) / 2, y + (cab - lh) / 2, lw);
  pdf.texto(x + w / 2, y + cab + 24, 'Transferencia en soles', { tam: 12, negrita: true, color: '#012966', alinear: 'centro' });
  pdf.texto(x + 16, y + cab + 50, 'CUENTA BCP SOLES', { tam: 7.5, negrita: true, color: NARANJA });
  pdf.texto(x + 16, y + cab + 68, cfg.cuenta_bcp, { tam: 15, negrita: true, color: '#18212f' });
  pdf.texto(x + 16, y + cab + 96, 'CUENTA INTERBANCARIA (CCI)', { tam: 7.5, negrita: true, color: NARANJA });
  pdf.texto(x + 16, y + cab + 114, cfg.cuenta_cci, { tam: 15, negrita: true, color: '#18212f' });
  pdf.texto(x + w / 2, y + cab + 140, 'Desde cualquier banco o billetera', { tam: 8.5, color: '#5b6779', alinear: 'centro' });
  return cab + 150;
}

export async function pdfPublicidad(cfg, { sitio = 'importaya', correo = 'iamasterperu@gmail.com' } = {}) {
  const pdf = new Pdf();
  const ids = Object.keys(ESPACIOS);
  const total = 4;
  const precio = (id) => cfg['precio_' + id] || 'Consultar';

  // ── Página 1 ──
  let y = cabecera(pdf, true) + 26;
  pdf.texto(MARGEN, y + 6, 'Espacios publicitarios', { tam: 22, negrita: true, color: AZUL });
  y = pdf.parrafo(MARGEN, y + 28, 'Tu marca frente a importadores y exportadores del Perú: agencias de aduana, agentes de carga, couriers y empresas de comercio exterior. En cada dibujo, el bloque naranja muestra en qué parte de la página web aparecerá tu publicidad.', pdf.ancho - MARGEN * 2, { tam: 10.5, color: '#3b475a' });
  y += 6;
  ids.slice(0, 3).forEach((id) => { tarjeta(pdf, y, id, ESPACIOS[id], precio(id)); y += 172; });
  pie(pdf, sitio, correo, 1, total);

  // ── Página 2 ──
  pdf.nuevaPagina();
  y = cabecera(pdf, false) + 20;
  ids.slice(3).forEach((id) => { tarjeta(pdf, y, id, ESPACIOS[id], precio(id)); y += 172; });
  if (cfg.oferta_anual) {
    pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 34, { relleno: '#fff3e8', borde: '#f5b98a', radio: 8 });
    pdf.texto(MARGEN + 14, y + 21, `Plan anual: ${cfg.oferta_anual}`, { tam: 10.5, negrita: true, color: '#b34a08' });
  }
  pie(pdf, sitio, correo, 2, total);

  // ── Página 3: cómo pagar ──
  pdf.nuevaPagina();
  y = cabecera(pdf, false) + 30;
  pdf.texto(MARGEN, y + 6, 'Cómo pagar', { tam: 20, negrita: true, color: AZUL });
  pdf.parrafo(MARGEN, y + 26, 'Elige tu espacio, llena tus datos y paga con Yape, por transferencia o con tarjeta en la página de pago.', pdf.ancho - MARGEN * 2, { tam: 10.5, color: '#3b475a' });
  y += 52;
  const colW = (pdf.ancho - MARGEN * 2 - 18) / 2;
  panelYape(pdf, MARGEN, y, colW, cfg);
  panelBcp(pdf, MARGEN + colW + 18, y, colW, cfg);
  y += 380;
  pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 60, { relleno: '#eef6ff', borde: '#b9d7f5', radio: 8 });
  pdf.texto(MARGEN + 14, y + 20, 'También puedes pagar con tarjeta (crédito o débito)', { tam: 11, negrita: true, color: '#0b3d91' });
  pdf.parrafo(MARGEN + 14, y + 38, `Pago en línea y seguro con Mercado Pago en ${sitio}/anunciate/pagar. Aceptamos todas las tarjetas.`, pdf.ancho - MARGEN * 2 - 28, { tam: 10, color: '#18212f' });
  y += 76;
  pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 64, { relleno: '#fff3e8', borde: '#f5b98a', radio: 8 });
  pdf.parrafo(MARGEN + 14, y + 20, `Si pagas con Yape o transferencia, envía la captura del pago a ${correo} con el asunto: PAGO REALIZADO - NOMBRE DE TU EMPRESA. Te responderemos automáticamente con las instrucciones.`, pdf.ancho - MARGEN * 2 - 28, { tam: 10, negrita: true, color: '#b34a08' });
  pie(pdf, sitio, correo, 3, total);

  // ── Página 4: qué enviar ──
  pdf.nuevaPagina();
  y = cabecera(pdf, false) + 30;
  pdf.texto(MARGEN, y + 6, 'Después de pagar: envía tu anuncio', { tam: 20, negrita: true, color: AZUL });
  y += 34;
  const pasos = [
    ['1', 'Prepara tu imagen', 'En formato PNG o JPG, con la medida exacta del espacio que elegiste (mira la tabla de abajo).'],
    ['2', 'Indica el enlace de destino', 'Escribe la dirección web (link) a la que quieres que lleve tu anuncio cuando alguien haga clic.'],
    ['3', 'Envíanos todo por correo', `Responde el correo que te enviamos (o escribe a ${correo}) con la imagen y el link. Si pagaste con Yape o transferencia, tu voucher va antes con el asunto PAGO REALIZADO - NOMBRE DE TU EMPRESA.`],
    ['4', `Tu anuncio sale en ${HORAS_PUBLICACION} horas`, `Dentro de ${HORAS_PUBLICACION} horas después de recibir tu archivo, tu publicidad estará en la página web de ImportaYa.`],
  ];
  for (const [n, t, d] of pasos) {
    pdf.rect(MARGEN, y - 12, 24, 24, { relleno: NARANJA, radio: 12 });
    pdf.texto(MARGEN + 12, y + 4, n, { tam: 12, negrita: true, color: '#ffffff', alinear: 'centro' });
    pdf.texto(MARGEN + 38, y - 1, t, { tam: 11.5, negrita: true, color: '#18212f' });
    const fin = pdf.parrafo(MARGEN + 38, y + 14, d, pdf.ancho - MARGEN * 2 - 38, { tam: 10, color: '#3b475a' });
    y = Math.max(fin, y + 30) + 14;
  }
  y += 8;
  pdf.texto(MARGEN, y + 4, 'Medidas de cada espacio', { tam: 14, negrita: true, color: AZUL });
  y += 18;
  pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 24, { relleno: AZUL, radio: 6 });
  pdf.texto(MARGEN + 12, y + 16, 'ESPACIO', { tam: 8, negrita: true, color: '#ffffff' });
  pdf.texto(MARGEN + 250, y + 16, 'MEDIDA (PNG O JPG)', { tam: 8, negrita: true, color: '#ffffff' });
  pdf.texto(pdf.ancho - MARGEN - 12, y + 16, 'PRECIO', { tam: 8, negrita: true, color: '#ffffff', alinear: 'der' });
  y += 24;
  ids.forEach((id, i) => {
    pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 26, { relleno: i % 2 ? '#f7f9fc' : '#ffffff' });
    pdf.texto(MARGEN + 12, y + 17, ESPACIOS[id].nombre, { tam: 10, negrita: true, color: '#18212f' });
    pdf.texto(MARGEN + 250, y + 17, ESPACIOS[id].medida, { tam: 10, color: '#18212f' });
    pdf.texto(pdf.ancho - MARGEN - 12, y + 17, precio(id), { tam: 10, negrita: true, color: AZUL, alinear: 'der' });
    y += 26;
  });
  pdf.linea(MARGEN, y, pdf.ancho - MARGEN, y, { borde: '#dde4ef' });
  y += 26;
  pdf.rect(MARGEN, y, pdf.ancho - MARGEN * 2, 52, { relleno: '#fff3e8', borde: '#f5b98a', radio: 8 });
  pdf.parrafo(MARGEN + 14, y + 20, 'Importante: usa exactamente la medida indicada para que tu anuncio se vea nítido. Si tienes dudas con tu diseño, escríbenos a ' + correo + ' y te ayudamos.', pdf.ancho - MARGEN * 2 - 28, { tam: 10, color: '#b34a08', negrita: true });
  pie(pdf, sitio, correo, 4, total);
  return pdf.generar({ titulo: 'Publicidad en ImportaYa: espacios, medidas, precios y pago' });
}

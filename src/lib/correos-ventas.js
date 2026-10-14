// Correos del formulario "Anúnciate": aviso al dueño y respuesta automática con precios, PDF y datos de pago.
import { esc } from './texto.js';
import { ESPACIOS } from './anuncios.js';
import { permitir } from './http.js';
import { enviarCorreo, correoConfigurado } from './correo.js';

export const NOMBRE_PDF = 'Publicidad-ImportaYa.pdf';

function filaDato(k, v) {
  return v ? `<tr><td style="padding:4px 12px 4px 0;color:#5b6779">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>` : '';
}

// Aviso para el dueño: llega con el asunto marcado como "desde la página web".
export function correoAviso(cfg, c, origen) {
  const espacio = ESPACIOS[c.espacio]?.nombre || 'No indicó';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#18212f">
  <p style="background:#fff3e8;border-left:4px solid #f2711c;padding:10px 14px;margin:0 0 14px"><b>Mensaje recibido desde el formulario de la página web de ImportaYa</b> (${esc(origen)}/anunciate)</p>
  <table style="border-collapse:collapse">${filaDato('Nombre', c.nombre)}${filaDato('Empresa', c.empresa)}${filaDato('Correo', c.email)}${filaDato('WhatsApp / teléfono', c.telefono)}${filaDato('Espacio de interés', espacio)}</table>
  <p style="margin:14px 0 4px;color:#5b6779">Mensaje:</p>
  <div style="background:#f4f6fa;border-radius:8px;padding:10px 14px;white-space:pre-wrap">${esc(c.mensaje || '(sin mensaje)')}</div>
  <p style="color:#5b6779;font-size:13px;margin-top:16px">${c.email ? 'Ya se le envió automáticamente la respuesta con precios, PDF y datos de pago. Puedes responder a este correo para escribirle directamente.' : 'No dejó correo: contáctalo por teléfono o WhatsApp.'}</p>
</div>`;
  return {
    para: cfg.correo_ventas,
    asunto: `[ImportaYa · Formulario web] ${c.nombre}${c.empresa ? ' · ' + c.empresa : ''}`,
    html,
    texto: `Mensaje desde el formulario de la página web de ImportaYa.\nNombre: ${c.nombre}\nEmpresa: ${c.empresa}\nCorreo: ${c.email}\nTeléfono: ${c.telefono}\nEspacio: ${espacio}\n\n${c.mensaje}`,
    responder_a: c.email || '',
    nombre: 'ImportaYa · Formulario web',
  };
}

// Respuesta automática para quien escribió.
export function correoRespuesta(cfg, c, origen) {
  const filas = Object.entries(ESPACIOS)
    .map(([id, e], i) => `<tr style="background:${i % 2 ? '#f7f9fc' : '#ffffff'}"><td style="padding:9px 10px;border-bottom:1px solid #e2e7ef"><b>${esc(e.nombre)}</b><br><span style="color:#5b6779;font-size:13px">${esc(e.detalle)}</span></td><td style="padding:9px 10px;border-bottom:1px solid #e2e7ef;white-space:nowrap">${esc(e.medida)}</td><td style="padding:9px 10px;border-bottom:1px solid #e2e7ef;white-space:nowrap"><b>${esc(cfg['precio_' + id] || 'Consultar')}</b></td></tr>`)
    .join('');
  const interes = ESPACIOS[c.espacio] ? `<p>Vimos que te interesa el espacio <b>${esc(ESPACIOS[c.espacio].nombre)}</b>. Aquí tienes todos los espacios para que compares.</p>` : '';
  const html = `<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;font-size:15px;color:#18212f;line-height:1.5">
  <div style="background:#13315c;padding:16px 20px;border-radius:12px 12px 0 0"><img src="${esc(origen)}/assets/logo-importaya.png" alt="ImportaYa" width="220" style="display:block;border:0;max-width:100%;height:auto"></div>
  <div style="height:4px;background:#f2711c"></div>
  <div style="padding:20px 6px">
    <p>Hola <b>${esc(c.nombre)}</b>,</p>
    <p>Gracias por escribirnos desde <b>ImportaYa</b>. Te enviamos los precios de publicidad y te contamos cómo contratar. En el PDF adjunto verás la <b>medida de cada banner</b> y un <b>dibujo de la página</b> que muestra dónde aparecerá tu publicidad.</p>
    ${interes}
    <table style="width:100%;border-collapse:collapse;font-size:14px;margin:14px 0"><thead><tr style="background:#13315c;color:#fff;text-align:left"><th style="padding:9px 10px">Espacio</th><th style="padding:9px 10px">Medida</th><th style="padding:9px 10px">Precio</th></tr></thead><tbody>${filas}</tbody></table>
    ${cfg.oferta_anual ? `<p style="background:#fff3e8;border-left:4px solid #f2711c;padding:10px 14px"><b>Plan anual:</b> ${esc(cfg.oferta_anual)}</p>` : ''}
    <h3 style="color:#13315c;margin:22px 0 8px">Cómo contratar</h3>
    <ol style="padding-left:20px;margin:0">
      <li><b>Elige tu espacio</b> de la lista.</li>
      <li><b>Realiza el pago en soles</b> a esta cuenta:
        <div style="background:#f4f6fa;border-radius:8px;padding:10px 14px;margin:8px 0">
          Cuenta BCP Soles: <b style="font-size:16px">${esc(cfg.cuenta_bcp)}</b><br>
          Cuenta interbancaria (CCI): <b style="font-size:16px">${esc(cfg.cuenta_cci)}</b>
        </div></li>
      <li><b>Envía a ${esc(cfg.correo_ventas)}</b>: el <b>voucher</b> del pago y el <b>diseño de tu banner</b> con la medida exacta de tu espacio.</li>
      <li>Revisamos tu diseño y publicamos tu anuncio.</li>
    </ol>
    <p style="margin-top:20px">Si tienes dudas, responde este correo y te ayudamos.</p>
    <p>Un saludo,<br><b>Equipo ImportaYa</b></p>
    <p style="color:#8a94a6;font-size:12px;border-top:1px solid #e2e7ef;padding-top:10px;margin-top:22px">Recibes este mensaje porque pediste información de publicidad en ${esc(origen.replace(/^https?:\/\//, ''))}. Es una respuesta automática.</p>
  </div></div>`;
  return {
    para: c.email,
    asunto: 'ImportaYa: precios de publicidad y cómo contratar',
    html,
    texto: `Hola ${c.nombre}, gracias por escribirnos. Adjuntamos el PDF con precios, medidas y el esquema de la página.\nPago en soles — BCP: ${cfg.cuenta_bcp} — CCI: ${cfg.cuenta_cci}.\nEnvía el voucher y el diseño de tu banner a ${cfg.correo_ventas}.`,
    responder_a: cfg.correo_ventas,
    nombre: 'ImportaYa',
    pdf_url: `${origen}/anunciate/${NOMBRE_PDF}`,
    pdf_nombre: NOMBRE_PDF,
  };
}

// Se ejecuta después de guardar el mensaje (sin hacer esperar a la persona).
export async function avisarContacto(env, cfg, c, origen) {
  if (!correoConfigurado(env)) return;
  await enviarCorreo(env, correoAviso(cfg, c, origen));
  // La respuesta automática: máximo una por correo cada 24 horas, para que nadie use el formulario para molestar a otros.
  if (c.email && (await permitir(env.DB, `autoresp:${c.email.toLowerCase()}`, 1, 86400))) {
    await enviarCorreo(env, correoRespuesta(cfg, c, origen));
  }
}

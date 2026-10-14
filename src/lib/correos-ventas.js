// Correos del formulario "Anúnciate": aviso al dueño y respuesta automática con precios, PDF y datos de pago.
import { esc } from './texto.js';
import { ESPACIOS } from './anuncios.js';
import { permitir } from './http.js';
import { enviarCorreo, correoConfigurado } from './correo.js';

export const NOMBRE_PDF = 'Publicidad-ImportaYa.pdf';
export const HORAS_PUBLICACION = 2;

// Datos de pago para correos: logos con fondo blanco sobre fondo blanco.
export function bloquePago(cfg, origen) {
  const o = esc(origen);
  return `<table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0;margin:6px 0">
  <tr>
    <td style="width:50%;vertical-align:top;padding:0 6px 0 0">
      <div style="border:1px solid #e2d3ea;border-radius:10px;padding:14px;text-align:center">
        <img src="${o}/assets/yape-color.png" alt="Yape" height="46" style="border:0;height:46px;width:auto">
        <div style="color:#5b6779;font-size:13px;margin-top:8px">Yape al número</div>
        <div style="font-size:22px;font-weight:bold;color:#790699">${esc(cfg.yape_numero)}</div>
        <img src="${o}/assets/yape-qr.png" alt="QR de Yape" width="150" style="border:0;margin-top:8px;border-radius:10px;max-width:100%">
      </div>
    </td>
    <td style="width:50%;vertical-align:top;padding:0 0 0 6px">
      <div style="border:1px solid #cdd8ea;border-radius:10px;padding:14px">
        <div style="text-align:center"><img src="${o}/assets/bcp-color.png" alt="BCP" height="40" style="border:0;height:40px;width:auto"></div>
        <div style="color:#5b6779;font-size:12px;margin-top:10px">CUENTA BCP SOLES</div>
        <div style="font-size:16px;font-weight:bold">${esc(cfg.cuenta_bcp)}</div>
        <div style="color:#5b6779;font-size:12px;margin-top:8px">CUENTA INTERBANCARIA (CCI)</div>
        <div style="font-size:16px;font-weight:bold">${esc(cfg.cuenta_cci)}</div>
      </div>
    </td>
  </tr></table>`;
}

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
    <ol style="padding-left:20px;margin:0 0 12px">
      <li><b>Elige tu espacio</b> de la lista.</li>
      <li><b>Paga en soles</b> por Yape o por transferencia (datos abajo).</li>
      <li>Entra a <a href="${esc(origen)}/anunciate/pagar" style="color:#d9560b"><b>${esc(origen.replace(/^https?:\/\//, ''))}/anunciate/pagar</b></a> y presiona <b>"Ya pagué"</b>.</li>
      <li>Te llegará un correo de confirmación con instrucciones para enviarnos tu banner.</li>
    </ol>
    ${bloquePago(cfg, origen)}
    <p style="margin-top:20px">Si tienes dudas, responde este correo y te ayudamos.</p>
    <p>Un saludo,<br><b>Equipo ImportaYa</b></p>
    <p style="color:#8a94a6;font-size:12px;border-top:1px solid #e2e7ef;padding-top:10px;margin-top:22px">Recibes este mensaje porque pediste información de publicidad en ${esc(origen.replace(/^https?:\/\//, ''))}. Es una respuesta automática.</p>
  </div></div>`;
  return {
    para: c.email,
    asunto: 'ImportaYa: precios de publicidad y cómo contratar',
    html,
    texto: `Hola ${c.nombre}, gracias por escribirnos. Adjuntamos el PDF con precios, medidas y el esquema de la página.\nPago en soles — Yape: ${cfg.yape_numero} — BCP: ${cfg.cuenta_bcp} — CCI: ${cfg.cuenta_cci}.\nDespués de pagar entra a ${origen}/anunciate/pagar y presiona "Ya pagué".`,
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

const cabeceraCorreo = (origen) => `<div style="background:#13315c;padding:16px 20px;border-radius:12px 12px 0 0"><img src="${esc(origen)}/assets/logo-importaya.png" alt="ImportaYa" width="220" style="display:block;border:0;max-width:100%;height:auto"></div><div style="height:4px;background:#f2711c"></div>`;

// Correo para el anunciante cuando avisa que ya pagó.
export function correoPagoCliente(cfg, p, origen) {
  const e = ESPACIOS[p.espacio];
  const html = `<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;font-size:15px;color:#18212f;line-height:1.5">
  ${cabeceraCorreo(origen)}
  <div style="padding:20px 6px">
    <p>Hola <b>${esc(p.nombre)}</b>,</p>
    <p>¡Gracias! Recibimos tu aviso de pago de <b>${esc(p.empresa)}</b>${e ? ` para el espacio <b>${esc(e.nombre)}</b>` : ''}. Estamos verificando el pago.</p>
    ${e ? `<div style="background:#f4f6fa;border-radius:8px;padding:10px 14px;margin:10px 0"><b>${esc(e.nombre)}</b><br><span style="color:#5b6779">${esc(e.detalle)}</span><br>Medida del banner: <b>${esc(e.medida)}</b></div>` : ''}
    <h3 style="color:#13315c;margin:20px 0 8px">Ahora envíanos tu anuncio</h3>
    <p>Responde este correo (o escribe a <b>${esc(cfg.correo_ventas)}</b>) con:</p>
    <ol style="padding-left:20px;margin:0">
      <li>La <b>imagen de tu banner en PNG o JPG</b>${e ? `, exactamente de <b>${esc(e.medida)}</b>` : ', con la medida de tu espacio (está en el PDF adjunto)'}.</li>
      <li>El <b>link (enlace)</b> a donde quieres que lleve tu anuncio cuando hagan clic.</li>
    </ol>
    <p style="background:#fff3e8;border-left:4px solid #f2711c;padding:10px 14px;margin:16px 0"><b>Tu anuncio estará en la página web dentro de ${HORAS_PUBLICACION} horas</b> después de que nos envíes el archivo.</p>
    <p>En el PDF adjunto encontrarás las medidas de todos los espacios y el dibujo de dónde aparecerá tu publicidad.</p>
    <p>Un saludo,<br><b>Equipo ImportaYa</b><br><span style="color:#5b6779;font-size:13px">La web para importadores y exportadores del Perú</span></p>
    <p style="color:#8a94a6;font-size:12px;border-top:1px solid #e2e7ef;padding-top:10px;margin-top:22px">Correo automático de ${esc(origen.replace(/^https?:\/\//, ''))}.</p>
  </div></div>`;
  return {
    para: p.email,
    asunto: 'ImportaYa: recibimos tu pago, envía tu banner',
    html,
    texto: `Hola ${p.nombre}, recibimos tu aviso de pago. Envía a ${cfg.correo_ventas} la imagen de tu banner en PNG o JPG${e ? ' de ' + e.medida : ''} y el link a donde debe llevar. Tu anuncio estará en la web dentro de ${HORAS_PUBLICACION} horas después de que envíes el archivo.`,
    responder_a: cfg.correo_ventas,
    nombre: 'ImportaYa',
    pdf_url: `${origen}/anunciate/${NOMBRE_PDF}`,
    pdf_nombre: NOMBRE_PDF,
  };
}

// Correo para el dueño: "tal empresa ya pagó".
export function correoPagoAviso(cfg, p, origen) {
  const e = ESPACIOS[p.espacio];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#18212f">
  <p style="background:#e8f7ee;border-left:4px solid #1f9d55;padding:10px 14px;margin:0 0 14px"><b>${esc(p.empresa)} ya pagó</b> (aviso desde ${esc(origen)}/anunciate/pagar). Verifica el pago y espera su banner para publicarlo.</p>
  <table style="border-collapse:collapse">${filaDato('Empresa', p.empresa)}${filaDato('Contacto', p.nombre)}${filaDato('Correo', p.email)}${filaDato('WhatsApp / teléfono', p.telefono)}${filaDato('Espacio', e ? `${e.nombre} (${e.medida})` : 'No indicó')}${filaDato('Precio', e ? cfg['precio_' + p.espacio] : '')}${filaDato('Método', p.metodo === 'yape' ? 'Yape' : 'Transferencia')}${filaDato('N.º de operación', p.operacion)}</table>
  <p style="color:#5b6779;font-size:13px;margin-top:16px">Ya se le envió la confirmación con el PDF y las instrucciones. Cuando te mande el banner (PNG o JPG) y el link, publícalo desde el panel de administración: se le prometió que saldrá dentro de ${HORAS_PUBLICACION} horas. Puedes responder a este correo para escribirle.</p>
</div>`;
  return {
    para: cfg.correo_ventas,
    asunto: `[ImportaYa · PAGO] ${p.empresa} ya pagó${e ? ' · ' + e.nombre : ''}`,
    html,
    texto: `${p.empresa} ya pagó. Contacto: ${p.nombre} ${p.email} ${p.telefono}. Espacio: ${e ? e.nombre : '-'}. Método: ${p.metodo}. Operación: ${p.operacion}.`,
    responder_a: p.email,
    nombre: 'ImportaYa · Pagos',
  };
}

export async function avisarPago(env, cfg, p, origen) {
  if (!correoConfigurado(env)) return;
  await enviarCorreo(env, correoPagoAviso(cfg, p, origen));
  await enviarCorreo(env, correoPagoCliente(cfg, p, origen));
}

// Puente de correo de ImportaYa (Google Apps Script), versión con respuesta automática de pagos.
// 1) Envía desde TU Gmail los correos que la página web le pide (doPost).
// 2) Cuando un cliente te manda su voucher con el asunto "PAGO REALIZADO - EMPRESA",
//    le responde solo: gracias, "es una inversión", el PDF y cómo enviar su banner (responderPagos).
//
// Cambia SOLO la clave si quieres; debe ser igual al secreto CORREO_CLAVE de Cloudflare.
var CLAVE = 'PON_AQUI_TU_CLAVE';
// Dirección de tu página, sin barra final. Ej.: https://importaya.pe  (si la dejas vacía, se aprende sola
// del primer correo que envíe la web).
var SITIO = '';
var ETIQUETA = 'ImportaYa-respondido';
var HORAS = 2;

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.clave !== CLAVE) return salida({ ok: false, error: 'clave' });
    if (!d.para || !d.asunto) return salida({ ok: false, error: 'faltan datos' });
    var opciones = { htmlBody: d.html || '', name: d.nombre || 'ImportaYa' };
    if (d.responder_a) opciones.replyTo = d.responder_a;
    if (d.pdf_url) {
      recordarSitio(d.pdf_url);
      var r = UrlFetchApp.fetch(d.pdf_url, { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) {
        opciones.attachments = [r.getBlob().setName(d.pdf_nombre || 'ImportaYa.pdf')];
      }
    }
    GmailApp.sendEmail(d.para, d.asunto, d.texto || '', opciones);
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function salida(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function recordarSitio(url) {
  var m = String(url).match(/^(https?:\/\/[^\/]+)/);
  if (m) PropertiesService.getScriptProperties().setProperty('SITIO', m[1]);
}

function sitio() {
  return (SITIO || PropertiesService.getScriptProperties().getProperty('SITIO') || '').replace(/\/+$/, '');
}

function escapar(t) {
  return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
}

// ── Respuesta automática a los vouchers ──
// Busca correos recibidos con asunto "PAGO REALIZADO - ..." que aún no se hayan respondido.
function responderPagos() {
  var yo = Session.getActiveUser().getEmail().toLowerCase();
  var etiqueta = GmailApp.getUserLabelByName(ETIQUETA) || GmailApp.createLabel(ETIQUETA);
  var hilos = GmailApp.search('subject:"PAGO REALIZADO" in:inbox -label:' + ETIQUETA, 0, 20);
  hilos.forEach(function (hilo) {
    var mensajes = hilo.getMessages();
    var primero = mensajes[0];
    var asunto = primero.getSubject();
    var remitente = primero.getFrom();
    // Solo asuntos que empiezan con PAGO REALIZADO, y nunca mensajes enviados por ti mismo
    if (!/^\s*PAGO REALIZADO/i.test(asunto) || remitente.toLowerCase().indexOf(yo) !== -1) {
      hilo.addLabel(etiqueta);
      return;
    }
    var empresa = asunto.replace(/^\s*PAGO REALIZADO\s*[-–—:]?\s*/i, '').trim() || 'tu empresa';
    var cuerpo = primero.getPlainBody() || '';
    var espacio = (cuerpo.match(/Espacio:\s*(.+)/i) || [])[1] || '';
    var nombre = (cuerpo.match(/Nombre:\s*(.+)/i) || [])[1] || '';
    var s = sitio();
    var opciones = { htmlBody: htmlRespuesta(empresa, nombre.trim(), espacio.trim(), s), name: 'ImportaYa' };
    if (s) {
      try {
        var r = UrlFetchApp.fetch(s + '/anunciate/Publicidad-ImportaYa.pdf', { muteHttpExceptions: true });
        if (r.getResponseCode() === 200) opciones.attachments = [r.getBlob().setName('Publicidad-ImportaYa.pdf')];
      } catch (err) { /* se responde igual, sin PDF */ }
    }
    hilo.reply('Gracias por tu pago. Es una inversión para ' + empresa + '. Responde este correo con tu banner en PNG o JPG y el link de destino; tu anuncio estará en la web dentro de ' + HORAS + ' horas.', opciones);
    hilo.addLabel(etiqueta);
  });
}

function htmlRespuesta(empresa, nombre, espacio, s) {
  var logo = s ? '<div style="background:#13315c;padding:16px 20px;border-radius:12px 12px 0 0"><img src="' + escapar(s) + '/assets/logo-importaya.png" alt="ImportaYa" width="220" style="display:block;border:0;max-width:100%;height:auto"></div><div style="height:4px;background:#f2711c"></div>' : '';
  return '<div style="max-width:640px;margin:0 auto;font-family:Arial,sans-serif;font-size:15px;color:#18212f;line-height:1.5">' + logo +
    '<div style="padding:20px 6px">' +
    '<p>Hola' + (nombre ? ' <b>' + escapar(nombre) + '</b>' : '') + ',</p>' +
    '<p>¡Muchas gracias! Recibimos tu voucher de <b>' + escapar(empresa) + '</b>. Lo que acabas de hacer <b>es una inversión</b> para hacer crecer tu empresa frente a importadores y exportadores del Perú.</p>' +
    (espacio ? '<p style="background:#f4f6fa;border-radius:8px;padding:10px 14px">Espacio contratado: <b>' + escapar(espacio) + '</b></p>' : '') +
    '<h3 style="color:#13315c;margin:20px 0 8px">Ahora envíanos tu anuncio</h3>' +
    '<p><b>Responde este mismo correo</b> con:</p>' +
    '<ol style="padding-left:20px;margin:0"><li>La <b>imagen de tu banner en PNG o JPG</b>, con la medida exacta de tu espacio' + (espacio ? ' (' + escapar(espacio) + ')' : ' (está en el PDF adjunto)') + '.</li>' +
    '<li>El <b>link (enlace)</b> a donde quieres que lleve tu anuncio cuando hagan clic.</li></ol>' +
    '<p style="background:#fff3e8;border-left:4px solid #f2711c;padding:10px 14px;margin:16px 0"><b>Tu anuncio estará en la página web dentro de ' + HORAS + ' horas</b> después de que nos envíes el archivo.</p>' +
    '<p>En el PDF adjunto ves las medidas de todos los espacios y cómo preparar tu imagen.</p>' +
    '<p>Un saludo,<br><b>Equipo ImportaYa</b><br><span style="color:#5b6779;font-size:13px">La web para importadores y exportadores del Perú</span></p>' +
    '</div></div>';
}

// Ejecútala UNA vez (botón ▶ Ejecutar) para que revise tu correo cada minuto. Pide permisos la primera vez.
function activarRespuestaAutomatica() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'responderPagos') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('responderPagos').timeBased().everyMinutes(1).create();
}

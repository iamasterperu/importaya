// Puente de correo de ImportaYa (Google Apps Script).
// Envía los correos desde TU Gmail cuando la página web se lo pide.
// Cambia SOLO la clave si quieres; debe ser igual al secreto CORREO_CLAVE de Cloudflare.
var CLAVE = 'PON_AQUI_TU_CLAVE';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    if (d.clave !== CLAVE) return salida({ ok: false, error: 'clave' });
    if (!d.para || !d.asunto) return salida({ ok: false, error: 'faltan datos' });
    var opciones = { htmlBody: d.html || '', name: d.nombre || 'ImportaYa' };
    if (d.responder_a) opciones.replyTo = d.responder_a;
    if (d.pdf_url) {
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

// Envío de correos desde el Gmail del dueño, usando un pequeño "puente" de Google Apps Script
// (ver docs/correo-apps-script.gs). Si no está configurado, simplemente no se envía nada.
export function correoConfigurado(env) {
  return Boolean(env.CORREO_URL && env.CORREO_CLAVE);
}

export async function enviarCorreo(env, datos) {
  if (!correoConfigurado(env)) return false;
  try {
    const r = await fetch(env.CORREO_URL, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ clave: env.CORREO_CLAVE, ...datos }),
      redirect: 'follow',
    });
    const texto = await r.text();
    const ok = r.ok && /"ok"\s*:\s*true/.test(texto);
    if (!ok) console.error('Correo no enviado:', r.status, texto.slice(0, 200));
    return ok;
  } catch (e) {
    console.error('Correo no enviado:', e);
    return false;
  }
}

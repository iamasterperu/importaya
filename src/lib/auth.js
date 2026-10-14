// Acceso al panel /admin con una sola contraseña (secreto ADMIN_PASSWORD).
const COOKIE = 'iy_admin';
const DIAS = 7;
const enc = new TextEncoder();

async function sha256(texto) {
  const d = new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(texto)));
  return [...d].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function leerCookie(request) {
  for (const parte of (request.headers.get('cookie') || '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === COOKIE) return v.join('=');
  }
  return null;
}

function cookie(valor, maxAge, request) {
  const segura = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${segura}`;
}

export async function claveCorrecta(env, intento) {
  const real = String(env.ADMIN_PASSWORD || '');
  if (real.length < 8) return false;
  // Se comparan los hash para no revelar nada por el tiempo de respuesta.
  const [a, b] = await Promise.all([sha256('iy:' + intento), sha256('iy:' + real)]);
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function crearSesion(db, request) {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  const expira = new Date(Date.now() + DIAS * 86400 * 1000).toISOString();
  await db.prepare('INSERT INTO sesiones (token_hash, expira) VALUES (?, ?)').bind(await sha256(token), expira).run();
  return cookie(token, DIAS * 86400, request);
}

export async function cerrarSesion(db, request) {
  const token = leerCookie(request);
  if (token) await db.prepare('DELETE FROM sesiones WHERE token_hash = ?').bind(await sha256(token)).run();
  return cookie('', 0, request);
}

export async function esAdmin(env, request) {
  const token = leerCookie(request);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const fila = await env.DB.prepare('SELECT 1 FROM sesiones WHERE token_hash = ? AND expira > ?')
    .bind(await sha256(token), new Date().toISOString())
    .first();
  return Boolean(fila);
}

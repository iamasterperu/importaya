// Utilidades HTTP y de fechas.

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}

export function error(mensaje, status = 400) {
  return json({ ok: false, error: mensaje }, status);
}

export function html(cuerpo, status = 200, headers = {}) {
  return new Response(cuerpo, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60', ...headers },
  });
}

export async function leerJson(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function ipCliente(request) {
  return request.headers.get('cf-connecting-ip') || '0.0.0.0';
}

export function urlBase(env, request) {
  const configurada = (env.SITE_URL || '').trim().replace(/\/+$/, '');
  return configurada || new URL(request.url).origin;
}

export function ahoraIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Fecha YYYY-MM-DD en hora de Lima (UTC-5, sin horario de verano).
export function fechaLima(d = new Date()) {
  return new Date(d.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function mesLima(d = new Date()) {
  return fechaLima(d).slice(0, 7);
}

export function mesAnterior(mes) {
  const [a, m] = mes.split('-').map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`;
}

export function esBot(request) {
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|curl|wget|python|headless/i.test(
    request.headers.get('user-agent') || ''
  );
}

// Límite simple de intentos guardado en D1. Devuelve true si se permite.
export async function permitir(db, clave, maximo, ventanaSeg) {
  const ahora = Math.floor(Date.now() / 1000);
  const fila = await db
    .prepare(
      `INSERT INTO rate_limits (clave, contador, expira) VALUES (?1, 1, ?2)
       ON CONFLICT(clave) DO UPDATE SET
         contador = CASE WHEN rate_limits.expira < ?3 THEN 1 ELSE rate_limits.contador + 1 END,
         expira   = CASE WHEN rate_limits.expira < ?3 THEN ?2 ELSE rate_limits.expira END
       RETURNING contador`
    )
    .bind(clave, ahora + ventanaSeg, ahora)
    .first();
  return fila.contador <= maximo;
}

// Solo se aceptan peticiones que modifican datos desde nuestro propio dominio.
export function mismoOrigen(request) {
  const origen = request.headers.get('origin');
  if (origen) return origen === new URL(request.url).origin;
  return /same-origin|none/.test(request.headers.get('sec-fetch-site') || '');
}

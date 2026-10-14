// Pagos con tarjeta mediante Mercado Pago (Checkout Pro): acepta tarjetas de crédito y débito.
// Requiere el secreto MP_ACCESS_TOKEN (Access Token de producción de tu cuenta de Mercado Pago).
const API = 'https://api.mercadopago.com';

// "S/ 400 al mes" → 400
export function montoDePrecio(texto) {
  const m = String(texto || '').match(/(\d[\d.,]*)/);
  if (!m) return 0;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function mpConfigurado(env) {
  return Boolean(env.MP_ACCESS_TOKEN);
}

async function llamar(env, ruta, opciones = {}) {
  const r = await fetch(API + ruta, {
    ...opciones,
    headers: { authorization: `Bearer ${env.MP_ACCESS_TOKEN}`, 'content-type': 'application/json', ...(opciones.headers || {}) },
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* sin cuerpo */ }
  if (!r.ok) console.error('Mercado Pago:', r.status, texto.slice(0, 300));
  return r.ok ? json : null;
}

// Crea la preferencia de pago y devuelve la dirección donde el cliente paga con su tarjeta.
export async function crearPreferencia(env, { pedidoId, titulo, monto, nombre, email, base }) {
  const datos = await llamar(env, '/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ id: `pedido-${pedidoId}`, title: titulo, quantity: 1, unit_price: monto, currency_id: 'PEN' }],
      payer: { name: nombre, email },
      external_reference: String(pedidoId),
      back_urls: {
        success: `${base}/anunciate/gracias?estado=ok`,
        pending: `${base}/anunciate/gracias?estado=pendiente`,
        failure: `${base}/anunciate/gracias?estado=fallo`,
      },
      auto_return: 'approved',
      notification_url: `${base}/api/mp/webhook`,
      statement_descriptor: 'IMPORTAYA',
    }),
  });
  return datos?.init_point || null;
}

export async function consultarPago(env, id) {
  return llamar(env, `/v1/payments/${encodeURIComponent(id)}`);
}

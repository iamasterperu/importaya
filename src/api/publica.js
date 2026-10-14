// API pública: búsquedas para el ranking, contacto de anunciantes, clics e imágenes de anuncios.
import { json, error, leerJson, ipCliente, permitir, ahoraIso, fechaLima, mesLima, esBot } from '../lib/http.js';
import { terminoLimpio } from '../lib/texto.js';
import { ESPACIOS } from '../lib/anuncios.js';
import { leerConfig } from '../lib/config.js';
import { avisarContacto, avisarPago } from '../lib/correos-ventas.js';

export function registrarBusqueda(db, termino, tipo) {
  return db
    .prepare(
      `INSERT INTO busquedas_mes (mes, termino, tipo, cantidad) VALUES (?, ?, ?, 1)
       ON CONFLICT(mes, termino, tipo) DO UPDATE SET cantidad = cantidad + 1`
    )
    .bind(mesLima(), termino, tipo)
    .run();
}

// POST /api/busqueda  { termino, tipo: 'calculadora' }
export async function busqueda(ctx) {
  const { request, env } = ctx;
  const datos = await leerJson(request);
  const termino = terminoLimpio(datos?.termino);
  if (!termino) return json({ ok: true });
  if (esBot(request)) return json({ ok: true });
  if (!(await permitir(env.DB, `busq:${ipCliente(request)}`, 30, 3600))) return json({ ok: true });
  await registrarBusqueda(env.DB, termino, 'calculadora');
  return json({ ok: true });
}

// POST /api/contacto  (formulario de "Anúnciate")
export async function contacto(ctx) {
  const { request, env } = ctx;
  const d = await leerJson(request);
  if (!d) return error('Datos no válidos.');
  if (d.web) return json({ ok: true }); // trampa para robots
  const limpio = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  const nombre = limpio(d.nombre, 80);
  const email = limpio(d.email, 120);
  const telefono = limpio(d.telefono, 30);
  if (nombre.length < 2) return error('Escribe tu nombre.');
  if (!email && !telefono) return error('Déjanos un correo o un teléfono para responderte.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('El correo no es válido.');
  if (!(await permitir(env.DB, `contacto:${ipCliente(request)}`, 5, 3600))) {
    return error('Recibimos varios mensajes desde tu conexión. Inténtalo más tarde.', 429);
  }
  const espacio = ESPACIOS[d.espacio] ? d.espacio : '';
  await env.DB.prepare('INSERT INTO contactos (nombre, empresa, email, telefono, espacio, mensaje, creado) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(nombre, limpio(d.empresa, 100), email, telefono, espacio, limpio(d.mensaje, 1000), ahoraIso())
    .run();
  // Aviso al dueño y respuesta automática (si el envío de correos está configurado)
  const datos = { nombre, empresa: limpio(d.empresa, 100), email, telefono, espacio, mensaje: limpio(d.mensaje, 1000) };
  const origen = new URL(request.url).origin;
  ctx.waitUntil(leerConfig(env.DB).then((cfg) => avisarContacto(env, cfg, datos, origen)).catch((e) => console.error(e)));
  return json({ ok: true });
}

// POST /api/pago  ("Ya pagué": avisa al dueño y confirma al anunciante)
export async function pago(ctx) {
  const { request, env } = ctx;
  const d = await leerJson(request);
  if (!d) return error('Datos no válidos.');
  if (d.web) return json({ ok: true });
  const limpio = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  const nombre = limpio(d.nombre, 80);
  const empresa = limpio(d.empresa, 100);
  const email = limpio(d.email, 120);
  if (nombre.length < 2) return error('Escribe tu nombre.');
  if (empresa.length < 2) return error('Escribe el nombre de tu empresa.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Escribe un correo válido: ahí te enviamos la confirmación.');
  if (!ESPACIOS[d.espacio]) return error('Elige el espacio que pagaste.');
  const metodo = d.metodo === 'transferencia' ? 'transferencia' : 'yape';
  if (!(await permitir(env.DB, `pago:${ipCliente(request)}`, 5, 3600))) {
    return error('Recibimos varios avisos desde tu conexión. Inténtalo más tarde.', 429);
  }
  const datos = { nombre, empresa, email, telefono: limpio(d.telefono, 30), espacio: d.espacio, metodo, operacion: limpio(d.operacion, 40) };
  await env.DB.prepare('INSERT INTO pagos (nombre, empresa, email, telefono, espacio, metodo, operacion, creado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(datos.nombre, datos.empresa, datos.email, datos.telefono, datos.espacio, datos.metodo, datos.operacion, ahoraIso())
    .run();
  const origen = new URL(request.url).origin;
  ctx.waitUntil(leerConfig(env.DB).then((cfg) => avisarPago(env, cfg, datos, origen)).catch((e) => console.error(e)));
  return json({ ok: true });
}

// GET /ad/:id → cuenta el clic y lleva al sitio del anunciante.
export async function clicAnuncio(ctx, id) {
  const { env, request } = ctx;
  const a = await env.DB.prepare('SELECT enlace FROM anuncios WHERE id = ?').bind(id).first();
  if (!a) return Response.redirect(new URL('/', request.url).toString(), 302);
  if (!esBot(request)) {
    ctx.waitUntil(
      env.DB.prepare(
        `INSERT INTO anuncio_stats (anuncio_id, fecha, clics) VALUES (?, ?, 1)
         ON CONFLICT(anuncio_id, fecha) DO UPDATE SET clics = clics + 1`
      )
        .bind(id, fechaLima())
        .run()
    );
  }
  return new Response(null, { status: 302, headers: { location: a.enlace, 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}

// GET /img/:id → imagen de anuncio subida desde el panel.
export async function imagen(ctx, id) {
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response('No encontrado', { status: 404 });
  const fila = await ctx.env.DB.prepare('SELECT tipo, datos FROM imagenes WHERE id = ?').bind(id).first();
  if (!fila) return new Response('No encontrado', { status: 404 });
  return new Response(new Uint8Array(fila.datos), {
    headers: { 'content-type': fila.tipo, 'cache-control': 'public, max-age=31536000, immutable' },
  });
}

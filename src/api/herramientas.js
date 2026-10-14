// API pública de las herramientas: buscador de partidas y registro en el directorio de empresas.
import { json, error, leerJson, ipCliente, permitir, ahoraIso } from '../lib/http.js';
import { sinAcentos, urlSegura, recortar } from '../lib/texto.js';
import { soloDigitos, formatoPartida, rucEmpresa, TIPOS_EMPRESA, SINONIMOS, singular } from '../lib/aduana.js';

export const LIMITE_PARTIDAS = 30;

// Convierte lo que escribe la persona en condiciones de búsqueda. Pura, para poder probarla.
export function condicionesPartida(q) {
  const texto = String(q || '').trim().slice(0, 60);
  if (/^[\d.\s]+$/.test(texto)) {
    const digitos = soloDigitos(texto);
    if (digitos.length < 2) return null;
    return { sql: 'codigo LIKE ?', valores: [`${digitos}%`], orden: 'codigo' };
  }
  const palabras = sinAcentos(texto)
    .toLowerCase()
    .replace(/[%_]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 5)
    .map(singular);
  if (!palabras.length) return null;
  const grupos = palabras.map((w) => [w, ...(SINONIMOS[w] || [])]);
  return {
    // Cada palabra debe aparecer (ella o un sinónimo); entre palabras manda el "y".
    sql: grupos.map((g) => (g.length > 1 ? `(${g.map(() => 'busqueda LIKE ?').join(' OR ')})` : 'busqueda LIKE ?')).join(' AND '),
    valores: grupos.flat().map((w) => `%${w}%`),
    orden: 'codigo',
  };
}

// GET /api/partidas?q=audifonos   o   ?q=8518
export async function partidas(ctx) {
  const { request, env } = ctx;
  const db = env.DB;
  if (!(await permitir(db, `part:${ipCliente(request)}`, 90, 60))) {
    return error('Demasiadas búsquedas seguidas. Espera un minuto.', 429);
  }
  const total = await db.prepare('SELECT COUNT(*) AS n FROM partidas').first();
  if (!total || !total.n) return json({ ok: true, vacia: true, resultados: [], limite: LIMITE_PARTIDAS });

  const cond = condicionesPartida(new URL(request.url).searchParams.get('q'));
  if (!cond) return json({ ok: true, vacia: false, resultados: [], limite: LIMITE_PARTIDAS });

  const { results } = await db
    .prepare(`SELECT codigo, descripcion, advalorem, notas FROM partidas WHERE ${cond.sql} ORDER BY ${cond.orden} LIMIT ${LIMITE_PARTIDAS}`)
    .bind(...cond.valores)
    .all();
  return json({
    ok: true,
    vacia: false,
    limite: LIMITE_PARTIDAS,
    resultados: results.map((r) => ({ ...r, formato: formatoPartida(r.codigo) })),
  });
}

// POST /api/directorio  (la empresa pide figurar en el directorio; queda "pendiente" hasta que se apruebe en /admin)
export async function registrarEmpresa(ctx) {
  const { request, env } = ctx;
  const d = await leerJson(request);
  if (!d) return error('Datos no válidos.');
  if (d.sitio_extra) return json({ ok: true }); // trampa para robots

  const limpio = (v, max) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  const razon = limpio(d.razon_social, 120);
  const ruc = soloDigitos(d.ruc);
  const tipo = TIPOS_EMPRESA[d.tipo] ? d.tipo : '';
  const email = limpio(d.email, 120);
  const telefono = limpio(d.telefono, 30);
  const webEscrita = limpio(d.web, 200);
  const web = webEscrita ? urlSegura(/^https?:\/\//i.test(webEscrita) ? webEscrita : `https://${webEscrita}`) : '';

  if (razon.length < 3) return error('Escribe el nombre o razón social de la empresa.');
  if (!rucEmpresa(ruc)) return error('El RUC no es válido. Debe tener 11 dígitos y empezar con 20 (empresas).');
  if (!tipo) return error('Elige a qué se dedica tu empresa.');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('Escribe un correo válido (no se publica, solo lo usamos para verificarte).');
  if (webEscrita && !web) return error('La página web no es válida.');
  if (d.autorizo !== true) return error('Debes autorizar la publicación de los datos de tu empresa.');

  if (!(await permitir(env.DB, `directorio:${ipCliente(request)}`, 3, 3600))) {
    return error('Recibimos varios registros desde tu conexión. Inténtalo más tarde.', 429);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO empresas (ruc, razon_social, tipo, rubro, productos, ciudad, web, telefono, email, descripcion, estado, creado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente', ?)`
    )
      .bind(ruc, razon, tipo, limpio(d.rubro, 80), limpio(d.productos, 200), limpio(d.ciudad, 60), web, telefono, email, recortar(limpio(d.descripcion, 400), 400), ahoraIso())
      .run();
  } catch {
    return error('Ya recibimos una solicitud con ese RUC.');
  }
  return json({ ok: true });
}

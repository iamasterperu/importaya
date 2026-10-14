// Ajustes editables desde /admin (tabla config), con valores por defecto.
import { CONFIG } from './semillas.js';

export async function leerConfig(db) {
  const { results } = await db.prepare('SELECT clave, valor FROM config').all();
  const c = { ...CONFIG };
  for (const r of results) c[r.clave] = r.valor;
  return c;
}

export async function guardarConfig(db, cambios) {
  const permitidas = Object.keys(CONFIG);
  const sentencias = Object.entries(cambios)
    .filter(([k]) => permitidas.includes(k))
    .map(([k, v]) =>
      db.prepare('INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor')
        .bind(k, String(v ?? '').slice(0, 4000))
    );
  if (sentencias.length) await db.batch(sentencias);
  return sentencias.length;
}

export function listaPalabras(texto) {
  return String(texto || '')
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

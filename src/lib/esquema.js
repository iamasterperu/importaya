// Crea las tablas de D1 la primera vez y carga los datos iniciales.
import ESQUEMA from '../../schema.sql';
import { FUENTES, CANALES, CONFIG } from './semillas.js';

const SENTENCIAS = ESQUEMA.split('\n')
  .map((linea) => linea.replace(/--.*$/, ''))
  .join('\n')
  .split(';')
  .map((s) => s.trim())
  .filter(Boolean);

let listo = null;

export function asegurarEsquema(db) {
  if (!listo) {
    listo = crear(db).catch((e) => {
      listo = null; // se reintenta en la siguiente petición
      throw e;
    });
  }
  return listo;
}

async function crear(db) {
  await db.batch(SENTENCIAS.map((s) => db.prepare(s)));
  const sembrado = await db.prepare("SELECT valor FROM config WHERE clave = 'sembrado'").first();
  if (sembrado) return;
  const sentencias = [];
  for (const f of FUENTES) {
    sentencias.push(
      db.prepare('INSERT OR IGNORE INTO fuentes (nombre, url, pais, idioma, filtrar) VALUES (?, ?, ?, ?, ?)')
        .bind(f.nombre, f.url, f.pais, f.idioma || 'es', f.filtrar || 0)
    );
  }
  for (const c of CANALES) {
    sentencias.push(
      db.prepare('INSERT OR IGNORE INTO canales (nombre, entrada, categoria, principal) VALUES (?, ?, ?, ?)')
        .bind(c.nombre, c.entrada, c.categoria, c.principal || 0)
    );
  }
  for (const [clave, valor] of Object.entries(CONFIG)) {
    sentencias.push(db.prepare('INSERT OR IGNORE INTO config (clave, valor) VALUES (?, ?)').bind(clave, valor));
  }
  sentencias.push(db.prepare("INSERT OR IGNORE INTO config (clave, valor) VALUES ('sembrado', '1')"));
  await db.batch(sentencias);
}

// Ranking mensual de lo más buscado y limpieza de datos antiguos.
import { leerConfig, listaPalabras } from '../lib/config.js';
import { mesLima, mesAnterior } from '../lib/http.js';

// El día 1 de cada mes se guarda el top 10 del mes que terminó.
export async function cerrarRankingMensual(env) {
  const db = env.DB;
  const mes = mesAnterior(mesLima());
  const ya = await db.prepare('SELECT 1 FROM ranking_mensual WHERE mes = ? LIMIT 1').bind(mes).first();
  if (ya) return `Ranking de ${mes} ya estaba guardado`;
  const top = await topTerminos(db, mes, 10);
  if (!top.length) return `Sin búsquedas en ${mes}`;
  await db.batch(
    top.map((t, i) =>
      db.prepare('INSERT OR IGNORE INTO ranking_mensual (mes, posicion, termino, cantidad) VALUES (?, ?, ?, ?)').bind(mes, i + 1, t.termino, t.cantidad)
    )
  );
  return `Ranking de ${mes} guardado (${top.length} términos)`;
}

export async function topTerminos(db, mes, limite = 10) {
  const cfg = await leerConfig(db);
  const ocultos = listaPalabras(cfg.terminos_ocultos);
  const { results } = await db
    .prepare(
      `SELECT termino, SUM(cantidad) AS cantidad FROM busquedas_mes WHERE mes = ?
        GROUP BY termino ORDER BY cantidad DESC LIMIT ?`
    )
    .bind(mes, limite + ocultos.length)
    .all();
  return results.filter((r) => !ocultos.includes(r.termino)).slice(0, limite);
}

export async function limpiar(env) {
  const db = env.DB;
  const ahora = Math.floor(Date.now() / 1000);
  const hace180 = new Date(Date.now() - 180 * 86400 * 1000).toISOString();
  const hace400 = new Date(Date.now() - 400 * 86400 * 1000).toISOString().slice(0, 10);
  const r = await db.batch([
    db.prepare('DELETE FROM noticias WHERE publicado < ? AND destacada = 0').bind(hace180),
    db.prepare(
      `DELETE FROM videos WHERE video_id IN (
         SELECT video_id FROM (
           SELECT video_id, ROW_NUMBER() OVER (PARTITION BY canal_id ORDER BY publicado DESC) AS n FROM videos
         ) WHERE n > 40)`
    ),
    db.prepare('DELETE FROM rate_limits WHERE expira < ?').bind(ahora),
    db.prepare('DELETE FROM sesiones WHERE expira < ?').bind(new Date().toISOString()),
    db.prepare('DELETE FROM anuncio_stats WHERE fecha < ?').bind(hace400),
    db.prepare('DELETE FROM visitas_dia WHERE fecha < ?').bind(hace400),
  ]);
  return `Limpieza: ${r[0].meta.changes} noticias y ${r[1].meta.changes} videos antiguos borrados`;
}

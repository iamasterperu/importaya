// Aplica el filtro de temas a lo que ya está guardado (noticias y videos).
// Sirve para limpiar lo que entró antes del filtro y para que un cambio en Ajustes se note enseguida.
import { leerConfig } from '../lib/config.js';
import { crearFiltro } from '../lib/filtro.js';

export async function limpiarFueraDeTema(env) {
  const db = env.DB;
  const filtro = crearFiltro(await leerConfig(db));

  // Las noticias destacadas a mano no se tocan.
  const { results: notas } = await db
    .prepare('SELECT id, titulo, titulo_original, descripcion FROM noticias WHERE destacada = 0 ORDER BY publicado DESC LIMIT 2000')
    .all();
  const notasFuera = notas.filter((n) => !filtro.relevante(n.titulo_original || n.titulo, n.descripcion)).map((n) => n.id);

  const { results: videos } = await db.prepare('SELECT video_id, titulo FROM videos ORDER BY publicado DESC LIMIT 3000').all();
  const videosFuera = videos.filter((v) => !filtro.relevante(v.titulo)).map((v) => v.video_id);

  const sentencias = [];
  for (let i = 0; i < notasFuera.length; i += 50) {
    const ids = notasFuera.slice(i, i + 50);
    sentencias.push(db.prepare(`DELETE FROM noticias WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids));
  }
  for (let i = 0; i < videosFuera.length; i += 50) {
    const ids = videosFuera.slice(i, i + 50);
    sentencias.push(db.prepare(`DELETE FROM videos WHERE video_id IN (${ids.map(() => '?').join(',')})`).bind(...ids));
  }
  if (sentencias.length) await db.batch(sentencias);
  return `Filtro de temas: ${notasFuera.length} noticias y ${videosFuera.length} videos fuera de tema retirados`;
}

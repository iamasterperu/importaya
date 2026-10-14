// Revisa los canales de YouTube y guarda sus videos nuevos.
// YouTube publica gratis la lista de videos de cada canal (sin clave de API).
import { leerYoutube } from '../lib/rss.js';
import { ahoraIso } from '../lib/http.js';
import { leerConfig } from '../lib/config.js';
import { crearFiltro } from '../lib/filtro.js';

const NAVEGADOR = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'accept-language': 'es-419,es;q=0.9',
  // Evita la pantalla de "aceptar cookies" de YouTube en algunos países.
  cookie: 'CONSENT=YES+cb; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVzIAEaBgiA_LyaBg',
};

export async function actualizarVideos(env, { lote = 12, soloCanal = null } = {}) {
  const db = env.DB;
  const canales = soloCanal
    ? (await db.prepare('SELECT * FROM canales WHERE id = ?').bind(soloCanal).all()).results
    : (
        await db
          .prepare('SELECT * FROM canales WHERE activo = 1 ORDER BY ultimo_intento IS NOT NULL, ultimo_intento ASC LIMIT ?')
          .bind(lote)
          .all()
      ).results;
  const filtro = crearFiltro(await leerConfig(db));
  const res = await Promise.all(canales.map((c) => procesarCanal(db, c, filtro)));
  const nuevos = res.reduce((a, r) => a + r.nuevos, 0);
  const errores = res.filter((r) => r.error).length;
  return `${canales.length} canales revisados, ${nuevos} videos nuevos${errores ? `, ${errores} con error` : ''}`;
}

async function procesarCanal(db, c, filtro) {
  const ahora = ahoraIso();
  try {
    let id = c.channel_id;
    if (!id) {
      id = await resolverCanal(c.entrada);
      await db.prepare('UPDATE canales SET channel_id = ? WHERE id = ?').bind(id, c.id).run();
    }
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, {
      headers: { 'user-agent': NAVEGADOR['user-agent'] },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(`YouTube respondió ${r.status}`);
    // Solo se guardan los videos cuyo título habla de comercio exterior o economía.
    const videos = leerYoutube(await r.text(), 15).filter((v) => filtro.relevante(v.titulo));
    let nuevos = 0;
    if (videos.length) {
      const res = await db.batch(
        videos.map((v) =>
          db
            .prepare('INSERT OR IGNORE INTO videos (video_id, canal_id, canal_nombre, titulo, publicado, es_short) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(v.id, c.id, c.nombre, v.titulo.slice(0, 200), v.fecha, v.short ? 1 : 0)
        )
      );
      nuevos = res.reduce((a, x) => a + (x.meta?.changes || 0), 0);
    }
    await db
      .prepare('UPDATE canales SET ultimo_intento = ?, ultimo_ok = ?, ultimo_error = NULL WHERE id = ?')
      .bind(ahora, ahora, c.id)
      .run();
    return { nuevos };
  } catch (e) {
    await db
      .prepare('UPDATE canales SET ultimo_intento = ?, ultimo_error = ? WHERE id = ?')
      .bind(ahora, String(e.message || e).slice(0, 200), c.id)
      .run();
    return { nuevos: 0, error: true };
  }
}

// Acepta: UCxxxxxxxx, @usuario, o un enlace de YouTube (canal, @usuario o video).
export async function resolverCanal(entrada) {
  const e = String(entrada || '').trim();
  const directo = e.match(/(UC[\w-]{22})/);
  if (directo) return directo[1];
  let url;
  if (/^@[\w.-]+$/.test(e)) url = `https://www.youtube.com/${e}`;
  else if (/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(e)) url = e;
  else if (/^[\w.-]+$/.test(e)) url = `https://www.youtube.com/@${e}`;
  else throw new Error('Escribe el @usuario del canal o su enlace de YouTube');
  const r = await fetch(url, { headers: NAVEGADOR, signal: AbortSignal.timeout(12000) });
  if (!r.ok) throw new Error(`No se encontró el canal (YouTube respondió ${r.status})`);
  const pagina = await r.text();
  const m =
    pagina.match(/"externalId":"(UC[\w-]{22})"/) ||
    pagina.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/) ||
    pagina.match(/itemprop="(?:identifier|channelId)" content="(UC[\w-]{22})"/) ||
    pagina.match(/"channelId":"(UC[\w-]{22})"/);
  if (!m) throw new Error('No se pudo leer el ID del canal. Pega el ID que empieza con UC');
  return m[1];
}

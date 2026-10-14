// Trae noticias nuevas de las fuentes RSS y las guarda en D1.
import { leerFeed } from '../lib/rss.js';
import { leerConfig, listaPalabras } from '../lib/config.js';
import { ahoraIso } from '../lib/http.js';
import { tituloNorm, sinAcentos, urlSegura, recortar } from '../lib/texto.js';

const UA = 'Mozilla/5.0 (compatible; ImportaYaBot/1.0; +https://importaya.pe)';
const DIAS_MAX = 10;

export async function actualizarNoticias(env, { lote = 10, soloFuente = null } = {}) {
  const db = env.DB;
  const cfg = await leerConfig(db);
  const palabras = listaPalabras(cfg.palabras_clave).map(sinAcentos);
  const fuentes = soloFuente
    ? (await db.prepare('SELECT * FROM fuentes WHERE id = ?').bind(soloFuente).all()).results
    : (
        await db
          .prepare('SELECT * FROM fuentes WHERE activa = 1 ORDER BY ultimo_intento IS NOT NULL, ultimo_intento ASC LIMIT ?')
          .bind(lote)
          .all()
      ).results;

  const resultados = await Promise.all(fuentes.map((f) => procesarFuente(db, f, palabras)));
  const nuevas = resultados.reduce((a, r) => a + r.nuevas, 0);
  const errores = resultados.filter((r) => r.error).length;
  return `${fuentes.length} fuentes revisadas, ${nuevas} noticias nuevas${errores ? `, ${errores} con error` : ''}`;
}

async function procesarFuente(db, f, palabras) {
  const ahora = ahoraIso();
  try {
    const r = await fetch(f.url, {
      headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(`La fuente respondió ${r.status}`);
    const xml = await r.text();
    const items = leerFeed(xml, 30);
    if (!items.length && !/<(rss|feed|rdf)/i.test(xml.slice(0, 2000))) throw new Error('No es un RSS válido');

    const limite = Date.now() - DIAS_MAX * 86400 * 1000;
    const sentencias = [];
    for (const it of items) {
      const n = normalizar(it, f);
      if (!n) continue;
      if (new Date(n.publicado).getTime() < limite) continue;
      if (f.filtrar && !coincide(n.titulo + ' ' + n.descripcion, palabras)) continue;
      sentencias.push(
        db
          .prepare(
            `INSERT OR IGNORE INTO noticias
               (url, titulo_norm, titulo, titulo_original, descripcion, imagen, fuente_id, fuente_nombre, pais, idioma, publicado, creado)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .bind(n.url, n.norm, n.titulo, n.titulo, n.descripcion, n.imagen, f.id, n.fuente, f.pais, f.idioma, n.publicado, ahora)
      );
    }
    let nuevas = 0;
    if (sentencias.length) {
      const res = await db.batch(sentencias);
      nuevas = res.reduce((a, x) => a + (x.meta?.changes || 0), 0);
    }
    await db
      .prepare('UPDATE fuentes SET ultimo_intento = ?, ultimo_ok = ?, ultimo_error = NULL, items_ultimo = ? WHERE id = ?')
      .bind(ahora, ahora, items.length, f.id)
      .run();
    return { nuevas };
  } catch (e) {
    await db
      .prepare('UPDATE fuentes SET ultimo_intento = ?, ultimo_error = ? WHERE id = ?')
      .bind(ahora, String(e.message || e).slice(0, 200), f.id)
      .run();
    return { nuevas: 0, error: true };
  }
}

function normalizar(it, f) {
  let titulo = it.titulo;
  const url = urlSegura(it.enlace);
  if (!titulo || !url) return null;
  let fuente = it.fuente || (/^(Google|Bing) Noticias/.test(f.nombre) ? '' : f.nombre.split(' · ')[0]);
  // Google Noticias pone "Titular - Medio": se separa el medio.
  const guion = titulo.lastIndexOf(' - ');
  if (guion > 20 && it.fuente && titulo.slice(guion + 3).trim() === it.fuente) {
    fuente = it.fuente;
    titulo = titulo.slice(0, guion).trim();
  }
  if (!fuente) fuente = f.nombre;
  const norm = tituloNorm(titulo);
  if (norm.length < 15) return null;
  let descripcion = it.descripcion || '';
  // Si la descripción solo repite el título (Google Noticias), no sirve.
  const dn = tituloNorm(descripcion);
  if (dn.startsWith(norm.slice(0, 40)) && descripcion.length < titulo.length + 80) descripcion = '';
  if (descripcion.length < 40) descripcion = '';
  descripcion = recortar(descripcion.replace(/\s*(The post|La entrada) .{0,200} (appeared first on|se publicó primero en) .*$/i, ''), 700);
  let publicado = it.fecha || ahoraIso();
  if (new Date(publicado).getTime() > Date.now() + 3600 * 1000) publicado = ahoraIso();
  return {
    titulo: recortar(titulo, 220),
    url,
    norm,
    descripcion,
    imagen: urlSegura(it.imagen) || null,
    fuente: recortar(fuente, 80),
    publicado,
  };
}

function coincide(texto, palabras) {
  const t = sinAcentos(texto).toLowerCase();
  return palabras.some((p) => t.includes(p));
}

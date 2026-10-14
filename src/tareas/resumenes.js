// Escribe con IA un resumen propio (y traduce al español las noticias en inglés).
import { generarTexto } from '../lib/ia.js';
import { leerConfig } from '../lib/config.js';
import { recortar } from '../lib/texto.js';

const SISTEMA =
  'Eres editor de ImportaYa, un portal peruano de noticias de importación y comercio exterior. ' +
  'Escribes en español neutro, claro y breve. Usas SOLO la información del texto que te dan: ' +
  'no inventas cifras, nombres, fechas ni opiniones. Nunca copias frases largas del original.';

export async function generarResumenes(env, { cantidad } = {}) {
  const db = env.DB;
  const cfg = await leerConfig(db);
  if (cfg.ia_activa !== '1') return 'IA desactivada en ajustes';
  const n = Math.min(Math.max(Number(cantidad || cfg.ia_por_hora) || 15, 1), 40);
  const { results } = await db
    .prepare(
      `SELECT id, titulo, titulo_original, descripcion, idioma, fuente_nombre FROM noticias
        WHERE resumen_ia = 0 AND ia_intentos < 3 AND oculta = 0
          AND (length(descripcion) >= 120 OR idioma <> 'es')
        ORDER BY publicado DESC LIMIT ?`
    )
    .bind(n)
    .all();

  let hechos = 0;
  let ultimoError = '';
  for (const nota of results) {
    try {
      const r = await resumir(env, nota);
      await db
        .prepare('UPDATE noticias SET titulo = ?, resumen = ?, resumen_ia = 1, ia_intentos = ia_intentos + 1 WHERE id = ?')
        .bind(r.titulo, r.resumen, nota.id)
        .run();
      hechos++;
    } catch (e) {
      ultimoError = String(e.message || e);
      // Sin ninguna IA disponible no se gastan los intentos de la noticia.
      if (/No hay IA configurada/.test(ultimoError)) break;
      await db.prepare('UPDATE noticias SET ia_intentos = ia_intentos + 1 WHERE id = ?').bind(nota.id).run();
      // Si se acabó el uso gratis del día, no se insiste más en esta ronda.
      if (/limit|quota|429|exceeded|neurons/i.test(ultimoError)) break;
    }
  }
  return `${hechos} de ${results.length} resúmenes hechos${ultimoError ? ` (último error: ${ultimoError.slice(0, 120)})` : ''}`;
}

export async function resumir(env, nota) {
  const enIngles = nota.idioma !== 'es';
  const tieneTexto = (nota.descripcion || '').length >= 120;
  const usuario = [
    `Fuente: ${nota.fuente_nombre}`,
    `Título original: ${nota.titulo_original || nota.titulo}`,
    tieneTexto ? `Texto: ${nota.descripcion}` : '',
    '',
    'Responde EXACTAMENTE con este formato, en español:',
    'TITULO: (titular en español de máximo 110 caracteres)',
    tieneTexto
      ? 'RESUMEN: (2 o 3 oraciones, máximo 380 caracteres, con los datos principales del texto)'
      : 'RESUMEN: -',
  ]
    .filter((l) => l !== '')
    .join('\n');

  const { texto } = await generarTexto(env, SISTEMA, usuario);
  const titulo = limpiar((texto.match(/T[IÍ]TULO\s*:\s*(.+)/i) || [])[1]);
  let resumen = limpiar((texto.match(/RESUMEN\s*:\s*([\s\S]+)/i) || [])[1]);
  if (resumen === '-' || !tieneTexto) resumen = '';
  if (!titulo || titulo.length < 15) throw new Error('La IA no devolvió un título válido');
  if (tieneTexto && resumen.length < 60) throw new Error('La IA no devolvió un resumen válido');
  return {
    titulo: recortar(enIngles ? titulo : nota.titulo, 220),
    resumen: resumen ? recortar(resumen, 480) : null,
  };
}

function limpiar(s) {
  return String(s || '')
    .replace(/\*\*/g, '')
    .replace(/^["“'«\s]+|["”'»\s]+$/g, '')
    .split(/\n\s*\n/)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

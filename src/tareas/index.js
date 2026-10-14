// Reparte las tareas automáticas según el minuto (el cron corre cada 15 minutos)
// y guarda el resultado de cada una para verlo en /admin.
import { actualizarNoticias } from './noticias.js';
import { actualizarVideos } from './videos.js';
import { actualizarTipoCambio } from './tipo-cambio.js';
import { generarResumenes } from './resumenes.js';
import { cerrarRankingMensual, limpiar } from './mantenimiento.js';
import { limpiarFueraDeTema } from './filtrar.js';
import { ahoraIso } from '../lib/http.js';

export const TAREAS = {
  noticias: (env) => actualizarNoticias(env),
  videos: (env) => actualizarVideos(env),
  tipo_cambio: (env) => actualizarTipoCambio(env),
  resumenes: (env) => generarResumenes(env),
  ranking: (env) => cerrarRankingMensual(env),
  limpieza: (env) => limpiar(env),
  filtro: (env) => limpiarFueraDeTema(env),
};

export async function ejecutarTarea(env, nombre) {
  let resultado;
  let ok = true;
  try {
    resultado = await TAREAS[nombre](env);
  } catch (e) {
    ok = false;
    resultado = 'Error: ' + String(e.message || e).slice(0, 300);
    console.error(nombre, e);
  }
  await env.DB.prepare(
    'INSERT INTO tareas_log (tarea, ultima, resultado) VALUES (?, ?, ?) ON CONFLICT(tarea) DO UPDATE SET ultima = excluded.ultima, resultado = excluded.resultado'
  )
    .bind(nombre, ahoraIso(), resultado)
    .run();
  return { ok, resultado };
}

export function tareasDelMinuto(fecha) {
  const minuto = fecha.getUTCMinutes();
  if (minuto < 15) return ['noticias'];
  if (minuto < 30) return ['videos'];
  if (minuto < 45) return ['noticias'];
  const lista = ['tipo_cambio', 'resumenes'];
  if (fecha.getUTCHours() === 8) lista.push('ranking', 'limpieza'); // 3 a. m. en Lima
  return lista;
}

// Tipo de cambio del dólar (SUNAT). Prueba varias fuentes públicas en orden.
import { ahoraIso, fechaLima } from '../lib/http.js';

const FUENTES = [
  {
    nombre: 'SUNAT',
    url: 'https://www.sunat.gob.pe/a/txt/tipoCambio.txt',
    leer: (t) => {
      // Formato: dd/mm/aaaa|compra|venta|
      const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})\s*\|\s*(\d+\.\d+)\s*\|\s*(\d+\.\d+)/);
      return m && { fecha: `${m[3]}-${m[2]}-${m[1]}`, compra: +m[4], venta: +m[5] };
    },
  },
  {
    nombre: 'SUNAT (vía apis.net.pe)',
    url: 'https://api.apis.net.pe/v1/tipo-cambio-sunat',
    leer: (t) => {
      const d = JSON.parse(t);
      return d && d.compra && { fecha: d.fecha || null, compra: +d.compra, venta: +d.venta };
    },
  },
  {
    nombre: 'Referencial de mercado',
    url: 'https://open.er-api.com/v6/latest/USD',
    leer: (t) => {
      const v = JSON.parse(t)?.rates?.PEN;
      return v && { fecha: null, compra: +v, venta: +v };
    },
  },
];

export async function actualizarTipoCambio(env) {
  const errores = [];
  for (const f of FUENTES) {
    try {
      const r = await fetch(f.url, {
        headers: { 'user-agent': 'Mozilla/5.0 (compatible; ImportaYaBot/1.0)' },
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw new Error(`respondió ${r.status}`);
      const d = f.leer(await r.text());
      if (!d || !(d.compra > 2.5 && d.compra < 6 && d.venta > 2.5 && d.venta < 6)) throw new Error('dato no válido');
      const fecha = d.fecha && /^\d{4}-\d{2}-\d{2}$/.test(d.fecha) ? d.fecha : fechaLima();
      await env.DB.prepare(
        `INSERT INTO tipo_cambio (fecha, compra, venta, fuente, actualizado) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(fecha) DO UPDATE SET compra = excluded.compra, venta = excluded.venta,
           fuente = excluded.fuente, actualizado = excluded.actualizado
         WHERE tipo_cambio.fuente NOT LIKE 'SUNAT%' OR excluded.fuente LIKE 'SUNAT%'`
      )
        .bind(fecha, d.compra, d.venta, f.nombre, ahoraIso())
        .run();
      return `${f.nombre}: compra ${d.compra.toFixed(3)} · venta ${d.venta.toFixed(3)} (${fecha})`;
    } catch (e) {
      errores.push(`${f.nombre}: ${e.message}`);
    }
  }
  throw new Error('Sin tipo de cambio. ' + errores.join(' | '));
}

export async function tipoCambioActual(db) {
  return db.prepare('SELECT * FROM tipo_cambio ORDER BY fecha DESC LIMIT 1').first();
}

export async function historialTipoCambio(db, dias = 30) {
  const { results } = await db
    .prepare('SELECT fecha, venta FROM tipo_cambio ORDER BY fecha DESC LIMIT ?')
    .bind(dias)
    .all();
  return results.reverse();
}

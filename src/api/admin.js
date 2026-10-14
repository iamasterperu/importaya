// API del panel de administración (/api/admin/...). Todo exige sesión, salvo "ingresar".
import { json, error, leerJson, ipCliente, permitir, ahoraIso, fechaLima, mesLima } from '../lib/http.js';
import { claveCorrecta, crearSesion, cerrarSesion, esAdmin } from '../lib/auth.js';
import { leerConfig, guardarConfig } from '../lib/config.js';
import { ESPACIOS } from '../lib/anuncios.js';
import { PAISES, urlSegura, terminoLimpio } from '../lib/texto.js';
import { parsearPartidas, parsearEmpresas, TIPOS_EMPRESA } from '../lib/aduana.js';
import { TAREAS, ejecutarTarea } from '../tareas/index.js';
import { actualizarNoticias } from '../tareas/noticias.js';
import { actualizarVideos } from '../tareas/videos.js';

export async function manejarAdmin(ctx, accion) {
  const { request, env } = ctx;
  const db = env.DB;
  const metodo = request.method;

  if (accion === 'ingresar' && metodo === 'POST') {
    if (!env.ADMIN_PASSWORD || String(env.ADMIN_PASSWORD).length < 8) {
      return error('Falta configurar el secreto ADMIN_PASSWORD (mínimo 8 caracteres) en Cloudflare. Revisa el README.', 503);
    }
    if (!(await permitir(db, `login:${ipCliente(request)}`, 10, 900))) {
      return error('Demasiados intentos. Espera 15 minutos.', 429);
    }
    const d = await leerJson(request);
    if (!d || !(await claveCorrecta(env, String(d.password || '')))) return error('Contraseña incorrecta.', 401);
    return json({ ok: true }, 200, { 'set-cookie': await crearSesion(db, request) });
  }

  if (!(await esAdmin(env, request))) return error('Inicia sesión.', 401);

  if (accion === 'salir' && metodo === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': await cerrarSesion(db, request) });
  }

  const d = metodo === 'POST' ? await leerJson(request) : null;
  if (metodo === 'POST' && accion !== 'imagen' && !d) return error('Datos no válidos.');
  const url = new URL(request.url);

  switch (`${metodo} ${accion}`) {
    case 'GET estado':
      return json(await estado(db, env));

    // ── Publicidad ──
    case 'GET anuncios': {
      const hace30 = fechaLima(new Date(Date.now() - 30 * 86400 * 1000));
      const { results } = await db
        .prepare(
          `SELECT a.*, COALESCE(SUM(s.impresiones), 0) AS impresiones, COALESCE(SUM(s.clics), 0) AS clics
             FROM anuncios a LEFT JOIN anuncio_stats s ON s.anuncio_id = a.id AND s.fecha >= ?
            GROUP BY a.id ORDER BY a.espacio, a.id DESC`
        )
        .bind(hace30)
        .all();
      return json({ anuncios: results, espacios: ESPACIOS, hoy: fechaLima() });
    }
    case 'POST anuncios': {
      const espacio = ESPACIOS[d.espacio] ? d.espacio : null;
      const empresa = String(d.empresa || '').trim().slice(0, 100);
      const imagen = String(d.imagen_url || '').startsWith('/img/') ? String(d.imagen_url).slice(0, 60) : urlSegura(d.imagen_url);
      const enlace = urlSegura(d.enlace);
      const fecha = (f) => (/^\d{4}-\d{2}-\d{2}$/.test(f || '') ? f : null);
      if (!espacio || !empresa || !imagen || !enlace) return error('Completa espacio, empresa, imagen y enlace (con https://).');
      const vals = [espacio, empresa, imagen, enlace, String(d.texto || '').slice(0, 150), fecha(d.inicio), fecha(d.fin), d.activo === false ? 0 : 1];
      if (d.id) {
        await db.prepare('UPDATE anuncios SET espacio=?, empresa=?, imagen_url=?, enlace=?, texto=?, inicio=?, fin=?, activo=? WHERE id=?').bind(...vals, d.id).run();
      } else {
        await db.prepare('INSERT INTO anuncios (espacio, empresa, imagen_url, enlace, texto, inicio, fin, activo, creado) VALUES (?,?,?,?,?,?,?,?,?)').bind(...vals, ahoraIso()).run();
      }
      return json({ ok: true });
    }
    case 'POST anuncios-borrar':
      await db.batch([
        db.prepare('DELETE FROM anuncios WHERE id = ?').bind(d.id),
        db.prepare('DELETE FROM anuncio_stats WHERE anuncio_id = ?').bind(d.id),
      ]);
      return json({ ok: true });
    case 'POST imagen':
      return subirImagen(db, request);

    // ── Noticias ──
    case 'GET noticias': {
      const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
      const p = Math.max(parseInt(url.searchParams.get('p') || '1', 10) || 1, 1);
      const { results } = await db
        .prepare(
          `SELECT id, titulo, fuente_nombre, pais, publicado, oculta, destacada, resumen_ia, visitas, url FROM noticias
            ${q ? 'WHERE titulo LIKE ?' : ''} ORDER BY publicado DESC LIMIT 50 OFFSET ?`
        )
        .bind(...(q ? [`%${q.replace(/[%_]/g, '')}%`] : []), (p - 1) * 50)
        .all();
      return json({ noticias: results });
    }
    case 'POST noticias-accion': {
      const sql = {
        ocultar: 'UPDATE noticias SET oculta = 1 WHERE id = ?',
        mostrar: 'UPDATE noticias SET oculta = 0 WHERE id = ?',
        destacar: 'UPDATE noticias SET destacada = 1 WHERE id = ?',
        'quitar-destacada': 'UPDATE noticias SET destacada = 0 WHERE id = ?',
        'rehacer-ia': 'UPDATE noticias SET resumen_ia = 0, ia_intentos = 0 WHERE id = ?',
      }[d.accion];
      if (!sql) return error('Acción no válida.');
      await db.prepare(sql).bind(d.id).run();
      return json({ ok: true });
    }

    // ── Fuentes de noticias ──
    case 'GET fuentes': {
      const { results } = await db
        .prepare(
          `SELECT f.*, (SELECT COUNT(*) FROM noticias n WHERE n.fuente_id = f.id) AS total FROM fuentes f ORDER BY f.pais, f.nombre`
        )
        .all();
      return json({ fuentes: results, paises: PAISES });
    }
    case 'POST fuentes': {
      const urlF = urlSegura(d.url);
      const nombre = String(d.nombre || '').trim().slice(0, 100);
      if (!nombre || !urlF) return error('Escribe un nombre y el enlace RSS (con https://).');
      const vals = [nombre, urlF, PAISES[d.pais] ? d.pais : 'PE', d.idioma === 'en' ? 'en' : 'es', d.filtrar ? 1 : 0, d.activa === false ? 0 : 1];
      try {
        if (d.id) await db.prepare('UPDATE fuentes SET nombre=?, url=?, pais=?, idioma=?, filtrar=?, activa=? WHERE id=?').bind(...vals, d.id).run();
        else await db.prepare('INSERT INTO fuentes (nombre, url, pais, idioma, filtrar, activa) VALUES (?,?,?,?,?,?)').bind(...vals).run();
      } catch {
        return error('Ese enlace RSS ya está registrado.');
      }
      return json({ ok: true });
    }
    case 'POST fuentes-borrar':
      await db.prepare('DELETE FROM fuentes WHERE id = ?').bind(d.id).run();
      return json({ ok: true });
    case 'POST fuentes-probar':
      return json({ ok: true, resultado: await actualizarNoticias(env, { soloFuente: d.id }) });

    // ── Canales de YouTube ──
    case 'GET canales': {
      const { results } = await db
        .prepare(
          `SELECT c.*, (SELECT MAX(publicado) FROM videos v WHERE v.canal_id = c.id) AS ultimo_video,
                  (SELECT COUNT(*) FROM videos v WHERE v.canal_id = c.id) AS total
             FROM canales c ORDER BY c.principal DESC, c.nombre`
        )
        .all();
      return json({ canales: results, paises: PAISES });
    }
    case 'POST canales': {
      const nombre = String(d.nombre || '').trim().slice(0, 80);
      const entrada = String(d.entrada || '').trim().slice(0, 200);
      if (!nombre || !entrada) return error('Escribe el nombre y el @usuario o enlace del canal.');
      const sentencias = [];
      if (d.principal) sentencias.push(db.prepare('UPDATE canales SET principal = 0'));
      const vals = [nombre, entrada, PAISES[d.categoria] ? d.categoria : 'PE', d.principal ? 1 : 0, d.activo === false ? 0 : 1];
      if (d.id) {
        const previo = await db.prepare('SELECT entrada FROM canales WHERE id = ?').bind(d.id).first();
        const reiniciar = previo && previo.entrada !== entrada ? ', channel_id = NULL' : '';
        sentencias.push(db.prepare(`UPDATE canales SET nombre=?, entrada=?, categoria=?, principal=?, activo=?${reiniciar} WHERE id=?`).bind(...vals, d.id));
      } else {
        sentencias.push(db.prepare('INSERT INTO canales (nombre, entrada, categoria, principal, activo) VALUES (?,?,?,?,?)').bind(...vals));
      }
      try {
        await db.batch(sentencias);
      } catch {
        return error('Ese canal ya está registrado.');
      }
      return json({ ok: true });
    }
    case 'POST canales-borrar':
      await db.batch([
        db.prepare('DELETE FROM videos WHERE canal_id = ?').bind(d.id),
        db.prepare('DELETE FROM canales WHERE id = ?').bind(d.id),
      ]);
      return json({ ok: true });
    case 'POST canales-probar':
      return json({ ok: true, resultado: await actualizarVideos(env, { soloCanal: d.id }) });

    // ── Ajustes ──
    case 'GET config':
      return json({ config: await leerConfig(db) });
    case 'POST config':
      if (d.percepciones) {
        try {
          JSON.parse(d.percepciones);
        } catch {
          return error('El campo de percepciones no tiene un formato válido.');
        }
      }
      await guardarConfig(db, d);
      return json({ ok: true });

    // ── Contactos de anunciantes ──
    case 'GET contactos': {
      const { results } = await db.prepare('SELECT * FROM contactos ORDER BY id DESC LIMIT 300').all();
      return json({ contactos: results });
    }
    case 'POST contactos-leido':
      await db.prepare('UPDATE contactos SET leido = 1 WHERE id = ?').bind(d.id).run();
      return json({ ok: true });
    case 'POST contactos-borrar':
      await db.prepare('DELETE FROM contactos WHERE id = ?').bind(d.id).run();
      return json({ ok: true });

    // ── Partidas arancelarias ──
    case 'GET partidas': {
      const n = await db.prepare('SELECT COUNT(*) AS n FROM partidas').first();
      const { results } = await db.prepare('SELECT codigo, descripcion, advalorem FROM partidas ORDER BY codigo LIMIT 5').all();
      return json({ total: n.n, muestra: results });
    }
    case 'POST partidas-importar': {
      const texto = String(d.texto || '');
      if (texto.length > 400000) return error('El bloque es demasiado grande. Súbelo en partes.');
      const { filas, descartadas } = parsearPartidas(texto);
      if (d.reemplazar) await db.prepare('DELETE FROM partidas').run();
      for (let i = 0; i < filas.length; i += 100) {
        await db.batch(
          filas.slice(i, i + 100).map((f) =>
            db
              .prepare(
                `INSERT INTO partidas (codigo, descripcion, busqueda, advalorem, notas) VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(codigo) DO UPDATE SET descripcion = excluded.descripcion, busqueda = excluded.busqueda,
                   advalorem = excluded.advalorem, notas = excluded.notas`
              )
              .bind(f.codigo, f.descripcion, f.busqueda, f.advalorem, f.notas)
          )
        );
      }
      return json({ ok: true, guardadas: filas.length, descartadas });
    }
    case 'POST partidas-vaciar':
      await db.prepare('DELETE FROM partidas').run();
      return json({ ok: true });

    // ── Directorio de empresas ──
    case 'POST empresas-importar': {
      const texto = String(d.texto || '');
      if (texto.length > 400000) return error('El bloque es demasiado grande. Súbelo en partes.');
      const { filas, descartadas } = parsearEmpresas(texto);
      const ahora = ahoraIso();
      for (let i = 0; i < filas.length; i += 100) {
        await db.batch(
          filas.slice(i, i + 100).map((f) => {
            const web = f.web ? urlSegura(/^https?:\/\//i.test(f.web) ? f.web : `https://${f.web}`) || '' : '';
            return db
              .prepare(
                `INSERT INTO empresas (ruc, razon_social, tipo, rubro, productos, ciudad, web, telefono, email, descripcion, estado, creado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', 'aprobada', ?)
                 ON CONFLICT(ruc) DO UPDATE SET razon_social = excluded.razon_social, tipo = excluded.tipo, rubro = excluded.rubro,
                   productos = excluded.productos, ciudad = excluded.ciudad, web = excluded.web, telefono = excluded.telefono, estado = 'aprobada'`
              )
              .bind(f.ruc, f.razon_social, f.tipo, f.rubro, f.productos, f.ciudad, web, f.telefono, ahora);
          })
        );
      }
      return json({ ok: true, guardadas: filas.length, descartadas });
    }
    case 'GET empresas': {
      const { results } = await db
        .prepare(`SELECT * FROM empresas ORDER BY CASE estado WHEN 'pendiente' THEN 0 WHEN 'aprobada' THEN 1 ELSE 2 END, id DESC LIMIT 300`)
        .all();
      return json({ empresas: results, tipos: TIPOS_EMPRESA });
    }
    case 'POST empresas-estado':
      if (!['pendiente', 'aprobada', 'rechazada'].includes(d.estado)) return error('Estado no válido.');
      await db.prepare('UPDATE empresas SET estado = ? WHERE id = ?').bind(d.estado, d.id).run();
      return json({ ok: true });
    case 'POST empresas-borrar':
      await db.prepare('DELETE FROM empresas WHERE id = ?').bind(d.id).run();
      return json({ ok: true });

    // ── Búsquedas ──
    case 'GET busquedas': {
      const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get('mes') || '') ? url.searchParams.get('mes') : mesLima();
      const { results } = await db
        .prepare('SELECT termino, tipo, cantidad FROM busquedas_mes WHERE mes = ? ORDER BY cantidad DESC LIMIT 100')
        .bind(mes)
        .all();
      return json({ mes, busquedas: results, ocultos: (await leerConfig(db)).terminos_ocultos });
    }
    case 'POST busquedas-ocultar': {
      const t = terminoLimpio(d.termino);
      if (!t) return error('Término no válido.');
      const cfg = await leerConfig(db);
      const lista = new Set(cfg.terminos_ocultos.split(',').map((x) => x.trim()).filter(Boolean));
      lista.add(t);
      await guardarConfig(db, { terminos_ocultos: [...lista].join(', ') });
      return json({ ok: true });
    }

    // ── Ejecutar una tarea ahora ──
    case 'POST ejecutar':
      if (!TAREAS[d.tarea]) return error('Tarea no válida.');
      return json(await ejecutarTarea(env, d.tarea));
  }
  return error('No encontrado.', 404);
}

async function estado(db, env) {
  const hace30 = fechaLima(new Date(Date.now() - 30 * 86400 * 1000));
  const hoyIso = new Date(Date.now() - 86400 * 1000).toISOString();
  const [visitas, porSeccion, notas24, notasTotal, sinIa, videos, fuentesError, canalesError, contactos, tareas, tc, anuncios] = await Promise.all([
    db.prepare('SELECT fecha, SUM(visitas) AS visitas FROM visitas_dia WHERE fecha >= ? GROUP BY fecha ORDER BY fecha').bind(hace30).all(),
    db.prepare('SELECT seccion, SUM(visitas) AS visitas FROM visitas_dia WHERE fecha >= ? GROUP BY seccion ORDER BY visitas DESC').bind(hace30).all(),
    db.prepare('SELECT COUNT(*) AS n FROM noticias WHERE creado >= ?').bind(hoyIso).first(),
    db.prepare('SELECT COUNT(*) AS n FROM noticias').first(),
    db.prepare("SELECT COUNT(*) AS n FROM noticias WHERE resumen_ia = 0 AND ia_intentos < 3 AND (length(descripcion) >= 120 OR idioma <> 'es')").first(),
    db.prepare('SELECT COUNT(*) AS n FROM videos').first(),
    db.prepare('SELECT COUNT(*) AS n FROM fuentes WHERE activa = 1 AND ultimo_error IS NOT NULL').first(),
    db.prepare('SELECT COUNT(*) AS n FROM canales WHERE activo = 1 AND ultimo_error IS NOT NULL').first(),
    db.prepare('SELECT COUNT(*) AS n FROM contactos WHERE leido = 0').first(),
    db.prepare('SELECT * FROM tareas_log ORDER BY tarea').all(),
    db.prepare('SELECT * FROM tipo_cambio ORDER BY fecha DESC LIMIT 1').first(),
    db.prepare("SELECT COUNT(*) AS n FROM anuncios WHERE activo = 1 AND (fin IS NULL OR fin = '' OR fin >= ?)").bind(fechaLima()).first(),
  ]);
  return {
    visitas: visitas.results,
    porSeccion: porSeccion.results,
    noticias24h: notas24.n,
    noticiasTotal: notasTotal.n,
    pendientesIa: sinIa.n,
    videos: videos.n,
    fuentesConError: fuentesError.n,
    canalesConError: canalesError.n,
    contactosNuevos: contactos.n,
    anunciosActivos: anuncios.n,
    tareas: tareas.results,
    tipoCambio: tc,
    ia: { workersAi: Boolean(env.AI), gemini: Boolean(env.GEMINI_API_KEY) },
  };
}

// Imágenes de anuncios: JPG, PNG, WebP o GIF de hasta 1 MB (se guardan en D1).
async function subirImagen(db, request) {
  const tipo = (request.headers.get('content-type') || '').split(';')[0];
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return error('No llegó ninguna imagen.');
  if (bytes.length > 1024 * 1024) return error('La imagen pesa más de 1 MB. Redúcela e inténtalo de nuevo.');
  const real =
    bytes[0] === 0xff && bytes[1] === 0xd8 ? 'image/jpeg'
    : bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png'
    : bytes[0] === 0x47 && bytes[1] === 0x49 ? 'image/gif'
    : bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 ? 'image/webp'
    : null;
  if (!real || (tipo && !tipo.startsWith('image/'))) return error('Formato no válido. Usa JPG, PNG, WebP o GIF.');
  const id = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT INTO imagenes (id, tipo, datos, creado) VALUES (?, ?, ?, ?)').bind(id, real, bytes, ahoraIso()).run();
  return json({ ok: true, url: `/img/${id}` });
}

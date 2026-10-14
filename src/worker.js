// Punto de entrada del Worker de Cloudflare.
//  - fetch: arma las páginas, la API y el panel /admin.
//  - scheduled: tareas automáticas (noticias, videos, tipo de cambio, IA, ranking).
import { error, urlBase, mismoOrigen, fechaLima, esBot } from './lib/http.js';
import { asegurarEsquema } from './lib/esquema.js';
import { leerConfig } from './lib/config.js';
import { cargarAnuncios, registrarImpresiones } from './lib/anuncios.js';
import { tipoCambioActual } from './tareas/tipo-cambio.js';
import { ejecutarTarea, tareasDelMinuto } from './tareas/index.js';
import { manejarAdmin } from './api/admin.js';
import * as publica from './api/publica.js';
import * as paginas from './paginas/publicas.js';
import * as herramientas from './paginas/herramientas.js';
import * as apiHerramientas from './api/herramientas.js';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
  "connect-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
].join('; ');

function seguridad(respuesta) {
  const r = new Response(respuesta.body, respuesta);
  r.headers.set('content-security-policy', CSP);
  r.headers.set('x-content-type-options', 'nosniff');
  r.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  r.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  return r;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ruta = url.pathname.replace(/\/+$/, '') || '/';
    const metodo = request.method;

    try {
      // Panel de administración (la página; los datos van por /api/admin)
      if (ruta === '/admin') {
        const r = await env.ASSETS.fetch(new Request(new URL('/admin/', url), request));
        const s = seguridad(r);
        s.headers.set('cache-control', 'no-store');
        s.headers.set('x-robots-tag', 'noindex, nofollow');
        return s;
      }

      await asegurarEsquema(env.DB);

      if (ruta.startsWith('/api/')) {
        if (metodo !== 'GET' && !mismoOrigen(request)) return error('Origen no permitido.', 403);
        try {
          if (ruta.startsWith('/api/admin/')) return await manejarAdmin({ request, env, waitUntil: (p) => ctx.waitUntil(p) }, ruta.slice(11));
          const c = { request, env, waitUntil: (p) => ctx.waitUntil(p) };
          if (ruta === '/api/busqueda' && metodo === 'POST') return await publica.busqueda(c);
          if (ruta === '/api/contacto' && metodo === 'POST') return await publica.contacto(c);
          if (ruta === '/api/partidas' && metodo === 'GET') return await apiHerramientas.partidas(c);
          if (ruta === '/api/directorio' && metodo === 'POST') return await apiHerramientas.registrarEmpresa(c);
          return error('No encontrado.', 404);
        } catch (e) {
          console.error(e);
          return error('Ocurrió un error inesperado. Inténtalo de nuevo.', 500);
        }
      }

      const c = { request, env, waitUntil: (p) => ctx.waitUntil(p) };
      let m;
      if ((m = ruta.match(/^\/ad\/(\d+)$/))) return publica.clicAnuncio(c, Number(m[1]));
      if ((m = ruta.match(/^\/img\/([a-f0-9]{32})$/))) return publica.imagen(c, m[1]);

      if (metodo !== 'GET' && metodo !== 'HEAD') return error('Método no permitido.', 405);

      // Contexto común de las páginas públicas
      const [cfg, anuncios, tc] = await Promise.all([leerConfig(env.DB), cargarAnuncios(env.DB), tipoCambioActual(env.DB)]);
      const p = { ...c, base: urlBase(env, request), cfg, anuncios, tc };

      if (ruta === '/sitemap.xml') return paginas.sitemap(p);
      if (ruta === '/robots.txt') return paginas.robots(p);

      let respuesta = null;
      let seccion = null;
      if (ruta === '/') [respuesta, seccion] = [await paginas.inicio(p), 'inicio'];
      else if (ruta === '/noticias') [respuesta, seccion] = [await paginas.listaDeNoticias(p), 'noticias'];
      else if ((m = ruta.match(/^\/n\/(\d+)(?:\/([a-z0-9-]*))?$/))) [respuesta, seccion] = [await paginas.detalleNoticia(p, Number(m[1]), m[2]), 'noticia'];
      else if (ruta === '/videos') [respuesta, seccion] = [await paginas.paginaVideos(p), 'videos'];
      else if (ruta === '/calculadora') [respuesta, seccion] = [await paginas.calculadora(p), 'calculadora'];
      else if (ruta === '/tendencias') [respuesta, seccion] = [await paginas.tendencias(p), 'tendencias'];
      else if ((m = ruta.match(/^\/tendencias\/(\d{4}-\d{2})$/))) [respuesta, seccion] = [await paginas.tendencias(p, m[1]), 'tendencias'];
      else if (ruta === '/herramientas') [respuesta, seccion] = [herramientas.inicioHerramientas(p), 'herramientas'];
      else if (ruta === '/herramientas/carga') [respuesta, seccion] = [herramientas.herramientaCarga(p), 'herramientas'];
      else if (ruta === '/herramientas/cotizador') [respuesta, seccion] = [herramientas.herramientaCotizador(p), 'herramientas'];
      else if (ruta === '/herramientas/partidas') [respuesta, seccion] = [herramientas.herramientaPartidas(p), 'herramientas'];
      else if (ruta === '/herramientas/guias') [respuesta, seccion] = [herramientas.herramientaGuias(p), 'herramientas'];
      else if (ruta === '/directorio') [respuesta, seccion] = [await herramientas.directorio(p), 'directorio'];
      else if (ruta === '/anunciate') [respuesta, seccion] = [await paginas.anunciate(p), 'anunciate'];
      else if (ruta === '/privacidad') [respuesta, seccion] = [paginas.privacidad(p), 'privacidad'];
      else {
        // Archivos estáticos (favicon, etc.)
        const estatico = await env.ASSETS.fetch(request);
        if (estatico.status !== 404) return estatico;
      }

      if (!respuesta) {
        p.anuncios.mostrados = [];
        return seguridad(paginas.noEncontrado(p));
      }
      if (respuesta.status === 200 && seccion && !esBot(request)) {
        ctx.waitUntil(
          Promise.all([
            registrarImpresiones(env.DB, anuncios),
            env.DB.prepare(
              `INSERT INTO visitas_dia (fecha, seccion, visitas) VALUES (?, ?, 1)
               ON CONFLICT(fecha, seccion) DO UPDATE SET visitas = visitas + 1`
            )
              .bind(fechaLima(), seccion)
              .run(),
          ]).catch((e) => console.error('estadísticas', e))
        );
      }
      return seguridad(respuesta);
    } catch (e) {
      console.error(e);
      return new Response('Ocurrió un error inesperado. Vuelve a intentarlo en unos minutos.', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      });
    }
  },

  async scheduled(evento, env, ctx) {
    ctx.waitUntil(
      (async () => {
        await asegurarEsquema(env.DB);
        for (const tarea of tareasDelMinuto(new Date(evento.scheduledTime))) {
          await ejecutarTarea(env, tarea);
        }
      })()
    );
  },
};

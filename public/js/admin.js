// Panel de administración de ImportaYa (sin librerías).
(function () {
  var vista = document.getElementById('vista');
  var NOMBRES_TAREAS = {
    noticias: 'Noticias', videos: 'Videos de YouTube', tipo_cambio: 'Tipo de cambio',
    resumenes: 'Resúmenes con IA', ranking: 'Ranking mensual', limpieza: 'Limpieza', filtro: 'Filtro de temas',
  };
  var PAISES = { PE: '🇵🇪 Perú', CN: '🇨🇳 China', US: '🇺🇸 EE. UU.', MUNDO: '🌎 Mundo' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fecha(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function aviso(texto) {
    var a = document.getElementById('aviso');
    a.textContent = texto;
    a.hidden = false;
    clearTimeout(aviso.t);
    aviso.t = setTimeout(function () { a.hidden = true; }, 4500);
  }
  function api(ruta, cuerpo, opciones) {
    var o = opciones || {};
    var init = { method: cuerpo !== undefined ? 'POST' : 'GET', headers: {} };
    if (o.binario) {
      init.body = cuerpo;
      init.headers['content-type'] = cuerpo.type || 'application/octet-stream';
    } else if (cuerpo !== undefined) {
      init.body = JSON.stringify(cuerpo);
      init.headers['content-type'] = 'application/json';
    }
    return fetch('/api/admin/' + ruta, init).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'Respuesta no válida' }; }).then(function (d) {
        if (r.status === 401 && ruta !== 'ingresar') { mostrarLogin(); throw new Error('Inicia sesión'); }
        if (!r.ok || d.ok === false) throw new Error(d.error || 'Error ' + r.status);
        return d;
      });
    });
  }
  function datosForm(form) {
    var d = {};
    Array.prototype.forEach.call(form.elements, function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') d[el.name] = el.checked;
      else d[el.name] = el.value;
    });
    return d;
  }
  function opciones(obj, elegido) {
    return Object.keys(obj).map(function (k) {
      return '<option value="' + esc(k) + '"' + (k === elegido ? ' selected' : '') + '>' + esc(obj[k]) + '</option>';
    }).join('');
  }

  // ── Login ──
  function mostrarLogin() {
    document.getElementById('login').hidden = false;
    document.getElementById('panel').hidden = true;
    document.getElementById('salir').hidden = true;
  }
  function mostrarPanel() {
    document.getElementById('login').hidden = true;
    document.getElementById('panel').hidden = false;
    document.getElementById('salir').hidden = false;
    router();
  }
  document.getElementById('form-login').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = e.target.querySelector('.error');
    err.textContent = '';
    api('ingresar', { password: e.target.password.value })
      .then(function () { e.target.reset(); mostrarPanel(); })
      .catch(function (x) { err.textContent = x.message; });
  });
  document.getElementById('salir').addEventListener('click', function () {
    api('salir', {}).finally(mostrarLogin);
  });

  // ── Navegación ──
  var VISTAS = {
    resumen: resumen, publicidad: publicidad, noticias: noticias, fuentes: fuentes,
    youtube: youtube, busquedas: busquedas, contactos: contactos, partidas: partidas, directorio: directorio, ajustes: ajustes,
  };
  function router() {
    var id = (location.hash || '#resumen').slice(1);
    if (!VISTAS[id]) id = 'resumen';
    Array.prototype.forEach.call(document.querySelectorAll('#pestanas a'), function (a) {
      if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    vista.innerHTML = '<p class="ayuda">Cargando…</p>';
    VISTAS[id]().catch(function (e) { vista.innerHTML = '<p class="error">' + esc(e.message) + '</p>'; });
  }
  window.addEventListener('hashchange', function () { if (!document.getElementById('panel').hidden) router(); });

  // Botones con data-accion dentro de la vista
  vista.addEventListener('click', function (e) {
    var b = e.target.closest('[data-accion]');
    if (!b) return;
    var fn = ACCIONES[b.getAttribute('data-accion')];
    if (!fn) return;
    e.preventDefault();
    b.disabled = true;
    Promise.resolve(fn(b)).catch(function (x) { aviso(x.message); }).finally(function () { b.disabled = false; });
  });

  var ACCIONES = {
    ejecutar: function (b) {
      aviso('Ejecutando… puede tardar hasta un minuto.');
      return api('ejecutar', { tarea: b.dataset.tarea }).then(function (r) { aviso(r.resultado); router(); });
    },
    'anuncio-editar': function (b) { formAnuncio(JSON.parse(b.dataset.anuncio)); },
    'anuncio-borrar': function (b) {
      if (!confirm('¿Borrar este anuncio y sus estadísticas?')) return;
      return api('anuncios-borrar', { id: +b.dataset.id }).then(router);
    },
    'anuncio-activar': function (b) {
      var a = JSON.parse(b.dataset.anuncio);
      a.activo = !a.activo;
      return api('anuncios', a).then(router);
    },
    nota: function (b) {
      return api('noticias-accion', { id: +b.dataset.id, accion: b.dataset.que }).then(function () { aviso('Listo'); noticias(); });
    },
    'fuente-editar': function (b) { formFuente(JSON.parse(b.dataset.fuente)); },
    'fuente-probar': function (b) {
      aviso('Probando la fuente…');
      return api('fuentes-probar', { id: +b.dataset.id }).then(function (r) { aviso(r.resultado); fuentes(); });
    },
    'fuente-borrar': function (b) {
      if (!confirm('¿Borrar esta fuente? Las noticias ya publicadas se mantienen.')) return;
      return api('fuentes-borrar', { id: +b.dataset.id }).then(fuentes);
    },
    'canal-editar': function (b) { formCanal(JSON.parse(b.dataset.canal)); },
    'canal-probar': function (b) {
      aviso('Revisando el canal…');
      return api('canales-probar', { id: +b.dataset.id }).then(function (r) { aviso(r.resultado); youtube(); });
    },
    'canal-borrar': function (b) {
      if (!confirm('¿Borrar este canal y sus videos?')) return;
      return api('canales-borrar', { id: +b.dataset.id }).then(youtube);
    },
    'termino-ocultar': function (b) {
      return api('busquedas-ocultar', { termino: b.dataset.termino }).then(function () { aviso('Oculto del ranking'); busquedas(); });
    },
    'contacto-leido': function (b) { return api('contactos-leido', { id: +b.dataset.id }).then(contactos); },
    'contacto-borrar': function (b) {
      if (!confirm('¿Borrar este contacto?')) return;
      return api('contactos-borrar', { id: +b.dataset.id }).then(contactos);
    },
    'partidas-vaciar': function () {
      if (!confirm('¿Borrar TODAS las partidas cargadas?')) return;
      return api('partidas-vaciar', {}).then(function () { aviso('Partidas borradas'); partidas(); });
    },
    'empresa-estado': function (b) {
      return api('empresas-estado', { id: +b.dataset.id, estado: b.dataset.estado }).then(function () { aviso('Listo'); directorio(); });
    },
    'empresa-borrar': function (b) {
      if (!confirm('¿Borrar esta empresa del directorio?')) return;
      return api('empresas-borrar', { id: +b.dataset.id }).then(directorio);
    },
  };

  // ── Resumen ──
  function resumen() {
    return api('estado').then(function (d) {
      var max = Math.max.apply(null, d.visitas.map(function (v) { return v.visitas; }).concat([1]));
      var total = d.visitas.reduce(function (a, v) { return a + v.visitas; }, 0);
      var tareas = Object.keys(NOMBRES_TAREAS).map(function (t) {
        var log = d.tareas.filter(function (x) { return x.tarea === t; })[0];
        var err = log && /^Error/.test(log.resultado);
        return '<tr><td><b>' + NOMBRES_TAREAS[t] + '</b></td><td>' + (log ? fecha(log.ultima) : 'Aún no se ejecuta') + '</td>' +
          '<td class="' + (err ? 'estado-error' : '') + '">' + esc(log ? log.resultado : '—') + '</td>' +
          '<td class="acciones"><button data-accion="ejecutar" data-tarea="' + t + '">Ejecutar ahora</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<div class="tarjetas">' +
        '<div><b>' + total.toLocaleString('es-PE') + '</b><span>visitas (30 días)</span></div>' +
        '<div><b>' + d.noticias24h + '</b><span>noticias nuevas (24 h)</span></div>' +
        '<div><b>' + d.noticiasTotal + '</b><span>noticias guardadas</span></div>' +
        '<div><b>' + d.videos + '</b><span>videos</span></div>' +
        '<div><b>' + d.anunciosActivos + '</b><span>anuncios activos</span></div>' +
        '<div class="' + (d.contactosNuevos ? 'alerta' : '') + '"><b>' + d.contactosNuevos + '</b><span>anunciantes sin leer</span></div>' +
        '<div class="' + (d.fuentesConError ? 'alerta' : '') + '"><b>' + d.fuentesConError + '</b><span>fuentes con error</span></div>' +
        '<div class="' + (d.canalesConError ? 'alerta' : '') + '"><b>' + d.canalesConError + '</b><span>canales con error</span></div>' +
        '</div>' +
        '<h2>Visitas por día</h2>' +
        (d.visitas.length
          ? '<div class="barras" aria-label="Visitas por día">' + d.visitas.map(function (v) {
              return '<span style="height:' + Math.max(2, Math.round(v.visitas / max * 100)) + '%" title="' + esc(v.fecha) + ': ' + v.visitas + '"></span>';
            }).join('') + '</div>'
          : '<p class="ayuda">Aún no hay visitas registradas.</p>') +
        (d.porSeccion.length ? '<p class="ayuda">Por sección: ' + d.porSeccion.map(function (s) { return esc(s.seccion) + ' ' + s.visitas; }).join(' · ') + '</p>' : '') +
        '<h2>Tareas automáticas</h2>' +
        '<p class="ayuda">Corren solas cada 15 minutos. Usa “Ejecutar ahora” para probar sin esperar.</p>' +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>Tarea</th><th>Última vez</th><th>Resultado</th><th></th></tr></thead><tbody>' + tareas + '</tbody></table></div>' +
        '<h2>Inteligencia artificial</h2>' +
        '<p>Workers AI (gratis): <b class="' + (d.ia.workersAi ? 'estado-ok">Activa' : 'estado-error">No disponible') + '</b> · ' +
        'Gemini (respaldo): <b>' + (d.ia.gemini ? 'Configurado' : 'No configurado (opcional)') + '</b> · ' +
        'Noticias esperando resumen: <b>' + d.pendientesIa + '</b></p>' +
        (d.tipoCambio ? '<p>Tipo de cambio: compra <b>' + d.tipoCambio.compra + '</b> · venta <b>' + d.tipoCambio.venta + '</b> (' + esc(d.tipoCambio.fecha) + ', ' + esc(d.tipoCambio.fuente) + ')</p>' : '');
    });
  }

  // ── Publicidad ──
  var espacios = {};
  function publicidad() {
    return api('anuncios').then(function (d) {
      espacios = d.espacios;
      var filas = d.anuncios.map(function (a) {
        var vigente = a.activo && (!a.fin || a.fin >= d.hoy) && (!a.inicio || a.inicio <= d.hoy);
        var ctr = a.impresiones ? (a.clics / a.impresiones * 100).toFixed(2) + ' %' : '—';
        var json = esc(JSON.stringify(a));
        return '<tr class="' + (vigente ? '' : 'apagado') + '"><td><img class="miniatura" src="' + esc(a.imagen_url) + '" alt=""></td>' +
          '<td><b>' + esc(a.empresa) + '</b><br><small>' + esc((espacios[a.espacio] || {}).nombre || a.espacio) + '</small><br><a href="' + esc(a.enlace) + '" target="_blank" rel="noopener"><small>' + esc(a.enlace) + '</small></a></td>' +
          '<td>' + esc(a.inicio || 'Ya') + ' → ' + esc(a.fin || 'Sin fin') + '<br>' + (vigente ? '<span class="estado-ok">Se está mostrando</span>' : '<span class="estado-error">No se muestra</span>') + '</td>' +
          '<td>' + a.impresiones.toLocaleString('es-PE') + ' vistas<br>' + a.clics + ' clics · ' + ctr + '</td>' +
          '<td class="acciones"><button data-accion="anuncio-editar" data-anuncio="' + json + '">Editar</button>' +
          '<button data-accion="anuncio-activar" data-anuncio="' + json + '">' + (a.activo ? 'Pausar' : 'Activar') + '</button>' +
          '<button class="peligro" data-accion="anuncio-borrar" data-id="' + a.id + '">Borrar</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<div class="fila-titulo"><h2>Anuncios de empresas</h2><button class="btn btn-naranja" id="nuevo-anuncio">+ Nuevo anuncio</button></div>' +
        '<div id="form-anuncio-caja"></div>' +
        '<p class="ayuda">Estadísticas de los últimos 30 días. Si un espacio no tiene anuncio, la web muestra “Tu marca aquí” con un enlace a la página Anúnciate (puedes ocultarlo en Ajustes).</p>' +
        (filas ? '<div class="tabla-env"><table class="tabla"><thead><tr><th>Imagen</th><th>Empresa y espacio</th><th>Fechas</th><th>Resultados</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' : '<p class="vacio">Todavía no hay anuncios. ¡Crea el primero!</p>') +
        '<h2>Espacios y medidas recomendadas</h2><ul>' + Object.keys(espacios).map(function (k) {
          return '<li><b>' + esc(espacios[k].nombre) + '</b> — ' + esc(espacios[k].medida) + '. ' + esc(espacios[k].detalle) + '</li>';
        }).join('') + '</ul>';
      document.getElementById('nuevo-anuncio').onclick = function () { formAnuncio({}); };
    });
  }
  function formAnuncio(a) {
    var caja = document.getElementById('form-anuncio-caja');
    var nombres = {};
    Object.keys(espacios).forEach(function (k) { nombres[k] = espacios[k].nombre + ' (' + espacios[k].medida + ')'; });
    caja.innerHTML =
      '<form class="admin-form" id="form-anuncio">' +
      '<label>Empresa<input name="empresa" required maxlength="100" value="' + esc(a.empresa) + '"></label>' +
      '<label>Espacio<select name="espacio">' + opciones(nombres, a.espacio) + '</select></label>' +
      '<label class="ancho">Enlace al que lleva el anuncio<input name="enlace" type="url" required placeholder="https://www.empresa.com" value="' + esc(a.enlace) + '"></label>' +
      '<label>Subir imagen (JPG, PNG, WebP o GIF, máx. 1 MB)<input type="file" id="archivo" accept="image/jpeg,image/png,image/webp,image/gif"></label>' +
      '<label>…o pega el enlace de la imagen<input name="imagen_url" placeholder="https://… o /img/…" value="' + esc(a.imagen_url) + '"></label>' +
      '<label>Texto alternativo<input name="texto" maxlength="150" placeholder="Ej.: Agencia XYZ, importa sin complicaciones" value="' + esc(a.texto) + '"></label>' +
      '<label>Desde (opcional)<input name="inicio" type="date" value="' + esc(a.inicio) + '"></label>' +
      '<label>Hasta (opcional)<input name="fin" type="date" value="' + esc(a.fin) + '"></label>' +
      '<label class="check"><input type="checkbox" name="activo"' + (a.activo === 0 ? '' : ' checked') + '> Activo</label>' +
      '<div class="ancho" id="vista-imagen">' + (a.imagen_url ? '<img class="miniatura" src="' + esc(a.imagen_url) + '" alt="">' : '') + '</div>' +
      '<div class="botones"><button class="btn btn-naranja" type="submit">Guardar anuncio</button><button class="btn btn-claro" type="button" id="cancelar-anuncio">Cancelar</button></div>' +
      '</form>';
    var form = document.getElementById('form-anuncio');
    document.getElementById('cancelar-anuncio').onclick = function () { caja.innerHTML = ''; };
    document.getElementById('archivo').onchange = function (e) {
      var f = e.target.files[0];
      if (!f) return;
      if (f.size > 1024 * 1024) { aviso('La imagen pesa más de 1 MB.'); return; }
      aviso('Subiendo imagen…');
      api('imagen', f, { binario: true }).then(function (r) {
        form.imagen_url.value = r.url;
        document.getElementById('vista-imagen').innerHTML = '<img class="miniatura" src="' + esc(r.url) + '" alt="">';
        aviso('Imagen subida');
      }).catch(function (x) { aviso(x.message); });
    };
    form.onsubmit = function (e) {
      e.preventDefault();
      var d = datosForm(form);
      if (a.id) d.id = a.id;
      api('anuncios', d).then(function () { aviso('Anuncio guardado'); publicidad(); }).catch(function (x) { aviso(x.message); });
    };
    caja.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Noticias ──
  var busquedaNotas = '';
  function noticias() {
    return api('noticias?q=' + encodeURIComponent(busquedaNotas)).then(function (d) {
      var filas = d.noticias.map(function (n) {
        return '<tr class="' + (n.oculta ? 'apagado' : '') + '"><td>' + esc(PAISES[n.pais] || n.pais) + '</td>' +
          '<td><a href="' + esc(n.url) + '" target="_blank" rel="noopener">' + esc(n.titulo) + '</a><br><small>' + esc(n.fuente_nombre) + ' · ' + fecha(n.publicado) + ' · ' + n.visitas + ' visitas' + (n.resumen_ia ? ' · ✨ IA' : '') + (n.destacada ? ' · ⭐ destacada' : '') + '</small></td>' +
          '<td class="acciones">' +
          '<button data-accion="nota" data-que="' + (n.oculta ? 'mostrar' : 'ocultar') + '" data-id="' + n.id + '">' + (n.oculta ? 'Mostrar' : 'Ocultar') + '</button>' +
          '<button data-accion="nota" data-que="' + (n.destacada ? 'quitar-destacada' : 'destacar') + '" data-id="' + n.id + '">' + (n.destacada ? 'Quitar ⭐' : 'Destacar ⭐') + '</button>' +
          '<button data-accion="nota" data-que="rehacer-ia" data-id="' + n.id + '">Rehacer IA</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<div class="fila-titulo"><h2>Noticias</h2><form id="buscar-notas" class="buscador"><input name="q" placeholder="Buscar por título" value="' + esc(busquedaNotas) + '"><button class="btn btn-naranja">Buscar</button></form></div>' +
        '<p class="ayuda">Llegan solas. Oculta las que no tengan relación con el tema y destaca las más importantes (salen primero en la portada).</p>' +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>País</th><th>Noticia</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="3">No hay noticias todavía.</td></tr>') + '</tbody></table></div>';
      document.getElementById('buscar-notas').onsubmit = function (e) {
        e.preventDefault();
        busquedaNotas = e.target.q.value;
        noticias();
      };
    });
  }

  // ── Fuentes ──
  function fuentes() {
    return api('fuentes').then(function (d) {
      var filas = d.fuentes.map(function (f) {
        var estado = f.ultimo_error ? '<span class="estado-error">Error: ' + esc(f.ultimo_error) + '</span>' : f.ultimo_ok ? '<span class="estado-ok">OK</span> ' + fecha(f.ultimo_ok) : 'Aún no revisada';
        return '<tr class="' + (f.activa ? '' : 'apagado') + '"><td>' + esc(PAISES[f.pais]) + '</td><td><b>' + esc(f.nombre) + '</b><br><small>' + esc(f.url.slice(0, 90)) + '</small><br><small>' + (f.idioma === 'en' ? 'Inglés (se traduce con IA)' : 'Español') + (f.filtrar ? ' · Filtra por palabras clave' : '') + '</small></td>' +
          '<td>' + estado + '<br><small>' + f.total + ' noticias</small></td>' +
          '<td class="acciones"><button data-accion="fuente-probar" data-id="' + f.id + '">Probar</button><button data-accion="fuente-editar" data-fuente="' + esc(JSON.stringify(f)) + '">Editar</button><button class="peligro" data-accion="fuente-borrar" data-id="' + f.id + '">Borrar</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<div class="fila-titulo"><h2>Fuentes de noticias (RSS)</h2><button class="btn btn-naranja" id="nueva-fuente">+ Agregar fuente</button></div>' +
        '<div id="form-fuente-caja"></div>' +
        '<p class="ayuda">Cualquier enlace RSS sirve. Truco: para un tema nuevo usa Google Noticias:<br><code>https://news.google.com/rss/search?q=TU+TEMA+when:7d&amp;hl=es-419&amp;gl=PE&amp;ceid=PE:es-419</code></p>' +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>País</th><th>Fuente</th><th>Estado</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>';
      document.getElementById('nueva-fuente').onclick = function () { formFuente({ activa: 1 }); };
    });
  }
  function formFuente(f) {
    var caja = document.getElementById('form-fuente-caja');
    caja.innerHTML =
      '<form class="admin-form" id="form-fuente">' +
      '<label>Nombre<input name="nombre" required maxlength="100" value="' + esc(f.nombre) + '"></label>' +
      '<label class="ancho">Enlace RSS<input name="url" type="url" required value="' + esc(f.url) + '"></label>' +
      '<label>País / sección<select name="pais">' + opciones(PAISES, f.pais || 'PE') + '</select></label>' +
      '<label>Idioma<select name="idioma">' + opciones({ es: 'Español', en: 'Inglés (traducir con IA)' }, f.idioma || 'es') + '</select></label>' +
      '<label class="check"><input type="checkbox" name="filtrar"' + (f.filtrar ? ' checked' : '') + '> Solo noticias con palabras clave del rubro</label>' +
      '<label class="check"><input type="checkbox" name="activa"' + (f.activa === 0 ? '' : ' checked') + '> Activa</label>' +
      '<div class="botones"><button class="btn btn-naranja" type="submit">Guardar</button><button class="btn btn-claro" type="button" id="cancelar-fuente">Cancelar</button></div></form>';
    document.getElementById('cancelar-fuente').onclick = function () { caja.innerHTML = ''; };
    document.getElementById('form-fuente').onsubmit = function (e) {
      e.preventDefault();
      var d = datosForm(e.target);
      if (f.id) d.id = f.id;
      api('fuentes', d).then(function () { aviso('Fuente guardada. Pulsa “Probar” para traer noticias ya.'); fuentes(); }).catch(function (x) { aviso(x.message); });
    };
  }

  // ── YouTube ──
  function youtube() {
    return api('canales').then(function (d) {
      var filas = d.canales.map(function (c) {
        var estado = c.ultimo_error ? '<span class="estado-error">Error: ' + esc(c.ultimo_error) + '</span>' : c.ultimo_ok ? '<span class="estado-ok">OK</span> ' + fecha(c.ultimo_ok) : 'Aún no revisado';
        return '<tr class="' + (c.activo ? '' : 'apagado') + '"><td><b>' + esc(c.nombre) + '</b>' + (c.principal ? ' ⭐ <small>principal</small>' : '') + '<br><small>' + esc(c.entrada) + (c.channel_id ? ' · ' + esc(c.channel_id) : '') + '</small></td>' +
          '<td>' + estado + '<br><small>' + c.total + ' videos · último: ' + fecha(c.ultimo_video) + '</small></td>' +
          '<td class="acciones"><button data-accion="canal-probar" data-id="' + c.id + '">Revisar ahora</button><button data-accion="canal-editar" data-canal="' + esc(JSON.stringify(c)) + '">Editar</button><button class="peligro" data-accion="canal-borrar" data-id="' + c.id + '">Borrar</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<div class="fila-titulo"><h2>Canales de YouTube</h2><button class="btn btn-naranja" id="nuevo-canal">+ Agregar canal</button></div>' +
        '<div id="form-canal-caja"></div>' +
        '<p class="ayuda">Escribe el <b>@usuario</b> del canal (por ejemplo <code>@rppnoticias</code>), su enlace, o su ID que empieza con <code>UC</code>. El último video del canal <b>principal ⭐</b> sale en grande en la portada y cambia solo cuando suben uno nuevo.</p>' +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>Canal</th><th>Estado</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>';
      document.getElementById('nuevo-canal').onclick = function () { formCanal({ activo: 1 }); };
    });
  }
  function formCanal(c) {
    var caja = document.getElementById('form-canal-caja');
    caja.innerHTML =
      '<form class="admin-form" id="form-canal">' +
      '<label>Nombre<input name="nombre" required maxlength="80" value="' + esc(c.nombre) + '"></label>' +
      '<label>@usuario, enlace o ID del canal<input name="entrada" required placeholder="@rppnoticias" value="' + esc(c.entrada) + '"></label>' +
      '<label>Categoría<select name="categoria">' + opciones(PAISES, c.categoria || 'PE') + '</select></label>' +
      '<label class="check"><input type="checkbox" name="principal"' + (c.principal ? ' checked' : '') + '> Canal principal (video grande de la portada)</label>' +
      '<label class="check"><input type="checkbox" name="activo"' + (c.activo === 0 ? '' : ' checked') + '> Activo</label>' +
      '<div class="botones"><button class="btn btn-naranja" type="submit">Guardar</button><button class="btn btn-claro" type="button" id="cancelar-canal">Cancelar</button></div></form>';
    document.getElementById('cancelar-canal').onclick = function () { caja.innerHTML = ''; };
    document.getElementById('form-canal').onsubmit = function (e) {
      e.preventDefault();
      var d = datosForm(e.target);
      if (c.id) d.id = c.id;
      api('canales', d).then(function () { aviso('Canal guardado. Pulsa “Revisar ahora” para traer sus videos.'); youtube(); }).catch(function (x) { aviso(x.message); });
    };
  }

  // ── Búsquedas ──
  function busquedas() {
    return api('busquedas').then(function (d) {
      var filas = d.busquedas.map(function (b) {
        return '<tr><td><b>' + esc(b.termino) + '</b></td><td>' + (b.tipo === 'calculadora' ? '🧮 Calculadora' : '🔎 Buscador') + '</td><td>' + b.cantidad + '</td>' +
          '<td class="acciones"><button data-accion="termino-ocultar" data-termino="' + esc(b.termino) + '">Ocultar del ranking</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<h2>Lo más buscado en ' + esc(d.mes) + '</h2>' +
        '<p class="ayuda">Se arma solo con lo que la gente escribe en la calculadora y el buscador. El día 1 de cada mes se guarda el ranking del mes anterior. Oculta las palabras ofensivas o sin sentido.</p>' +
        (d.ocultos ? '<p class="ayuda">Ocultos: ' + esc(d.ocultos) + ' (puedes editarlos en Ajustes)</p>' : '') +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>Término</th><th>Dónde</th><th>Veces</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="4">Aún no hay búsquedas este mes.</td></tr>') + '</tbody></table></div>';
    });
  }

  // ── Contactos ──
  function contactos() {
    return api('contactos').then(function (d) {
      var filas = d.contactos.map(function (c) {
        var wsp = c.telefono ? ' · <a href="https://wa.me/' + esc(c.telefono.replace(/\D/g, '')) + '" target="_blank" rel="noopener">WhatsApp</a>' : '';
        return '<tr class="' + (c.leido ? 'apagado' : '') + '"><td>' + fecha(c.creado) + '</td><td><b>' + esc(c.nombre) + '</b> ' + esc(c.empresa ? '(' + c.empresa + ')' : '') + '<br>' +
          (c.email ? '<a href="mailto:' + esc(c.email) + '">' + esc(c.email) + '</a> ' : '') + esc(c.telefono) + wsp + '</td>' +
          '<td>' + esc(c.espacio || '—') + '</td><td>' + esc(c.mensaje) + '</td>' +
          '<td class="acciones">' + (c.leido ? '' : '<button data-accion="contacto-leido" data-id="' + c.id + '">Marcar leído</button>') + '<button class="peligro" data-accion="contacto-borrar" data-id="' + c.id + '">Borrar</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<h2>Empresas interesadas en anunciar</h2><p class="ayuda">Llegan desde el formulario de la página <a href="/anunciate" target="_blank">Anúnciate</a>.</p>' +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>Fecha</th><th>Contacto</th><th>Espacio</th><th>Mensaje</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Todavía no escribe ninguna empresa.</td></tr>') + '</tbody></table></div>';
    });
  }

  // ── Partidas arancelarias ──
  function partidas() {
    return api('partidas').then(function (d) {
      var muestra = d.muestra.map(function (p) { return '<li><b>' + esc(p.codigo) + '</b> · ' + esc(p.descripcion) + ' · ' + (p.advalorem == null ? '—' : p.advalorem + ' %') + '</li>'; }).join('');
      vista.innerHTML =
        '<h2>Arancel de aduanas (partidas)</h2>' +
        '<p class="ayuda">Aquí cargas el arancel para que funcione el <a href="/herramientas/partidas" target="_blank">buscador de partidas</a>. Hoy hay <b>' + d.total + '</b> partidas cargadas.</p>' +
        (muestra ? '<ul class="ayuda">' + muestra + '</ul>' : '') +
        '<form class="admin-form" id="form-partidas">' +
        '<p class="ancho ayuda">Sube un archivo de <b>texto o CSV</b> con una partida por línea: <code>partida ; descripción ; ad valorem ; notas</code> (las notas son opcionales). Sirve el separador punto y coma, tabulación o barra |. Si tienes el arancel en Excel, guárdalo como “CSV (delimitado por comas)” o “Texto (delimitado por tabulaciones)”. La partida puede llevar puntos (8518.30.00.00) y se ignoran los encabezados.</p>' +
        '<label class="ancho">Archivo<input type="file" name="archivo" accept=".csv,.txt,.tsv,text/plain,text/csv"></label>' +
        '<label class="ancho">…o pega las líneas aquí<textarea name="texto" rows="6" placeholder="8518.30.00.00;Auriculares;0"></textarea></label>' +
        '<label class="check ancho"><input type="checkbox" name="reemplazar" checked> Reemplazar todo lo que hay (recomendado la primera vez)</label>' +
        '<div class="botones"><button class="btn btn-naranja" type="submit">Cargar partidas</button>' + (d.total ? '<button class="btn btn-claro" type="button" data-accion="partidas-vaciar">Borrar todas</button>' : '') + '</div>' +
        '<p class="ancho ayuda" id="progreso-partidas" role="status"></p></form>';
      document.getElementById('form-partidas').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target;
        var archivo = f.archivo.files[0];
        var leer = archivo ? archivo.text() : Promise.resolve(f.texto.value);
        var boton = f.querySelector('button[type="submit"]');
        var prog = document.getElementById('progreso-partidas');
        boton.disabled = true;
        leer.then(function (texto) {
          var lineas = texto.split(/\r?\n/).filter(function (l) { return l.trim(); });
          if (!lineas.length) throw new Error('No hay líneas para cargar.');
          var reemplazar = f.reemplazar.checked;
          var guardadas = 0, descartadas = 0, i = 0;
          function siguiente() {
            if (i >= lineas.length) { aviso(guardadas + ' partidas cargadas' + (descartadas ? ' (' + descartadas + ' líneas ignoradas)' : '')); return partidas(); }
            var trozo = lineas.slice(i, i + 300).join('\n');
            return api('partidas-importar', { texto: trozo, reemplazar: reemplazar && i === 0 }).then(function (r) {
              guardadas += r.guardadas; descartadas += r.descartadas; i += 300;
              prog.textContent = 'Cargando… ' + Math.min(i, lineas.length) + ' de ' + lineas.length + ' líneas';
              return siguiente();
            });
          }
          return siguiente();
        }).catch(function (x) { aviso(x.message); prog.textContent = x.message; }).finally(function () { boton.disabled = false; });
      };
    });
  }

  // ── Directorio de empresas ──
  function directorio() {
    return api('empresas').then(function (d) {
      var ETQ = { pendiente: '🟡 Pendiente', aprobada: '🟢 Publicada', rechazada: '🔴 Rechazada' };
      var filas = d.empresas.map(function (e) {
        var wsp = e.telefono ? ' · <a href="https://wa.me/' + esc(e.telefono.replace(/\D/g, '')) + '" target="_blank" rel="noopener">WhatsApp</a>' : '';
        var botones = ['aprobada', 'rechazada', 'pendiente'].filter(function (s) { return s !== e.estado; }).map(function (s) {
          return '<button data-accion="empresa-estado" data-id="' + e.id + '" data-estado="' + s + '">' + (s === 'aprobada' ? 'Publicar' : s === 'rechazada' ? 'Rechazar' : 'Dejar pendiente') + '</button>';
        }).join('');
        return '<tr class="' + (e.estado === 'rechazada' ? 'apagado' : '') + '"><td>' + (ETQ[e.estado] || esc(e.estado)) + '<br><small>' + fecha(e.creado) + '</small></td>' +
          '<td><b>' + esc(e.razon_social) + '</b><br><small>RUC ' + esc(e.ruc) + ' · ' + esc(d.tipos[e.tipo] || e.tipo) + '</small><br><small>' + esc([e.rubro, e.ciudad].filter(Boolean).join(' · ')) + '</small></td>' +
          '<td>' + esc(e.productos) + '<br><small>' + esc(e.descripcion) + '</small></td>' +
          '<td>' + (e.email ? '<a href="mailto:' + esc(e.email) + '">' + esc(e.email) + '</a><br>' : '') + esc(e.telefono) + wsp + (e.web ? '<br><a href="' + esc(e.web) + '" target="_blank" rel="noopener">' + esc(e.web) + '</a>' : '') + '</td>' +
          '<td class="acciones">' + botones + '<button class="peligro" data-accion="empresa-borrar" data-id="' + e.id + '">Borrar</button></td></tr>';
      }).join('');
      vista.innerHTML =
        '<h2>Directorio de empresas</h2>' +
        '<p class="ayuda">Las empresas se registran en <a href="/directorio" target="_blank">el directorio</a> y quedan <b>pendientes</b>. Revisa el RUC en la SUNAT antes de pulsar “Publicar”: solo las publicadas se ven en la web. El correo nunca se muestra al público.</p>' +
        '<form class="admin-form" id="form-empresas">' +
        '<h3 class="ancho">Cargar empresas en bloque</h3>' +
        '<p class="ancho ayuda">Sube un CSV o pega líneas con: <code>RUC ; razón social ; tipo ; rubro ; ciudad ; teléfono ; web ; productos</code>. El tipo puede ser importador, exportador, ambos, agencia o carga. Las empresas cargadas aquí se publican de inmediato y se pueden buscar por RUC o nombre. Si el RUC ya existe, se actualiza.</p>' +
        '<label class="ancho">Archivo<input type="file" name="archivo" accept=".csv,.txt,.tsv,text/plain,text/csv"></label>' +
        '<label class="ancho">…o pega las líneas aquí<textarea name="texto" rows="5" placeholder="20123456789;EMPRESA EJEMPLO S.A.C.;importador;Repuestos;Lima;987654321;www.ejemplo.pe;autopartes"></textarea></label>' +
        '<div class="botones"><button class="btn btn-naranja" type="submit">Cargar empresas</button></div>' +
        '<p class="ancho ayuda" id="progreso-empresas" role="status"></p></form>' +
        '<div class="tabla-env"><table class="tabla"><thead><tr><th>Estado</th><th>Empresa</th><th>Detalle</th><th>Contacto</th><th></th></tr></thead><tbody>' + (filas || '<tr><td colspan="5">Todavía no se registró ninguna empresa.</td></tr>') + '</tbody></table></div>';
      document.getElementById('form-empresas').onsubmit = function (e) {
        e.preventDefault();
        var f = e.target;
        var archivo = f.archivo.files[0];
        var leer = archivo ? archivo.text() : Promise.resolve(f.texto.value);
        var boton = f.querySelector('button[type="submit"]');
        var prog = document.getElementById('progreso-empresas');
        boton.disabled = true;
        leer.then(function (texto) {
          var lineas = texto.split(/\r?\n/).filter(function (l) { return l.trim(); });
          if (!lineas.length) throw new Error('No hay líneas para cargar.');
          var guardadas = 0, descartadas = 0, i = 0;
          function siguiente() {
            if (i >= lineas.length) { aviso(guardadas + ' empresas cargadas' + (descartadas ? ' (' + descartadas + ' líneas ignoradas)' : '')); return directorio(); }
            return api('empresas-importar', { texto: lineas.slice(i, i + 300).join('\n') }).then(function (r) {
              guardadas += r.guardadas; descartadas += r.descartadas; i += 300;
              prog.textContent = 'Cargando… ' + Math.min(i, lineas.length) + ' de ' + lineas.length + ' líneas';
              return siguiente();
            });
          }
          return siguiente();
        }).catch(function (x) { aviso(x.message); prog.textContent = x.message; }).finally(function () { boton.disabled = false; });
      };
    });
  }

  // ── Ajustes ──
  function ajustes() {
    return api('config').then(function (d) {
      var c = d.config;
      function campo(clave, etiqueta, extra) {
        return '<label' + (extra && extra.ancho ? ' class="ancho"' : '') + '>' + etiqueta +
          (extra && extra.area
            ? '<textarea name="' + clave + '" rows="' + (extra.filas || 3) + '">' + esc(c[clave]) + '</textarea>'
            : '<input name="' + clave + '" value="' + esc(c[clave]) + '">') + '</label>';
      }
      vista.innerHTML =
        '<form class="admin-form" id="form-ajustes">' +
        '<h2 class="ancho">Contacto</h2>' +
        campo('whatsapp', 'Tu WhatsApp (con código de país, ej. 51987654321)') +
        campo('email', 'Correo para anunciantes') +
        '<label class="check ancho"><input type="checkbox" name="mostrar_espacios_libres"' + (c.mostrar_espacios_libres === '1' ? ' checked' : '') + '> Mostrar “Tu marca aquí” en los espacios sin anuncio</label>' +
        '<h2 class="ancho">Precios de publicidad (se ven en /anunciate)</h2>' +
        campo('precio_cabecera', 'Banner superior') + campo('precio_lateral', 'Recuadro lateral') + campo('precio_noticias', 'Entre noticias') +
        campo('precio_calculadora', 'Patrocinio calculadora') + campo('precio_videos', 'Banner de videos') + campo('precio_pie', 'Banner inferior') +
        campo('oferta_anual', 'Oferta del plan anual', { ancho: true }) +
        '<h2 class="ancho">Calculadora de impuestos (%)</h2>' +
        campo('igv', 'IGV') + campo('ipm', 'IPM') + campo('seguro_pct', 'Seguro estimado (% del FOB)') + campo('advalorem', 'Tasas de ad valorem (separadas por coma)') +
        campo('percepciones', 'Opciones de percepción (formato JSON: v = tasa, t = texto)', { ancho: true, area: true, filas: 5 }) +
        '<h2 class="ancho">Noticias e IA</h2>' +
        '<label class="check"><input type="checkbox" name="ia_activa"' + (c.ia_activa === '1' ? ' checked' : '') + '> Resumir y traducir noticias con IA</label>' +
        campo('ia_por_hora', 'Resúmenes por hora (máx. 40)') +
        '<h2 class="ancho">Filtro de temas (noticias y videos)</h2>' +
        '<p class="ancho ayuda">Solo se publica lo que habla de <b>comercio exterior, logística y economía</b>, y se descarta lo policial, deportivo o de espectáculos. Ya viene con una lista amplia. Aquí puedes sumar palabras: una palabra completa (<code>uva</code>), una frase (<code>tipo de cambio</code>) o el comienzo de una palabra con asterisco (<code>aduan*</code>). Sepáralas con comas. Después de guardar, pulsa “Ejecutar” en <b>Filtro de temas</b> (pestaña Resumen) para limpiar lo ya publicado.</p>' +
        campo('palabras_extra', 'Palabras que SÍ deben dejar pasar (extra)', { ancho: true, area: true, filas: 2 }) +
        campo('palabras_excluidas', 'Palabras que deben DESCARTAR una noticia o video (extra)', { ancho: true, area: true, filas: 2 }) +
        campo('terminos_ocultos', 'Términos ocultos del ranking (separados por coma)', { ancho: true, area: true, filas: 2 }) +
        '<div class="botones"><button class="btn btn-naranja" type="submit">Guardar ajustes</button></div></form>';
      document.getElementById('form-ajustes').onsubmit = function (e) {
        e.preventDefault();
        var datos = datosForm(e.target);
        datos.mostrar_espacios_libres = datos.mostrar_espacios_libres ? '1' : '0';
        datos.ia_activa = datos.ia_activa ? '1' : '0';
        api('config', datos).then(function () { aviso('Ajustes guardados'); }).catch(function (x) { aviso(x.message); });
      };
    });
  }

  // Inicio: si hay sesión se muestra el panel; si no, el login.
  api('estado').then(mostrarPanel).catch(mostrarLogin);
})();

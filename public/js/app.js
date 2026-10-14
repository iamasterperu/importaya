// ImportaYa — interacción de las páginas públicas (sin librerías).
(function () {
  // Menú del celular
  var boton = document.querySelector('[data-menu]');
  var menu = document.getElementById('menu');
  if (boton && menu) {
    boton.addEventListener('click', function () {
      var abierto = menu.classList.toggle('abierto');
      boton.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    });
  }

  // Videos: al tocar la miniatura se reproduce aquí mismo (sin salir de la web).
  document.addEventListener('click', function (e) {
    var enlace = e.target.closest && e.target.closest('[data-video]');
    if (!enlace) return;
    var id = enlace.getAttribute('data-video');
    if (!/^[\w-]{11}$/.test(id)) return;
    e.preventDefault();
    var marco = document.createElement('iframe');
    marco.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1';
    marco.title = 'Video';
    marco.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share';
    marco.allowFullscreen = true;
    var caja = document.createElement('div');
    caja.className = 'video-mini';
    caja.appendChild(marco);
    enlace.replaceWith(caja);
  });

  // Si la foto de una noticia ya no existe en el medio, se muestra un ícono en su lugar.
  document.addEventListener('error', function (e) {
    var img = e.target;
    if (!img || img.tagName !== 'IMG') return;
    var caja = img.closest('.nota-imagen');
    if (caja) {
      var div = document.createElement('div');
      var etiqueta = caja.closest('.nota') && caja.closest('.nota').querySelector('.etiqueta-PE');
      if (etiqueta) {
        div.className = 'nota-sin-imagen';
        div.textContent = '🇵🇪';
      } else {
        div.className = 'nota-mundo';
        div.setAttribute('aria-hidden', 'true');
        div.innerHTML = '<svg class="nota-mundo-globo" viewBox="0 0 120 120"><use href="#ico-mundo"></use></svg><div class="nota-mundo-texto"><b>Noticias Mundiales</b><small>Comercio exterior</small></div>';
      }
      img.replaceWith(div);
    } else if (img.classList.contains('articulo-imagen')) {
      img.remove();
    }
  }, true);

  // Formularios públicos (contacto de anunciantes y registro en el directorio)
  function enviarFormulario(form, ruta, gracias) {
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.mensaje-form');
      var boton = form.querySelector('button[type="submit"]');
      var datos = {};
      new FormData(form).forEach(function (v, k) { datos[k] = v; });
      Array.prototype.forEach.call(form.querySelectorAll('input[type="checkbox"]'), function (c) { datos[c.name] = c.checked; });
      boton.disabled = true;
      msg.textContent = 'Enviando…';
      fetch(ruta, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            msg.textContent = gracias;
          } else {
            msg.textContent = r.error || 'No se pudo enviar. Inténtalo otra vez.';
          }
        })
        .catch(function () { msg.textContent = 'Sin conexión. Inténtalo otra vez.'; })
        .finally(function () { boton.disabled = false; });
    });
  }
  enviarFormulario(document.getElementById('form-contacto'), '/api/contacto', '¡Gracias! Te escribiremos muy pronto con la propuesta.');
  enviarFormulario(document.getElementById('form-directorio'), '/api/directorio', '¡Gracias! Revisaremos los datos de tu empresa y la publicaremos en el directorio.');
})();

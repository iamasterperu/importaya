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
      div.className = 'nota-sin-imagen';
      div.textContent = '📰';
      img.replaceWith(div);
    } else if (img.classList.contains('articulo-imagen')) {
      img.remove();
    }
  }, true);

  // Formulario de contacto de anunciantes
  var form = document.getElementById('form-contacto');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = form.querySelector('.mensaje-form');
      var boton = form.querySelector('button[type="submit"]');
      var datos = {};
      new FormData(form).forEach(function (v, k) { datos[k] = v; });
      boton.disabled = true;
      msg.textContent = 'Enviando…';
      fetch('/api/contacto', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(datos) })
        .then(function (r) { return r.json(); })
        .then(function (r) {
          if (r.ok) {
            form.reset();
            msg.textContent = '¡Gracias! Te escribiremos muy pronto con la propuesta.';
          } else {
            msg.textContent = r.error || 'No se pudo enviar. Inténtalo otra vez.';
          }
        })
        .catch(function () { msg.textContent = 'Sin conexión. Inténtalo otra vez.'; })
        .finally(function () { boton.disabled = false; });
    });
  }
})();

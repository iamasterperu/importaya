// Buscador de partidas arancelarias.
(function () {
  var caja = document.getElementById('q-partida');
  var salida = document.getElementById('resultados-partidas');
  if (!caja || !salida) return;
  var espera = null;
  var ultima = '';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function pintar(d, q) {
    if (d.vacia) {
      salida.innerHTML = '<p class="vacio">El arancel todavía no está cargado en este sitio. Si eres el administrador, súbelo desde el panel (Partidas).</p>';
      return;
    }
    if (!d.resultados.length) {
      salida.innerHTML = '<p class="vacio">No se encontró nada para “' + esc(q) + '”. Prueba con otra palabra, en singular, o con los primeros dígitos de la partida.</p>';
      return;
    }
    var filas = d.resultados.map(function (r) {
      var av = r.advalorem === null || r.advalorem === undefined ? '—' : r.advalorem + ' %';
      var enlace = r.advalorem === null || r.advalorem === undefined ? '/calculadora' : '/calculadora?av=' + encodeURIComponent(r.advalorem);
      return '<tr><td class="codigo">' + esc(r.formato) + '</td><td>' + esc(r.descripcion) + (r.notas ? '<br><small>' + esc(r.notas) + '</small>' : '') + '</td>' +
        '<td class="der">' + av + '</td><td><a class="mini" href="' + enlace + '">Calcular</a></td></tr>';
    }).join('');
    salida.innerHTML = '<div class="resultado"><table><thead><tr><th>Partida</th><th>Descripción</th><th>Ad valorem</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<p class="nota-meta">' + (d.resultados.length >= d.limite ? 'Se muestran las primeras ' + d.limite + ' coincidencias: escribe más palabras para afinar. ' : '') +
      'Confirma siempre la partida y las tasas con tu agente de aduana o en la SUNAT.</p>';
  }

  function buscar() {
    var q = caja.value.trim();
    if (q === ultima) return;
    ultima = q;
    if (q.length < 2) {
      salida.innerHTML = '<p class="vacio">Escribe el producto (por ejemplo “audífonos” o “zapatillas”) o los primeros dígitos de la partida (por ejemplo 8518).</p>';
      return;
    }
    salida.innerHTML = '<p class="ayuda">Buscando…</p>';
    fetch('/api/partidas?q=' + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (q !== ultima) return;
        if (d.ok === false) { salida.innerHTML = '<p class="vacio">' + esc(d.error || 'No se pudo buscar.') + '</p>'; return; }
        pintar(d, q);
      })
      .catch(function () { salida.innerHTML = '<p class="vacio">Sin conexión. Inténtalo otra vez.</p>'; });
  }

  caja.addEventListener('input', function () { clearTimeout(espera); espera = setTimeout(buscar, 300); });
  caja.closest('form').addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(espera); buscar(); });
  var inicial = new URLSearchParams(location.search).get('q');
  if (inicial) { caja.value = inicial.slice(0, 60); buscar(); } else { ultima = '\u0000'; buscar(); }
})();

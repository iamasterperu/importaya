// Calculadora de impuestos de importación (Perú). Todo se calcula en el navegador.
(function () {
  var form = document.getElementById('calculadora');
  var salida = document.getElementById('resultado');
  if (!form || !salida) return;
  var datos = JSON.parse(document.getElementById('datos-calculadora').textContent);
  var ultimoProducto = '';

  function num(nombre) {
    var v = parseFloat(String(form.elements[nombre].value).replace(',', '.'));
    return isNaN(v) || v < 0 ? 0 : v;
  }
  function usd(v) { return 'US$ ' + v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pen(v) { return 'S/ ' + v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var fob = num('fob');
    if (!fob) {
      form.elements.fob.focus();
      salida.hidden = false;
      salida.innerHTML = '<p>Escribe el valor de tu mercadería (FOB) en dólares.</p>';
      return;
    }
    var flete = num('flete');
    var seguroEscrito = String(form.elements.seguro.value).trim() !== '';
    var seguro = seguroEscrito ? num('seguro') : fob * datos.seguro / 100;
    var tc = num('tc') || datos.tc;
    var unidades = Math.floor(num('unidades'));
    var av = parseFloat(form.elements.advalorem.value) || 0;
    var perc = parseFloat(form.elements.percepcion.value) || 0;

    var cif = fob + flete + seguro;
    var advalorem = cif * av / 100;
    var baseIgv = cif + advalorem;
    var igv = baseIgv * datos.igv / 100;
    var ipm = baseIgv * datos.ipm / 100;
    var tributos = advalorem + igv + ipm;
    var percepcion = (cif + tributos) * perc / 100;
    var pagoAduana = tributos + percepcion;
    var costoTotal = cif + tributos;

    var filas = [
      ['Valor FOB', fob],
      ['Flete', flete],
      ['Seguro' + (seguroEscrito ? '' : ' (estimado ' + datos.seguro + ' %)'), seguro],
      ['Valor CIF', cif, 'subtotal'],
      ['Ad valorem (' + av + ' %)', advalorem],
      ['IGV (' + datos.igv + ' %)', igv],
      ['IPM (' + datos.ipm + ' %)', ipm],
      ['Total de tributos', tributos, 'subtotal'],
      ['Percepción del IGV (' + perc + ' %)', percepcion],
      ['Total a pagar en aduana', pagoAduana, 'total'],
    ];
    var tabla = '<table><thead><tr><th>Concepto</th><th>Dólares</th><th>Soles</th></tr></thead><tbody>' +
      filas.map(function (f) {
        return '<tr' + (f[2] ? ' class="' + f[2] + '"' : '') + '><td>' + esc(f[0]) + '</td><td>' + usd(f[1]) + '</td><td>' + pen(f[1] * tc) + '</td></tr>';
      }).join('') + '</tbody></table>';

    var porUnidad = unidades > 0
      ? '<div><small>Costo por unidad puesta en Perú</small><b>' + pen(costoTotal * tc / unidades) + '</b><small>' + usd(costoTotal / unidades) + ' (sin percepción)</small></div>'
      : '';
    var producto = String(form.elements.producto.value || '').trim();
    var textoWsp = encodeURIComponent('Calculé mis impuestos de importación en ImportaYa: pago en aduana ' + pen(pagoAduana * tc) + '. Calcula los tuyos gratis: ' + location.origin + '/calculadora');

    salida.hidden = false;
    salida.innerHTML =
      '<h2>Resultado' + (producto ? ': ' + esc(producto) : '') + '</h2>' +
      '<div class="resultado-grande">' +
      '<div><small>Pagas en aduana</small><b>' + pen(pagoAduana * tc) + '</b><small>' + usd(pagoAduana) + '</small></div>' +
      '<div><small>Costo total de tu importación</small><b>' + pen(costoTotal * tc) + '</b><small>CIF + tributos</small></div>' +
      porUnidad + '</div>' + tabla +
      '<p class="nota-meta">Tipo de cambio usado: S/ ' + tc.toFixed(3) + (datos.tcFecha ? ' (' + esc(datos.tcFecha) + ')' : '') + '. La percepción es un adelanto del IGV que luego puedes recuperar si tienes RUC.</p>' +
      '<p class="compartir-calculo"><a class="btn btn-wsp" target="_blank" rel="noopener" href="https://wa.me/?text=' + textoWsp + '">Compartir por WhatsApp</a></p>';
    salida.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Se guarda solo el nombre del producto (sin montos) para el ranking "Lo más buscado".
    if (producto && producto.toLowerCase() !== ultimoProducto) {
      ultimoProducto = producto.toLowerCase();
      fetch('/api/busqueda', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ termino: producto }) }).catch(function () {});
    }
  });
})();

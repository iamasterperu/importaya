// Calculadora de IGV: agregar, quitar e IGV de una importación. Todo se calcula en el navegador.
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;
  var IGV = 16; // % IGV
  var IPM = 2;  // % Impuesto de Promoción Municipal (se cobra junto con el IGV: 18 % en total)

  function r2(n) { return Math.round((n + 1e-9) * 100) / 100; }

  // Precio sin IGV → IGV y total.
  function agregar(base, tasa) {
    var t = tasa >= 0 ? tasa : IGV + IPM;
    var igv = base * t / 100;
    return { base: base, igv: igv, total: base + igv, tasa: t };
  }

  // Precio con IGV incluido → base e IGV.
  function quitar(total, tasa) {
    var t = tasa >= 0 ? tasa : IGV + IPM;
    var base = total / (1 + t / 100);
    return { base: base, igv: total - base, total: total, tasa: t };
  }

  // IGV de una importación: base imponible = valor CIF + ad valorem + otros derechos (ISC, etc.).
  function importacion(cif, advPct, otros, tasa) {
    var t = tasa >= 0 ? tasa : IGV + IPM;
    var adv = cif * (advPct > 0 ? advPct : 0) / 100;
    var base = cif + adv + (otros > 0 ? otros : 0);
    var igv = base * (t >= IPM ? (t - IPM) : t) / 100;
    var ipm = t >= IPM ? base * IPM / 100 : 0;
    return { cif: cif, adValorem: adv, otros: otros > 0 ? otros : 0, base: base, igv: igv, ipm: ipm, impuestos: adv + igv + ipm, total: base + igv + ipm };
  }

  root.IYIgv = { agregar: agregar, quitar: quitar, importacion: importacion, r2: r2, IGV: IGV, IPM: IPM };

  if (typeof document === 'undefined') return;
  var form = document.getElementById('form-igv');
  var salida = document.getElementById('salida-igv');
  if (!form || !salida) return;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { var n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? NaN : n; }
  function m(n) { return n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function fila(t, v, fuerte) { return '<tr' + (fuerte ? ' class="fuerte"' : '') + '><td>' + t + '</td><td>' + v + '</td></tr>'; }

  function calcular() {
    var modo = form.elements.modo.value;
    var monto = num(form.elements.monto.value);
    var tasa = num(form.elements.tasa.value);
    var moneda = form.elements.moneda.value;
    form.classList.toggle('modo-importacion', modo === 'importacion');
    if (isNaN(monto) || monto < 0) { salida.innerHTML = '<p class="nota-meta">Escribe un monto para ver el cálculo.</p>'; return; }
    if (isNaN(tasa) || tasa < 0) tasa = IGV + IPM;
    var filas;
    if (modo === 'agregar') {
      var a = agregar(monto, tasa);
      filas = fila('Precio sin IGV', moneda + ' ' + m(a.base)) + fila('IGV + IPM (' + a.tasa + ' %)', moneda + ' ' + m(a.igv)) + fila('Total a pagar', moneda + ' ' + m(a.total), true);
    } else if (modo === 'quitar') {
      var q = quitar(monto, tasa);
      filas = fila('Precio con IGV', moneda + ' ' + m(q.total)) + fila('IGV + IPM incluido (' + q.tasa + ' %)', moneda + ' ' + m(q.igv)) + fila('Precio sin IGV (base)', moneda + ' ' + m(q.base), true);
    } else {
      var adv = num(form.elements.adv.value);
      var otros = num(form.elements.otros.value);
      var i = importacion(monto, isNaN(adv) ? 0 : adv, isNaN(otros) ? 0 : otros, tasa);
      filas = fila('Valor CIF', moneda + ' ' + m(i.cif)) + fila('Ad valorem', moneda + ' ' + m(i.adValorem)) + (i.otros ? fila('Otros derechos / ISC', moneda + ' ' + m(i.otros)) : '') +
        fila('Base imponible del IGV', moneda + ' ' + m(i.base)) + fila('IGV (' + (tasa - IPM) + ' %)', moneda + ' ' + m(i.igv)) + fila('IPM (' + IPM + ' %)', moneda + ' ' + m(i.ipm)) +
        fila('Total de impuestos', moneda + ' ' + m(i.impuestos), true) + fila('Costo con impuestos', moneda + ' ' + m(i.total));
    }
    salida.innerHTML = '<div class="resultado"><table><tbody>' + filas + '</tbody></table></div>';
  }
  form.addEventListener('input', calcular);
  form.addEventListener('change', calcular);
  form.addEventListener('submit', function (e) { e.preventDefault(); calcular(); });
  calcular();
})();

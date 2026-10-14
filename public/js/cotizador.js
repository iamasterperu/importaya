// Cotizador para clientes: arma una cotización, la imprime en PDF o la comparte. Todo en el navegador.
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;

  // ── Cálculo (función pura) ──
  // lineas: [{ concepto, monto, moneda: 'USD'|'PEN', afecto: boolean }]
  function totales(lineas, tc, igvPct) {
    var t = tc > 0 ? tc : 1;
    var afectoPen = 0, noAfectoPen = 0;
    var detalle = lineas.map(function (l) {
      var m = l.monto > 0 ? l.monto : 0;
      var pen = l.moneda === 'PEN' ? m : m * t;
      var usd = l.moneda === 'USD' ? m : m / t;
      if (l.afecto) afectoPen += pen; else noAfectoPen += pen;
      return { concepto: l.concepto, moneda: l.moneda, monto: m, afecto: !!l.afecto, pen: pen, usd: usd };
    });
    var igvPen = afectoPen * (igvPct > 0 ? igvPct : 0) / 100;
    var totalPen = afectoPen + noAfectoPen + igvPen;
    return {
      detalle: detalle,
      subtotalAfectoPen: afectoPen,
      subtotalNoAfectoPen: noAfectoPen,
      igvPen: igvPen,
      totalPen: totalPen,
      totalUsd: totalPen / t,
      igvUsd: igvPen / t,
    };
  }
  root.IYCotizador = { totales: totales };

  if (typeof document === 'undefined') return;
  var form = document.getElementById('cotizador');
  if (!form) return;
  var datos = JSON.parse(document.getElementById('datos-cotizador').textContent);
  var cuerpo = document.getElementById('lineas-cuerpo');
  var hoja = document.getElementById('hoja-cotizacion');
  var CLAVE = 'iy_cotizador_v1';

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(v) { return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function num(v) { var x = parseFloat(String(v).replace(',', '.')); return isNaN(x) || x < 0 ? 0 : x; }

  // ── Líneas ──
  function agregarLinea(l) {
    l = l || { concepto: '', monto: '', moneda: 'USD', afecto: false };
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input data-c="concepto" maxlength="80" placeholder="Concepto" value="' + esc(l.concepto) + '" aria-label="Concepto"></td>' +
      '<td><input data-c="monto" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" value="' + esc(l.monto) + '" aria-label="Monto"></td>' +
      '<td><select data-c="moneda" aria-label="Moneda"><option value="USD"' + (l.moneda === 'USD' ? ' selected' : '') + '>US$</option><option value="PEN"' + (l.moneda === 'PEN' ? ' selected' : '') + '>S/</option></select></td>' +
      '<td class="centro"><input data-c="afecto" type="checkbox"' + (l.afecto ? ' checked' : '') + ' aria-label="Afecto a IGV"></td>' +
      '<td><button type="button" class="mini peligro" data-quitar aria-label="Quitar línea">✕</button></td>';
    cuerpo.appendChild(tr);
  }
  function leerLineas() {
    return Array.prototype.map.call(cuerpo.querySelectorAll('tr'), function (tr) {
      return {
        concepto: tr.querySelector('[data-c="concepto"]').value.trim(),
        monto: num(tr.querySelector('[data-c="monto"]').value),
        moneda: tr.querySelector('[data-c="moneda"]').value,
        afecto: tr.querySelector('[data-c="afecto"]').checked,
      };
    }).filter(function (l) { return l.concepto || l.monto; });
  }
  function campo(nombre) { return String(form.elements[nombre].value || '').trim(); }

  // ── Vista de la cotización ──
  function recalcular() {
    var tc = num(form.elements.tc.value) || datos.tc;
    var igv = form.elements.igv.value === '' ? datos.igv : num(form.elements.igv.value);
    var t = totales(leerLineas(), tc, igv);
    var hoy = new Date().toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: 'long', year: 'numeric' });
    var validez = Math.floor(num(form.elements.validez.value));
    var ruta = [campo('origen'), campo('destino')].filter(Boolean).join(' → ');

    var filas = t.detalle.map(function (d) {
      return '<tr><td>' + esc(d.concepto || '—') + '</td><td class="der">' + (d.moneda === 'USD' ? 'US$ ' : 'S/ ') + fmt(d.monto) + '</td><td class="der">' + (d.afecto ? 'Sí' : 'No') + '</td></tr>';
    }).join('');

    hoja.innerHTML =
      '<header class="hoja-cabecera"><div><h2>' + esc(campo('agencia') || 'Tu empresa') + '</h2><p>Cotización de servicios</p></div>' +
      '<div class="hoja-fecha"><b>' + esc(hoy) + '</b>' + (validez ? '<br>Válida por ' + validez + ' día' + (validez > 1 ? 's' : '') : '') + '</div></header>' +
      '<dl class="hoja-datos">' +
      (campo('cliente') ? '<div><dt>Cliente</dt><dd>' + esc(campo('cliente')) + '</dd></div>' : '') +
      (campo('referencia') ? '<div><dt>Referencia</dt><dd>' + esc(campo('referencia')) + '</dd></div>' : '') +
      (ruta ? '<div><dt>Ruta</dt><dd>' + esc(ruta) + '</dd></div>' : '') +
      (campo('incoterm') ? '<div><dt>Incoterm</dt><dd>' + esc(campo('incoterm')) + '</dd></div>' : '') +
      '</dl>' +
      '<table class="hoja-tabla"><thead><tr><th>Concepto</th><th class="der">Monto</th><th class="der">Afecto a IGV</th></tr></thead><tbody>' +
      (filas || '<tr><td colspan="3" class="vacio-hoja">Agrega conceptos para armar la cotización.</td></tr>') + '</tbody></table>' +
      '<table class="hoja-totales"><tbody>' +
      '<tr><td>Subtotal afecto a IGV</td><td class="der">S/ ' + fmt(t.subtotalAfectoPen) + '</td></tr>' +
      '<tr><td>Subtotal no afecto</td><td class="der">S/ ' + fmt(t.subtotalNoAfectoPen) + '</td></tr>' +
      '<tr><td>IGV (' + igv + ' %)</td><td class="der">S/ ' + fmt(t.igvPen) + '</td></tr>' +
      '<tr class="total"><td>Total en soles</td><td class="der">S/ ' + fmt(t.totalPen) + '</td></tr>' +
      '<tr class="total"><td>Total en dólares</td><td class="der">US$ ' + fmt(t.totalUsd) + '</td></tr>' +
      '</tbody></table>' +
      '<p class="hoja-nota">Tipo de cambio referencial: S/ ' + tc.toFixed(3) + ' por US$ 1.' + (campo('notas') ? '<br>' + esc(campo('notas')).replace(/\n/g, '<br>') : '') + '</p>' +
      '<p class="hoja-pie">Cotización elaborada con ImportaYa</p>';

    guardar();
    return { t: t, tc: tc, igv: igv, hoy: hoy, validez: validez, ruta: ruta };
  }

  // Texto para copiar o enviar por WhatsApp
  function texto() {
    var r = recalcular();
    var l = [];
    l.push('*COTIZACIÓN' + (campo('agencia') ? ' · ' + campo('agencia') : '') + '*');
    if (campo('cliente')) l.push('Cliente: ' + campo('cliente'));
    if (campo('referencia')) l.push('Ref.: ' + campo('referencia'));
    if (r.ruta) l.push('Ruta: ' + r.ruta);
    if (campo('incoterm')) l.push('Incoterm: ' + campo('incoterm'));
    l.push('');
    r.t.detalle.forEach(function (d) { l.push('• ' + (d.concepto || 'Concepto') + ': ' + (d.moneda === 'USD' ? 'US$ ' : 'S/ ') + fmt(d.monto) + (d.afecto ? ' + IGV' : '')); });
    l.push('');
    l.push('IGV (' + r.igv + ' %): S/ ' + fmt(r.t.igvPen));
    l.push('*Total: S/ ' + fmt(r.t.totalPen) + ' (US$ ' + fmt(r.t.totalUsd) + ')*');
    l.push('T.C. referencial: ' + r.tc.toFixed(3));
    if (r.validez) l.push('Válida por ' + r.validez + ' día' + (r.validez > 1 ? 's' : ''));
    if (campo('notas')) l.push(campo('notas'));
    return l.join('\n');
  }

  // ── Guardado en el navegador (solo lo usa quien arma la cotización) ──
  function guardar() {
    try {
      var estado = { campos: {}, lineas: Array.prototype.map.call(cuerpo.querySelectorAll('tr'), function (tr) {
        return {
          concepto: tr.querySelector('[data-c="concepto"]').value,
          monto: tr.querySelector('[data-c="monto"]').value,
          moneda: tr.querySelector('[data-c="moneda"]').value,
          afecto: tr.querySelector('[data-c="afecto"]').checked,
        };
      }) };
      ['agencia', 'cliente', 'referencia', 'origen', 'destino', 'incoterm', 'validez', 'igv', 'notas'].forEach(function (k) { estado.campos[k] = form.elements[k].value; });
      localStorage.setItem(CLAVE, JSON.stringify(estado));
    } catch (e) { /* sin almacenamiento: se sigue funcionando */ }
  }
  function cargar() {
    try {
      var e = JSON.parse(localStorage.getItem(CLAVE) || 'null');
      if (!e) return false;
      Object.keys(e.campos || {}).forEach(function (k) { if (form.elements[k]) form.elements[k].value = e.campos[k]; });
      (e.lineas || []).forEach(agregarLinea);
      return true;
    } catch (err) { return false; }
  }

  // ── Eventos ──
  form.addEventListener('input', recalcular);
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  cuerpo.addEventListener('click', function (e) {
    var b = e.target.closest('[data-quitar]');
    if (!b) return;
    b.closest('tr').remove();
    recalcular();
  });
  document.getElementById('agregar-linea').addEventListener('click', function () { agregarLinea(); recalcular(); });
  var presets = document.getElementById('presets');
  datos.conceptos.forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini';
    b.textContent = '+ ' + c.concepto;
    b.addEventListener('click', function () { agregarLinea({ concepto: c.concepto, monto: '', moneda: c.moneda, afecto: c.afecto }); recalcular(); });
    presets.appendChild(b);
  });
  document.getElementById('imprimir').addEventListener('click', function () {
    recalcular();
    var anterior = document.title;
    document.title = 'Cotizacion' + (campo('cliente') ? ' - ' + campo('cliente') : '');
    window.print();
    document.title = anterior;
  });
  document.getElementById('copiar').addEventListener('click', function () {
    var b = this, t = texto();
    function listo() { b.textContent = '¡Copiado!'; setTimeout(function () { b.textContent = 'Copiar texto'; }, 1800); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(listo, function () {});
    else { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); listo(); } catch (e) {} a.remove(); }
  });
  document.getElementById('wsp').addEventListener('click', function (e) {
    e.preventDefault();
    window.open('https://wa.me/?text=' + encodeURIComponent(texto()), '_blank', 'noopener');
  });
  document.getElementById('limpiar').addEventListener('click', function () {
    if (!confirm('¿Borrar esta cotización y empezar de nuevo?')) return;
    cuerpo.innerHTML = '';
    ['cliente', 'referencia', 'origen', 'destino', 'notas'].forEach(function (k) { form.elements[k].value = ''; });
    form.elements.incoterm.value = '';
    agregarLinea();
    recalcular();
  });

  // Arranque: valores por defecto y lo último que se guardó en este navegador
  form.elements.tc.value = datos.tc.toFixed(3);
  form.elements.igv.value = datos.igv;
  form.elements.validez.value = 7;
  if (!cargar()) { agregarLinea(); }
  if (!cuerpo.children.length) agregarLinea();
  recalcular();
})();

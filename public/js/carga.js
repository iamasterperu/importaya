// Calculadoras de carga: CBM, peso volumétrico, contenedores y conversor. Todo se calcula en el navegador.
(function () {
  var root = typeof window !== 'undefined' ? window : globalThis;

  // ── Cálculos (funciones puras) ──
  function cbm(largoCm, anchoCm, altoCm, bultos) {
    var n = bultos > 0 ? bultos : 1;
    return (largoCm * anchoCm * altoCm) / 1e6 * n;
  }

  // Peso volumétrico aéreo: cm³ ÷ factor (6000 estándar IATA; 5000 en algunos courier).
  function pesoVolumetrico(cbmTotal, factor) {
    var f = factor > 0 ? factor : 6000;
    return (cbmTotal * 1e6) / f;
  }

  // Aéreo: se cobra el mayor entre el peso real y el volumétrico.
  function aereo(cbmTotal, kgReal, factor) {
    var vol = pesoVolumetrico(cbmTotal, factor);
    return { volumetrico: vol, facturable: Math.max(vol, kgReal), porVolumen: vol > kgReal };
  }

  // Marítimo LCL: se cobra el mayor entre m³ y toneladas (1 m³ = 1 tonelada = 1 W/M).
  function lcl(cbmTotal, kgReal) {
    var ton = kgReal / 1000;
    return { wm: Math.max(cbmTotal, ton), porVolumen: cbmTotal >= ton };
  }

  // Cuántos contenedores hacen falta, por volumen (con 85 % de aprovechamiento) y por peso.
  function contenedores(cbmTotal, kgReal, lista, aprovechamiento) {
    var ef = aprovechamiento > 0 ? aprovechamiento : 0.85;
    return lista.map(function (c) {
      var porVolumen = cbmTotal / (c.cbm * ef);
      var porPeso = kgReal / c.kg;
      var limite = porVolumen >= porPeso ? 'volumen' : 'peso';
      var cantidad = Math.max(1, Math.ceil(Math.max(porVolumen, porPeso) - 1e-9));
      var uso = Math.max(porVolumen, porPeso) / cantidad;
      return { id: c.id, nombre: c.nombre, cantidad: cantidad, limite: limite, uso: uso, porVolumen: porVolumen, porPeso: porPeso };
    });
  }

  // Conversiones: factor para pasar de "a" a "b" (b = a × factor).
  var CONVERSIONES = {
    kg_lb: { a: 'kg', b: 'lb', factor: 2.2046226218 },
    cm_in: { a: 'cm', b: 'pulg', factor: 0.3937007874 },
    m_ft: { a: 'm', b: 'pies', factor: 3.280839895 },
    m3_ft3: { a: 'm³', b: 'pies³', factor: 35.3146667 },
    l_gal: { a: 'L', b: 'gal EE. UU.', factor: 0.2641720524 },
  };
  function convertir(clave, valor, alReves) {
    var c = CONVERSIONES[clave];
    if (!c) return NaN;
    return alReves ? valor / c.factor : valor * c.factor;
  }

  root.IYCarga = { cbm: cbm, pesoVolumetrico: pesoVolumetrico, aereo: aereo, lcl: lcl, contenedores: contenedores, convertir: convertir, CONVERSIONES: CONVERSIONES };

  // ── Interfaz (solo en el navegador) ──
  if (typeof document === 'undefined') return;
  var panel = document.getElementById('herramientas-carga');
  if (!panel) return;
  var LISTA = JSON.parse(document.getElementById('datos-contenedores').textContent);

  function n(form, nombre) {
    var v = parseFloat(String(form.elements[nombre].value).replace(',', '.'));
    return isNaN(v) || v < 0 ? 0 : v;
  }
  function f(v, d) { return v.toLocaleString('es-PE', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  // La carga se calcula una vez y alimenta las tres tarjetas.
  var form = document.getElementById('form-carga');
  var salida = document.getElementById('salida-carga');

  function calcular() {
    var l = n(form, 'largo'), a = n(form, 'ancho'), h = n(form, 'alto');
    var bultos = Math.max(1, Math.floor(n(form, 'bultos')));
    var kgBulto = n(form, 'peso');
    var kg = kgBulto * bultos;
    var factor = parseFloat(form.elements.factor.value) || 6000;
    if (!l || !a || !h) {
      salida.innerHTML = '<p class="vacio">Escribe el largo, ancho y alto de un bulto (en centímetros) para ver los resultados.</p>';
      return;
    }
    var m3 = cbm(l, a, h, bultos);
    var air = aereo(m3, kg, factor);
    var mar = lcl(m3, kg);
    var cont = contenedores(m3, kg, LISTA, 0.85);
    var filas = cont.map(function (c) {
      return '<tr><td>' + esc(c.nombre) + '</td><td>' + c.cantidad + '</td><td>' + f(c.uso * 100, 0) + ' %</td><td>limita el ' + c.limite + '</td></tr>';
    }).join('');
    var sugerencia = m3 >= 15
      ? 'Con más de unos 15 m³ suele convenir un contenedor completo (FCL) frente a carga suelta (LCL). Compáralo con la tarifa de tu agente.'
      : 'Con menos de unos 15 m³ normalmente conviene carga suelta (LCL). Compáralo con la tarifa de tu agente.';
    salida.innerHTML =
      '<div class="resultado-grande">' +
      '<div><small>Volumen total</small><b>' + f(m3, 3) + ' m³</b><small>' + bultos + ' bulto' + (bultos > 1 ? 's' : '') + ' · ' + f(kg, 1) + ' kg</small></div>' +
      '<div><small>Aéreo: peso facturable</small><b>' + f(air.facturable, 1) + ' kg</b><small>volumétrico ' + f(air.volumetrico, 1) + ' kg · cobra por ' + (air.porVolumen ? 'volumen' : 'peso real') + '</small></div>' +
      '<div><small>Marítimo LCL: W/M</small><b>' + f(mar.wm, 3) + '</b><small>cobra por ' + (mar.porVolumen ? 'm³' : 'toneladas') + '</small></div>' +
      '</div>' +
      '<h3>Contenedores necesarios</h3>' +
      '<div class="resultado"><table><thead><tr><th>Contenedor</th><th>Cantidad</th><th>Uso</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<p class="nota-meta">' + esc(sugerencia) + ' Se supone un 85 % de aprovechamiento del volumen. Valores referenciales: confirma con tu naviera.</p>';
  }
  form.addEventListener('input', calcular);
  form.addEventListener('submit', function (e) { e.preventDefault(); calcular(); });
  calcular();

  // Conversor
  var conv = document.getElementById('form-conversor');
  var convSalida = document.getElementById('salida-conversor');
  function convertirPantalla() {
    var clave = conv.elements.tipo.value;
    var c = CONVERSIONES[clave];
    var v = parseFloat(String(conv.elements.valor.value).replace(',', '.'));
    if (isNaN(v)) { convSalida.textContent = ''; return; }
    var alReves = conv.elements.sentido.value === 'b';
    var res = convertir(clave, v, alReves);
    convSalida.innerHTML = '<b>' + f(v, 3) + ' ' + esc(alReves ? c.b : c.a) + ' = ' + f(res, 3) + ' ' + esc(alReves ? c.a : c.b) + '</b>';
  }
  function etiquetasSentido() {
    var c = CONVERSIONES[conv.elements.tipo.value];
    conv.elements.sentido.options[0].textContent = c.a + ' → ' + c.b;
    conv.elements.sentido.options[1].textContent = c.b + ' → ' + c.a;
  }
  conv.addEventListener('input', function () { etiquetasSentido(); convertirPantalla(); });
  conv.addEventListener('submit', function (e) { e.preventDefault(); });
  etiquetasSentido();
  convertirPantalla();
})();

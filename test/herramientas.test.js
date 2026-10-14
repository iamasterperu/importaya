// Pruebas de las herramientas: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { rucValido, rucEmpresa, parsearPartidas, formatoPartida } from '../src/lib/aduana.js';
import { condicionesPartida } from '../src/api/herramientas.js';

// Los scripts del navegador se cargan en un contexto aislado (sin DOM) y exponen sus funciones puras.
function cargarCliente(archivo, nombre) {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL(`../public/js/${archivo}`, import.meta.url), 'utf8'), ctx);
  return ctx[nombre];
}
const carga = cargarCliente('carga.js', 'IYCarga');
const cotizador = cargarCliente('cotizador.js', 'IYCotizador');

test('RUC: dígito verificador y tipo de contribuyente', () => {
  assert.equal(rucValido('20131312955'), true); // SUNAT
  assert.equal(rucValido('20131312954'), false); // dígito verificador mal
  assert.equal(rucValido('2013131295'), false); // 10 dígitos
  assert.equal(rucValido('30131312955'), false); // prefijo inexistente
  assert.equal(rucEmpresa('20131312955'), true);
  assert.equal(rucValido(''), false);
});

test('Partidas: lee líneas con ; tabulación y |, ignora encabezados', () => {
  const texto = [
    'Partida;Descripción;Ad valorem',
    '8518.30.00.00;Auriculares, incluso combinados con micrófono;0',
    '6403.99.00.00\tCalzado con suela de caucho\t11%',
    '4202.11.00.00|Baúles, maletas y similares|6|Sujeto a verificación',
    '12;Muy corta;0',
    '8517.13.00.00;Teléfonos inteligentes;abc',
    '',
  ].join('\n');
  const { filas, descartadas } = parsearPartidas(texto);
  assert.equal(filas.length, 3);
  assert.equal(descartadas, 3); // encabezado, código corto y ad valorem inválido
  assert.equal(filas[0].codigo, '8518300000');
  assert.equal(filas[0].advalorem, 0);
  assert.equal(filas[0].busqueda, 'auriculares, incluso combinados con microfono');
  assert.equal(filas[1].advalorem, 11);
  assert.equal(filas[2].codigo, '4202110000');
  assert.equal(filas[2].notas, 'Sujeto a verificación');
});

test('Partidas: formato visible', () => {
  assert.equal(formatoPartida('8518300000'), '8518.30.00.00');
  assert.equal(formatoPartida('85183000'), '8518.30.00');
  assert.equal(formatoPartida('851830'), '8518.30');
});

test('Buscador de partidas: por código o por palabras sin tildes ni plural', () => {
  assert.deepEqual(condicionesPartida('8518'), { sql: 'codigo LIKE ?', valores: ['8518%'], orden: 'codigo' });
  assert.deepEqual(condicionesPartida('8518.30').valores, ['851830%']);
  const c = condicionesPartida('Audífonos inalámbricos');
  assert.equal(c.sql, '(busqueda LIKE ? OR busqueda LIKE ?) AND busqueda LIKE ?'); // audífono ≈ auricular
  assert.deepEqual(c.valores, ['%audifono%', '%auricular%', '%inalambrico%']);
  assert.deepEqual(condicionesPartida('celulares').valores, ['%celular%', '%telefono%']);
  assert.deepEqual(condicionesPartida('televisores').valores, ['%televisor%']);
  assert.equal(condicionesPartida('a'), null);
  assert.equal(condicionesPartida('5'), null);
  assert.deepEqual(condicionesPartida('100%_').valores, ['%100%']); // los comodines de SQL se eliminan
});

test('Carga: CBM, peso volumétrico aéreo y W/M marítimo', () => {
  // 10 cajas de 60×40×40 cm = 0,96 m³ cada una → 9,6 m³
  assert.ok(Math.abs(carga.cbm(60, 40, 40, 10) - 0.96) < 1e-9);
  const m3 = carga.cbm(100, 100, 100, 2); // 2 m³
  const a = carga.aereo(m3, 200, 6000);
  assert.ok(Math.abs(a.volumetrico - 333.3333) < 1e-3);
  assert.equal(a.porVolumen, true);
  assert.equal(a.facturable, a.volumetrico);
  assert.equal(carga.aereo(0.1, 100, 6000).porVolumen, false); // pesa más de lo que ocupa
  assert.deepEqual({ ...carga.lcl(3, 2500) }, { wm: 3, porVolumen: true });
  assert.deepEqual({ ...carga.lcl(2, 5000) }, { wm: 5, porVolumen: false });
});

test('Carga: contenedores necesarios por volumen o por peso', () => {
  const lista = [
    { id: '20', nombre: "20'", cbm: 33, kg: 28000 },
    { id: '40hc', nombre: "40' HC", cbm: 76, kg: 26300 },
  ];
  const r = carga.contenedores(20, 5000, lista, 0.85);
  assert.equal(r[0].cantidad, 1);
  assert.equal(r[0].limite, 'volumen');
  const pesado = carga.contenedores(10, 60000, lista, 0.85);
  assert.equal(pesado[0].cantidad, 3); // 60 000 / 28 000 = 2,14 → 3
  assert.equal(pesado[0].limite, 'peso');
  const grande = carga.contenedores(100, 1000, lista, 0.85);
  assert.equal(grande[1].cantidad, 2); // 100 / (76 × 0,85) = 1,55 → 2
});

test('Conversor de unidades', () => {
  assert.ok(Math.abs(carga.convertir('kg_lb', 100) - 220.46226) < 1e-4);
  assert.ok(Math.abs(carga.convertir('kg_lb', 220.46226218, true) - 100) < 1e-6);
  assert.ok(Math.abs(carga.convertir('m3_ft3', 1) - 35.3146667) < 1e-6);
  assert.ok(Number.isNaN(carga.convertir('inexistente', 1)));
});

test('Cotizador: subtotales, IGV y totales en soles y dólares', () => {
  const t = cotizador.totales(
    [
      { concepto: 'Flete marítimo', monto: 1000, moneda: 'USD', afecto: false },
      { concepto: 'Gastos operativos', monto: 100, moneda: 'USD', afecto: true },
      { concepto: 'Transporte local', monto: 350, moneda: 'PEN', afecto: true },
    ],
    3.5,
    18
  );
  assert.ok(Math.abs(t.subtotalNoAfectoPen - 3500) < 1e-9);
  assert.ok(Math.abs(t.subtotalAfectoPen - 700) < 1e-9); // 100 × 3,5 + 350
  assert.ok(Math.abs(t.igvPen - 126) < 1e-9); // 18 % de 700
  assert.ok(Math.abs(t.totalPen - 4326) < 1e-9);
  assert.ok(Math.abs(t.totalUsd - 4326 / 3.5) < 1e-9);
  // Montos vacíos o negativos no suman
  const v = cotizador.totales([{ concepto: 'x', monto: -5, moneda: 'USD', afecto: true }], 3.5, 18);
  assert.equal(v.totalPen, 0);
});

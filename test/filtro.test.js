// Pruebas del filtro de temas: npm test
// Los títulos son reales: salieron en el sitio de ImportaYa.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFiltro } from '../src/lib/filtro.js';

const filtro = crearFiltro();

test('Deja pasar comercio exterior, logística y economía', () => {
  const buenos = [
    'Aranceles en EE.UU. llevan al grupo Rocío a diversificar mercados con la uva de mesa',
    'Precio del dólar hoy, miércoles 14 de octubre: cuál es el tipo de cambio del día',
    'Exportación peruana de confecciones cae 5.7% y el sector apunta a los aranceles de EE. UU.',
    'Importaciones de tecnología en Perú crecen 46% y superan los USD 1.700 millones',
    'Sunat alista reglas únicas para que importadores accedan a rebajas de aranceles',
    'Port of Los Angeles Sets All-Time Cargo Record as Imports Surge',
    'Container Ship Sinks Near Hormuz After Being Hit by Projectile, Sources Say',
    'Fletes para envíos de petróleo ruso Urals a India alcanzan nuevos récords',
    '🟣Irán ataca buques para que suba más el precio del petróleo y esto dañe a Trump en Estados Unidos',
    'El Niño retrasaría la recuperación económica del Perú hasta la segunda mitad de 2027',
    'APM Terminals Poti registra alza en volumen de contenedores entre enero y septiembre de 2026',
    'Corío apunta a ser una “ciudad puerto”: todo lo que traería el proyecto dentro de 10 años',
    'Vaca Muerta y la minería traccionan el comercio exterior',
    'Sunat: cómo calcular el IGV y el ISC en una importación con DUA',
    'Exportaciones de cacao peruano crecen en China y alistan nuevo canal',
    'Fenómeno de El Niño: envíos de arándanos peruanos caerían 31% en las próximas semanas',
  ];
  for (const t of buenos) assert.equal(filtro.relevante(t), true, t);
});

test('Descarta policiales, deportes, espectáculos y temas ajenos', () => {
  const malos = [
    'Confesaron con total frialdad: Capturan a sicarios de solo 18 y 19 años',
    'La atacaron por atrás pero se defendió con pudo para evitar robo: Ladrón huyó en mototaxi',
    'Delincuente tenía un cómplice oculto: Joven chofer de la empresa Urbanito es asesinado a balazo',
    'Si la Liga 1 terminara hoy: ¿cómo se definiría el título y los playoffs? #rppshorts',
    'ROMA VS REAL MADRID 🔴EN VIVO UEFA CHAMPIONS LEAGUE 2026-27 | Transmisión Oficial RPP',
    '⚽⚡ FÚTBOL COMO CANCHA: lo último del mundo deportivo nacional e internacional | Todo sobre la Liga 1',
    'Papa León XIV: informan resultados posoperatorios y evolución positiva',
    'LATINA NOTICIAS MEDIODÍA - MIÉRCOLES 14 DE OCTUBRE DE 2026',
    'Identifican a la persona que falleció al caer de una montaña rusa en Six Flags',
    'Nueve detenidos con armas y dinamita en el Callao: cinco son menores de edad',
    '"Cajamarca está en riesgo de convertirse en el nuevo Pataz": Fiscal sobre minería ilegal',
    'Inversionistas advierten 3 riesgos para invertir en Perú',
    'Gobierno designa presidenta del directorio y directora ejecutiva del Fonafe',
    'Estas cartas de Pokémon se podrían vender por US$ 20 millones',
    'Chile: tormenta eléctrica, granizo y un tornado sorprenden a Santiago',
  ];
  for (const t of malos) assert.equal(filtro.relevante(t), false, t);
});

test('Lo policial o deportivo gana aunque el título nombre el comercio', () => {
  assert.equal(filtro.relevante('Roban contenedores con mercadería en el puerto del Callao'), false);
  assert.equal(filtro.relevante('Sicarios extorsionan a transportistas de carga en Lima'), false);
  assert.equal(filtro.relevante('Alianza Lima presenta su nuevo auspiciador de importaciones'), false);
  assert.equal(filtro.relevante('Asesinan a empresario exportador en Piura'), false);
});

test('No calza dentro de otra palabra: deportes, importante, reporte, cargo, fiscal', () => {
  assert.equal(filtro.relevante('Lo más importante de la semana en deportes'), false);
  assert.equal(filtro.relevante('Reportan fuertes lluvias en la selva'), false);
  assert.equal(filtro.relevante('El ministro asumió el cargo este lunes'), false);
  assert.equal(filtro.relevante('Fiscal pide prisión preventiva para el investigado'), false);
  assert.equal(filtro.relevante('Hoy es un día importante'), false);
  assert.equal(filtro.relevante('Royal Navy’s Only Ice Patrol Ship Faces Uncertain Future After Defect'), false);
});

test('La descripción también cuenta', () => {
  assert.equal(filtro.relevante('Se reúnen en Lima', 'Hablarán sobre aranceles y exportaciones'), true);
  assert.equal(filtro.relevante('Se reúnen en Lima', 'Hablarán sobre fútbol y aranceles'), false);
});

test('El administrador puede sumar palabras permitidas y descartadas', () => {
  const t = 'El aguaymanto peruano llega a nuevos destinos';
  assert.equal(filtro.relevante(t), false);
  assert.equal(crearFiltro({ palabras_extra: 'aguaymanto, tuna*' }).relevante(t), true);
  assert.equal(crearFiltro({ palabras_extra: 'aguaymanto' }).relevante('El aguaymanto sube por el bitcoin'), true);
  assert.equal(crearFiltro({ palabras_extra: 'aguaymanto', palabras_excluidas: 'bitcoin' }).relevante('El aguaymanto sube por el bitcoin'), false);
});

test('Texto vacío o sin palabras no pasa', () => {
  assert.equal(filtro.relevante(''), false);
  assert.equal(filtro.relevante('🔴🔴🔴'), false);
  assert.equal(filtro.relevante(null, null), false);
});

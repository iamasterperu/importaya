// Filtro de temas: deja pasar solo lo que habla de comercio exterior, logística o economía,
// y descarta lo que es policial, deportivo o de espectáculos.
//
// Cómo se escriben las palabras (sin tildes, en minúsculas):
//   "aduan*"          → cualquier palabra que EMPIECE así (aduana, aduanas, aduanero…)
//   "tlc"             → solo esa palabra completa (no calza dentro de otra palabra)
//   "tipo de cambio"  → esa frase completa
// Así "port" no calza con "deportes" ni "import" con "importante".
import { sinAcentos } from './texto.js';

// Debe aparecer al menos una de estas.
export const TEMAS = [
  // Comercio exterior, aduanas e impuestos
  'importaci*', 'importad*', 'importar', 'importan', 'importaron', 'exportaci*', 'exportad*', 'exportar', 'exportan', 'agroexport*',
  'aduan*', 'arancel*', 'sunat', 'comerci*', 'balanza comercial', 'guerra comercial', 'acuerdo comercial', 'tratado*', 'tlc',
  'mincetur', 'promperu', 'adex', 'comex', 'contrabando', 'mercancia*', 'mercaderia*', 'courier', 'divisa*', 'incoterm*', 'despacho*', 'dua',
  'partida arancelaria', 'valor en aduana', 'drawback', 'restitucion de derechos', 'antidumping', 'dumping', 'salvaguardia*', 'certificado de origen',
  'agente de aduana', 'agentes de aduana', 'agente de carga', 'agentes de carga', 'forwarder*', 'zona franca', 'zofratacna', 'cetico', 'vuce',
  'omc', 'apec', 'alianza del pacifico', 'mercosur', 'negocios internacionales', 'internacionalizacion', 'mercado internacional', 'mercados internacionales',
  'inversion extranjera', 'inversiones extranjeras', 'tribut*', 'impuesto*', 'igv', 'isc', 'recaudaci*',
  // Puertos, transporte y logística
  'puerto*', 'portuari*', 'callao', 'chancay', 'flete*', 'contenedor*', 'naviera*', 'naviero*', 'buque*', 'maritim*', 'logistic*', 'carga', 'cargas',
  'cadena de suministro', 'cadenas de suministro', 'terminal portuario', 'astillero*', 'maersk', 'cosco', 'hapag', 'cma cgm', 'canal de panama', 'canal de suez', 'mar rojo', 'ormuz', 'hormuz',
  // Economía y finanzas
  'econom*', 'pbi', 'pib', 'inflaci*', 'dolar*', 'tipo de cambio', 'bcr', 'bcrp', 'banco central', 'mef', 'fmi', 'banco mundial', 'ocde',
  'reserva federal', 'tasa de interes', 'tasas de interes', 'bolsa de valores', 'bvl', 'finanzas', 'recesion', 'devaluacion', 'reservas internacionales',
  'politica fiscal', 'deficit fiscal', 'ingresos fiscales', 'gasto publico', 'petroleo', 'crudo', 'brent', 'opep', 'gas natural', 'cobre', 'commodit*', 'bursatil*',
  // Productos de exportación
  'arandano*', 'uva', 'uvas', 'palta*', 'esparrago*', 'banano*', 'cacao', 'quinua', 'mango*', 'harina de pescado', 'langostino*', 'textil*', 'confecciones',
  // Inglés (fuentes marítimas y de negocios)
  'import', 'imports', 'importer*', 'export', 'exports', 'exporter*', 'tariff*', 'trade', 'shipping', 'freight', 'container*', 'customs', 'cargo ship', 'cargo ships', 'cargo vessel', 'cargo vessels', 'air cargo', 'shipyard*', 'seafarer*', 'maritime',
  'supply chain', 'port', 'ports', 'tanker*', 'shipowner*', 'bunker*', 'boxship*', 'economy', 'economic', 'inflation', 'sanction*',
];

// Si aparece cualquiera de estas, se descarta aunque hable de comercio.
export const EXCLUIR = [
  // Policiales
  'asesin*', 'homicid*', 'sicari*', 'robo', 'robos', 'robar', 'robaron', 'robad*', 'roban', 'ladron*', 'asalt*', 'crimen*', 'criminal*', 'delincuen*',
  'extorsi*', 'secuestr*', 'violaci*', 'feminicid*', 'balacera*', 'baleado*', 'balazo*', 'cadaver*', 'apunal*', 'muerto', 'muertos', 'mueren', 'murio', 'murieron', 'fallecid*',
  'inmigrante*', 'redada*', 'papa leon', 'pataz', 'pandilla*', 'barra brava', 'barras bravas', 'dinamita', 'armas de fuego', 'detenidos con armas', 'explosivo*', 'atentado*',
  // Deportes
  'futbol*', 'fulbito', 'liga 1', 'liga1', 'torneo*', 'campeonato*', 'champions', 'copa libertadores', 'copa sudamericana', 'eliminatorias',
  'seleccion peruana', 'gol', 'goles', 'deporte*', 'deportivo*', 'deportivas', 'tenis', 'voley*', 'basquet*', 'nba', 'ufc', 'boxeo', 'olimpic*',
  'alianza lima', 'universitario', 'sporting cristal', 'garcilaso', 'melgar', 'real madrid', 'var', 'formula 1', 'gran premio',
  // Espectáculos y entretenimiento
  'farandula', 'espectaculo*', 'chisme*', 'reality', 'telenovela*', 'concierto*', 'cantante*', 'actriz', 'horoscopo*', 'miss peru', 'streamer*',
  // Inglés
  'football', 'soccer', 'nfl', 'nba', 'mlb', 'murder*', 'homicide*', 'robbery', 'rapper',
];

// Convierte un texto en palabras sueltas sin tildes ni signos.
function palabrasDe(texto) {
  return sinAcentos(String(texto || ''))
    .toLowerCase()
    .replace(/[^a-z0-9ñ]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

// Prepara una lista de palabras para buscarla rápido.
function compilar(lista) {
  const exactas = new Set();
  const comienzos = [];
  const frases = [];
  for (const crudo of lista) {
    const p = sinAcentos(String(crudo || '')).toLowerCase().trim();
    if (!p) continue;
    if (p.endsWith('*')) {
      const base = p.slice(0, -1).replace(/[^a-z0-9ñ]/g, '');
      if (base.length >= 3) comienzos.push(base);
    } else if (p.includes(' ')) {
      frases.push(` ${palabrasDe(p).join(' ')} `);
    } else {
      exactas.add(p);
    }
  }
  return (texto) => {
    const palabras = palabrasDe(texto);
    if (!palabras.length) return false;
    for (const w of palabras) {
      if (exactas.has(w)) return true;
      for (const c of comienzos) if (w.startsWith(c)) return true;
    }
    if (frases.length) {
      const corrido = ` ${palabras.join(' ')} `;
      for (const f of frases) if (corrido.includes(f)) return true;
    }
    return false;
  };
}

// Lista escrita por el administrador en Ajustes: separada por comas o saltos de línea.
export function listaExtra(texto) {
  return String(texto || '')
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Crea el filtro con las palabras base más las que el administrador agregó en Ajustes.
export function crearFiltro(cfg = {}) {
  const quiere = compilar([...TEMAS, ...listaExtra(cfg.palabras_extra)]);
  const descarta = compilar([...EXCLUIR, ...listaExtra(cfg.palabras_excluidas)]);
  return {
    // titulo: obligatorio. descripcion: opcional (extracto de la fuente).
    relevante(titulo, descripcion = '') {
      const todo = `${titulo || ''} ${descripcion || ''}`;
      if (descarta(todo)) return false;
      return quiere(todo);
    },
  };
}

// Utilidades de comercio exterior: validación de RUC y lectura de la tabla de partidas.
import { sinAcentos, recortar } from './texto.js';

// RUC peruano: 11 dígitos, dígito verificador módulo 11.
export function rucValido(ruc) {
  const r = String(ruc || '').trim();
  if (!/^\d{11}$/.test(r)) return false;
  if (!['10', '15', '16', '17', '20'].includes(r.slice(0, 2))) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((a, p, i) => a + p * Number(r[i]), 0);
  const resto = 11 - (suma % 11);
  const digito = resto === 10 ? 0 : resto === 11 ? 1 : resto;
  return digito === Number(r[10]);
}

// Las empresas se publican solo con RUC de persona jurídica (20…) para no exponer datos de personas naturales.
export function rucEmpresa(ruc) {
  return rucValido(ruc) && String(ruc).startsWith('20');
}

// Importación masiva de empresas: ruc ; razón social ; tipo ; rubro ; ciudad ; teléfono ; web ; productos
// (tipo: importador / exportador / ambos / agencia / carga; si falta o no se entiende, queda como "ambos").
export function parsearEmpresas(texto) {
  const filas = [];
  let descartadas = 0;
  const limpio = (v, max) => recortar(String(v || '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim(), max);
  for (const linea of String(texto || '').split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const c = linea.split(/[;\t|]/).map((x) => x.trim().replace(/^"|"$/g, ''));
    const ruc = soloDigitos(c[0]);
    const razon = limpio(c[1], 120);
    if (!rucValido(ruc) || razon.length < 3) {
      descartadas++;
      continue;
    }
    const t = String(c[2] || '').toLowerCase();
    const tipo = TIPOS_EMPRESA[t] ? t : /export/.test(t) && /import/.test(t) ? 'ambos' : /export/.test(t) ? 'exportador' : /import/.test(t) ? 'importador' : 'ambos';
    filas.push({ ruc, razon_social: razon, tipo, rubro: limpio(c[3], 80), ciudad: limpio(c[4], 60), telefono: limpio(c[5], 30), web: limpio(c[6], 200), productos: limpio(c[7], 200) });
  }
  return { filas, descartadas };
}

export const TIPOS_EMPRESA = {
  importador: 'Importador',
  exportador: 'Exportador',
  ambos: 'Importador y exportador',
  agencia: 'Agencia de aduana',
  carga: 'Agente de carga / logística',
};

export function soloDigitos(codigo) {
  return String(codigo || '').replace(/\D/g, '');
}

// Formato de una partida: 8517.12.00.00
export function formatoPartida(codigo) {
  const d = soloDigitos(codigo);
  if (d.length === 10) return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}.${d.slice(8)}`;
  if (d.length === 8) return `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6)}`;
  if (d.length === 6) return `${d.slice(0, 4)}.${d.slice(4)}`;
  return d;
}

// Lee líneas "partida ; descripción ; ad valorem ; notas" (separadas por punto y coma, tabulación o |).
// Ignora encabezados y líneas vacías. Devuelve las filas válidas y cuántas se descartaron.
export function parsearPartidas(texto) {
  const filas = [];
  let descartadas = 0;
  for (const linea of String(texto || '').split(/\r?\n/)) {
    if (!linea.trim()) continue;
    const campos = linea.split(/[;\t|]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    const codigo = soloDigitos(campos[0]);
    const descripcion = recortar(campos[1] || '', 400);
    if (codigo.length < 6 || codigo.length > 10 || !descripcion) {
      descartadas++;
      continue;
    }
    const crudo = String(campos[2] || '').replace('%', '').replace(',', '.').trim();
    const av = crudo === '' ? null : Number(crudo);
    if (av !== null && (!Number.isFinite(av) || av < 0 || av > 100)) {
      descartadas++;
      continue;
    }
    filas.push({
      codigo,
      descripcion,
      busqueda: sinAcentos(descripcion).toLowerCase(),
      advalorem: av,
      notas: campos[3] ? recortar(campos[3], 300) : null,
    });
  }
  return { filas, descartadas };
}

// El arancel usa lenguaje técnico ("auriculares", "calzado") y la gente busca como habla ("audífonos", "zapatillas").
// Cada palabra (en singular, sin tildes) se amplía con los términos que sí aparecen en el arancel.
export const SINONIMOS = {
  audifono: ['auricular'],
  celular: ['telefono'],
  smartphone: ['telefono'],
  movil: ['telefono'],
  zapatilla: ['calzado'],
  zapato: ['calzado'],
  sandalia: ['calzado'],
  bota: ['calzado'],
  laptop: ['portatil', 'ordenador'],
  computadora: ['ordenador', 'automatica de datos'],
  pc: ['ordenador'],
  tv: ['televis'],
  television: ['televis'],
  ropa: ['prenda', 'vestir'],
  polo: ['camiseta'],
  pantalon: ['pantalone'],
  polera: ['sueter', 'jersey'],
  juguete: ['juego', 'jugueteria'],
  bicicleta: ['ciclo'],
  moto: ['motocicleta'],
  auto: ['automovile', 'vehiculo'],
  carro: ['automovile', 'vehiculo'],
  repuesto: ['parte', 'accesorio'],
  bateria: ['acumulador', 'pila'],
  cargador: ['convertidor', 'alimentacion'],
  reloj: ['relojes'],
  cosmetico: ['belleza', 'maquillaje'],
  maquillaje: ['belleza'],
  perfume: ['perfumeria'],
  licuadora: ['batidora', 'electromecanico'],
  refrigeradora: ['refrigerador', 'frigorifico'],
  lavadora: ['lavar'],
  cocina: ['hornillo', 'cocinar'],
  silla: ['asiento'],
  mueble: ['mobiliario'],
  vino: ['vinos'],
  cerveza: ['malta'],
  aceite: ['grasa'],
  llanta: ['neumatico'],
  pelota: ['balon'],
  mochila: ['bolso', 'morral'],
  maleta: ['baul', 'maleta'],
};

// Singular simple: "celulares" → "celular", "polos" → "polo". Como la búsqueda es por trozo de palabra, quedarse corto no estorba.
export function singular(palabra) {
  if (palabra.length > 5 && palabra.endsWith('es')) return palabra.slice(0, -2);
  if (palabra.length > 3 && palabra.endsWith('s')) return palabra.slice(0, -1);
  return palabra;
}

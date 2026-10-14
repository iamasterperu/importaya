// Datos de referencia para las herramientas de comercio exterior.
// Son textos fijos: se pueden editar aquí sin tocar el resto del código.

// Incoterms® 2020 (Cámara de Comercio Internacional).
// vendedor / comprador: quién asume cada tramo. mar = solo transporte marítimo y fluvial.
export const INCOTERMS = [
  { sigla: 'EXW', nombre: 'En fábrica', mar: false, resumen: 'El vendedor pone la mercadería a disposición en su local. El comprador asume casi todo: carga, exportación, flete, seguro e importación.' },
  { sigla: 'FCA', nombre: 'Franco transportista', mar: false, resumen: 'El vendedor entrega la mercadería, ya con trámite de exportación, al transportista que designa el comprador.' },
  { sigla: 'CPT', nombre: 'Transporte pagado hasta', mar: false, resumen: 'El vendedor paga el flete hasta el destino acordado; el riesgo pasa al comprador cuando entrega al primer transportista.' },
  { sigla: 'CIP', nombre: 'Transporte y seguro pagados hasta', mar: false, resumen: 'Como CPT, pero el vendedor además contrata un seguro con cobertura amplia.' },
  { sigla: 'DAP', nombre: 'Entregada en lugar', mar: false, resumen: 'El vendedor entrega en el lugar de destino, listo para descargar. El comprador hace la importación y paga sus tributos.' },
  { sigla: 'DPU', nombre: 'Entregada y descargada en lugar', mar: false, resumen: 'Como DAP, pero el vendedor también descarga en el destino.' },
  { sigla: 'DDP', nombre: 'Entregada con derechos pagados', mar: false, resumen: 'El vendedor asume todo, incluida la importación y sus tributos. Es su máxima obligación.' },
  { sigla: 'FAS', nombre: 'Franco al costado del buque', mar: true, resumen: 'El vendedor entrega la mercadería al costado del buque en el puerto de embarque.' },
  { sigla: 'FOB', nombre: 'Franco a bordo', mar: true, resumen: 'El vendedor entrega la mercadería a bordo del buque. Desde ahí el riesgo y el flete son del comprador.' },
  { sigla: 'CFR', nombre: 'Costo y flete', mar: true, resumen: 'El vendedor paga el flete hasta el puerto de destino; el riesgo pasa al comprador al cargar en el buque.' },
  { sigla: 'CIF', nombre: 'Costo, seguro y flete', mar: true, resumen: 'Como CFR, pero el vendedor además contrata un seguro (cobertura mínima).' },
];

// Contenedores marítimos estándar (medidas internas y carga útil típicas; varían según la naviera).
export const CONTENEDORES = [
  { id: '20', nombre: "20' estándar", largo: 5.9, ancho: 2.35, alto: 2.39, cbm: 33, kg: 28000 },
  { id: '40', nombre: "40' estándar", largo: 12.03, ancho: 2.35, alto: 2.39, cbm: 67, kg: 26500 },
  { id: '40hc', nombre: "40' High Cube", largo: 12.03, ancho: 2.35, alto: 2.69, cbm: 76, kg: 26300 },
];

// Enlaces útiles. Si alguno cambia, se corrige solo aquí.
export const ENLACES = [
  {
    grupo: 'Trámites y autoridades (Perú)',
    items: [
      { nombre: 'SUNAT', url: 'https://www.sunat.gob.pe', nota: 'Aduanas, tipo de cambio, arancel y operaciones en línea' },
      { nombre: 'VUCE', url: 'https://www.vuce.gob.pe', nota: 'Ventanilla Única de Comercio Exterior' },
      { nombre: 'MINCETUR', url: 'https://www.gob.pe/mincetur', nota: 'Tratados de libre comercio y política comercial' },
      { nombre: 'PromPerú', url: 'https://www.promperu.gob.pe', nota: 'Promoción de exportaciones' },
      { nombre: 'Autoridad Portuaria Nacional', url: 'https://www.gob.pe/apn', nota: 'Puertos y terminales' },
      { nombre: 'El Peruano', url: 'https://elperuano.pe', nota: 'Normas legales y feriados oficiales' },
    ],
  },
  {
    grupo: 'Terminales portuarios',
    items: [
      { nombre: 'APM Terminals Callao', url: 'https://www.apmterminalscallao.com.pe', nota: 'Muelle Sur, Callao' },
      { nombre: 'DP World Callao', url: 'https://www.dpworldcallao.com.pe', nota: 'Muelle Norte, Callao' },
    ],
  },
  {
    grupo: 'Seguimiento de contenedores (navieras)',
    items: [
      { nombre: 'Maersk', url: 'https://www.maersk.com/tracking' },
      { nombre: 'MSC', url: 'https://www.msc.com/en/track-a-shipment' },
      { nombre: 'CMA CGM', url: 'https://www.cma-cgm.com/ebusiness/tracking' },
      { nombre: 'Hapag-Lloyd', url: 'https://www.hapag-lloyd.com/en/online-business/track/track-by-container-solution.html' },
      { nombre: 'COSCO', url: 'https://elines.coscoshipping.com/ebusiness/cargoTracking' },
      { nombre: 'ONE', url: 'https://ecomm.one-line.com/one-ecom/manage-shipment/cargo-tracking' },
      { nombre: 'Evergreen', url: 'https://www.shipmentlink.com' },
      { nombre: 'ZIM', url: 'https://www.zim.com/tools/track-a-shipment' },
    ],
  },
  {
    grupo: 'Carga aérea y courier',
    items: [
      { nombre: 'LATAM Cargo', url: 'https://www.latamcargo.com' },
      { nombre: 'DHL', url: 'https://www.dhl.com/pe-es/home/tracking.html' },
      { nombre: 'FedEx', url: 'https://www.fedex.com/es-pe/tracking.html' },
      { nombre: 'UPS', url: 'https://www.ups.com/track?loc=es_PE' },
    ],
  },
];

// Documentos habituales de una importación (orientativo: depende del producto y del régimen).
export const DOCUMENTOS = [
  ['Factura comercial', 'Valor de la compra y condiciones (incoterm). Base del valor en aduana.'],
  ['Lista de empaque (packing list)', 'Bultos, pesos y medidas. Debe coincidir con lo embarcado.'],
  ['Documento de transporte', 'Bill of Lading (BL) si es marítimo; guía aérea (AWB) si es aéreo.'],
  ['Póliza o certificado de seguro', 'Si el seguro lo contrata el comprador o forma parte del valor CIF.'],
  ['Certificado de origen', 'Cuando se aplica una preferencia arancelaria de un tratado de libre comercio.'],
  ['Permisos o autorizaciones', 'Solo para mercancías restringidas (por ejemplo sanitarias, de salud o de telecomunicaciones).'],
  ['Declaración Aduanera de Mercancías (DAM)', 'La numera el agente de aduana en la SUNAT para el despacho.'],
];

// Glosario de siglas de uso diario.
export const GLOSARIO = [
  ['DAM', 'Declaración Aduanera de Mercancías: el documento con el que se despacha la carga en aduana.'],
  ['BL', 'Bill of Lading: documento de transporte marítimo. MBL lo emite la naviera; HBL, el agente de carga.'],
  ['AWB', 'Air Waybill: guía aérea, el documento de transporte por avión.'],
  ['FCL / LCL', 'Contenedor completo para un solo cliente / carga consolidada con otros clientes.'],
  ['CBM', 'Metro cúbico (largo × ancho × alto en metros). Unidad con la que se cobra la carga LCL.'],
  ['TEU', 'Unidad equivalente a un contenedor de 20 pies. Uno de 40 pies = 2 TEU.'],
  ['THC', 'Terminal Handling Charge: cargo del terminal por mover el contenedor en puerto.'],
  ['Demurrage', 'Sobreestadía: cobro por mantener el contenedor en el terminal más allá de los días libres.'],
  ['Detention', 'Cobro por mantener el contenedor fuera del terminal más allá de los días libres.'],
  ['Canal de control', 'Resultado de la selección en aduana: verde (sin revisión), naranja (revisión documentaria) o rojo (revisión física).'],
  ['Valor CIF', 'Valor de la mercadería más flete y seguro hasta el Perú: base de los tributos.'],
  ['Partida arancelaria', 'Código que clasifica el producto y define su ad valorem.'],
];

// Conceptos habituales para el cotizador. afecto = suele llevar IGV (servicio local).
export const CONCEPTOS_COTIZADOR = [
  { concepto: 'Flete marítimo', moneda: 'USD', afecto: false },
  { concepto: 'Flete aéreo', moneda: 'USD', afecto: false },
  { concepto: 'Seguro de la carga', moneda: 'USD', afecto: false },
  { concepto: 'THC / gastos de puerto', moneda: 'USD', afecto: true },
  { concepto: 'Desconsolidación', moneda: 'USD', afecto: true },
  { concepto: 'Visto bueno / emisión de BL', moneda: 'USD', afecto: true },
  { concepto: 'Agenciamiento de aduana', moneda: 'USD', afecto: true },
  { concepto: 'Gastos operativos', moneda: 'USD', afecto: true },
  { concepto: 'Almacenaje', moneda: 'PEN', afecto: true },
  { concepto: 'Transporte local', moneda: 'PEN', afecto: true },
];

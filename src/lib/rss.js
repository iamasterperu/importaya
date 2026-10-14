// Lector liviano de RSS 2.0 y Atom (sin librerías, para gastar poco CPU).

const NOMBRADAS = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', aacute: 'á', eacute: 'é', iacute: 'í',
  oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ',
  Ntilde: 'Ñ', uuml: 'ü', iexcl: '¡', iquest: '¿', laquo: '«', raquo: '»', ndash: '–', mdash: '—',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…', deg: '°', euro: '€',
};

export function decodificar(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : '';
    }
    return NOMBRADAS[e] ?? m;
  });
}

function sinCdata(s) {
  return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}

export function textoPlano(htmlTexto) {
  // Las descripciones vienen como HTML escapado: se decodifica, se quitan etiquetas y se vuelve a decodificar.
  let s = decodificar(sinCdata(htmlTexto));
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ');
  return decodificar(s).replace(/\s+/g, ' ').trim();
}

// Contenido de la primera etiqueta <nombre ...>...</nombre> dentro de un bloque.
function etiqueta(bloque, nombre) {
  const ini = bloque.indexOf('<' + nombre);
  if (ini < 0) return '';
  const despues = bloque[ini + nombre.length + 1];
  if (despues !== '>' && despues !== ' ' && despues !== '\n' && despues !== '\t' && despues !== '/') {
    return etiqueta(bloque.slice(ini + nombre.length + 1), nombre);
  }
  const cierreApertura = bloque.indexOf('>', ini);
  if (cierreApertura < 0 || bloque[cierreApertura - 1] === '/') return '';
  const fin = bloque.indexOf('</' + nombre + '>', cierreApertura);
  if (fin < 0) return '';
  return bloque.slice(cierreApertura + 1, fin);
}

function atributo(bloque, nombre, attr) {
  const re = new RegExp('<' + nombre + '\\b[^>]*?\\b' + attr + '="([^"]+)"', 'i');
  const m = bloque.match(re);
  return m ? decodificar(m[1]) : '';
}

function bloques(xml, nombre, max) {
  const lista = [];
  let pos = 0;
  while (lista.length < max) {
    const ini = xml.indexOf('<' + nombre, pos);
    if (ini < 0) break;
    const c = xml[ini + nombre.length + 1];
    if (c !== '>' && c !== ' ' && c !== '\n') {
      pos = ini + 1;
      continue;
    }
    const fin = xml.indexOf('</' + nombre + '>', ini);
    if (fin < 0) break;
    lista.push(xml.slice(ini, fin));
    pos = fin + nombre.length + 3;
  }
  return lista;
}

function fechaIso(texto) {
  const d = new Date(textoPlano(texto));
  return isNaN(d) ? null : d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// Bing envuelve el enlace real en apiclick.aspx?url=...
function enlaceReal(link) {
  try {
    const u = new URL(link);
    if (u.hostname.endsWith('bing.com') && u.searchParams.get('url')) return u.searchParams.get('url');
  } catch {}
  return link;
}

// Devuelve [{ titulo, enlace, descripcion, imagen, fecha, fuente }]
export function leerFeed(xml, max = 30) {
  const esAtom = !/<item[\s>]/.test(xml) && /<entry[\s>]/.test(xml);
  const items = bloques(xml, esAtom ? 'entry' : 'item', max);
  return items.map((b) => {
    let enlace = esAtom ? atributo(b, 'link', 'href') : textoPlano(etiqueta(b, 'link'));
    if (!enlace) enlace = textoPlano(etiqueta(b, 'guid'));
    const crudo = etiqueta(b, 'description') || etiqueta(b, 'summary') || etiqueta(b, 'content:encoded') || etiqueta(b, 'content');
    let imagen =
      atributo(b, 'media:content', 'url') ||
      atributo(b, 'media:thumbnail', 'url') ||
      (/<enclosure[^>]+type="image/i.test(b) ? atributo(b, 'enclosure', 'url') : '') ||
      textoPlano(etiqueta(b, 'News:Image'));
    if (!imagen) {
      const m = decodificar(sinCdata(crudo + etiqueta(b, 'content:encoded'))).match(/<img[^>]+src="(https?:[^"]+)"/i);
      if (m) imagen = m[1];
    }
    return {
      titulo: textoPlano(etiqueta(b, 'title')),
      enlace: enlaceReal(enlace.trim()),
      descripcion: textoPlano(crudo),
      imagen: imagen && /^https?:\/\//.test(imagen) ? imagen.replace(/^http:/, 'https:') : '',
      fecha: fechaIso(etiqueta(b, 'pubDate') || etiqueta(b, 'published') || etiqueta(b, 'updated') || etiqueta(b, 'dc:date')),
      fuente: textoPlano(etiqueta(b, 'source') || etiqueta(b, 'News:Source')),
    };
  });
}

// Feed de un canal de YouTube (Atom): [{ id, titulo, fecha, short }]
export function leerYoutube(xml, max = 15) {
  return bloques(xml, 'entry', max)
    .map((b) => ({
      id: textoPlano(etiqueta(b, 'yt:videoId')),
      titulo: textoPlano(etiqueta(b, 'title')),
      fecha: fechaIso(etiqueta(b, 'published')),
      short: /\/shorts\//.test(atributo(b, 'link', 'href')),
    }))
    .filter((v) => /^[\w-]{11}$/.test(v.id) && v.fecha);
}

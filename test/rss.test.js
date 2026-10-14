// Pruebas del lector de RSS: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerFeed, leerYoutube, textoPlano } from '../src/lib/rss.js';

test('Google Noticias: titular, medio y fecha', () => {
  const xml = `<?xml version="1.0"?><rss><channel><title>x</title><item><title>Importaciones desde China crecen 12% en septiembre - Gestión</title><link>https://news.google.com/rss/articles/CBMiabc?oc=5</link><guid>abc</guid><pubDate>Sun, 11 Oct 2026 14:00:00 GMT</pubDate><description>&lt;a href="https://news.google.com/rss/articles/CBMiabc"&gt;Importaciones desde China crecen 12% en septiembre&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;Gestión&lt;/font&gt;</description><source url="https://gestion.pe">Gestión</source></item></channel></rss>`;
  const [it] = leerFeed(xml);
  assert.equal(it.titulo, 'Importaciones desde China crecen 12% en septiembre - Gestión');
  assert.equal(it.fuente, 'Gestión');
  assert.equal(it.fecha, '2026-10-11T14:00:00Z');
  assert.match(it.enlace, /^https:\/\/news\.google\.com/);
});

test('Bing: enlace real, imagen y extracto', () => {
  const xml = `<rss xmlns:News="https://www.bing.com/news/search?q=x&amp;format=rss"><channel><item><title>SUNAT cambia reglas de courier</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;aid=&amp;tid=1&amp;url=https%3a%2f%2fandina.pe%2fnota%2f123&amp;c=1</link><description>La SUNAT anunció cambios en el régimen de envíos de entrega rápida…</description><pubDate>Sat, 10 Oct 2026 10:00:00 GMT</pubDate><News:Source>Andina</News:Source><News:Image>http://www.bing.com/th?id=OVFT.abc&amp;pid=News</News:Image></item></channel></rss>`;
  const [it] = leerFeed(xml);
  assert.equal(it.enlace, 'https://andina.pe/nota/123');
  assert.equal(it.fuente, 'Andina');
  assert.equal(it.imagen, 'https://www.bing.com/th?id=OVFT.abc&pid=News');
  assert.match(it.descripcion, /régimen de envíos/);
});

test('WordPress: CDATA, imagen dentro del contenido', () => {
  const xml = `<rss><channel><item><title><![CDATA[Port congestion eases in Shanghai]]></title><link>https://gcaptain.com/port-congestion</link><pubDate>Mon, 12 Oct 2026 08:00:00 +0000</pubDate><description><![CDATA[<p>Container lines report &#8220;faster&#8221; turnarounds.</p>]]></description><content:encoded><![CDATA[<img src="https://gcaptain.com/img.jpg"/><p>Texto</p>]]></content:encoded></item></channel></rss>`;
  const [it] = leerFeed(xml);
  assert.equal(it.titulo, 'Port congestion eases in Shanghai');
  assert.equal(it.descripcion, 'Container lines report “faster” turnarounds.');
  assert.equal(it.imagen, 'https://gcaptain.com/img.jpg');
});

test('YouTube: videos y shorts', () => {
  const xml = `<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015"><entry><id>yt:video:abcdefghijk</id><yt:videoId>abcdefghijk</yt:videoId><title>Noticiero &amp; economía</title><link rel="alternate" href="https://www.youtube.com/watch?v=abcdefghijk"/><published>2026-10-12T12:00:00+00:00</published></entry><entry><yt:videoId>ZYXWVUTSRQP</yt:videoId><title>Short</title><link rel="alternate" href="https://www.youtube.com/shorts/ZYXWVUTSRQP"/><published>2026-10-12T13:00:00+00:00</published></entry></feed>`;
  const v = leerYoutube(xml);
  assert.equal(v.length, 2);
  assert.equal(v[0].titulo, 'Noticiero & economía');
  assert.equal(v[0].short, false);
  assert.equal(v[1].short, true);
});

test('textoPlano decodifica entidades dobles', () => {
  assert.equal(textoPlano('Per&amp;uacute; &amp;amp; China'), 'Perú & China');
});

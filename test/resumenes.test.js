// Pruebas del resumen con IA (con una IA simulada): npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumir } from '../src/tareas/resumenes.js';

const iaFalsa = (respuesta) => ({ AI: { run: async () => ({ response: respuesta }) } });
const nota = {
  titulo: 'Transpacific container rates jump 20% ahead of peak season',
  titulo_original: 'Transpacific container rates jump 20% ahead of peak season',
  descripcion: 'Spot rates for containers from China to the US West Coast rose 20% this week as carriers announced general rate increases and blank sailings ahead of the peak shipping season.',
  idioma: 'en',
  fuente_nombre: 'gCaptain',
};

test('traduce el título y guarda el resumen', async () => {
  const r = await resumir(iaFalsa('TITULO: **Fletes de contenedores de China a EE. UU. suben 20 %**\nRESUMEN: Las tarifas spot de contenedores desde China hacia la costa oeste de EE. UU. subieron 20 % esta semana. Las navieras anunciaron alzas generales y cancelaron salidas antes de la temporada alta.'), nota);
  assert.equal(r.titulo, 'Fletes de contenedores de China a EE. UU. suben 20 %');
  assert.match(r.resumen, /^Las tarifas spot/);
});

test('en español mantiene el título original', async () => {
  const r = await resumir(iaFalsa('TÍTULO: Otro título inventado por la IA\nRESUMEN: El tipo de cambio cerró a la baja por la menor demanda de dólares de las empresas importadoras y la caída global de la divisa.'), { ...nota, idioma: 'es', titulo: 'Dólar cierra a la baja' });
  assert.equal(r.titulo, 'Dólar cierra a la baja');
});

test('rechaza respuestas sin formato', async () => {
  await assert.rejects(resumir(iaFalsa('Lo siento, no puedo ayudar con eso.'), nota));
});

test('sin IA configurada da un error claro', async () => {
  await assert.rejects(resumir({}, nota), /No hay IA configurada/);
});

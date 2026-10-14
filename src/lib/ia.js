// Resúmenes con IA gratis: primero Workers AI (incluida en Cloudflare),
// y si falla, Google Gemini (solo si agregaste el secreto GEMINI_API_KEY).

export async function generarTexto(env, sistema, usuario) {
  const errores = [];
  if (env.AI) {
    try {
      const r = await env.AI.run(env.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct', {
        messages: [
          { role: 'system', content: sistema },
          { role: 'user', content: usuario },
        ],
        max_tokens: 350,
        temperature: 0.3,
      });
      const texto = typeof r === 'string' ? r : r?.response;
      if (texto && texto.trim()) return { texto: texto.trim(), motor: 'workers-ai' };
      errores.push('Workers AI: respuesta vacía');
    } catch (e) {
      errores.push('Workers AI: ' + (e.message || e));
    }
  }
  if (env.GEMINI_API_KEY) {
    try {
      const modelo = env.GEMINI_MODEL || 'gemini-2.5-flash';
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sistema }] },
          contents: [{ role: 'user', parts: [{ text: usuario }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 400 },
        }),
        signal: AbortSignal.timeout(20000),
      });
      if (!r.ok) throw new Error(`respondió ${r.status}`);
      const d = await r.json();
      const texto = d?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('');
      if (texto && texto.trim()) return { texto: texto.trim(), motor: 'gemini' };
      errores.push('Gemini: respuesta vacía');
    } catch (e) {
      errores.push('Gemini: ' + (e.message || e));
    }
  }
  throw new Error(errores.join(' | ') || 'No hay IA configurada');
}

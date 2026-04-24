import { getSettings } from './settings';

/**
 * Wrapper léger pour l'API Gemini.
 * Lit la clé d'abord depuis la table Setting (modifiable dans /admin/settings),
 * sinon depuis .env (GEMINI_API_KEY) en fallback.
 */
async function getKeys() {
  const dbKeys = await getSettings([
    'integrations.gemini.apiKey',
    'integrations.gemini.textModel',
    'integrations.gemini.imageModel'
  ]).catch(() => ({} as Record<string, string>));

  return {
    key: dbKeys['integrations.gemini.apiKey'] || process.env.GEMINI_API_KEY,
    textModel: dbKeys['integrations.gemini.textModel'] || process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-pro',
    imageModel: dbKeys['integrations.gemini.imageModel'] || process.env.GEMINI_IMAGE_MODEL || 'imagen-3.0-generate-002'
  };
}

export async function generateText(prompt: string, system?: string) {
  const { key, textModel } = await getKeys();
  if (!key) {
    return {
      text: `🔑 Clé Gemini non configurée. Va dans /admin/settings et renseigne-la.\n\nPrompt reçu :\n${prompt}`,
      mock: true
    };
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${textModel}:generateContent?key=${key}`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: system ? { parts: [{ text: system }] } : undefined
  };
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json();
  const text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return { text, raw: j, mock: false };
}

export async function generateImage(prompt: string) {
  const { key } = await getKeys();
  if (!key) {
    return { url: null, mock: true, message: 'Clé Gemini non configurée. Va dans /admin/settings.' };
  }
  return { url: null, mock: false, message: 'Imagen wiring à finaliser après ajout de la clé (V1.5).' };
}

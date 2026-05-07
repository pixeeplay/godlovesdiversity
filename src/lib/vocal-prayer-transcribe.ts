import { prisma } from '@/lib/prisma';
import { minioClient, BUCKET } from '@/lib/storage';

/**
 * Transcrit une prière vocale via Gemini 2.5 Flash (multimodal — accepte audio inline).
 *
 * Flux :
 *   1. Récupère le buffer audio depuis MinIO.
 *   2. Encode en base64 inline pour Gemini.
 *   3. Demande transcription FR + extraction title (1ère phrase) + détection mood.
 *   4. Update VocalPrayer avec status COMPLETED ou FAILED + errorMessage.
 *
 * Variables d'env utilisées :
 *   - GEMINI_API_KEY (obligatoire)
 *   - VOCAL_PRAYER_MODEL (optionnel, défaut "gemini-2.5-flash")
 *
 * Sécurité : on n'envoie PAS de PII utilisateur dans le prompt — seul l'audio.
 * Le prompt est neutre et n'oriente pas le ton (pas de jugement religieux).
 */
export async function transcribeVocalPrayer(prayerId: string): Promise<void> {
  const prayer = await prisma.vocalPrayer.findUnique({
    where: { id: prayerId },
    select: { id: true, storageKey: true, audioMime: true, language: true, status: true, durationSec: true }
  });
  if (!prayer) {
    console.warn('[vocal-prayer] prayer disappeared before transcription', prayerId);
    return;
  }
  if (prayer.status !== 'PROCESSING') {
    // déjà transcrit ou en cours par une autre instance — on skip
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    await markFailed(prayerId, 'GEMINI_API_KEY manquant — la transcription sera disponible après config admin.');
    return;
  }

  try {
    // 1. Récupère l'audio depuis MinIO en buffer
    const stream = await minioClient.getObject(BUCKET, prayer.storageKey);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const audioBuffer = Buffer.concat(chunks);
    const audioBase64 = audioBuffer.toString('base64');

    // 2. Prompt — transcription neutre + extraction structurée
    const langName = prayer.language === 'en' ? 'English'
      : prayer.language === 'es' ? 'Español'
      : prayer.language === 'pt' ? 'Português'
      : 'Français';

    const prompt = `Tu es un assistant de transcription respectueux et neutre.
Transcris fidèlement le contenu audio en ${langName}, sans jugement, sans paraphrase.
La personne enregistre une prière personnelle ou un message spirituel privé.

Réponds UNIQUEMENT en JSON valide, sans texte autour, avec ce format :
{
  "transcription": "texte intégral exact, ponctué proprement",
  "title": "courte phrase qui résume (max 80 caractères, sans guillemets)",
  "mood": "joie | tristesse | espoir | colère | paix | gratitude | questionnement | inquiétude"
}

Si l'audio est inaudible ou silencieux, renvoie {"transcription":"", "title":"", "mood":""}.`;

    const model = process.env.VOCAL_PRAYER_MODEL || 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inline_data: { mime_type: prayer.audioMime || 'audio/webm', data: audioBase64 } }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json'
        }
      }),
      signal: AbortSignal.timeout(55_000)
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`gemini-http-${r.status}: ${txt.slice(0, 300)}`);
    }

    const j: any = await r.json();
    const raw = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    let parsed: { transcription?: string; title?: string; mood?: string } = {};
    try {
      // responseMimeType=application/json devrait garantir un JSON, mais on est défensif
      const cleaned = raw.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      // fallback : on prend le raw comme transcription brute
      parsed = { transcription: raw };
    }

    const transcription = (parsed.transcription || '').trim();
    if (!transcription) {
      await markFailed(prayerId, "L'audio semble silencieux ou inaudible. Réessaie en parlant plus près du micro.");
      return;
    }

    await prisma.vocalPrayer.update({
      where: { id: prayerId },
      data: {
        transcription,
        title: (parsed.title || '').slice(0, 200) || null,
        mood: normalizeMood(parsed.mood),
        status: 'COMPLETED',
        transcribedAt: new Date(),
        errorMessage: null
      }
    });
  } catch (e: any) {
    await markFailed(prayerId, e?.message || 'Erreur inconnue lors de la transcription.');
  }
}

async function markFailed(prayerId: string, message: string) {
  try {
    await prisma.vocalPrayer.update({
      where: { id: prayerId },
      data: { status: 'FAILED', errorMessage: message.slice(0, 1000) }
    });
  } catch (e) {
    console.error('[vocal-prayer] markFailed failed', e);
  }
}

const ALLOWED_MOODS = new Set([
  'joie', 'tristesse', 'espoir', 'colère', 'paix', 'gratitude', 'questionnement', 'inquiétude'
]);
function normalizeMood(m: string | undefined): string | null {
  if (!m) return null;
  const lower = m.toLowerCase().trim();
  return ALLOWED_MOODS.has(lower) ? lower : null;
}

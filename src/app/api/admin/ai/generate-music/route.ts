import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadBuffer, publicUrl } from '@/lib/storage';
import { getSettings } from '@/lib/settings';

/**
 * Génère un morceau d'ambiance via ElevenLabs Music API.
 * Body : { theme: 'priere'|'meditation'|'cathedrale'|'taize'|'soufi'|'mantra'|'custom', prompt?: string, durationSec?: number }
 * Retourne : { url, key, theme }
 *
 * Si ElevenLabs non configuré → erreur explicite avec message d'aide.
 */

const THEMES: Record<string, string> = {
  priere:      'Soft choral hymn, peaceful prayer, sacred ambient, distant cathedral choir, gentle organ, contemplative, ethereal, no lyrics, healing frequencies 432Hz',
  meditation:  'Deep meditation soundscape, tibetan singing bowls, soft breathing pads, ethereal drones, binaural-friendly, no rhythm, peaceful, healing, no lyrics',
  cathedrale:  'Gregorian chant ambient, monks vocalizations, distant church bells, vast cathedral reverb, soft pipe organ, sacred atmosphere, no lyrics in identifiable language',
  taize:       'Taizé style soft chant, repetitive contemplative melody, gentle piano and voices, peaceful and meditative, no specific lyrics',
  soufi:       'Sufi ambient music, soft ney flute, slow drone, mystical contemplative atmosphere, gentle hand drums, no lyrics',
  mantra:      'Mantra ambient drone, soft chant repetitions, tampura, healing frequency, peaceful, no rhythm change',
  bouddhiste:  'Tibetan buddhist meditation soundscape, deep singing bowls, soft monks chant, prayer flags wind, no lyrics',
  ambient:     'Soft ambient electronic music, peaceful, dreamy pads, no rhythm, ideal as background',
  custom:      ''
};

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const theme = (body.theme || 'priere') as keyof typeof THEMES;
  const customPrompt: string | undefined = body.prompt;
  const durationSec = Math.max(15, Math.min(120, Number(body.durationSec) || 60));

  const prompt = customPrompt || THEMES[theme] || THEMES.priere;

  const settings = await getSettings(['integrations.elevenlabs.apiKey']).catch(() => ({} as Record<string, string>));
  const key = settings['integrations.elevenlabs.apiKey'] || process.env.ELEVENLABS_API_KEY;

  if (!key) {
    return NextResponse.json({
      error: 'ElevenLabs non configuré. Va dans /admin/settings → ElevenLabs Music. Tu peux récupérer une clé gratuite sur https://elevenlabs.io'
    }, { status: 400 });
  }

  try {
    // ElevenLabs Music API (en bêta — endpoint public ElevenLabs)
    const r = await fetch('https://api.elevenlabs.io/v1/music/compose', {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify({
        prompt,
        duration_seconds: durationSec,
        style: 'ambient',
        tempo: 'slow'
      })
    });
    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ error: `ElevenLabs: ${r.status} ${txt.slice(0, 200)}` }, { status: 500 });
    }

    const buf = Buffer.from(await r.arrayBuffer());
    const objectKey = `audio/${theme}-${Date.now()}.mp3`;
    await uploadBuffer(objectKey, buf, 'audio/mpeg');
    const url = publicUrl(objectKey);

    return NextResponse.json({ url, key: objectKey, theme, prompt });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ themes: Object.keys(THEMES) });
}

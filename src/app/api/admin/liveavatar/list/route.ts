import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listPublicAvatars, listVoices, listLanguages, getCredits, GEMINI_VOICES } from '@/lib/liveavatar';

export const dynamic = 'force-dynamic';

/**
 * Liste les avatars publics + voix + langues + crédits LiveAvatar pour l'admin.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Auth requise' }, { status: 401 });

  try {
    const [avatars, voices, languages, credits] = await Promise.allSettled([
      listPublicAvatars(60),
      listVoices(80),
      listLanguages(),
      getCredits()
    ]);

    return NextResponse.json({
      avatars: avatars.status === 'fulfilled' ? avatars.value.results : [],
      avatarsCount: avatars.status === 'fulfilled' ? avatars.value.count : 0,
      voices: voices.status === 'fulfilled' ? voices.value.results : [],
      voicesCount: voices.status === 'fulfilled' ? voices.value.count : 0,
      languages: languages.status === 'fulfilled' ? languages.value : [],
      geminiVoices: GEMINI_VOICES,
      credits: credits.status === 'fulfilled' ? credits.value.credits_left : null,
      errors: {
        avatars: avatars.status === 'rejected' ? String(avatars.reason?.message || avatars.reason) : null,
        voices: voices.status === 'rejected' ? String(voices.reason?.message || voices.reason) : null,
        languages: languages.status === 'rejected' ? String(languages.reason?.message || languages.reason) : null,
        credits: credits.status === 'rejected' ? String(credits.reason?.message || credits.reason) : null
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur LiveAvatar' }, { status: 500 });
  }
}

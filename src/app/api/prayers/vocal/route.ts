import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadBuffer } from '@/lib/storage';
import { transcribeVocalPrayer } from '@/lib/vocal-prayer-transcribe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Limite imposée pour maîtriser le coût IA + durée d'upload. */
const MAX_DURATION_SEC = 180;            // 3 min
const MAX_FILE_BYTES = 8 * 1024 * 1024;  // 8 MB
const ALLOWED_MIMES = new Set(['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-m4a']);

/**
 * POST /api/prayers/vocal
 * Multipart/form-data : { audio: File, durationSec: string, language?: string, isPublic?: string }
 *
 * 1. Auth obligatoire.
 * 2. Vérifie consentement RGPD (User.vocalPrayerConsent).
 * 3. Valide mime, taille, durée.
 * 4. Upload sur MinIO (clé privée vocal-prayers/YYYY/MM/<cuid>.<ext>).
 * 5. Crée VocalPrayer en DB avec status=PROCESSING.
 * 6. Lance la transcription IA en background (non-bloquant).
 * 7. Retourne immédiatement l'ID + status.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Vérifie consentement RGPD
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { vocalPrayerConsent: true }
  });
  if (!user?.vocalPrayerConsent) {
    return NextResponse.json(
      { error: 'consent-required', message: 'Tu dois accepter le traitement IA de ta voix avant d\'enregistrer.' },
      { status: 403 }
    );
  }

  // Parse multipart
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid-form' }, { status: 400 });
  }

  const audio = form.get('audio') as File | null;
  const durationSecRaw = form.get('durationSec');
  const language = (form.get('language') as string) || 'fr';
  const isPublic = form.get('isPublic') === 'true';

  if (!audio) {
    return NextResponse.json({ error: 'audio-missing' }, { status: 400 });
  }

  const mime = audio.type || 'audio/webm';
  const baseMime = mime.split(';')[0].trim();
  if (!ALLOWED_MIMES.has(baseMime)) {
    return NextResponse.json({ error: 'mime-not-allowed', received: mime }, { status: 400 });
  }
  if (audio.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: 'file-too-large', limitBytes: MAX_FILE_BYTES, receivedBytes: audio.size },
      { status: 413 }
    );
  }

  const durationSec = Number(durationSecRaw);
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > MAX_DURATION_SEC) {
    return NextResponse.json(
      { error: 'duration-invalid', limit: MAX_DURATION_SEC, received: durationSec },
      { status: 400 }
    );
  }

  // Upload MinIO
  const buffer = Buffer.from(await audio.arrayBuffer());
  const ext = baseMime === 'audio/webm' ? 'webm'
    : baseMime === 'audio/ogg' ? 'ogg'
    : baseMime === 'audio/mp4' ? 'm4a'
    : baseMime === 'audio/mpeg' ? 'mp3'
    : baseMime === 'audio/wav' ? 'wav'
    : 'bin';

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  // Génère un cuid-like court via crypto
  const rand = Buffer.from(crypto.getRandomValues(new Uint8Array(12))).toString('hex');
  const storageKey = `vocal-prayers/${yyyy}/${mm}/${userId}-${rand}.${ext}`;

  try {
    await uploadBuffer(storageKey, buffer, baseMime);
  } catch (e: any) {
    return NextResponse.json({ error: 'upload-failed', detail: e?.message }, { status: 500 });
  }

  // Création DB
  const prayer = await prisma.vocalPrayer.create({
    data: {
      userId,
      storageKey,
      audioMime: baseMime,
      durationSec: Math.round(durationSec),
      fileSizeBytes: audio.size,
      language: language.slice(0, 8),
      isPublic: !!isPublic,
      status: 'PROCESSING'
    },
    select: {
      id: true, storageKey: true, audioMime: true, durationSec: true,
      language: true, status: true, createdAt: true, isPublic: true
    }
  });

  // Transcription async (fire-and-forget)
  // Note : sur Coolify Next.js standalone, le process reste up donc le fire-and-forget marche.
  transcribeVocalPrayer(prayer.id).catch((err) => {
    console.error('[vocal-prayer] transcription background failed', prayer.id, err);
  });

  return NextResponse.json({ ok: true, prayer }, { status: 201 });
}

/**
 * GET /api/prayers/vocal
 * Liste les prières vocales de l'utilisateur courant.
 * Query : ?cursor=<id>&limit=<n>
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || 20)));
  const cursor = url.searchParams.get('cursor');

  const prayers = await prisma.vocalPrayer.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true, storageKey: true, audioMime: true, durationSec: true,
      language: true, transcription: true, title: true, mood: true,
      status: true, errorMessage: true, isPublic: true,
      transcribedAt: true, createdAt: true
    }
  });

  const hasMore = prayers.length > limit;
  const items = hasMore ? prayers.slice(0, -1) : prayers;
  const nextCursor = hasMore ? prayers[prayers.length - 2].id : null;

  return NextResponse.json({
    ok: true,
    items: items.map(p => ({ ...p, audioUrl: `/api/prayers/vocal/${p.id}/audio` })),
    nextCursor
  });
}

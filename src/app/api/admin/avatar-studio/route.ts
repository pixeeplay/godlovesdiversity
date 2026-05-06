import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { loadAiConfig } from '@/lib/ai-provider';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Avatar Studio — gestion des avatars + génération de vidéos
 *
 * GET    /api/admin/avatar-studio                          — liste avatars + générations
 * POST   /api/admin/avatar-studio?action=create-replica    — crée un nouveau replica (Avatar V/Tavus/D-ID)
 *   body: { name, persona?, provider, sourceVideoUrl }     — sourceVideoUrl = MinIO key d'un clip 15s
 * POST   /api/admin/avatar-studio?action=generate          — génère une vidéo avec un avatar existant
 *   body: { avatarId, scriptText, outfit?, setting?, language? }
 * POST   /api/admin/avatar-studio?action=poll              — poll les générations en cours
 *
 * Auth ADMIN requis.
 */

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return null;
  return s;
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const [avatars, recentGenerations] = await Promise.all([
      (prisma as any).avatar.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      (prisma as any).avatarGeneration.findMany({
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { avatar: { select: { name: true, persona: true } } }
      })
    ]);
    return NextResponse.json({ avatars, recentGenerations });
  } catch {
    return NextResponse.json({ avatars: [], recentGenerations: [], error: 'db-not-migrated' });
  }
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const body = await req.json().catch(() => ({}));

  if (action === 'create-replica') {
    return createReplica(body);
  }
  if (action === 'generate') {
    return generate(body);
  }
  if (action === 'poll') {
    return pollPending();
  }
  return NextResponse.json({ error: 'action-unknown' }, { status: 400 });
}

/**
 * Création d'un replica avatar — adapter selon le provider.
 * En MVP : on enregistre l'avatar en "training", l'API provider est appelée mais
 * la suite (callback webhook quand training fini) est documentée.
 */
async function createReplica(body: any) {
  const name = String(body.name || '').trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: 'name-missing' }, { status: 400 });
  const persona = ['marie', 'khadija', 'rabbin', 'zen'].includes(body.persona) ? body.persona : null;
  const providerType = String(body.provider || 'avatar-v');
  const sourceVideoUrl = String(body.sourceVideoUrl || '').slice(0, 500);

  const cfg = await loadAiConfig();
  const provider = cfg.providers.find(p => p.type === providerType && p.enabled);
  if (!provider) return NextResponse.json({ error: 'provider-not-configured', message: `Active "${providerType}" dans /admin/ai-settings` }, { status: 400 });
  if (!provider.apiKey) return NextResponse.json({ error: 'apikey-missing' }, { status: 400 });

  // Appel API selon le provider — squelette, à finaliser quand tu valides la doc exacte de chaque provider
  let externalId = '';
  let status: 'training' | 'ready' = 'training';
  let trainingError: string | null = null;

  try {
    if (providerType === 'avatar-v' || providerType === 'heygen') {
      // POST https://api.heygen.com/v2/photo_avatar/avatar_group/create OU /v2/avatar/create
      // (Adapter selon doc HeyGen Avatar V exacte — endpoint à valider)
      const r = await fetch(`${provider.baseUrl}/photo_avatar/photo/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': provider.apiKey },
        body: JSON.stringify({ name, video_url: sourceVideoUrl })
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j?.data?.id) {
        externalId = j.data.id;
      } else {
        trainingError = `${r.status}: ${JSON.stringify(j).slice(0, 200)}`;
      }
    } else if (providerType === 'tavus') {
      // POST https://tavusapi.com/v2/replicas
      const r = await fetch(`${provider.baseUrl}/v2/replicas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': provider.apiKey },
        body: JSON.stringify({ replica_name: name, train_video_url: sourceVideoUrl })
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j?.replica_id) externalId = j.replica_id;
      else trainingError = `${r.status}: ${JSON.stringify(j).slice(0, 200)}`;
    } else if (providerType === 'd-id') {
      // D-ID — pas de "training", on utilise direct des photos. On crée un avatar à partir d'une URL d'image.
      externalId = `d-id-${Date.now()}`;  // pas de vrai replica
      status = 'ready';
    } else if (providerType === 'synthesia') {
      // Synthesia avatars stock — externalId = "anna_costume1_cameraA" etc., choisi dans la liste
      externalId = String(body.synthesiaAvatarId || 'anna_costume1_cameraA');
      status = 'ready';
    }
  } catch (e: any) {
    trainingError = e?.message;
  }

  const slug = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  try {
    const avatar = await (prisma as any).avatar.create({
      data: {
        slug: slug + '-' + Date.now().toString(36).slice(-4),
        name,
        persona,
        provider: providerType,
        externalId,
        status,
        trainingError,
        metadata: body.metadata || null
      }
    });
    return NextResponse.json({ ok: true, avatar });
  } catch (e: any) {
    return NextResponse.json({ error: 'db-error', message: e?.message }, { status: 500 });
  }
}

/**
 * Génération d'une vidéo avec un avatar existant.
 */
async function generate(body: any) {
  const avatarId = String(body.avatarId || '');
  const scriptText = String(body.scriptText || '').trim().slice(0, 5000);
  if (!avatarId || !scriptText) return NextResponse.json({ error: 'avatarId-or-scriptText-missing' }, { status: 400 });

  const avatar = await (prisma as any).avatar.findUnique({ where: { id: avatarId } });
  if (!avatar) return NextResponse.json({ error: 'avatar-not-found' }, { status: 404 });
  if (avatar.status !== 'ready') return NextResponse.json({ error: 'avatar-not-ready', message: `Statut: ${avatar.status}` }, { status: 400 });

  const cfg = await loadAiConfig();
  const provider = cfg.providers.find(p => p.type === avatar.provider && p.enabled);
  if (!provider || !provider.apiKey) return NextResponse.json({ error: 'provider-not-configured' }, { status: 400 });

  const generation = await (prisma as any).avatarGeneration.create({
    data: {
      avatarId,
      scriptText,
      outfit: body.outfit || null,
      setting: body.setting || null,
      language: body.language || 'fr',
      status: 'pending'
    }
  });

  // Lance le job — fire-and-forget, le provider fera un webhook ou on poll
  triggerVideoGeneration(generation.id, avatar, scriptText, provider, body).catch(() => {});

  return NextResponse.json({ ok: true, generation });
}

async function triggerVideoGeneration(genId: string, avatar: any, scriptText: string, provider: any, opts: any) {
  let externalJobId = '';
  let errorMessage: string | null = null;
  try {
    if (avatar.provider === 'avatar-v' || avatar.provider === 'heygen') {
      // POST https://api.heygen.com/v2/video/generate
      const r = await fetch(`${provider.baseUrl}/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': provider.apiKey },
        body: JSON.stringify({
          video_inputs: [{
            character: { type: 'avatar', avatar_id: avatar.externalId, scale: 1.0 },
            voice: { type: 'text', input_text: scriptText, voice_id: avatar.voiceId || undefined }
          }],
          dimension: { width: 1280, height: 720 }
        })
      });
      const j: any = await r.json().catch(() => ({}));
      if (r.ok && j?.data?.video_id) externalJobId = j.data.video_id;
      else errorMessage = `${r.status}: ${JSON.stringify(j).slice(0, 200)}`;
    }
    // Tavus, Synthesia, D-ID — adapters similaires à compléter
  } catch (e: any) {
    errorMessage = e?.message;
  }

  await (prisma as any).avatarGeneration.update({
    where: { id: genId },
    data: { externalJobId, status: errorMessage ? 'failed' : 'processing', errorMessage }
  });
}

/**
 * Poll les générations 'processing' pour récupérer les URLs vidéo finales.
 * À appeler périodiquement (cron 5 min) OU manuellement depuis l'UI.
 */
async function pollPending() {
  const pending = await (prisma as any).avatarGeneration.findMany({
    where: { status: 'processing', externalJobId: { not: null } },
    include: { avatar: true },
    take: 10
  });
  const cfg = await loadAiConfig();

  let updated = 0;
  for (const gen of pending) {
    const provider = cfg.providers.find(p => p.type === gen.avatar.provider);
    if (!provider?.apiKey) continue;
    try {
      if (gen.avatar.provider === 'avatar-v' || gen.avatar.provider === 'heygen') {
        const r = await fetch(`${provider.baseUrl}/video_status.get?video_id=${gen.externalJobId}`, {
          headers: { 'X-Api-Key': provider.apiKey }
        });
        const j: any = await r.json().catch(() => ({}));
        const s = j?.data?.status;
        if (s === 'completed' && j?.data?.video_url) {
          await (prisma as any).avatarGeneration.update({
            where: { id: gen.id },
            data: { status: 'done', videoUrl: j.data.video_url, durationSec: j.data.duration, finishedAt: new Date() }
          });
          updated++;
        } else if (s === 'failed') {
          await (prisma as any).avatarGeneration.update({
            where: { id: gen.id },
            data: { status: 'failed', errorMessage: j?.data?.error?.message || 'failed' }
          });
        }
      }
    } catch {}
  }
  return NextResponse.json({ ok: true, polled: pending.length, updated });
}

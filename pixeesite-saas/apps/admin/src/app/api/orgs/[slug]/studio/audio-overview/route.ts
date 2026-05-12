import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/studio/audio-overview
 * body: { siteSlug, hostName?, guestName?, tone?, durationMin? }
 *
 * Flow :
 *   1. Charge toutes les SitePage du site → extrait texte
 *   2. Prompt IA Gemini/etc. : "Génère un dialogue podcast 2 voix de ~N min"
 *   3. Split par locuteur (HOST/GUEST)
 *   4. ElevenLabs TTS pour chaque ligne (2 voice_id distincts)
 *   5. Concat MP3 base64 → renvoie data URL + script
 *
 * Si ELEVENLABS_API_KEY absent : renvoie juste le script avec warning.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const siteSlug = (body.siteSlug as string || '').trim();
  if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });

  const hostName = (body.hostName as string) || 'Alice';
  const guestName = (body.guestName as string) || 'Marc';
  const tone = (body.tone as string) || 'enthousiaste';
  const durationMin = Math.max(2, Math.min(8, Number(body.durationMin) || 3));

  const orgId = auth.membership.org.id;

  // ─── 1. Extraire le contenu du site ──────────────
  let siteContent = '';
  let siteName = siteSlug;
  try {
    const site = await platformDb.site.findUnique({
      where: { orgId_slug: { orgId, slug: siteSlug } },
    });
    if (!site) return NextResponse.json({ error: 'site-not-found' }, { status: 404 });
    siteName = site.name;

    const tenantDb = await getTenantPrisma(slug);
    const pages = await tenantDb.sitePage.findMany({
      where: { siteId: site.id, visible: true },
      orderBy: { isHome: 'desc' },
      take: 20,
    });
    siteContent = pages.map((p: any) => {
      const blocksTxt = extractTextFromBlocks(p.blocks);
      return `## ${p.title} (${p.slug})\n${blocksTxt}`;
    }).join('\n\n').slice(0, 12000);
    if (site.description) siteContent = `Description: ${site.description}\n\n${siteContent}`;
  } catch (e: any) {
    return NextResponse.json({ error: 'site-load-failed: ' + e?.message }, { status: 500 });
  }

  // ─── 2. Génération du script de podcast ──────────
  const targetTurns = durationMin * 8; // ~8 répliques par minute
  const sysPrompt = `Tu es un scénariste de podcast professionnel. Génère un dialogue 100% en français entre deux personnes pour présenter un site web. Format strict :

${hostName}: [phrase]
${guestName}: [phrase]
${hostName}: [phrase]
...

Règles :
- Exactement ~${targetTurns} répliques au total
- Ton ${tone}, naturel, conversationnel
- ${hostName} = animateur·trice qui pose des questions et résume
- ${guestName} = invité·e qui présente le site, ses points forts, sa mission
- Pas de jargon technique, pas d'emojis dans le texte
- Phrases courtes (15–30 mots max)
- Inclure des transitions naturelles ("ah intéressant", "exactement", "et concrètement…")
- Commencer par une intro chaleureuse, finir par un call-to-action subtil`;

  const userPrompt = `Voici le contenu du site "${siteName}". Génère le dialogue podcast :\n\n${siteContent}`;

  const ai = await aiCall({
    orgId, feature: 'text',
    prompt: userPrompt, systemPrompt: sysPrompt,
    temperature: 0.85, maxTokens: 3500,
  });
  if (!ai.ok || !ai.output) {
    return NextResponse.json({ error: 'ai-script-failed: ' + (ai.error || 'no output') }, { status: 500 });
  }
  const script = ai.output.trim();

  // ─── 3. ElevenLabs TTS (optionnel) ────────────────
  const elevenKey = await getOrgSecret(orgId, 'ELEVENLABS_API_KEY');
  if (!elevenKey) {
    return NextResponse.json({
      ok: true, script, audioUrl: null,
      warning: 'ELEVENLABS_API_KEY non configurée. Configure-la dans /keys pour générer l\'audio.',
    });
  }

  // Voice IDs par défaut ElevenLabs (multilingual v2)
  // Rachel (F) + Adam (M) — fallback safe sur lib ElevenLabs publique
  const hostVoiceId = (await getOrgSecret(orgId, 'ELEVENLABS_VOICE_HOST')) || '21m00Tcm4TlvDq8ikWAM';   // Rachel
  const guestVoiceId = (await getOrgSecret(orgId, 'ELEVENLABS_VOICE_GUEST')) || 'pNInz6obpgDQGcFmaJgB'; // Adam

  // Parse script en lignes locuteur:texte
  const lines = parseDialog(script, hostName, guestName);
  if (lines.length === 0) {
    return NextResponse.json({ ok: true, script, audioUrl: null, warning: 'Impossible de parser le dialogue.' });
  }

  // Pour rester sous maxDuration=60s, on limite à 24 segments (taille raisonnable)
  const segments = lines.slice(0, 24);
  const audioChunks: Buffer[] = [];
  for (const line of segments) {
    const voiceId = line.speaker === 'host' ? hostVoiceId : guestVoiceId;
    try {
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        method: 'POST',
        headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text.slice(0, 500),
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.4, use_speaker_boost: true },
        }),
      });
      if (!r.ok) {
        const err = await r.text();
        console.warn('[eleven] error', r.status, err.slice(0, 200));
        continue;
      }
      const buf = Buffer.from(await r.arrayBuffer());
      audioChunks.push(buf);
    } catch (e) {
      console.warn('[eleven] fetch fail', (e as any)?.message);
    }
  }

  if (audioChunks.length === 0) {
    return NextResponse.json({ ok: true, script, audioUrl: null, warning: 'ElevenLabs n\'a renvoyé aucun chunk audio. Vérifie la clé et les crédits.' });
  }

  // Concat naïve de MP3 (les frames MP3 se concatènent sans démuxer dans la plupart des cas)
  const merged = Buffer.concat(audioChunks);
  const dataUrl = `data:audio/mp3;base64,${merged.toString('base64')}`;

  // ─── 4. Save Asset (best-effort) ──────────────────
  try {
    const tenantDb = await getTenantPrisma(slug);
    await tenantDb.asset.create({
      data: {
        bucket: 'studio',
        key: `studio/audio/${siteSlug}-${Date.now()}.mp3`,
        url: null, // data URL trop volumineux pour la DB ; le client le tient en mémoire
        filename: `${siteSlug}-podcast.mp3`,
        mimeType: 'audio/mpeg',
        sizeBytes: merged.length,
        folder: 'studio-audio',
        tags: ['studio', 'audio-overview', tone],
        aiGenerated: true,
        aiPrompt: `Podcast ${hostName}/${guestName} sur ${siteName}`,
      },
    });
  } catch {}

  await platformDb.aiUsage.create({
    data: { orgId, provider: 'elevenlabs', model: 'multilingual-v2', operation: 'tts-podcast', success: true },
  }).catch(() => {});

  return NextResponse.json({ ok: true, script, audioUrl: dataUrl, segments: segments.length });
}

/* ─── Helpers ─── */

function extractTextFromBlocks(blocks: any): string {
  if (!Array.isArray(blocks)) return '';
  const out: string[] = [];
  for (const b of blocks) {
    if (!b || typeof b !== 'object') continue;
    const d = b.data || {};
    if (d.title) out.push(d.title);
    if (d.subtitle) out.push(d.subtitle);
    if (d.html) out.push(stripHtml(d.html));
    if (d.text) out.push(d.text);
    if (d.label) out.push(d.label);
    if (Array.isArray(d.slides)) {
      for (const s of d.slides) {
        if (s.title) out.push(s.title);
        if (s.subtitle) out.push(s.subtitle);
        if (s.tagline) out.push(s.tagline);
      }
    }
    if (Array.isArray(d.columns)) {
      for (const c of d.columns) if (c.html) out.push(stripHtml(c.html));
    }
    if (Array.isArray(d.items)) {
      for (const it of d.items) if (it.title || it.text) out.push((it.title || '') + ' ' + (it.text || ''));
    }
  }
  return out.filter(Boolean).join('\n').slice(0, 6000);
}

function stripHtml(s: string): string {
  return (s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function parseDialog(script: string, hostName: string, guestName: string): { speaker: 'host' | 'guest'; text: string }[] {
  const lines = script.split('\n').map((l) => l.trim()).filter(Boolean);
  const out: { speaker: 'host' | 'guest'; text: string }[] = [];
  const hostRx = new RegExp(`^${escapeRx(hostName)}\\s*[:：]\\s*(.+)$`, 'i');
  const guestRx = new RegExp(`^${escapeRx(guestName)}\\s*[:：]\\s*(.+)$`, 'i');
  for (const line of lines) {
    let m = line.match(hostRx);
    if (m) { out.push({ speaker: 'host', text: m[1].trim() }); continue; }
    m = line.match(guestRx);
    if (m) { out.push({ speaker: 'guest', text: m[1].trim() }); continue; }
  }
  return out;
}

function escapeRx(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

import { NextRequest, NextResponse } from 'next/server';
import { platformDb, getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';
import { aiCall } from '@/lib/ai-client';
import { listAvatars, listVoices, generateVideo } from '@/lib/heygen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/studio/video-overview
 * body: { siteSlug, tone? : 'pitch'|'tour'|'welcome', avatarId?, voiceId? }
 *
 * Génère un script de présentation depuis le contenu du site, puis lance HeyGen.
 * Renvoie { ok, video_id, script } — le client polle ensuite /avatar-studio/generate?videoId=...
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const siteSlug = (body.siteSlug as string || '').trim();
  if (!siteSlug) return NextResponse.json({ error: 'siteSlug required' }, { status: 400 });
  const tone = (body.tone as 'pitch' | 'tour' | 'welcome') || 'welcome';

  const orgId = auth.membership.org.id;

  // ─── Charger contenu site ────────────────────────
  let siteContent = '', siteName = siteSlug;
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
      take: 10,
    });
    siteContent = pages.map((p: any) => `## ${p.title}\n${extractTextFromBlocks(p.blocks)}`).join('\n\n').slice(0, 8000);
    if (site.description) siteContent = `Description: ${site.description}\n\n${siteContent}`;
  } catch (e: any) {
    return NextResponse.json({ error: 'site-load-failed: ' + e?.message }, { status: 500 });
  }

  // ─── Génération script ───────────────────────────
  const toneInstructions: Record<string, string> = {
    welcome: 'Ton chaleureux et accueillant. Commence par "Bienvenue !" ou similaire. Présente l\'esprit du site, fais sentir l\'invitation à explorer.',
    tour: 'Ton de guide touristique enthousiaste. Décris ce que le visiteur va découvrir, énumère les sections principales, donne envie de cliquer.',
    pitch: 'Ton commercial sobre et professionnel. Met en avant la proposition de valeur, les bénéfices concrets, le call-to-action principal.',
  };
  const sysPrompt = `Tu rédiges un script de narration vidéo pour un avatar parlant. Format : un seul paragraphe fluide, 100% français, 130–180 mots (≈ 60–80 secondes de parole).
${toneInstructions[tone]}
Pas d'emojis dans le texte. Pas de "[pause]" ni de didascalies. Pas de bullet points. Texte parlé naturel uniquement, ponctué pour respirer.`;

  const ai = await aiCall({
    orgId, feature: 'text',
    prompt: `Site : "${siteName}". Contenu :\n\n${siteContent}\n\nGénère le script de narration vidéo maintenant.`,
    systemPrompt: sysPrompt,
    temperature: 0.75, maxTokens: 800,
  });
  if (!ai.ok || !ai.output) {
    return NextResponse.json({ error: 'ai-script-failed: ' + (ai.error || 'no output') }, { status: 500 });
  }
  const script = ai.output.trim().slice(0, 1500);

  // ─── Lancer HeyGen ───────────────────────────────
  const heygenKey = await getOrgSecret(orgId, 'HEYGEN_API_KEY');
  if (!heygenKey) {
    return NextResponse.json({
      error: 'HEYGEN_API_KEY non configurée. Configure-la dans /keys.',
      script,
    }, { status: 400 });
  }

  let avatarId = (body.avatarId as string) || '';
  let voiceId = (body.voiceId as string) || '';
  if (!avatarId || !voiceId) {
    try {
      const [avatars, voices] = await Promise.all([
        listAvatars(heygenKey).catch(() => []),
        listVoices(heygenKey, 'french').catch(() => []),
      ]);
      if (!avatarId) avatarId = avatars[0]?.avatar_id || '';
      if (!voiceId) {
        const fr = voices.find((v: any) => /french|fr/i.test(v.language || '')) || voices[0];
        voiceId = fr?.voice_id || '';
      }
    } catch {}
  }
  if (!avatarId || !voiceId) {
    return NextResponse.json({ error: 'no-avatar-or-voice-available', script }, { status: 500 });
  }

  try {
    const result = await generateVideo(heygenKey, {
      text: script, avatarId, voiceId,
      bgColor: '#FBEAF0', ratio: '16:9',
    });
    await platformDb.aiUsage.create({
      data: { orgId, provider: 'heygen', model: 'studio-overview', operation: 'video-overview', success: true },
    }).catch(() => {});
    return NextResponse.json({ ok: true, video_id: result.video_id, script, avatarId, voiceId });
  } catch (e: any) {
    return NextResponse.json({ error: 'heygen-failed: ' + e?.message, script }, { status: 500 });
  }
}

function extractTextFromBlocks(blocks: any): string {
  if (!Array.isArray(blocks)) return '';
  const out: string[] = [];
  for (const b of blocks) {
    const d = b?.data || {};
    if (d.title) out.push(d.title);
    if (d.subtitle) out.push(d.subtitle);
    if (d.html) out.push((d.html as string).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    if (d.text) out.push(d.text);
  }
  return out.filter(Boolean).join('\n').slice(0, 4000);
}

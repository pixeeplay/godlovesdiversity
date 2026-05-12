import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/orgs/[slug]/temoignage-ia/finish
 * body: { conversationId, authorName?, publish? }
 *
 * → Lit la conversation guidée, résume en Testimonial draft, et persiste si demandé.
 * Renvoie le draft (quote, suggested title).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const conversationId = String(b.conversationId || '');
  if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  const authorName = String(b.authorName || '').trim() || 'Anonyme';
  const publish = Boolean(b.publish);

  const db = await getTenantPrisma(slug);
  const userId = (auth.user as any).id;
  const conv: any = await db.aIConversation.findFirst({
    where: { id: conversationId, userId, tool: 'interview' },
  });
  if (!conv) return NextResponse.json({ error: 'conversation not found' }, { status: 404 });

  const msgs: any[] = Array.isArray(conv.messages) ? conv.messages : [];
  // Reconstruct Q&A
  const qa = msgs
    .filter((m) => m.role !== 'system')
    .map((m, i) => `[${m.role.toUpperCase()}] ${m.content}`)
    .join('\n\n');

  const systemPrompt = `Tu es un éditeur professionnel chargé de transformer une interview en témoignage publiable.
- Ton naturel, factuel, jamais religieux.
- Rédige à la 1ère personne ("Je", "Mon expérience").
- Évite les clichés, garde l'authenticité.
- Renvoie STRICTEMENT du JSON :
  { "title": "titre accrocheur 3-7 mots",
    "quote": "court extrait 1-2 phrases idéal pour citation visuelle",
    "body": "témoignage complet 150-400 mots, paragraphes \\n\\n",
    "tags": ["3-5 tags pertinents"] }`;

  const prompt = `Voici une interview guidée entre un assistant IA et un témoin.
Auteur : ${authorName}

${qa}

Transforme cette interview en témoignage publiable.`;

  const result = await aiCall({
    orgId: auth.membership.org.id,
    feature: 'text',
    prompt, systemPrompt,
    temperature: 0.6, maxTokens: 1800,
  });
  if (!result.ok) return NextResponse.json({ error: result.error || 'finish failed' }, { status: 500 });

  let parsed: any = null;
  try {
    const m = result.output.match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : null;
  } catch {}
  if (!parsed?.body) {
    parsed = { title: 'Témoignage', quote: '', body: result.output.trim(), tags: [] };
  }

  // Persist as Testimonial if publish=true (status=draft)
  let testimonial = null;
  if (publish) {
    testimonial = await db.testimonial.create({
      data: {
        authorName,
        quote: parsed.body,
        locale: 'fr',
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 6).map((t: any) => String(t)) : [],
        published: false,
        position: 0,
      },
    });
  }

  return NextResponse.json({
    ok: true,
    draft: parsed,
    testimonial,
    provider: result.provider,
    model: result.model,
  });
}

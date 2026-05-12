import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/orgs/[slug]/temoignage-ia/start
 * body: { topic?: string, authorName?: string }
 *
 * → Initialise une conversation guidée "interview IA" :
 *   - crée une AIConversation tool="interview"
 *   - renvoie la 1ère question + l'id
 *
 * Le client appelle ensuite /coach-ia/[id] avec POST tool="interview"
 * (ou utilise ce même endpoint via /next pour avancer).
 */
const QUESTIONS = [
  'Pour commencer, peux-tu te présenter en quelques mots ? (Prénom, contexte général)',
  'Quel est le moment ou l\'expérience que tu aimerais partager aujourd\'hui ? Décris-la brièvement.',
  'Qu\'est-ce qui a été le plus marquant pour toi dans cette expérience ?',
  'Si tu devais résumer en une phrase ce que ça t\'a apporté, ce serait quoi ?',
  'Y a-t-il un message que tu aimerais transmettre à quelqu\'un qui vit la même chose ?',
];

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const topic = String(b.topic || 'votre expérience');
  const authorName = String(b.authorName || '');

  const db = await getTenantPrisma(slug);
  const userId = (auth.user as any).id;
  const conv = await db.aIConversation.create({
    data: {
      userId,
      tool: 'interview',
      title: `Témoignage — ${topic}`,
      messages: [
        {
          role: 'system',
          content: `interview-guided | topic=${topic} | author=${authorName} | step=0`,
          at: new Date().toISOString(),
        },
        {
          role: 'assistant',
          content: QUESTIONS[0],
          at: new Date().toISOString(),
        },
      ],
    },
  });

  return NextResponse.json({
    ok: true,
    conversationId: conv.id,
    step: 0,
    totalSteps: QUESTIONS.length,
    question: QUESTIONS[0],
  });
}

/**
 * POST /api/orgs/[slug]/temoignage-ia/start/next
 *  body: { conversationId, answer }
 *  → enregistre la réponse, renvoie la question suivante (ou done=true)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json().catch(() => ({}));
  const conversationId = String(b.conversationId || '');
  const answer = String(b.answer || '').trim();
  if (!conversationId || !answer) return NextResponse.json({ error: 'conversationId + answer required' }, { status: 400 });

  const db = await getTenantPrisma(slug);
  const userId = (auth.user as any).id;
  const conv: any = await db.aIConversation.findFirst({
    where: { id: conversationId, userId, tool: 'interview' },
  });
  if (!conv) return NextResponse.json({ error: 'conversation not found' }, { status: 404 });

  const msgs: any[] = Array.isArray(conv.messages) ? conv.messages : [];
  const assistantCount = msgs.filter((m) => m.role === 'assistant').length;
  const userCount = msgs.filter((m) => m.role === 'user').length;

  const newMsgs = [
    ...msgs,
    { role: 'user', content: answer, at: new Date().toISOString() },
  ];

  // Determine next step
  const nextIdx = assistantCount; // since 0 assistant means we just asked Q0
  if (nextIdx < QUESTIONS.length) {
    newMsgs.push({
      role: 'assistant',
      content: QUESTIONS[nextIdx],
      at: new Date().toISOString(),
    });
    await db.aIConversation.update({
      where: { id: conversationId },
      data: { messages: newMsgs, updatedAt: new Date() },
    });
    return NextResponse.json({
      ok: true, done: false, step: nextIdx, totalSteps: QUESTIONS.length,
      question: QUESTIONS[nextIdx],
    });
  }

  // Interview complete
  await db.aIConversation.update({
    where: { id: conversationId },
    data: { messages: newMsgs, updatedAt: new Date() },
  });
  return NextResponse.json({ ok: true, done: true, step: QUESTIONS.length, totalSteps: QUESTIONS.length });
}

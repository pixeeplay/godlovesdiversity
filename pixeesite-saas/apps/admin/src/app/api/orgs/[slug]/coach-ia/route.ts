import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { getOrgSecret } from '@/lib/secrets';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Coach IA — conversation neutre (assistant guidance, pas religieux).
 * Persistance dans AIConversation (tool="coach").
 *
 * GET  /api/orgs/[slug]/coach-ia            → liste conversations user
 * POST /api/orgs/[slug]/coach-ia
 *   body: { message: string, conversationId?: string, scenario?: string }
 *   stream NDJSON : { token: "..." } ... { done: true, conversationId, messageId }
 */

const SCENARIOS: Record<string, string> = {
  default:
    "Tu es un coach bienveillant et factuel. Tu aides l'utilisateur à clarifier ses pensées, ses objectifs ou ses décisions. Pose des questions ouvertes, reformule, donne des pistes concrètes. Ton neutre, jamais religieux. Réponds en français, en 4 paragraphes maximum.",
  pro:
    "Tu joues le rôle d'un coach professionnel. Aide l'utilisateur à préparer une conversation difficile avec son employeur, un client ou un partenaire. Pose 1 question, donne 2-3 pistes concrètes.",
  perso:
    "Tu joues le rôle d'un coach de vie laïc. Aide l'utilisateur à clarifier une décision personnelle (relation, déménagement, choix de vie). Réponses courtes, empathiques, factuelles.",
  prep:
    "Tu joues le rôle d'un interlocuteur difficile pour entraîner l'utilisateur. Joue le rôle adverse (parent, employeur, ami maladroit). L'utilisateur peut écrire 'STOP' pour débriefer.",
  decision:
    "Tu es un assistant d'aide à la décision. Pose des questions pour cadrer le problème, liste les options, leurs pour/contre. Termine par 'Tu veux que je détaille une option ?'",
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }
  const userId = (auth.user as any).id;

  const db = await getTenantPrisma(slug);
  const convs = await db.aIConversation.findMany({
    where: { userId, tool: 'coach' },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: { id: true, title: true, createdAt: true, updatedAt: true, messages: true },
  });
  return NextResponse.json({
    items: convs.map((c: any) => ({
      id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt,
      messageCount: Array.isArray(c.messages) ? c.messages.length : 0,
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const body = await req.json().catch(() => ({}));
  const message = String(body.message || '').trim();
  if (!message) return NextResponse.json({ error: 'message required' }, { status: 400 });
  const scenario = String(body.scenario || 'default');
  const sys = SCENARIOS[scenario] || SCENARIOS.default;

  const orgId = auth.membership.org.id;
  const userId = (auth.user as any).id;
  const geminiKey = await getOrgSecret(orgId, 'GEMINI_API_KEY');
  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY non configurée' }, { status: 400 });

  const db = await getTenantPrisma(slug);

  // Load or create conversation
  let conv: any;
  if (body.conversationId) {
    conv = await db.aIConversation.findFirst({
      where: { id: String(body.conversationId), userId, tool: 'coach' },
    });
  }
  if (!conv) {
    conv = await db.aIConversation.create({
      data: {
        userId,
        tool: 'coach',
        title: message.slice(0, 60),
        messages: [],
      },
    });
  }

  const history = Array.isArray(conv.messages) ? conv.messages : [];
  const newUserMsg = { role: 'user', content: message, at: new Date().toISOString() };
  const fullHistory = [...history, newUserMsg];

  // Build Gemini conversation
  const contents = fullHistory.slice(-20).map((m: any) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }],
  }));

  // Streaming SSE
  const encoder = new TextEncoder();
  const conversationId = conv.id;

  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = '';
      try {
        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: sys }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 1500 },
            }),
          },
        );
        if (!r.ok || !r.body) {
          const err = await r.text().catch(() => 'stream failed');
          controller.enqueue(encoder.encode(JSON.stringify({ error: err.slice(0, 200) }) + '\n'));
          controller.close();
          return;
        }
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
              if (txt) {
                assistantText += txt;
                controller.enqueue(encoder.encode(JSON.stringify({ token: txt }) + '\n'));
              }
            } catch {}
          }
        }

        // Persist
        const newMsgs = [
          ...fullHistory,
          { role: 'assistant', content: assistantText, at: new Date().toISOString() },
        ];
        await db.aIConversation.update({
          where: { id: conversationId },
          data: { messages: newMsgs, updatedAt: new Date() },
        });

        controller.enqueue(
          encoder.encode(JSON.stringify({ done: true, conversationId }) + '\n'),
        );
      } catch (e: any) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: e?.message || 'stream failed' }) + '\n'),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

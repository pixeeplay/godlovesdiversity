import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runClaude } from '@/lib/claude-runner';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min max

/**
 * POST /api/admin/claude/run
 * Body : { prompt, model?, permissionMode?, workingDir? }
 * Réponse : SSE stream — chaque event = un message du SDK Claude.
 *
 * ADMIN-only. La page UI (/admin/claude-cli) lit le stream et l'affiche en live.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }
  if ((s.user as any)?.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const prompt = (body?.prompt as string)?.trim();
  if (!prompt || prompt.length < 3) {
    return new Response(JSON.stringify({ error: 'prompt-required' }), { status: 400 });
  }

  const model = (body?.model as string) || 'claude-sonnet-4-5';
  const permissionMode = (body?.permissionMode as 'default' | 'acceptEdits' | 'bypassPermissions') || 'bypassPermissions';
  const userId = (s.user as any)?.id || null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        for await (const msg of runClaude({ prompt, model, permissionMode, userId })) {
          send(msg);
        }
        send({ type: 'stream_end' });
      } catch (e: any) {
        send({ type: 'error', text: e?.message || 'stream KO' });
      } finally {
        controller.close();
      }
    },
    cancel() {
      // Le client a fermé la connexion — on ne peut pas vraiment kill le SDK depuis ici,
      // mais on note l'évent. Le runner devrait gérer un AbortController dans une V2.
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'   // désactive le buffering Nginx
    }
  });
}

/**
 * Claude Agent SDK runner — exécute Claude Code en autonome côté serveur.
 *
 * Authentification (par ordre de priorité) :
 *   1. ANTHROPIC_API_KEY (env)               → API key classique (consumer plan)
 *   2. CLAUDE_CODE_OAUTH_TOKEN (env)         → Token OAuth Max (long-lived)
 *
 * Pour la V2 :
 *   - Flow OAuth Max complet (npm install + OAuth callback)
 *   - MCP servers personnalisés (seedance vidéo, github, paperasse legal)
 *
 * Sécurité :
 *   - Réservé aux ADMIN (auth via session NextAuth dans la route appelante)
 *   - cwd limité à /app (le répertoire du conteneur Coolify)
 *   - permissionMode 'bypassPermissions' = Claude peut tout faire sans confirmation
 *     → utile pour le mode autonome mais à utiliser avec parcimonie.
 *     Si tu veux un mode safe, passe 'acceptEdits' ou 'default'.
 */

import { prisma } from './prisma';

export type RunOptions = {
  prompt: string;
  model?: string;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions';
  workingDir?: string;
  userId?: string | null;
  sessionId?: string;        // si on resume une session existante
  maxTurns?: number;
};

export type RunMessage = {
  type: string;
  raw: any;                   // message brut SDK
  text?: string;              // texte extrait pour affichage rapide
};

/**
 * Lance Claude Agent SDK et yield chaque message.
 * Persiste session + messages en DB.
 */
export async function* runClaude(opts: RunOptions): AsyncGenerator<RunMessage> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const oauthToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;

  if (!apiKey && !oauthToken) {
    yield {
      type: 'error',
      raw: { error: 'no-credentials' },
      text: '⚠️ Aucune clé API configurée. Définis ANTHROPIC_API_KEY ou CLAUDE_CODE_OAUTH_TOKEN dans Coolify.'
    };
    return;
  }

  // Crée la session DB avant de lancer
  const session = await prisma.claudeSession.create({
    data: {
      userId: opts.userId || null,
      prompt: opts.prompt,
      model: opts.model || 'claude-sonnet-4-5',
      workingDir: opts.workingDir || process.cwd(),
      permissionMode: opts.permissionMode || 'bypassPermissions',
      status: 'running'
    }
  });

  yield { type: 'session_started', raw: { sessionId: session.id }, text: `Session ${session.id} démarrée` };

  let messageIndex = 0;
  const startedAt = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let errorMessage: string | null = null;

  try {
    // Dynamic import : si le SDK n'est pas installé, on a un fallback clair.
    // webpackIgnore: true → empêche Next/webpack de tenter de résoudre le module au build.
    let query: any;
    try {
      const sdk = await import(/* webpackIgnore: true */ '@anthropic-ai/claude-agent-sdk' as any);
      query = sdk.query;
    } catch (e: any) {
      yield {
        type: 'error',
        raw: { error: 'sdk-missing', detail: e?.message },
        text: '⚠️ Le SDK @anthropic-ai/claude-agent-sdk n\'est pas installé. Lance `npm i @anthropic-ai/claude-agent-sdk` puis redéploie.'
      };
      await prisma.claudeSession.update({
        where: { id: session.id },
        data: { status: 'error', errorMessage: 'sdk-missing', finishedAt: new Date() }
      });
      return;
    }

    // Configure l'env pour le subprocess
    if (apiKey) process.env.ANTHROPIC_API_KEY = apiKey;
    if (oauthToken) process.env.CLAUDE_CODE_OAUTH_TOKEN = oauthToken;

    const generator = query({
      prompt: opts.prompt,
      options: {
        model: opts.model || 'claude-sonnet-4-5',
        cwd: opts.workingDir || process.cwd(),
        permissionMode: opts.permissionMode || 'bypassPermissions',
        maxTurns: opts.maxTurns || 30
      }
    });

    for await (const msg of generator) {
      const text = extractText(msg);

      // Persiste en DB (best-effort)
      await prisma.claudeMessage.create({
        data: {
          sessionId: session.id,
          type: (msg as any)?.type || 'unknown',
          payload: msg as any,
          index: messageIndex++
        }
      }).catch(() => null);

      // Track tokens si le SDK retourne usage
      const usage = (msg as any)?.message?.usage || (msg as any)?.usage;
      if (usage) {
        totalInputTokens += (usage.input_tokens || 0);
        totalOutputTokens += (usage.output_tokens || 0);
      }

      yield {
        type: (msg as any)?.type || 'unknown',
        raw: msg,
        text
      };
    }
  } catch (e: any) {
    errorMessage = e?.message || 'unknown-error';
    yield { type: 'error', raw: { error: errorMessage }, text: `❌ Erreur : ${errorMessage}` };
  } finally {
    await prisma.claudeSession.update({
      where: { id: session.id },
      data: {
        status: errorMessage ? 'error' : 'completed',
        durationMs: Date.now() - startedAt,
        totalInputTokens: totalInputTokens || null,
        totalOutputTokens: totalOutputTokens || null,
        errorMessage,
        finishedAt: new Date()
      }
    }).catch(() => null);

    yield {
      type: 'done',
      raw: {
        sessionId: session.id,
        durationMs: Date.now() - startedAt,
        totalInputTokens,
        totalOutputTokens
      },
      text: '✓ Session terminée'
    };
  }
}

/** Extrait le texte du message pour affichage rapide. */
function extractText(msg: any): string {
  if (!msg) return '';
  if (typeof msg === 'string') return msg;
  // Les messages assistant ont content = [{type:'text', text:'...'}, {type:'tool_use',...}]
  const content = msg.message?.content || msg.content;
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((c: any) => {
        if (c.type === 'text') return c.text || '';
        if (c.type === 'tool_use') return `\n🔧 ${c.name}(${JSON.stringify(c.input || {}).slice(0, 200)})`;
        if (c.type === 'tool_result') return `\n📥 ${typeof c.content === 'string' ? c.content.slice(0, 300) : JSON.stringify(c.content).slice(0, 300)}`;
        return '';
      })
      .join('');
  }
  return '';
}

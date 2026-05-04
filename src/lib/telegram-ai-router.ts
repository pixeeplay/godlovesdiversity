/**
 * Router IA pour messages naturels Telegram.
 * Prend un message en français/anglais et retourne quelle commande exécuter.
 *
 * Exemples :
 *   "tu as combien de commandes cette semaine ?" → /stats
 *   "j'aimerais voir les photos en attente" → /photos pending
 *   "c'est quoi l'agenda ?" → /agenda
 *   "comment ça va le système ?" → /healthcheck
 */
import { generateText } from './gemini';

export const KNOWN_COMMANDS = [
  { cmd: 'help',         desc: 'liste de toutes les commandes' },
  { cmd: 'stats',        desc: 'statistiques (commandes, abonnés, photos)' },
  { cmd: 'commandes',    desc: '5 dernières commandes boutique' },
  { cmd: 'photos',       desc: 'photos en attente de modération avec boutons approuver/refuser' },
  { cmd: 'agenda',       desc: 'prochains événements à venir' },
  { cmd: 'dons',         desc: 'total des dons reçus' },
  { cmd: 'newsletter',   desc: 'dernière campagne newsletter' },
  { cmd: 'healthcheck',  desc: 'état de toutes les intégrations (DB, Stripe, Gemini, etc.)' },
  { cmd: 'whoami',       desc: "ton identifiant Telegram pour la whitelist" }
] as const;

export type IntentResult =
  | { matched: true; command: string; reason?: string }
  | { matched: false; suggestion?: string; reason?: string };

const SYSTEM_PROMPT = `Tu es un routeur d'intentions pour le bot Telegram du mouvement « God Loves Diversity ».

Le visiteur t'écrit un message naturel (sans /). Tu dois choisir UNE commande parmi cette liste :

${KNOWN_COMMANDS.map((c) => `- ${c.cmd}  →  ${c.desc}`).join('\n')}

RÈGLES :
1. Réponds UNIQUEMENT en JSON strict, format :
   {"command": "stats", "reason": "le visiteur demande des chiffres"}
   ou
   {"command": null, "reason": "intention pas claire", "suggestion": "essaie /stats pour les chiffres"}

2. Si l'intention correspond clairement à une commande, choisis-la.
3. Si c'est ambigu ou hors-sujet, mets command=null + suggestion polie.
4. Pas de blabla, pas de markdown, JUSTE le JSON.`;

export async function interpretNaturalMessage(text: string): Promise<IntentResult> {
  if (!text || text.trim().length < 2) {
    return { matched: false, reason: 'message vide' };
  }

  // Heuristique rapide avant d'appeler l'IA — si le message contient déjà un mot-clé fort
  const lower = text.toLowerCase();
  for (const c of KNOWN_COMMANDS) {
    if (lower.includes(c.cmd)) {
      return { matched: true, command: c.cmd, reason: 'mot-clé direct dans le message' };
    }
  }

  // Appel Gemini
  try {
    const { text: out, mock } = await generateText(text, SYSTEM_PROMPT);
    if (mock) {
      return { matched: false, reason: 'IA non configurée — utilise une commande / explicite' };
    }
    // Extraction JSON robuste
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) return { matched: false, reason: 'IA réponse non-JSON', suggestion: out.slice(0, 100) };
    const parsed = JSON.parse(match[0]);
    if (parsed.command && typeof parsed.command === 'string' && KNOWN_COMMANDS.some((c) => c.cmd === parsed.command)) {
      return { matched: true, command: parsed.command, reason: parsed.reason };
    }
    return { matched: false, suggestion: parsed.suggestion || 'Tape /help pour voir les commandes', reason: parsed.reason };
  } catch (e: any) {
    return { matched: false, reason: `IA error: ${e?.message?.slice(0, 80)}` };
  }
}

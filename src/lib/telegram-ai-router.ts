/**
 * Router IA pour messages naturels Telegram.
 * 100+ patterns + heuristique multilingue (FR/EN/ES/PT) + IA fallback Gemini.
 */
import { generateText } from './gemini';

export const KNOWN_COMMANDS = [
  { cmd: 'help',           desc: 'liste commandes', aliases: ['aide', 'manual', 'list'] },
  { cmd: 'stats',          desc: 'statistiques globales', aliases: ['statistique', 'chiffre', 'kpi', 'dashboard'] },
  { cmd: 'commandes',      desc: '5 dernières commandes boutique', aliases: ['orders', 'achat', 'vente', 'shop'] },
  { cmd: 'photos',         desc: 'photos modération', aliases: ['photo', 'image', 'images', 'galerie', 'moderate'] },
  { cmd: 'agenda',         desc: 'événements à venir', aliases: ['events', 'calendrier', 'rdv', 'evenement'] },
  { cmd: 'dons',           desc: 'total dons', aliases: ['donations', 'donation', 'don'] },
  { cmd: 'newsletter',     desc: 'dernière newsletter', aliases: ['mail', 'campagne', 'mailing'] },
  { cmd: 'healthcheck',    desc: 'état intégrations', aliases: ['health', 'status', 'sante', 'systeme'] },
  { cmd: 'whoami',         desc: 'ton ID Telegram', aliases: ['mon id', 'my id'] },
  // Communauté
  { cmd: 'forum',          desc: 'derniers sujets forum', aliases: ['discussion', 'topic', 'sujet', 'thread'] },
  { cmd: 'temoignages',    desc: 'témoignages vidéo', aliases: ['testimony', 'temoignage', 'recit'] },
  { cmd: 'lieux',          desc: 'lieux LGBT-friendly', aliases: ['venue', 'restaurant', 'bar', 'eglise'] },
  { cmd: 'peerhelp',       desc: 'entraide pairs', aliases: ['peer', 'support', 'entraide', 'crise'] },
  { cmd: 'meetups',        desc: 'meetups', aliases: ['meetup', 'rencontre', 'apero', 'irl'] },
  { cmd: 'mentor',         desc: 'matchings mentor', aliases: ['mentoring', 'coach'] },
  // Création
  { cmd: 'addvenue',       desc: 'ajouter lieu', aliases: ['ajouter lieu', 'creer lieu', 'nouveau lieu'] },
  { cmd: 'addevent',       desc: 'ajouter event', aliases: ['ajouter event', 'creer event', 'nouveau rdv'] },
  { cmd: 'addpost',        desc: 'créer post forum', aliases: ['ajouter post', 'nouveau sujet'] },
  { cmd: 'addbanner',      desc: 'créer bannière', aliases: ['banner', 'banniere', 'nouvelle banniere'] },
  { cmd: 'addcoupon',      desc: 'créer coupon', aliases: ['coupon', 'promo', 'reduction'] },
  { cmd: 'addtemoignage',  desc: 'créer témoignage depuis ce message', aliases: ['mon temoignage', 'partager'] },
  { cmd: 'sendnewsletter', desc: 'envoyer newsletter', aliases: ['envoyer mail', 'send mail'] },
  // IA
  { cmd: 'aitext',         desc: 'générer texte IA', aliases: ['ia', 'gemini', 'redige', 'write'] },
  { cmd: 'aiimage',        desc: 'générer image IA', aliases: ['imagen', 'genere image'] },
  { cmd: 'aivideo',        desc: 'générer vidéo IA', aliases: ['video ia', 'higgsfield', 'veo'] },
  { cmd: 'translate',      desc: 'traduire', aliases: ['traduire', 'traduit', 'translation'] },
  { cmd: 'verse',          desc: 'analyse verset', aliases: ['verset', 'bible', 'coran', 'torah'] },
  { cmd: 'legal',          desc: 'aide juridique IA', aliases: ['juridique', 'avocat', 'droit', 'pacs'] },
  { cmd: 'voicecoach',     desc: 'simulation conversation', aliases: ['coming out', 'simulation'] },
  // Notifs
  { cmd: 'broadcast',      desc: 'message au groupe', aliases: ['envoyer groupe', 'annoncer'] },
  { cmd: 'notify',         desc: 'notifier abonnés', aliases: ['notification', 'alerter', 'push'] },
  // Boutique
  { cmd: 'products',       desc: 'liste produits', aliases: ['produits', 'catalogue', 'merch'] },
  { cmd: 'stock',          desc: 'état stock', aliases: ['inventaire'] },
  { cmd: 'topproducts',    desc: 'top vendus', aliases: ['top vente', 'meilleures ventes'] },
  // Thèmes
  { cmd: 'theme',          desc: 'thème actif', aliases: ['themes', 'design', 'couleurs'] },
  { cmd: 'pridemode',      desc: 'thème Pride ON', aliases: ['pride', 'rainbow', 'arc en ciel'] },
  { cmd: 'noelmode',       desc: 'thème Noël ON', aliases: ['noel', 'christmas'] },
  { cmd: 'features',       desc: 'feature flags', aliases: ['flags', 'fonctionnalites'] },
  // Users
  { cmd: 'users',          desc: 'derniers inscrits', aliases: ['inscrits', 'membres'] },
  { cmd: 'subscribers',    desc: 'abonnés newsletter', aliases: ['abonnes', 'mailing list'] },
  // SOS
  { cmd: 'sosalerts',      desc: 'alertes SOS', aliases: ['sos alert', 'urgences'] },
  { cmd: 'shelters',       desc: 'demandes hébergement', aliases: ['hebergement', 'refuge'] },
  { cmd: 'reports',        desc: 'signalements', aliases: ['signalement', 'report'] },
  // Système
  { cmd: 'logs',           desc: 'logs récents', aliases: ['log', 'historique', 'journal'] },
  { cmd: 'backup',         desc: 'backup DB', aliases: ['sauvegarde', 'export'] }
] as const;

export type IntentResult =
  | { matched: true; command: string; args?: string; reason?: string }
  | { matched: false; suggestion?: string; reason?: string };

const SYSTEM_PROMPT = `Tu es un routeur d'intentions pour le bot Telegram « parislgbt » (mouvement LGBT).
L'utilisateur écrit en FR/EN/ES/PT. Choisis UNE commande parmi : ${KNOWN_COMMANDS.map(c => c.cmd).join(', ')}.

RÉPONDS STRICTEMENT en JSON (pas de markdown) :
{"command": "stats", "args": "", "reason": "courte explication"}
ou si rien ne matche :
{"command": null, "reason": "...", "suggestion": "essaie /help"}

Tolère fautes ("kombien" → combien, "stat" → stats). Si CRÉER, utilise add* (addvenue/addevent/addpost/addbanner/addcoupon) avec contenu en args.`;

const SMALL_TALK = [
  /^(merci|thanks|thx|cool|ok|👍|👌|❤️|💚|🌈)\s*$/i,
  /^(bonjour|salut|hello|hi|hey|coucou|yo|cc|bonsoir)\s*[!.]?\s*$/i,
  /^(au revoir|bye|ciao|à\s+plus|a\s+plus)/i
];

export async function interpretNaturalMessage(text: string): Promise<IntentResult> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length < 2) return { matched: false, reason: 'message vide' };
  if (SMALL_TALK.some(p => p.test(trimmed))) return { matched: false, reason: 'small talk', suggestion: '🌈 Tape /help !' };

  const lower = trimmed.toLowerCase();

  // 1) Mot exact (mot entier)
  for (const c of KNOWN_COMMANDS) {
    if (new RegExp(`\\b${c.cmd}\\b`, 'i').test(lower)) {
      return { matched: true, command: c.cmd, args: extractArgs(trimmed, c.cmd), reason: 'mot-clé direct' };
    }
  }
  // 2) Alias (synonymes)
  for (const c of KNOWN_COMMANDS) {
    for (const alias of (c as any).aliases || []) {
      if (lower.includes(alias.toLowerCase())) {
        return { matched: true, command: c.cmd, args: extractArgs(trimmed, alias), reason: `alias "${alias}"` };
      }
    }
  }
  // 3) Verbes d'action création
  if (/^(genere|génère|cree|crée|ajoute|envoie|publie|send|create|add|generate)/i.test(lower)) {
    if (/banniere|banner|bannière/i.test(lower))   return { matched: true, command: 'addbanner',     args: trimmed, reason: 'verbe + banner' };
    if (/event|evenement|événement|agenda|rdv/i.test(lower)) return { matched: true, command: 'addevent', args: trimmed, reason: 'verbe + event' };
    if (/lieu|venue|restaurant|bar/i.test(lower))  return { matched: true, command: 'addvenue',      args: trimmed, reason: 'verbe + venue' };
    if (/post|sujet|forum/i.test(lower))            return { matched: true, command: 'addpost',       args: trimmed, reason: 'verbe + post' };
    if (/newsletter|mail/i.test(lower))             return { matched: true, command: 'sendnewsletter', args: trimmed, reason: 'verbe + newsletter' };
    if (/coupon|promo|code/i.test(lower))           return { matched: true, command: 'addcoupon',     args: trimmed, reason: 'verbe + coupon' };
    if (/video/i.test(lower))                       return { matched: true, command: 'aivideo',       args: trimmed, reason: 'verbe + video' };
    if (/image|photo|picture/i.test(lower))         return { matched: true, command: 'aiimage',       args: trimmed, reason: 'verbe + image' };
    if (/text|texte|article|description/i.test(lower)) return { matched: true, command: 'aitext',     args: trimmed, reason: 'verbe + texte' };
  }
  // 4) "combien de X"
  if (/combien|how many|count|nombre de/i.test(lower)) {
    if (/photo|image/i.test(lower))   return { matched: true, command: 'photos',     reason: 'combien photos' };
    if (/commande|order/i.test(lower)) return { matched: true, command: 'commandes', reason: 'combien commandes' };
    if (/abonn|subscriber/i.test(lower)) return { matched: true, command: 'subscribers', reason: 'combien abonnés' };
    if (/lieu|venue/i.test(lower))    return { matched: true, command: 'lieux',      reason: 'combien lieux' };
    if (/event|évén|agenda/i.test(lower)) return { matched: true, command: 'agenda', reason: 'combien events' };
    if (/don|donat/i.test(lower))     return { matched: true, command: 'dons',       reason: 'combien dons' };
    return { matched: true, command: 'stats', reason: 'combien général' };
  }
  // 5) Fallback IA
  try {
    const { text: out, mock } = await generateText(trimmed, SYSTEM_PROMPT);
    if (mock) return { matched: false, reason: 'IA non configurée', suggestion: '/help' };
    const match = out.match(/\{[\s\S]*\}/);
    if (!match) return { matched: false, suggestion: '/help', reason: 'IA non-JSON' };
    const parsed = JSON.parse(match[0]);
    if (parsed.command && KNOWN_COMMANDS.some(c => c.cmd === parsed.command)) {
      return { matched: true, command: parsed.command, args: parsed.args || '', reason: parsed.reason };
    }
    return { matched: false, suggestion: parsed.suggestion || '/help', reason: parsed.reason };
  } catch (e: any) {
    return { matched: false, reason: `IA error: ${e?.message?.slice(0, 80)}`, suggestion: '/help' };
  }
}

function extractArgs(text: string, keyword: string): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx < 0) return '';
  return text.slice(idx + keyword.length).trim();
}

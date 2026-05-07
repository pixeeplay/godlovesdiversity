/**
 * Manual Generator — produit 3 manuels (user / admin / superadmin) auto-écrits par Gemini.
 *
 * Stratégie :
 *  1. SECTIONS = liste de chapitres hardcodée par audience (nom + routes + description courte)
 *  2. Pour chaque section, Gemini écrit 2-3 paragraphes pédagogiques en FR
 *  3. Assemble en HTML stylé + version Markdown (pour script vidéo)
 *  4. Sauvegarde en DB (model Manual) avec versioning auto
 *
 * Le manuel est régénéré 2×/jour par cron Coolify pour rester à jour
 * avec les nouvelles features ajoutées au site.
 */

import { generateText } from './gemini';
import { bumpQuota, checkQuota } from './ai-autopilot';

export type Audience = 'user' | 'admin' | 'superadmin';

interface Section {
  title: string;
  emoji: string;
  routes: string[];
  hint: string; // contexte pour Gemini
}

// ─────────────────────────────────────────────
// SECTIONS PAR AUDIENCE
// ─────────────────────────────────────────────

const SECTIONS_USER: Section[] = [
  { title: 'Bienvenue', emoji: '🌈', routes: ['/'], hint: 'Page d\'accueil GLD : hero, témoignages, ticker dons, partenaires, footer' },
  { title: 'Découvrir l\'argumentaire', emoji: '📖', routes: ['/argumentaire', '/message'], hint: 'Pages éditoriales sur la mission GLD : foi inclusive, message d\'amour' },
  { title: 'Trouver un lieu LGBT-friendly', emoji: '📍', routes: ['/lieux', '/lieux/[slug]'], hint: 'Annuaire 2700+ venues : recherche, carte mondiale, filtres par ville/type' },
  { title: 'Voir les événements', emoji: '📅', routes: ['/agenda'], hint: 'Agenda événements LGBT et religieux à venir' },
  { title: 'Forum communautaire', emoji: '💬', routes: ['/forum', '/forum/[category]', '/forum/sujet/[slug]'], hint: 'Échanges thématiques modérés sur foi+orientation' },
  { title: 'Témoignages vidéo', emoji: '🎥', routes: ['/temoignages'], hint: 'Vidéos de membres partageant leur parcours' },
  { title: 'Boutique inclusive', emoji: '🛍', routes: ['/boutique', '/boutique/[slug]'], hint: 'Produits dérivés avec dropshipping (Printful, Gelato)' },
  { title: 'Connect — réseau social', emoji: '🤝', routes: ['/connect'], hint: 'Profils 3 modes (Communauté/Rencontres/Pro), feed, messages temps-réel' },
  { title: 'Mon espace personnel', emoji: '👤', routes: ['/mon-espace'], hint: '30 pages perso : dashboard, profil, favoris, commandes, paramètres' },
  { title: 'SOS d\'urgence LGBT', emoji: '🆘', routes: ['/urgence', '/sos'], hint: 'Bouton d\'urgence avec helplines internationales 24/7' },
  { title: 'Demandez à GLD (chat IA)', emoji: '✨', routes: ['/'], hint: 'Widget chat avec avatar IA RAG sur la base de connaissance' },
  { title: 'S\'abonner Premium', emoji: '⭐', routes: ['/membre-plus'], hint: 'Abonnement 5€/mois : badge, support direct, perks' },
  { title: 'Newsletter', emoji: '📧', routes: ['/newsletters'], hint: 'Archive des newsletters + inscription' },
  { title: 'Faire un don', emoji: '❤️', routes: ['/'], hint: 'Don via Stripe / HelloAsso / Square / Apple Pay (ticker en haut)' }
];

const SECTIONS_ADMIN: Section[] = [
  { title: 'Tableau de bord admin', emoji: '📊', routes: ['/admin'], hint: 'Vue d\'ensemble : stats live, alertes, raccourcis' },
  { title: 'Gérer les établissements', emoji: '🏛', routes: ['/admin/establishments', '/admin/venues/[id]'], hint: 'CRUD venues, import CSV/XLSX, géocodage, multi-sélection bulk enrichissement IA' },
  { title: 'Forum (modération + catégories)', emoji: '💬', routes: ['/admin/forum'], hint: 'Catégories, threads, posts, modération manuelle des contenus IA-flagged' },
  { title: 'Témoignages vidéo', emoji: '🎥', routes: ['/admin/testimonies'], hint: 'Approuver/rejeter les soumissions, mettre en avant' },
  { title: 'Événements (CRUD)', emoji: '📅', routes: ['/admin/events'], hint: 'Calendrier macOS-style, création, sync Facebook auto' },
  { title: 'Newsletter', emoji: '📧', routes: ['/admin/newsletter'], hint: 'Compose, abonnés, envoi multi-destinataires, log Resend' },
  { title: 'Boutique', emoji: '🛍', routes: ['/admin/shop', '/admin/shop/products'], hint: 'Produits, variants, IA images, dropshipping, commandes Colissimo' },
  { title: 'Espace pro venues', emoji: '🏢', routes: ['/admin/pro'], hint: 'Dashboard pro pour propriétaires, sync Facebook events, Studio IA' },
  { title: 'Studio IA', emoji: '✨', routes: ['/admin/ai-studio', '/admin/ai/knowledge'], hint: 'Génération texte/image/vidéo, RAG knowledge base' },
  { title: 'Avatar IA', emoji: '🎭', routes: ['/admin/avatar'], hint: 'Vidéo HeyGen + Live LiveAvatar Gemini Realtime' },
  { title: 'Bot Telegram', emoji: '🤖', routes: ['/admin/telegram'], hint: 'Configuration bot, 100+ commandes, log envois' },
  { title: 'Photos / Galerie', emoji: '🖼', routes: ['/admin/photos', '/admin/posters'], hint: 'Upload bulk EXIF, floutage IA visages, posters PDF' },
  { title: 'Partenaires', emoji: '🤝', routes: ['/admin/partners'], hint: 'Bandeau home + page /partenaires' },
  { title: 'Forum modération', emoji: '🛡', routes: ['/admin/forum'], hint: 'Posts hidden par IA, audit trail ModerationDecision' }
];

const SECTIONS_SUPERADMIN: Section[] = [
  ...SECTIONS_ADMIN,
  { title: 'AI Autopilot', emoji: '🤖', routes: ['/admin/ai-autopilot'], hint: 'GLD Soul + Mood + Modération + Newsletter auto, toggles ultra-fins, quota Gemini' },
  { title: 'Paramètres techniques', emoji: '⚙️', routes: ['/admin/settings'], hint: 'Clés API (Gemini, Resend, Stripe, Telegram), SMTP relay, mail-setup' },
  { title: 'Intégrations', emoji: '🔌', routes: ['/admin/integrations'], hint: 'Slack, Discord, Webhook, Mailchimp, WhatsApp, etc.' },
  { title: 'Dropshipping', emoji: '📦', routes: ['/admin/dropshipping'], hint: 'Printful, Gelato, TPOP : sync produits, marges' },
  { title: 'Utilisateurs', emoji: '👥', routes: ['/admin/users'], hint: 'CRUD users multi-rôles, permissions différenciées' },
  { title: 'Sécurité + audit', emoji: '🔒', routes: ['/admin'], hint: 'CSP, HSTS, JWT NextAuth, audit RGPD, rotation secrets' },
  { title: 'Thèmes saisonniers', emoji: '🎨', routes: ['/admin/themes'], hint: '50 thèmes auto-activés par fêtes (Pride, Noël, etc.)' },
  { title: 'Carte mondiale (admin)', emoji: '🗺', routes: ['/admin/map'], hint: 'Stats géographiques, géocodage progressif Nominatim' },
  { title: 'Cron + scheduled tasks', emoji: '⏰', routes: [], hint: 'Liste des 6 cron Coolify : geocode, enrich, i18n-audit, refresh-tracking, connect-digest, facebook-sync. Et le AI Autopilot (Soul, Newsletter)' },
  { title: 'Déploiement Coolify', emoji: '🚢', routes: [], hint: 'Webhook GitHub auto, env vars CRON_SECRET/CRON_TOKEN, build Dockerfile multi-stage, Prisma db push runtime' }
];

const AUDIENCES: Record<Audience, { sections: Section[]; tone: string; intro: string }> = {
  user: {
    sections: SECTIONS_USER,
    tone: 'chaleureux, accessible, pas de jargon technique, comme un ami qui guide. Tutoiement.',
    intro: 'Bienvenue dans parislgbt ! Ce manuel te guide à travers toutes les fonctionnalités du site pour que tu te sentes chez toi.'
  },
  admin: {
    sections: SECTIONS_ADMIN,
    tone: 'pro, efficace, orienté tâches concrètes. Explique le "comment" et le "pourquoi". Vouvoiement neutre.',
    intro: 'Ce manuel admin couvre toutes les pages du back-office GLD : modération, contenu, intégrations.'
  },
  superadmin: {
    sections: SECTIONS_SUPERADMIN,
    tone: 'technique, précis, mentionne stack et endpoints. Pour un sysadmin/dev. Vouvoiement neutre.',
    intro: 'Manuel super-admin : pilotage technique complet, sécurité, IA autopilot, infrastructure.'
  }
};

// ─────────────────────────────────────────────
// GÉNÉRATION
// ─────────────────────────────────────────────

export interface GeneratedManual {
  audience: Audience;
  version: string;
  html: string;
  markdown: string;
  videoScript: string;
  sectionCount: number;
  wordCount: number;
  apiCalls: number;
  /** Sections où l'IA a échoué et qui sont en fallback non-IA. */
  fallbackSections?: string[];
  /** Erreurs Gemini agrégées pour debug (jamais exposé au public). */
  errors?: string[];
}

/** Extrait robustement un objet JSON depuis du texte Gemini, même bruyant. */
function extractJson(raw: string): any | null {
  if (!raw) return null;
  // 1. Essayer tel quel après nettoyage léger
  let s = raw
    .replace(/^```(?:json|JSON)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();
  // Gemini met parfois du texte AVANT le JSON
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace > 0 && lastBrace > firstBrace) {
    s = s.slice(firstBrace, lastBrace + 1);
  }
  try { return JSON.parse(s); } catch {}

  // 2. Tenter de réparer les retours-ligne non-échappés dans les strings
  try {
    const repaired = s
      .replace(/(?<!\\)\n/g, '\\n')
      .replace(/(?<!\\)\r/g, '\\r')
      .replace(/(?<!\\)\t/g, '\\t');
    return JSON.parse(repaired);
  } catch {}

  // 3. Extraire manuellement html et markdown via regex (dernière chance)
  const htmlMatch = s.match(/"html"\s*:\s*"((?:\\.|[^"\\])*)"/s);
  const mdMatch = s.match(/"markdown"\s*:\s*"((?:\\.|[^"\\])*)"/s);
  if (htmlMatch) {
    return {
      html: htmlMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      markdown: mdMatch?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n') || ''
    };
  }
  return null;
}

/** Construit un fallback non-IA exploitable depuis le hint et les routes. */
function nonAiFallback(sec: Section, audience: Audience): { html: string; markdown: string } {
  const labels: Record<Audience, string> = {
    user: 'Cette section concerne ton expérience utilisateur sur le site',
    admin: 'Cette section couvre la gestion administrateur',
    superadmin: 'Cette section couvre la configuration technique avancée'
  };
  const routesText = sec.routes.length
    ? `Tu peux y accéder via : ${sec.routes.map(r => `<code>${r}</code>`).join(', ')}.`
    : 'Cette fonctionnalité est transversale au site.';
  const html = `<p>${labels[audience]}. <strong>${sec.title}</strong> — ${sec.hint}.</p><p>${routesText}</p>`;
  const md = `${labels[audience]}. **${sec.title}** — ${sec.hint}.\n\n${sec.routes.length ? `Routes : ${sec.routes.join(', ')}` : 'Section transversale.'}`;
  return { html, markdown: md };
}

export async function generateManual(audience: Audience): Promise<GeneratedManual> {
  const cfg = AUDIENCES[audience];
  const date = new Date();
  const version = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;

  const sectionTexts: Array<{ title: string; emoji: string; routes: string[]; bodyHtml: string; bodyMd: string }> = [];
  const fallbackSections: string[] = [];
  const errors: string[] = [];
  let apiCalls = 0;
  let quotaExhausted = false;

  for (const sec of cfg.sections) {
    // Si quota épuisé, on N'ABANDONNE PLUS la boucle : on génère un fallback non-IA
    let parsed: { html: string; markdown: string } | null = null;
    let attemptError: string | null = null;

    if (!quotaExhausted) {
      const quota = await checkQuota();
      if (!quota.ok) {
        quotaExhausted = true;
        errors.push(`quota-exhausted-at-section: ${sec.title}`);
      }
    }

    if (!quotaExhausted) {
      const prompt = `Tu rédiges UNE section d'un manuel utilisateur pour le site parislgbt (réseau social inclusif religieux LGBT+, https://gld.pixeeplay.com).

AUDIENCE : ${audience.toUpperCase()}
TON : ${cfg.tone}

SECTION : "${sec.emoji} ${sec.title}"
ROUTES CONCERNÉES : ${sec.routes.join(', ') || '(transversal)'}
CONTEXTE : ${sec.hint}

Écris 2-3 paragraphes pédagogiques en FRANÇAIS clair :
- 1er paragraphe : à QUOI ça sert (le bénéfice utilisateur)
- 2e paragraphe : COMMENT y accéder + actions principales
- 3e paragraphe optionnel : astuce ou cas d'usage concret

Réponds UNIQUEMENT en JSON strict (pas de markdown, pas de \`\`\`) :
{
  "html": "contenu HTML : <p>…</p><p>…</p>. Tu peux utiliser <strong>, <em>, <a href=\\"…\\">. Pas de <h1>/<h2> (ils sont gérés autour).",
  "markdown": "même contenu en markdown pour la version vidéo : 2-3 paragraphes texte plat"
}

Règles :
- 200-300 mots max au total
- Pas de "découvrez", "n'hésitez pas", clichés marketing
- Mentionne 1 vrai chiffre si pertinent (ex: 2700+ lieux, 10 langues)
- Reste factuel, pas de fluff`;

      // 2 tentatives : la 2e avec un prompt plus simple si la 1ère JSON-parse échoue
      for (let attempt = 1; attempt <= 2 && !parsed; attempt++) {
        try {
          const r = await generateText(attempt === 1 ? prompt : `${prompt}\n\nIMPORTANT : ta réponse doit être UNIQUEMENT le JSON {"html":"...","markdown":"..."}, sans aucun texte avant ou après.`);
          apiCalls++;
          await bumpQuota(1);
          const candidate = extractJson(r.text || '');
          if (candidate && (candidate.html || candidate.markdown)) {
            parsed = {
              html: candidate.html || `<p>${candidate.markdown || ''}</p>`,
              markdown: candidate.markdown || (candidate.html || '').replace(/<[^>]+>/g, '').trim()
            };
          } else {
            attemptError = `parse-failed-attempt-${attempt}`;
          }
        } catch (e: any) {
          attemptError = `gemini-error-attempt-${attempt}: ${e?.message || 'unknown'}`;
          // Sur erreur réseau/quota au runtime → on n'insiste pas
          if (e?.message?.includes('quota') || e?.message?.includes('429')) {
            quotaExhausted = true;
            break;
          }
        }
      }

      if (!parsed && attemptError) errors.push(`${sec.title}: ${attemptError}`);
    }

    // Si pas de contenu IA exploitable → fallback non-IA basé sur hint + routes
    if (!parsed) {
      parsed = nonAiFallback(sec, audience);
      fallbackSections.push(sec.title);
    }

    sectionTexts.push({
      title: sec.title,
      emoji: sec.emoji,
      routes: sec.routes,
      bodyHtml: parsed.html,
      bodyMd: parsed.markdown
    });

    // Petit délai pour éviter de saturer Gemini (skip si en fallback non-IA)
    if (!quotaExhausted) await new Promise((r) => setTimeout(r, 500));
  }

  const html = renderHtml(audience, version, cfg.intro, sectionTexts);
  const markdown = renderMarkdown(audience, version, cfg.intro, sectionTexts);
  const videoScript = renderVideoScript(audience, sectionTexts);
  const wordCount = markdown.split(/\s+/).length;

  return {
    audience,
    version,
    html,
    markdown,
    videoScript,
    sectionCount: sectionTexts.length,
    wordCount,
    apiCalls,
    fallbackSections: fallbackSections.length ? fallbackSections : undefined,
    errors: errors.length ? errors : undefined
  };
}

// ─────────────────────────────────────────────
// RENDU HTML / MARKDOWN / VIDEO SCRIPT
// ─────────────────────────────────────────────

function renderHtml(audience: Audience, version: string, intro: string, sections: any[]): string {
  const audienceLabels: Record<Audience, string> = { user: 'Utilisateur', admin: 'Administrateur', superadmin: 'Super-Admin' };
  const dateLong = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Manuel ${audienceLabels[audience]} — GLD v${version}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,system-ui,"Segoe UI",sans-serif;background:#f9f9fa;color:#222;line-height:1.6;padding:0}
  .container{max-width:780px;margin:0 auto;padding:32px 24px;background:white}
  .hero{background:linear-gradient(135deg,#d4537e,#7f77dd,#1d9e75);color:white;padding:32px 24px;border-radius:16px;margin-bottom:32px;text-align:center}
  .hero h1{font-size:32px;margin-bottom:8px}
  .hero p{opacity:0.9;font-size:14px}
  h2{font-size:22px;margin:40px 0 12px;padding:8px 0;border-bottom:2px solid #d4537e;color:#7f77dd}
  h3{font-size:14px;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin:8px 0}
  p{margin:8px 0;color:#444}
  a{color:#7f77dd}
  .toc{background:#f0f0f5;border-radius:12px;padding:20px;margin:24px 0}
  .toc h3{margin-top:0}
  .toc ul{list-style:none;columns:2;gap:12px}
  .toc li{padding:4px 0;font-size:13px;break-inside:avoid}
  .toc a{text-decoration:none}
  .meta{font-size:11px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:16px;margin-top:32px}
  .badge{display:inline-block;background:#fee;color:#d4537e;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:bold;margin-top:8px}
  .routes{font-size:11px;color:#999;font-family:monospace;background:#f5f5f5;padding:4px 8px;border-radius:4px;margin-bottom:8px;display:inline-block}
  .btn{display:inline-block;background:#d4537e;color:white;text-decoration:none;padding:10px 20px;border-radius:99px;font-weight:bold;margin:8px 0}
  @media print{body{background:white}.container{max-width:100%}.hero{page-break-after:avoid}h2{page-break-after:avoid}}
</style>
</head>
<body>
<div class="container">
  <div class="hero">
    <div style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;opacity:0.85">Manuel ${audienceLabels[audience]}</div>
    <h1>🌈 parislgbt</h1>
    <p>${intro}</p>
    <span class="badge">v${version} · ${dateLong}</span>
    <p style="margin-top:16px"><a href="javascript:window.print()" class="btn">📄 Télécharger en PDF</a></p>
  </div>

  <nav class="toc">
    <h3>Sommaire (${sections.length} sections)</h3>
    <ul>
      ${sections.map((s, i) => `<li><a href="#sec-${i}">${s.emoji} ${s.title}</a></li>`).join('')}
    </ul>
  </nav>

  ${sections.map((s, i) => `
    <section id="sec-${i}">
      <h2>${s.emoji} ${s.title}</h2>
      ${s.routes.length ? `<div class="routes">${s.routes.map((r: string) => `<a href="${r}">${r}</a>`).join(' · ')}</div>` : ''}
      ${s.bodyHtml}
    </section>
  `).join('')}

  <div class="meta">
    Manuel généré automatiquement par IA le ${dateLong}.<br/>
    Régénéré 2×/jour pour rester à jour. — parislgbt · gld.pixeeplay.com
  </div>
</div>
</body>
</html>`;
}

function renderMarkdown(audience: Audience, version: string, intro: string, sections: any[]): string {
  const labels: Record<Audience, string> = { user: 'Utilisateur', admin: 'Administrateur', superadmin: 'Super-Admin' };
  let md = `# 🌈 parislgbt — Manuel ${labels[audience]}\n\nv${version}\n\n${intro}\n\n## Sommaire\n\n`;
  md += sections.map((s, i) => `${i + 1}. ${s.emoji} ${s.title}`).join('\n') + '\n\n---\n\n';
  for (const s of sections) {
    md += `## ${s.emoji} ${s.title}\n\n`;
    if (s.routes.length) md += `*Routes : ${s.routes.join(', ')}*\n\n`;
    md += `${s.bodyMd || s.bodyHtml.replace(/<[^>]+>/g, '').trim()}\n\n`;
  }
  return md;
}

function renderVideoScript(audience: Audience, sections: any[]): string {
  const labels: Record<Audience, string> = { user: 'Utilisateur', admin: 'Administrateur', superadmin: 'Super-Admin' };
  let script = `# 🎬 SCRIPT VIDÉO — Manuel ${labels[audience]} GLD\n\n`;
  script += `**Durée totale estimée :** ${Math.ceil(sections.length * 0.7)} minutes\n\n`;
  script += `---\n\n## 🎬 OUVERTURE (0:00 - 0:15)\n\n`;
  script += `**Voix off :**\n> Bienvenue dans parislgbt. Voici un tour complet du site.\n\n`;
  script += `**Screenshot :** \`/\` (home)\n**Animation :** zoom doux sur le hero\n\n---\n\n`;

  let timestamp = 15;
  for (let i = 0; i < sections.length; i++) {
    const s = sections[i];
    const seconds = 30 + Math.floor((s.bodyMd?.length || 200) / 30);
    const min = Math.floor(timestamp / 60);
    const sec = timestamp % 60;
    const endMin = Math.floor((timestamp + seconds) / 60);
    const endSec = (timestamp + seconds) % 60;

    script += `## ${i + 1}. ${s.emoji} ${s.title} (${min}:${String(sec).padStart(2, '0')} - ${endMin}:${String(endSec).padStart(2, '0')})\n\n`;
    script += `**Voix off :**\n> ${s.bodyMd?.split('\n').filter(Boolean).slice(0, 2).join(' ').replace(/\s+/g, ' ').slice(0, 400)}\n\n`;
    if (s.routes.length) script += `**Screenshot à capturer :** ${s.routes.map((r: string) => `\`https://gld.pixeeplay.com${r}\``).join(', ')}\n`;
    script += `**Action UI :** ${s.routes.length ? 'naviguer vers la page, hover sur les zones-clés' : 'illustration / animation libre'}\n\n---\n\n`;
    timestamp += seconds;
  }

  const totalMin = Math.floor(timestamp / 60);
  const totalSec = timestamp % 60;
  script += `## 🎬 CLÔTURE (${totalMin}:${String(totalSec).padStart(2, '0')} - end)\n\n`;
  script += `**Voix off :**\n> Pour aller plus loin, rejoins gld.pixeeplay.com. Dieu est amour. La foi se conjugue au pluriel.\n\n`;
  script += `**Screenshot :** logo GLD + lien site\n**Outro :** musique fade-out 5 sec\n\n---\n\n`;
  script += `## 📸 LISTE DES SCREENSHOTS À CAPTURER\n\n`;
  const allRoutes = Array.from(new Set(sections.flatMap((s) => s.routes)));
  for (const r of allRoutes) script += `- [ ] \`https://gld.pixeeplay.com${r}\`\n`;
  return script;
}

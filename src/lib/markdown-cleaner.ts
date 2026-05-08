/**
 * markdown-cleaner — vire le boilerplate web pour ne garder que le CONTENU utile.
 *
 * Pourquoi : Jina Reader produit du markdown très propre par rapport à un strip-tags
 * basique, mais il garde quand même tout le chrome du site : menus, breadcrumbs,
 * footers, listes de filtres, blocs d'images-icônes. Quand on chunk ce markdown
 * pour le RAG, les embeddings sont pollués par tout ce bruit → la recherche
 * sémantique remonte des chunks qui sont 80 % menu et 20 % vrai contenu.
 *
 * Ce cleaner détecte et supprime :
 *   1. Lignes 100 % composées de liens markdown (menus)
 *   2. Listes de liens consécutifs (>= 5 liens d'affilée → menu)
 *   3. Images en lien `[![Image N: ...](...)](...)` qui polluent à mort
 *   4. Lignes < 25 caractères répétées plusieurs fois (boilerplate)
 *   5. Breadcrumbs (Home › X › Y)
 *   6. Lignes "MENU", "Liens objectifs", "Marques", autres mots-clés UI
 *   7. Trop de bullets vides ou "* *"
 *
 * Préserve :
 *   - Paragraphes denses (>= 60 chars)
 *   - Blocs produit (titre + prix repérable par regex)
 *   - Headings (#, ##, ###)
 *   - Listes courtes mais informatives (descriptions)
 *
 * Modes :
 *   - 'standard' : nettoyage modéré, garde la structure
 *   - 'aggressive' : vire tout ce qui ressemble à du chrome (recommandé pour RAG)
 */

export type CleanerMode = 'off' | 'standard' | 'aggressive';

export type CleanResult = {
  cleaned: string;
  /** Stats pour info */
  stats: {
    originalChars: number;
    cleanedChars: number;
    removedPct: number;
    linesIn: number;
    linesOut: number;
  };
};

/* ─── DÉTECTEURS ──────────────────────────────────────────────── */

/** Vrai si la ligne est un menu (composée majoritairement de liens). */
function isLinkMenu(line: string): boolean {
  // Compte les "[text](url)" et le texte en dehors
  const links = (line.match(/\[[^\]]*\]\([^)]+\)/g) || []).length;
  if (links < 2) return false;
  // Si la ligne est >= 50% liens et < 200 chars : c'est un menu
  const stripped = line.replace(/\[[^\]]*\]\([^)]+\)/g, '').replace(/[\s|·•►▸*\-]+/g, '');
  return links >= 2 && stripped.length < 30;
}

/** Vrai si la ligne contient une image en lien (très polluant). */
function isImageLink(line: string): boolean {
  return /\[!\[Image\s*\d*[^\]]*\]\([^)]+\)\]\([^)]+\)/.test(line);
}

/** Vrai si la ligne est un breadcrumb. */
function isBreadcrumb(line: string): boolean {
  return /[›»>]/.test(line) && (line.match(/[›»>]/g) || []).length >= 2 && line.length < 200;
}

/** Vrai si la ligne ressemble à un mot-clé UI (sans contexte). */
function isUiKeyword(line: string): boolean {
  const trimmed = line.trim().replace(/^#+\s*/, '');
  if (trimmed.length === 0 || trimmed.length > 60) return false;
  return /^(MENU|Marques|Catégories|Filtre[s]?|Trier par|Par marque|Liens objectifs|Mon (compte|panier)|Connexion|Déconnexion|Identifiez-vous|Rechercher|Accueil|Liste|Wishlist|Besoin d['']aide)/i.test(trimmed);
}

/** Vrai si la ligne ressemble à un prix (à préserver). */
function hasPrice(line: string): boolean {
  return /\d+[\s,.]?\d*\s*[€$£¥]/.test(line) || /\b\d+[\s,.]?\d*\s*(EUR|USD|GBP)\b/i.test(line);
}

/** Vrai si la ligne est dense (vrai contenu). */
function isDenseContent(line: string): boolean {
  const stripped = line
    .replace(/\[[^\]]*\]\([^)]+\)/g, '$1') // remplace liens par leur texte
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/[*_`#>-]/g, '')
    .trim();
  // Considère comme contenu dense si >= 50 chars de texte non-balisé
  return stripped.length >= 50;
}

/* ─── NETTOYAGE PRINCIPAL ─────────────────────────────────────── */

export function cleanMarkdown(input: string, mode: CleanerMode = 'standard'): CleanResult {
  if (mode === 'off') {
    return {
      cleaned: input,
      stats: {
        originalChars: input.length,
        cleanedChars: input.length,
        removedPct: 0,
        linesIn: input.split('\n').length,
        linesOut: input.split('\n').length,
      },
    };
  }

  const original = input;
  const lines = input.split('\n');
  const out: string[] = [];

  // Première passe : strip ligne à ligne
  let consecutiveLinkLines = 0;
  let lastLines: string[] = []; // Pour détecter doublons

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === '') {
      consecutiveLinkLines = 0;
      // Garde une seule ligne vide d'affilée
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }

    // Vire les images en lien — toujours (polluent énormément)
    if (isImageLink(line)) continue;

    // Vire les "MENU" et UI keywords
    if (isUiKeyword(line)) continue;

    // Vire les breadcrumbs en mode aggressive
    if (mode === 'aggressive' && isBreadcrumb(line)) continue;

    // Détection menu : si une ligne est une liste de liens, on l'agrège
    if (isLinkMenu(line)) {
      consecutiveLinkLines++;
      // Si déjà plusieurs lignes-menu d'affilée → on ignore TOUT le bloc
      if (consecutiveLinkLines >= 2 || mode === 'aggressive') continue;
      // Sinon on garde la 1re (peut être un mini-menu informatif)
    } else {
      consecutiveLinkLines = 0;
    }

    // Lignes très courtes (< 25 chars) : virer si répétées 2+ fois OU mode aggressive
    if (line.length < 25 && !line.startsWith('#') && !hasPrice(line)) {
      const seenBefore = lastLines.includes(line);
      if (seenBefore || mode === 'aggressive') continue;
    }

    // Garde les ressources strip / trim de l'image markdown bruit
    const cleaned = stripImageMarkdown(raw);
    if (cleaned.trim() === '') continue;

    out.push(cleaned);
    lastLines.push(line);
    if (lastLines.length > 30) lastLines.shift();
  }

  // 2e passe : élimine les blocs successifs de < 30 chars (résidus de menus)
  let result = out.join('\n');

  if (mode === 'aggressive') {
    // Vire les paragraphes qui sont 80% liens (résidus)
    result = result.split('\n\n').filter((para) => {
      const links = (para.match(/\[[^\]]*\]\([^)]+\)/g) || []).length;
      const text = para.replace(/\[[^\]]*\]\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
      // Si > 4 liens et < 80 chars de texte hors liens → c'est du menu
      if (links > 4 && text.length < 80) return false;
      return true;
    }).join('\n\n');
  }

  // Normalise les sauts de ligne multiples
  result = result.replace(/\n{3,}/g, '\n\n').trim();

  return {
    cleaned: result,
    stats: {
      originalChars: original.length,
      cleanedChars: result.length,
      removedPct: Math.round((1 - result.length / Math.max(1, original.length)) * 100),
      linesIn: lines.length,
      linesOut: result.split('\n').length,
    },
  };
}

/** Vire les `![Image N: alt](url)` qui ne servent à rien dans le RAG textuel. */
function stripImageMarkdown(line: string): string {
  return line
    .replace(/!\[Image\s*\d*[^\]]*\]\([^)]+\)/g, '')
    .replace(/!\[\s*\]\([^)]+\)/g, '')
    .replace(/!\[icone[^\]]*\]\([^)]+\)/gi, '')
    .replace(/!\[logo[^\]]*\]\([^)]+\)/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ─── EXTRACTEUR GEMINI (mode max qualité) ────────────────────── */

import { callGeminiText, GEMINI_MODELS } from './gemini-text';

export type GeminiExtractOptions = {
  apiKey: string;
  model?: string;     // Défaut GEMINI_MODELS.CLEANER (gemini-3-flash-lite avec fallback)
  hint?: string;      // Hint contextuel (ex: "site e-commerce photo")
};

const EXTRACT_PROMPT = `Tu reçois le markdown brut d'une page web. Ta mission : extraire UNIQUEMENT le contenu UTILE pour un système de recherche sémantique (RAG).

À PRÉSERVER absolument :
- Titres et sous-titres réels du contenu (pas les titres de menus)
- Descriptions, paragraphes narratifs, articles
- Informations structurées (produits, prix, dates, lieux, contacts)
- Citations, témoignages, FAQ
- Tableaux de données

À VIRER absolument :
- Menus de navigation, breadcrumbs, footers
- Listes répétitives de liens (catégories, marques, filtres)
- Mentions légales, cookies, copyright
- Boutons UI ("Mon compte", "Panier", "Connexion", etc.)
- Images d'icônes ou de logos
- Métadonnées techniques répétitives

FORMAT DE SORTIE :
- Markdown propre, structuré avec ## et ###
- Phrases complètes, paragraphes denses
- Garde les vraies info (prix, références, descriptions)
- Renvoie SEULEMENT le markdown nettoyé, pas de commentaire ni d'introduction`;

export async function extractWithGemini(
  markdown: string,
  opts: GeminiExtractOptions
): Promise<{ cleaned: string; tokensIn: number; tokensOut: number; modelUsed: string } | null> {
  // Cap input à 60K chars pour ne pas exploser le contexte
  const input = markdown.slice(0, 60_000);
  const prompt = `${EXTRACT_PROMPT}${opts.hint ? `\n\nCONTEXTE : ${opts.hint}` : ''}\n\nMARKDOWN BRUT :\n\n${input}\n\n---\n\nRenvoie maintenant uniquement le markdown nettoyé :`;

  const r = await callGeminiText({
    apiKey: opts.apiKey,
    prompt,
    model: opts.model || GEMINI_MODELS.CLEANER,
    temperature: 0.1,
    maxOutputTokens: 8000,
    timeoutMs: 25_000,
  });

  if (!r) return null;
  return {
    cleaned: r.text.trim(),
    tokensIn: r.tokensIn || 0,
    tokensOut: r.tokensOut || 0,
    modelUsed: r.modelUsed,
  };
}

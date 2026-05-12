import { NextRequest, NextResponse } from 'next/server';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiCall } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

/**
 * POST /api/orgs/[slug]/legal/generate
 * body: { type: 'cgu'|'cgv'|'rgpd'|'cookies'|'mentions', companyInfo: {...} }
 *   companyInfo : { legalName, siret?, address?, country?, email?, sector?, website?, dataCategories?, ... }
 */
const TEMPLATES_HINT: Record<string, string> = {
  cgu: `Génère des CONDITIONS GÉNÉRALES D'UTILISATION (CGU) complètes pour un site web français.
Sections obligatoires : objet, accès au service, propriété intellectuelle, données personnelles (RGPD), responsabilité, modération, droit applicable, modifications, contact.`,
  cgv: `Génère des CONDITIONS GÉNÉRALES DE VENTE (CGV) pour une boutique en ligne française.
Sections : objet, identification du vendeur, produits, commandes, prix, paiement, livraison, droit de rétractation (14j), garanties légales (conformité + vices cachés), responsabilité, données personnelles, droit applicable, médiation conso.`,
  rgpd: `Génère une POLITIQUE DE CONFIDENTIALITÉ (RGPD) conforme à 2026 :
finalités du traitement, bases légales, catégories de données, durées de conservation, destinataires, transferts hors UE, droits des personnes (accès/rectification/effacement/portabilité/opposition/limitation), DPO si applicable, contact CNIL.`,
  cookies: `Génère une POLITIQUE COOKIES complète + bandeau de consentement texte.
Liste les cookies par finalité (techniques, mesure d'audience, marketing, réseaux sociaux), durée, base légale, et instructions pour gérer le consentement.`,
  mentions: `Génère les MENTIONS LÉGALES obligatoires pour un site français :
éditeur (nom/forme juridique/capital), siège social, SIRET, directeur de publication, hébergeur (nom, adresse, tel), email contact, n° TVA intracom le cas échéant.`,
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const b = await req.json();
  const type = String(b.type || '').toLowerCase();
  if (!TEMPLATES_HINT[type]) return NextResponse.json({ error: `type invalide (cgu|cgv|rgpd|cookies|mentions)` }, { status: 400 });
  const company = b.companyInfo || {};
  if (!company.legalName) return NextResponse.json({ error: 'companyInfo.legalName requis' }, { status: 400 });

  const sys = `Tu es un juriste français spécialiste du droit du numérique. Tu écris en français formel, juridiquement précis, à jour 2026.
Rendu : Markdown propre (titres ##, ###, listes -, gras **).
Date du document = ${new Date().toLocaleDateString('fr-FR')}.
N'invente aucun fait que tu n'as pas dans companyInfo : utilise des placeholders [À RENSEIGNER : ...] si une info manque.`;

  const prompt = `${TEMPLATES_HINT[type]}

ENTREPRISE :
\`\`\`json
${JSON.stringify(company, null, 2)}
\`\`\`

Génère le document complet maintenant. Pas de préambule.`;

  const result = await aiCall({
    orgId: auth.membership.org.id,
    feature: 'text', prompt, systemPrompt: sys,
    temperature: 0.3, maxTokens: 6000,
  });
  if (!result.ok) return NextResponse.json({ error: result.error || 'generate failed' }, { status: 500 });
  return NextResponse.json({ ok: true, type, text: result.output, provider: result.provider, model: result.model });
}

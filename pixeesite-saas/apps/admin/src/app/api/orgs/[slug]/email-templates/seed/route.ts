/**
 * Seed 5 templates rodés (B2B, B2C, transactionnel, welcome). Port faithful GLD.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SEEDS = [
  {
    name: 'B2B — Cold mail prospection',
    type: 'b2b-email',
    subject: 'Partenariat — {{company}}',
    body: `Bonjour {{firstName}},

Je suis {{senderName}}, je travaille avec des {{jobTitle}} chez des marques comme {{company}}.
Je voulais te proposer une collab simple : {{offer}}.

Si tu veux qu'on se cale 15 min : {{calendarLink}}.
À bientôt,
{{senderName}}

(Désinscription : {{unsubscribeUrl}})`,
    variables: ['firstName', 'jobTitle', 'company', 'senderName', 'offer', 'calendarLink', 'unsubscribeUrl']
  },
  {
    name: 'B2C — DM Instagram doux',
    type: 'b2c-dm-insta',
    subject: null,
    body: `Coucou {{firstName}} 💍

J'ai vu ton projet — c'est super inspirant !
Si tu veux qu'on discute, je suis dispo : {{portfolioLink}}`,
    variables: ['firstName', 'portfolioLink']
  },
  {
    name: 'B2B — Follow-up J+7',
    type: 'b2b-email',
    subject: 'Re: Partenariat — {{company}}',
    body: `Hello {{firstName}},

Je remonte mon dernier email — pas sûr qu'il soit passé.
Toujours partant pour discuter d'une collab ? Réponse en 2 mots me suffit ({{calendarLink}}).

Bonne journée,
{{senderName}}`,
    variables: ['firstName', 'company', 'senderName', 'calendarLink']
  },
  {
    name: 'Welcome — Newsletter',
    type: 'welcome',
    subject: 'Bienvenue {{firstName}} !',
    body: `Hello {{firstName}},

Merci de rejoindre la newsletter !
Tu recevras 1 mail par mois avec les meilleurs contenus.

À très vite,
{{senderName}}`,
    variables: ['firstName', 'senderName']
  },
  {
    name: 'Transactionnel — Confirmation commande',
    type: 'transactional',
    subject: 'Ta commande {{orderNumber}} est confirmée',
    body: `Bonjour {{firstName}},

Ta commande #{{orderNumber}} d'un montant de {{amount}} € est confirmée.

📦 Suivi : {{trackingUrl}}
📧 Support : {{supportEmail}}

Merci pour ta confiance !`,
    variables: ['firstName', 'orderNumber', 'amount', 'trackingUrl', 'supportEmail']
  }
];

export async function POST(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug: orgSlug } = await params;
  try { await requireOrgMember(orgSlug, ['owner', 'admin']); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 403 }); }

  const tenantDb = await getTenantPrisma(orgSlug);
  let created = 0;
  let skipped = 0;
  for (const t of SEEDS) {
    const existing = await (tenantDb as any).emailTemplate.findFirst({ where: { name: t.name } }).catch(() => null);
    if (existing) { skipped++; continue; }
    await (tenantDb as any).emailTemplate.create({ data: t }).catch(() => null);
    created++;
  }
  return NextResponse.json({ ok: true, created, skipped, total: SEEDS.length });
}

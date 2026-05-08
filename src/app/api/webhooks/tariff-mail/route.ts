import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ingestTariffFile } from '@/lib/tariff-ingestor';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

/**
 * POST /api/webhooks/tariff-mail
 *
 * Webhook pour ingestion de tarifs reçus par mail.
 * Compatible Resend Inbound (https://resend.com/docs/dashboard/webhooks/introduction)
 * ou n'importe quel service mail-to-webhook.
 *
 * Sécurité : header X-Webhook-Secret obligatoire (env TARIFF_MAIL_SECRET).
 *
 * Format attendu :
 *   {
 *     "from": "fournisseur@example.com",
 *     "subject": "Tarif Sigma 2026-05",
 *     "attachments": [{ "filename": "tarif.csv", "content": "base64..." }]
 *   }
 *
 * Logique : on cherche une TariffSource type=mail dont fromAddress matche le `from`,
 * et on ingère chaque pièce jointe parsable.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TARIFF_MAIL_SECRET || '';
  const provided = req.headers.get('x-webhook-secret') || '';
  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }

  const fromAddress = String(body.from || '').toLowerCase().trim();
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (!fromAddress) return NextResponse.json({ error: 'from manquant' }, { status: 400 });
  if (attachments.length === 0) return NextResponse.json({ error: 'aucune pièce jointe' }, { status: 400 });

  // Cherche une TariffSource type=mail qui matche
  const sources = await prisma.tariffSource.findMany({ where: { type: 'mail', active: true } });
  const matching = sources.find((s) => {
    const cfg = s.config as { fromAddress?: string; fromDomain?: string };
    if (cfg.fromAddress && fromAddress === cfg.fromAddress.toLowerCase()) return true;
    if (cfg.fromDomain && fromAddress.endsWith('@' + cfg.fromDomain.toLowerCase())) return true;
    return false;
  });

  if (!matching) {
    return NextResponse.json({
      error: 'aucune TariffSource type=mail ne matche',
      from: fromAddress,
      hint: 'configure une source dans /admin/tariffs avec fromAddress ou fromDomain',
    }, { status: 404 });
  }

  // Ingère chaque pièce jointe parsable (.csv/.xml/.json/.tsv)
  const results = [];
  for (const att of attachments) {
    const fileName = String(att.filename || 'attachment');
    if (!/\.(csv|tsv|xml|json|txt)$/i.test(fileName)) {
      results.push({ fileName, skipped: 'extension non supportée' });
      continue;
    }
    let content: string;
    if (typeof att.content === 'string') {
      // Si base64, décode
      try {
        content = Buffer.from(att.content, 'base64').toString('utf-8');
      } catch {
        content = att.content;
      }
    } else {
      results.push({ fileName, skipped: 'content invalide' });
      continue;
    }

    try {
      const r = await ingestTariffFile({
        sourceId: matching.id,
        fileName,
        fileContent: content,
        trigger: 'webhook',
      });
      results.push({ fileName, ...r });
    } catch (e: any) {
      results.push({ fileName, error: e?.message || 'crash' });
    }
  }

  return NextResponse.json({ ok: true, sourceId: matching.id, results });
}

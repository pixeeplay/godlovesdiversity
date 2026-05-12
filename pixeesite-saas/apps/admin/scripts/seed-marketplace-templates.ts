/**
 * Phase 20 — Seed Marketplace Templates (CLI entrypoint)
 *
 * Upserts the 11 themed marketplace templates from `src/lib/marketplace-templates-seed.ts`
 * into the platform DB (Template model).
 *
 * Idempotent: rerunnable safely. Same logic as POST /api/admin/seed-marketplace-templates.
 *
 * Usage:
 *   pnpm --filter @pixeesite/admin exec tsx scripts/seed-marketplace-templates.ts
 *   pnpm --filter @pixeesite/admin exec ts-node scripts/seed-marketplace-templates.ts
 */
import { seedMarketplaceTemplates } from '../src/lib/marketplace-templates-seed';

async function main() {
  const report = await seedMarketplaceTemplates();
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) {
    // eslint-disable-next-line no-console
    console.error('Seed completed with errors.');
    process.exit(1);
  }
  // eslint-disable-next-line no-console
  console.log(
    `\n✅ Done · ${report.created} created · ${report.updated} updated · ${report.total} total templates.`
  );
  process.exit(0);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Fatal seed error:', e);
  process.exit(1);
});

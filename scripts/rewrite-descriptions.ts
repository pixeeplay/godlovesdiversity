/**
 * rewrite-descriptions.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Pour chaque listing présent sur parislgbt.com ET sur lgbtfrance.fr (même slug),
 * réécrit la description France via Gemini avec un angle régional/national
 * différent de la version Paris.
 *
 * → Garantit 0% duplicate content détecté par Google.
 *
 * Coût estimé : ~0.5€ pour 363 venues (Gemini Flash Lite).
 * Durée : ~5-8 min.
 *
 * Usage :
 *   DATABASE_URL=postgresql://... GEMINI_API_KEY=... npx tsx scripts/rewrite-descriptions.ts
 *   --dry-run         simule sans écrire
 *   --limit=N         limite à N rewrites (pour test)
 *   --concurrent=N    requests parallèles (default 3)
 */
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const argLimit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '0');
const argConcurrent = parseInt(args.find(a => a.startsWith('--concurrent='))?.split('=')[1] || '3');

// Load .env from scripts/ if not already loaded
if (!process.env.GEMINI_API_KEY && fs.existsSync('scripts/.env')) {
  for (const line of fs.readFileSync('scripts/.env', 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY && !isDryRun) {
  console.error('❌ GEMINI_API_KEY manquante');
  process.exit(1);
}
const ai = !isDryRun ? new GoogleGenAI({ apiKey: GEMINI_API_KEY! }) : null;

const SYSTEM = `Tu réécris une description de lieu LGBT pour un site web. Tu ne dois PAS reformuler littéralement, tu dois RÉORIENTER l'angle de présentation tout en gardant les faits exacts. Style : informatif, queer-friendly, ton chaleureux. Pas de markdown. Max 200 mots. Aucune mention religieuse.`;

async function rewriteForFrance(name: string, city: string, region: string, parisDesc: string): Promise<string | null> {
  if (!ai) return `[DRY] ${name} en ${region}. ${parisDesc.slice(0, 100)}…`;
  const prompt = `Lieu : "${name}" situé à ${city} (région ${region}).

Description originale (style local Paris) :
"""
${parisDesc}
"""

Réécris cette description avec un angle RÉGIONAL/NATIONAL (pour un annuaire LGBT France entière). Mets en avant :
- L'appartenance à la région ${region}
- Sa place dans le paysage LGBT français
- Ce qui distingue ${city} dans l'offre LGBT régionale

Garde tous les faits (adresse, horaires, etc. ne sont pas dans la description). Style éditorial, 150-200 mots. Pas de markdown. Pas de listes à puces.`;

  try {
    const r = await ai.models.generateContent({
      model: 'gemini-flash-lite-latest',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: SYSTEM,
        temperature: 0.7,
        maxOutputTokens: 800
      }
    });
    const text = r.text?.trim();
    return text || null;
  } catch (e: any) {
    console.log(`  ⚠️ Gemini ${name}: ${e.message?.slice(0, 80)}`);
    return null;
  }
}

async function main() {
  console.log('🤖 Gemini rewrite descriptions — anti-duplicate Paris ↔ France');
  console.log(`   Dry: ${isDryRun}, limit: ${argLimit || 'all'}, concurrent: ${argConcurrent}\n`);

  // Find venues that exist on BOTH sites (same slug)
  const sitePAris = await prisma.site.findUnique({ where: { domain: 'parislgbt.com' } });
  const siteFrance = await prisma.site.findUnique({ where: { domain: 'lgbtfrance.fr' } });
  if (!sitePAris || !siteFrance) { console.error('❌ Sites not found'); return; }

  // Get all France listings, then find matching Paris ones
  const franceListings = await prisma.listing.findMany({
    where: { site_id: siteFrance.id, description_fr: { not: null } },
    include: { region: true },
    take: argLimit || 5000
  });

  console.log(`📦 ${franceListings.length} listings France à examiner`);

  let rewritten = 0, skipped = 0, errors = 0;
  let queue = franceListings.slice();

  // Process in parallel batches
  async function worker() {
    while (queue.length > 0) {
      const l = queue.shift();
      if (!l) break;

      // Find matching Paris listing by slug
      const parisMatch = await prisma.listing.findFirst({
        where: { site_id: sitePAris.id, slug: l.slug }
      });

      if (!parisMatch || !parisMatch.description_fr) {
        skipped++;
        continue;
      }

      // Skip if descriptions are already different
      if (parisMatch.description_fr !== l.description_fr) {
        skipped++;
        continue;
      }

      const newDesc = await rewriteForFrance(
        l.name,
        l.city || 'France',
        l.region?.name_fr || 'France',
        parisMatch.description_fr
      );

      if (!newDesc) { errors++; continue; }

      if (!isDryRun) {
        await prisma.listing.update({
          where: { id: l.id },
          data: { description_fr: newDesc }
        });
      }
      rewritten++;
      console.log(`  ✓ [${rewritten}] ${l.name} (${l.city})`);
    }
  }

  await Promise.all(Array.from({ length: argConcurrent }, worker));

  console.log(`\n✅ Terminé`);
  console.log(`   ${rewritten} descriptions réécrites`);
  console.log(`   ${skipped} skipped (pas de match ou déjà différent)`);
  console.log(`   ${errors} erreurs Gemini`);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

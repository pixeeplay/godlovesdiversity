import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/establishments/import
 * Body: { csv: string }
 * Format CSV : name,city,country,address,phone,website,email,description,categories
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || !['ADMIN', 'EDITOR'].includes((s.user as any).role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { csv } = await req.json();
  if (!csv || typeof csv !== 'string') return NextResponse.json({ error: 'csv vide' }, { status: 400 });

  const lines = csv.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return NextResponse.json({ error: 'CSV doit contenir au moins 1 header + 1 ligne' }, { status: 400 });

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows = lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = cells[i]?.trim() || null; });
    return obj;
  });

  let created = 0;
  let skipped = 0;
  for (const r of rows) {
    if (!r.name) { skipped++; continue; }
    const slug = slugify(r.name);
    try {
      const exists = await prisma.venue.findUnique({ where: { slug } }).catch(() => null);
      if (exists) { skipped++; continue; }
      await prisma.venue.create({
        data: {
          name: r.name,
          slug,
          city: r.city || null,
          country: r.country || 'FR',
          address: r.address || null,
          phone: r.phone || null,
          website: r.website || null,
          email: r.email || null,
          description: r.description || null,
          categories: r.categories ? r.categories.split('|').map((c: string) => c.trim()) : [],
          published: true
        }
      });
      created++;
    } catch (e) { skipped++; }
  }

  return NextResponse.json({ ok: true, created, skipped, total: rows.length });
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"' && !inQuotes) { inQuotes = true; continue; }
    if (ch === '"' && inQuotes) { inQuotes = false; continue; }
    if (ch === ',' && !inQuotes) { result.push(current); current = ''; continue; }
    current += ch;
  }
  result.push(current);
  return result;
}

function slugify(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + Math.random().toString(36).slice(2, 5);
}

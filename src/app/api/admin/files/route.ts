import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Quick file editor — ADMIN-only, accès limité au cwd de l'app.
 *
 * GET  /api/admin/files?path=src/components/Navbar.tsx
 * PUT  /api/admin/files  body: { path, content }
 *
 * Sécurité :
 *   - Path traversal bloqué (resolve + check préfixe)
 *   - Pas de lecture en dehors du cwd (root du projet)
 *   - Pas de fichiers > 5 MB
 *   - Whitelist d'extensions éditables
 */

const ROOT = process.cwd();
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.mdx', '.txt',
  '.css', '.scss', '.html', '.svg', '.yml', '.yaml', '.toml',
  '.env.example', '.gitignore', '.prisma', '.config.js', '.config.ts'
]);

async function requireAdmin() {
  const s = await getServerSession(authOptions);
  if (!s) return null;
  if ((s.user as any)?.role !== 'ADMIN') return null;
  return s;
}

function safePath(rel: string): string | null {
  if (!rel || typeof rel !== 'string') return null;
  // Bloque les chemins absolus et les escapes
  if (rel.startsWith('/') || rel.startsWith('~') || rel.includes('..')) return null;
  const abs = path.resolve(ROOT, rel);
  if (!abs.startsWith(ROOT + path.sep) && abs !== ROOT) return null;
  return abs;
}

function isExtAllowed(filePath: string): boolean {
  const base = path.basename(filePath);
  const ext = path.extname(filePath).toLowerCase();
  if (ALLOWED_EXTS.has(ext)) return true;
  // Quelques fichiers sans extension OK
  if (['.gitignore', '.dockerignore', 'Dockerfile', 'README', 'LICENSE'].some((n) => base === n)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const rel = url.searchParams.get('path');
  const abs = rel ? safePath(rel) : null;
  if (!abs) return NextResponse.json({ error: 'invalid-path' }, { status: 400 });

  try {
    const stat = await fs.stat(abs);
    if (stat.size > MAX_BYTES) {
      return NextResponse.json({ error: 'file-too-large', sizeBytes: stat.size, limit: MAX_BYTES }, { status: 413 });
    }
    if (stat.isDirectory()) {
      // Liste le contenu
      const entries = await fs.readdir(abs, { withFileTypes: true });
      return NextResponse.json({
        ok: true, isDir: true,
        entries: entries.map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }))
      });
    }
    if (!isExtAllowed(abs)) {
      return NextResponse.json({ error: 'ext-not-allowed', detail: 'Type de fichier non éditable via Quick Editor.' }, { status: 415 });
    }
    const content = await fs.readFile(abs, 'utf-8');
    return NextResponse.json({ ok: true, path: rel, content, sizeBytes: stat.size });
  } catch (e: any) {
    return NextResponse.json({ error: 'read-failed', detail: e?.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const s = await requireAdmin();
  if (!s) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const rel = body?.path;
  const content = body?.content;
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content-required' }, { status: 400 });
  }
  if (content.length > MAX_BYTES) {
    return NextResponse.json({ error: 'content-too-large' }, { status: 413 });
  }
  const abs = rel ? safePath(rel) : null;
  if (!abs) return NextResponse.json({ error: 'invalid-path' }, { status: 400 });
  if (!isExtAllowed(abs)) {
    return NextResponse.json({ error: 'ext-not-allowed' }, { status: 415 });
  }

  try {
    // Crée les dossiers parents si besoin
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf-8');
    return NextResponse.json({ ok: true, path: rel, bytes: content.length });
  } catch (e: any) {
    return NextResponse.json({ error: 'write-failed', detail: e?.message }, { status: 500 });
  }
}

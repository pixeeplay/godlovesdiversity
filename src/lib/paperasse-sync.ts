/**
 * paperasse-sync — importe les skills "paperasse" (https://github.com/romainsimon/paperasse)
 * dans le RAG GLD pour transformer le chat en assistant juridique français.
 *
 * Source : 6 skills MIT-licensed (comptable, notaire, fiscaliste, contrôleur fiscal, CAC, syndic)
 *          + leurs fichiers references/*.md.
 *
 * Stratégie :
 *   1. List les fichiers .md du repo via GitHub Trees API (récursif)
 *   2. Pull chaque fichier via raw.githubusercontent.com (cap à 1.5 Mo / fichier)
 *   3. Ingère dans le RAG via ingestDocument() avec :
 *      - source = "paperasse://{skill}/{path}"
 *      - tags   = ["paperasse", skill, "fr-juridique"]
 *      - locale = "fr"
 *   4. Skip les fichiers déjà ingérés (compare hash) → idempotent
 *
 * Usage :
 *   const r = await syncPaperasse({ skills: ['comptable', 'notaire'] });
 *   → { totalFiles, ingested, skipped, errors }
 */

import { prisma } from './prisma';
import { ingestDocument } from './rag';

const REPO = 'romainsimon/paperasse';
const BRANCH = 'master';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}`;
const TREES_API = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;

export const PAPERASSE_SKILLS = ['comptable', 'notaire', 'fiscaliste', 'controleur-fiscal', 'commissaire-aux-comptes', 'syndic'] as const;
export type PaperasseSkill = typeof PAPERASSE_SKILLS[number];

export type PaperasseSyncResult = {
  totalFiles: number;
  ingested: number;
  skipped: number;
  errors: { file: string; message: string }[];
  perSkill: Record<string, { ingested: number; skipped: number }>;
};

type GitHubTreeEntry = { path: string; type: 'blob' | 'tree'; sha: string; size?: number };

async function fetchTree(): Promise<GitHubTreeEntry[]> {
  const r = await fetch(TREES_API, {
    headers: { 'User-Agent': 'GLD-Paperasse-Sync/1.0', Accept: 'application/vnd.github.v3+json' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`GitHub Trees API HTTP ${r.status}`);
  const j = await r.json();
  return (j.tree || []).filter((x: GitHubTreeEntry) => x.type === 'blob');
}

async function fetchRaw(path: string): Promise<string> {
  const r = await fetch(`${RAW_BASE}/${path}`, {
    headers: { 'User-Agent': 'GLD-Paperasse-Sync/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) throw new Error(`Raw HTTP ${r.status} sur ${path}`);
  return r.text();
}

function detectSkill(path: string): PaperasseSkill | null {
  const top = path.split('/')[0];
  return (PAPERASSE_SKILLS as readonly string[]).includes(top) ? (top as PaperasseSkill) : null;
}

/** Heuristique : ne garde que les .md/.json utiles, vire les evals/files (datasets de test). */
function shouldIngest(path: string): boolean {
  if (!/\.(md|json)$/i.test(path)) return false;
  if (path.endsWith('SKILL.md')) return true;
  if (path.includes('/references/') && path.endsWith('.md')) return true;
  if (path.includes('/data/') && path.endsWith('.json') && !path.includes('/files/')) return true;
  return false;
}

/**
 * Sync principal. Idempotent : skip les fichiers déjà ingérés (par source).
 */
export async function syncPaperasse(opts: { skills?: PaperasseSkill[]; force?: boolean } = {}): Promise<PaperasseSyncResult> {
  const tree = await fetchTree();
  const targetSkills = opts.skills && opts.skills.length > 0 ? opts.skills : PAPERASSE_SKILLS;

  const candidates = tree
    .filter((e) => shouldIngest(e.path))
    .filter((e) => {
      const skill = detectSkill(e.path);
      return skill !== null && targetSkills.includes(skill);
    })
    .filter((e) => (e.size ?? 0) < 1_500_000); // skip > 1.5 Mo

  const result: PaperasseSyncResult = {
    totalFiles: candidates.length,
    ingested: 0,
    skipped: 0,
    errors: [],
    perSkill: {},
  };

  for (const entry of candidates) {
    const skill = detectSkill(entry.path)!;
    const source = `paperasse://${entry.path}`;

    if (!result.perSkill[skill]) result.perSkill[skill] = { ingested: 0, skipped: 0 };

    // Idempotence : si le doc existe déjà avec ce source, skip (sauf force)
    if (!opts.force) {
      const exists = await prisma.knowledgeDoc.findFirst({ where: { source } });
      if (exists) {
        result.skipped++;
        result.perSkill[skill].skipped++;
        continue;
      }
    } else {
      // Force : supprime l'ancien d'abord
      await prisma.knowledgeDoc.deleteMany({ where: { source } });
    }

    try {
      const content = await fetchRaw(entry.path);
      if (content.length < 100) {
        result.errors.push({ file: entry.path, message: 'fichier trop court' });
        continue;
      }

      // Titre = nom de fichier ou extrait du H1 du markdown
      const h1 = content.match(/^#\s+(.+)$/m);
      const baseName = entry.path.split('/').pop()!.replace(/\.(md|json)$/, '');
      const title = h1 ? h1[1].trim() : `${skill} · ${baseName}`;

      await ingestDocument({
        title: `[Paperasse / ${skill}] ${title}`,
        content,
        source,
        sourceType: 'url' as any,
        author: 'romainsimon/paperasse (MIT)',
        tags: ['paperasse', skill, 'fr-juridique', 'bureaucratie-fr'],
        locale: 'fr',
      });

      result.ingested++;
      result.perSkill[skill].ingested++;
    } catch (e: any) {
      result.errors.push({ file: entry.path, message: e?.message || 'crash' });
    }
  }

  return result;
}

/** Lit l'état actuel : combien de docs paperasse sont déjà ingérés, par skill. */
export async function getPaperasseStatus(): Promise<{
  total: number;
  perSkill: Record<string, { count: number; lastIngestedAt: string | null }>;
}> {
  const docs = await prisma.knowledgeDoc.findMany({
    where: { source: { startsWith: 'paperasse://' } },
    select: { source: true, createdAt: true },
  });
  const perSkill: Record<string, { count: number; lastIngestedAt: string | null }> = {};
  for (const skill of PAPERASSE_SKILLS) perSkill[skill] = { count: 0, lastIngestedAt: null };
  for (const d of docs) {
    const path = d.source!.replace('paperasse://', '');
    const skill = detectSkill(path);
    if (!skill) continue;
    perSkill[skill].count++;
    if (!perSkill[skill].lastIngestedAt || d.createdAt > new Date(perSkill[skill].lastIngestedAt!)) {
      perSkill[skill].lastIngestedAt = d.createdAt.toISOString();
    }
  }
  return { total: docs.length, perSkill };
}

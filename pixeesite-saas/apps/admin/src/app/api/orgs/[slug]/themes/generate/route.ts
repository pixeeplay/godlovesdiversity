import { NextRequest, NextResponse } from 'next/server';
import { getTenantPrisma } from '@pixeesite/database';
import { requireOrgMember } from '@/lib/auth-helpers';
import { aiText } from '@/lib/ai-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function slugify(s: string) {
  return (s || 'theme').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'theme';
}

/**
 * POST /api/orgs/[slug]/themes/generate
 * Body: { prompt, save? }
 * Génère un thème via IA (Gemini par défaut). Si save=true → enregistre en DB.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let auth;
  try { auth = await requireOrgMember(slug, ['owner', 'admin', 'editor']); } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 403 });
  }
  try {
    const { prompt, save } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'prompt requis' }, { status: 400 });

    const systemPrompt = `Tu génères un thème visuel complet pour le site d'une organisation.
L'utilisateur décrit l'ambiance souhaitée : "${prompt}"

Tu réponds STRICTEMENT en JSON valide (commence par "{", finit par "}"), avec cette structure :
{
  "slug": "kebab-case-court",
  "name": "Nom court avec emoji",
  "description": "Phrase courte (≤120 chars)",
  "season": "spring" | "summer" | "autumn" | "winter" | null,
  "mood": "festif" | "calme" | "mystique" | "energique" | "romantique" | "solennel" | "joyeux",
  "palette": {
    "primary":   "#hex",
    "secondary": "#hex",
    "accent":    "#hex",
    "bg":        "#hex",
    "fg":        "#hex"
  },
  "fonts": { "heading": "Nom Google Font", "body": "Inter" },
  "blocks": {
    "snow": false, "hearts": false, "confetti": false, "petals": false,
    "fireworks": false, "bubbles": false, "leaves": false, "stars": false,
    "pumpkins": false, "eggs": false, "lanterns": false, "diamonds": false,
    "rainbow": false
  }
}

RÈGLES :
- Choisis 5 couleurs cohérentes et harmoniques.
- Active 1-3 blocks max qui collent à l'ambiance.
- Le bg doit avoir un bon contraste avec fg (WCAG AA).
- Le slug doit être unique et descriptif.
- N'INCLUS PAS de markdown — juste l'objet JSON brut.`;

    const result = await aiText(auth.membership.org.id, 'Génère le thème maintenant.', { systemPrompt });
    if (!result.ok) return NextResponse.json({ error: result.error || 'IA indisponible' }, { status: 500 });

    let theme: any;
    try {
      const cleaned = result.output.trim().replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
      theme = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: 'IA n\'a pas renvoyé un JSON valide', raw: result.output }, { status: 500 });
    }

    if (save) {
      const db = await getTenantPrisma(slug);
      const baseSlug = slugify(theme.slug || theme.name || 'ai');
      const finalSlug = `${baseSlug}-${Date.now().toString(36)}`;
      const created = await (db as any).theme.create({
        data: {
          slug: finalSlug,
          name: theme.name || 'Thème IA',
          season: theme.season || null,
          palette: theme.palette || {},
          fonts: theme.fonts || null,
          blocks: theme.blocks || null,
          active: false,
        },
      });
      return NextResponse.json({ ok: true, saved: true, theme: created, suggestion: theme });
    }

    return NextResponse.json({ ok: true, theme });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

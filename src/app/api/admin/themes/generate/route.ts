import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateText } from '@/lib/gemini';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * POST /api/admin/themes/generate
 * Body : { prompt, save?: boolean }
 *
 * Génère un thème complet (couleurs + animations + CSS + musique suggérée)
 * via Gemini, à partir d'une description en langage naturel.
 *
 * Si save === true, crée le thème en DB. Sinon retourne juste le JSON pour preview.
 */
export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const { prompt, save } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'prompt requis' }, { status: 400 });

    const sys = `Tu génères un thème visuel complet pour le site GLD (parislgbt, mouvement LGBT+ inclusif).
L'utilisateur décrit l'ambiance souhaitée : "${prompt}"

Tu réponds STRICTEMENT en JSON valide (commence par "{", finit par "}"), avec cette structure :
{
  "slug": "kebab-case-court (ex: aurora-dreams)",
  "name": "Nom court avec emoji (ex: 🌌 Aurore boréale)",
  "description": "Phrase courte qui décrit l'ambiance (≤120 chars)",
  "category": "aesthetic" | "holiday" | "religious" | "national" | "seasonal",
  "mood": "festif" | "calme" | "mystique" | "energique" | "romantique" | "solennel" | "joyeux",
  "colors": {
    "primary":   "#hex (couleur dominante d'accent)",
    "secondary": "#hex (couleur secondaire harmonique)",
    "accent":    "#hex (couleur d'éclat/contraste)",
    "bg":        "#hex (fond principal, généralement sombre #0a0a14 ou clair #fafafa)",
    "fg":        "#hex (texte principal)"
  },
  "decorations": {
    "snow": false, "hearts": false, "confetti": false, "petals": false,
    "fireworks": false, "bubbles": false, "leaves": false, "stars": false,
    "pumpkins": false, "eggs": false, "lanterns": false, "diamonds": false,
    "rainbow": false
  },
  "customCss": "CSS additionnel (optionnel) — ex: 'body { background: linear-gradient(135deg,#x,#y); }'. Évite la complexité, max 500 chars.",
  "musicSuggestion": "Description courte du genre de musique adapté (sans URL — l'admin ajoutera l'URL)",
  "musicVolume": 0.3
}

RÈGLES :
- Choisis 5 couleurs cohérentes et harmoniques (utilise principes designs : analogues, complémentaires, triadiques)
- Active 1-3 décorations max qui collent à l'ambiance
- Le bg doit avoir un bon contraste avec fg (test WCAG AA mentalement)
- Le slug doit être unique et descriptif
- N'INCLUS PAS de markdown (\`\`\`json) — juste l'objet JSON brut`;

    const { text } = await generateText('Génère le thème maintenant.', sys);
    let theme: any;
    try {
      const cleaned = text.trim().replace(/^```json?\s*/i, '').replace(/```$/, '').trim();
      theme = JSON.parse(cleaned);
    } catch (e: any) {
      return NextResponse.json({ error: 'IA n\'a pas renvoyé un JSON valide', raw: text }, { status: 500 });
    }

    if (save) {
      try {
        const created = await prisma.theme.create({
          data: {
            slug: `${theme.slug}-${Date.now().toString(36)}`,
            name: theme.name,
            description: theme.description,
            category: theme.category || 'aesthetic',
            colors: theme.colors,
            decorations: theme.decorations,
            customCss: theme.customCss || null,
            mood: theme.mood,
            musicVolume: theme.musicVolume ?? 0.3,
            autoActivate: false,
            daysBefore: 0,
            durationDays: 0
          }
        });
        return NextResponse.json({ ok: true, saved: true, theme: created, suggestion: theme });
      } catch (e: any) {
        return NextResponse.json({ ok: true, saved: false, theme, error: e?.message });
      }
    }

    return NextResponse.json({ ok: true, theme });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

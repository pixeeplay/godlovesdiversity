import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { WEBCAM_SOURCES } from '@/lib/webcam-sources';
import { resolveChannelLive, resolveVideoLive } from '@/lib/webcam-resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 120;

/**
 * Agent webcams — appelé périodiquement par Coolify (toutes les 6h).
 *
 * Ce que ça fait :
 *  1. Vérifie que toutes les sources connues (statiques + DB) sont encore live.
 *     - Met à jour lastVerifiedAt, lastLive, liveCount, failCount.
 *     - Désactive si failCount > 30 (grosso modo > 1 semaine d'échecs).
 *  2. Demande à Gemini (avec Google Search grounding) de découvrir de nouvelles
 *     webcams live de lieux saints inclusifs. Parse la réponse JSON.
 *  3. Tente de résoudre chaque candidat → si live, l'ajoute en DB.
 *
 * Auth : header `x-cron-secret` doit matcher CRON_SECRET (configurable Coolify).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret');
  if (secret && provided !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  const log: string[] = [];

  // ────── 1. Sync sources statiques → DB
  for (const src of WEBCAM_SOURCES) {
    await prisma.webcamSource.upsert({
      where: { slug: src.id },
      update: {
        name: src.name,
        city: src.city,
        country: src.country,
        faith: src.faith,
        emoji: src.emoji,
        description: src.description,
        channelId: src.channelId,
        videoId: src.videoId,
        externalUrl: src.externalUrl,
        schedule: src.schedule,
        inclusive: src.inclusive ?? false
      },
      create: {
        slug: src.id,
        name: src.name,
        city: src.city,
        country: src.country,
        faith: src.faith,
        emoji: src.emoji,
        description: src.description,
        channelId: src.channelId,
        videoId: src.videoId,
        externalUrl: src.externalUrl,
        schedule: src.schedule,
        inclusive: src.inclusive ?? false,
        discoveredBy: 'manual'
      }
    });
  }
  log.push(`✓ Sync statiques : ${WEBCAM_SOURCES.length} sources`);

  // ────── 2. Vérification live de TOUTES les sources actives en DB
  const allActive = await prisma.webcamSource.findMany({ where: { active: true } });
  let liveCount = 0;
  let offlineCount = 0;
  let disabledCount = 0;

  await Promise.all(
    allActive.map(async (src) => {
      const live =
        src.videoId
          ? await resolveVideoLive(src.videoId, { force: true })
          : src.channelId
          ? await resolveChannelLive(src.channelId, { force: true })
          : { videoId: null, isLive: false, resolvedAt: Date.now() };

      const newFailCount = live.isLive ? 0 : (src.failCount || 0) + 1;
      const shouldDisable = newFailCount > 30; // ~1 semaine d'échecs si toutes les 6h

      await prisma.webcamSource.update({
        where: { id: src.id },
        data: {
          lastVerifiedAt: new Date(),
          lastLive: live.isLive,
          lastVideoId: live.videoId,
          liveCount: live.isLive ? src.liveCount + 1 : src.liveCount,
          failCount: newFailCount,
          ...(shouldDisable && !src.reportedDeadAt
            ? { active: false, reportedDeadAt: new Date() }
            : {})
        }
      });

      if (live.isLive) liveCount++;
      else offlineCount++;
      if (shouldDisable) disabledCount++;
    })
  );
  log.push(`✓ Vérifié ${allActive.length} sources : ${liveCount} live, ${offlineCount} offline, ${disabledCount} désactivées`);

  // ────── 3. Découverte Gemini de nouvelles sources
  let added = 0;
  if (process.env.GEMINI_API_KEY) {
    try {
      const known = (await prisma.webcamSource.findMany({ select: { name: true, city: true, channelId: true } }))
        .map(s => `${s.name} (${s.city}) [${s.channelId || 'no-yt'}]`).join('\n');

      const prompt = `Tu es un agent de veille pour la plateforme parislgbt (lieux saints inclusifs / LGBT-friendly).

OBJECTIF : trouver des webcams live YouTube de lieux saints, sanctuaires, basiliques, mosquées, synagogues, temples bouddhistes/hindous/sikhs qui :
- Diffusent réellement en LIVE (24/7 idéalement, ou aux heures d'office)
- Sont des lieux RÉPUTÉS (pas de chaîne perso obscure)
- Sont si possible LGBT-friendly ou neutres (priorité)

Tu connais déjà ces sources :
${known.slice(0, 3000)}

Cherche sur le web 5 à 10 NOUVELLES webcams live YouTube non listées ci-dessus. Pour chacune, donne le channelId YouTube (UCxxx) si tu peux le trouver (sinon, ignore-la).

Réponds UNIQUEMENT en JSON valide, format :
{
  "candidates": [
    {
      "slug": "kebab-case-id",
      "name": "Nom du lieu",
      "city": "Ville",
      "country": "code ISO 2",
      "category": "pride|place|venue|event",
      "emoji": "✝️",
      "description": "1 phrase courte",
      "channelId": "UCxxxxxxxxxxxxxxxxxxxxxx",
      "externalUrl": "https://...",
      "schedule": "Heures d'office",
      "inclusive": true
    }
  ]
}

Pas de texte autour, juste le JSON.`;

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
          }),
          signal: AbortSignal.timeout(60_000)
        }
      );

      if (r.ok) {
        const j: any = await r.json();
        const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('\n') || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const candidates = parsed.candidates || [];
          log.push(`✓ Gemini a proposé ${candidates.length} candidats`);

          for (const cand of candidates) {
            if (!cand.channelId || !cand.slug) continue;
            // Vérifie qu'il n'existe pas déjà
            const exists = await prisma.webcamSource.findFirst({
              where: { OR: [{ slug: cand.slug }, { channelId: cand.channelId }] }
            });
            if (exists) continue;

            // Vérifie que la chaîne est vraiment live MAINTENANT (sinon on note quand même mais inactive)
            const live = await resolveChannelLive(cand.channelId, { force: true });

            await prisma.webcamSource.create({
              data: {
                slug: cand.slug,
                name: cand.name || cand.slug,
                city: cand.city || '?',
                country: (cand.country || '??').toUpperCase().slice(0, 2),
                faith: ['pride','place','venue','event'].includes(cand.category) ? cand.category : 'place',
                emoji: cand.emoji || '⛪',
                description: cand.description?.slice(0, 500) || null,
                channelId: cand.channelId,
                externalUrl: cand.externalUrl,
                schedule: cand.schedule?.slice(0, 200) || null,
                inclusive: !!cand.inclusive,
                active: live.isLive, // n'active que si live confirmé
                lastVerifiedAt: new Date(),
                lastLive: live.isLive,
                lastVideoId: live.videoId,
                discoveredBy: 'ai-cron',
                liveCount: live.isLive ? 1 : 0,
                failCount: live.isLive ? 0 : 1
              }
            });
            added++;
          }
        }
      } else {
        log.push(`✗ Gemini HTTP ${r.status}`);
      }
    } catch (e: any) {
      log.push(`✗ Discovery error: ${e?.message || 'unknown'}`);
    }
  } else {
    log.push('✗ GEMINI_API_KEY absent — découverte skippée');
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - t0,
    summary: {
      verified: allActive.length,
      live: liveCount,
      offline: offlineCount,
      disabled: disabledCount,
      newDiscovered: added
    },
    log
  });
}

export const POST = GET;

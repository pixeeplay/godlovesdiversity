import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/rapport/religious-census
 * Audit complet des lieux saints + plan implementation calendrier religieux.
 *
 * Renvoie :
 *  - Comptage des venues par type (CHURCH, TEMPLE, etc.)
 *  - Liste des lieux marqués comme saints (CHURCH/TEMPLE/MOSQUE/SYNAGOGUE)
 *  - Stats géocodage par catégorie
 *  - Evénements à venir liés à un lieu religieux
 *  - HTML page imprimable
 */

interface TypeCount { type: string; total: number; geocoded: number; samples: { name: string; city: string | null; country: string | null }[] }

async function loadCensus(): Promise<{ types: TypeCount[]; total: number; geoTotal: number; events: any[] }> {
  const p = prisma as any;
  const total = await p.venue.count().catch(() => 0);
  const geoTotal = await p.venue.count({ where: { lat: { not: null } } }).catch(() => 0);

  const grouped: any[] = await p.venue.groupBy({
    by: ['type'],
    _count: { _all: true },
    orderBy: { _count: { type: 'desc' } }
  }).catch(() => []);

  const types: TypeCount[] = [];
  for (const g of grouped) {
    const geocoded = await p.venue.count({
      where: { type: g.type, lat: { not: null } }
    }).catch(() => 0);
    const samples = await p.venue.findMany({
      where: { type: g.type, published: true },
      select: { name: true, city: true, country: true },
      take: 5,
      orderBy: { name: 'asc' }
    }).catch(() => []);
    types.push({ type: g.type, total: g._count._all, geocoded, samples });
  }

  const events = await p.event.findMany({
    where: { published: true, startsAt: { gte: new Date() } },
    orderBy: { startsAt: 'asc' },
    take: 20,
    select: { id: true, title: true, startsAt: true, location: true, city: true }
  }).catch(() => []);

  return { types, total, geoTotal, events };
}

const KNOWN_RELIGIOUS_TYPES = ['CHURCH', 'TEMPLE', 'MOSQUE', 'SYNAGOGUE', 'GURDWARA', 'MEDITATION_CENTER', 'HOLY_SITE'];

const RELIGIOUS_FESTIVALS = [
  { faith: 'Christianisme catholique', emoji: '✝️', events: ['Pâques', 'Pentecôte', 'Noël (25 déc)', 'Épiphanie (6 jan)', 'Toussaint (1 nov)', 'Carême (40j)', 'Mercredi des Cendres', 'Saint-Patrick (17 mars)', 'Assomption (15 août)', 'Avent (4 dim avant Noël)'] },
  { faith: 'Christianisme orthodoxe', emoji: '☦️', events: ['Pâques orthodoxe (date différente)', 'Théophanie (6 jan)', 'Dormition (15 août)', 'Carême oriental'] },
  { faith: 'Christianisme protestant', emoji: '✠', events: ['Pâques', 'Pentecôte', 'Noël', 'Réformation (31 oct)', 'Avent'] },
  { faith: 'Islam', emoji: '☪️', events: ['Ramadan (mois lunaire)', 'Aïd al-Fitr', 'Aïd al-Adha', 'Mawlid (naissance Prophète)', 'Achoura (10 Muharram)', 'Laylat al-Qadr (27e Ramadan)', 'Hajj (8-13 Dhul Hijjah)'] },
  { faith: 'Judaïsme', emoji: '✡️', events: ['Roch Hachana (sept/oct)', 'Yom Kippour', 'Souccot (8j)', 'Hanouka (8j déc)', 'Pourim (mars)', 'Pessa\'h (mars-avril, 7j)', 'Chavouot (50j après Pessa\'h)', 'Tisha BeAv (jeûne)'] },
  { faith: 'Bouddhisme', emoji: '☸️', events: ['Vesak (mai)', 'Asalha Puja (juillet)', 'Magha Puja (fév/mars)', 'Ulambana / Bon', 'Losar (nouvel an tibétain)'] },
  { faith: 'Hindouisme', emoji: '🕉️', events: ['Diwali (oct/nov)', 'Holi (mars)', 'Ganesh Chaturthi (sept)', 'Navratri (oct, 9 nuits)', 'Maha Shivaratri (fév/mars)', 'Krishna Janmashtami (août)', 'Raksha Bandhan', 'Kumbh Mela (tous les 3 ans)'] },
  { faith: 'Sikhisme', emoji: '☬', events: ['Vaisakhi (13/14 avril)', 'Diwali sikh', 'Guru Nanak Jayanti (nov)'] },
  { faith: 'Inter-religieux', emoji: '🌍', events: ['Journée mondiale dialogue inter-religieux (jan ONU)', 'Pride Month (juin) + foi', 'World AIDS Day (1 déc)'] }
];

function generateHtml(census: Awaited<ReturnType<typeof loadCensus>>): string {
  const date = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const religiousCount = census.types.filter(t => KNOWN_RELIGIOUS_TYPES.includes(t.type)).reduce((s, t) => s + t.total, 0);
  const otherCount = census.total - religiousCount;
  const pctGeo = Math.round((census.geoTotal / Math.max(1, census.total)) * 100);

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="theme-color" content="#0a0a0f"/>
<title>🕊 Census religieux GLD · ${census.total} lieux</title>
<meta name="robots" content="noindex"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,system-ui,sans-serif;background:#0a0a0f;color:#fafafa;line-height:1.6;padding:24px}
.container{max-width:1100px;margin:0 auto}
h1{font-size:32px}
h2{font-size:20px;margin:32px 0 12px;padding-bottom:6px;border-bottom:2px solid #d4537e}
h3{font-size:14px;color:#f0abfc;margin:14px 0 6px;text-transform:uppercase;letter-spacing:0.05em}
.live{display:inline-block;background:#064e3b;border:1px solid #10b981;color:#6ee7b7;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:bold;letter-spacing:0.08em;text-transform:uppercase}
.live::before{content:"● ";animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.hero{background:linear-gradient(135deg,#1e3a8a,#7c3aed,#ec4899);padding:32px 24px;border-radius:16px;margin-bottom:24px}
.scores{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:16px 0}
.score{background:rgba(0,0,0,0.3);border-radius:12px;padding:12px;text-align:center;backdrop-filter:blur(10px)}
.score-num{font-size:24px;font-weight:bold}
.score-lab{font-size:10px;text-transform:uppercase;opacity:0.85;letter-spacing:0.05em}
.btn{display:inline-block;background:#d4537e;color:white;padding:10px 20px;border-radius:99px;font-weight:bold;text-decoration:none;margin:4px 8px 4px 0}
.section{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:18px 22px;margin-bottom:14px}
.type-row{display:grid;grid-template-columns:auto 1fr auto auto;gap:12px;align-items:center;padding:8px 0;border-bottom:1px solid #27272a}
.type-row:last-child{border-bottom:none}
.type-name{font-weight:bold;font-size:13px}
.type-count{font-family:monospace;color:#6ee7b7;font-weight:bold}
.type-geo{font-family:monospace;color:#fbbf24;font-size:11px}
.tag{display:inline-block;font-size:9px;padding:2px 8px;border-radius:99px;font-weight:bold;letter-spacing:0.05em;text-transform:uppercase}
.tag-religious{background:#7c3aed20;color:#a78bfa}
.tag-other{background:#52525220;color:#a1a1aa}
.samples{font-size:11px;color:#a1a1aa;margin-top:4px;padding-left:0}
.samples span{display:inline-block;background:#27272a;padding:2px 8px;border-radius:99px;margin-right:4px;margin-top:2px;font-size:10px}
.faith-card{background:#18181b;border:1px solid #27272a;border-radius:12px;padding:14px 18px;margin-bottom:8px}
.faith-emoji{font-size:24px;margin-right:8px;vertical-align:middle}
.faith-events{font-size:12px;color:#a1a1aa;margin-top:6px;display:flex;flex-wrap:wrap;gap:6px}
.faith-events span{background:#27272a;padding:3px 9px;border-radius:99px;font-size:11px}
.action{padding:8px 12px;border-left:3px solid #d4537e;margin:6px 0;background:#18181b;border-radius:0 6px 6px 0;font-size:13px}
.footer{text-align:center;color:#71717a;font-size:11px;margin-top:32px;padding-top:16px;border-top:1px solid #27272a}
@media print{body{background:white;color:black}.section{background:#fff;border-color:#ccc}}
</style></head><body><div class="container">

<div class="hero">
  <div style="margin-bottom:12px"><span class="live">Live · ${date}</span></div>
  <h1>🕊 Census religieux GLD</h1>
  <p style="font-size:14px;opacity:0.95;margin-top:8px">Inventaire des lieux saints répertoriés + calendrier des fêtes religieuses mondiales.</p>
  <div class="scores">
    <div class="score"><div class="score-num">${census.total}</div><div class="score-lab">Lieux total</div></div>
    <div class="score" style="color:#a78bfa"><div class="score-num">${religiousCount}</div><div class="score-lab">🕊 Religieux typés</div></div>
    <div class="score" style="color:#a1a1aa"><div class="score-num">${otherCount}</div><div class="score-lab">À reclassifier</div></div>
    <div class="score" style="color:#fbbf24"><div class="score-num">${pctGeo}%</div><div class="score-lab">Géocodés</div></div>
  </div>
  <div style="margin-top:16px">
    <a class="btn" href="javascript:window.print()">📄 PDF</a>
    <a class="btn" href="javascript:location.reload()" style="background:#7f77dd">🔄 Refresh</a>
    <a class="btn" href="/api/rapport/audit" style="background:#10b981">📊 Audit complet</a>
    <a class="btn" href="/lieux" style="background:#ec4899">📍 Carte mondiale</a>
  </div>
</div>

<h2>📋 Lieux par type (${census.types.length} catégories)</h2>
<div class="section">
  ${census.types.map(t => {
    const isReligious = KNOWN_RELIGIOUS_TYPES.includes(t.type);
    const pct = Math.round((t.geocoded / Math.max(1, t.total)) * 100);
    return `
      <div class="type-row">
        <span class="tag ${isReligious ? 'tag-religious' : 'tag-other'}">${isReligious ? '🕊' : '📍'} ${t.type}</span>
        <div>
          <div class="type-name">${t.type.replace(/_/g, ' ')}</div>
          ${t.samples.length > 0 ? `<div class="samples">${t.samples.slice(0, 3).map(s => `<span>${s.name}${s.city ? ' · ' + s.city : ''}</span>`).join('')}</div>` : ''}
        </div>
        <div class="type-count">${t.total}</div>
        <div class="type-geo">${t.geocoded} géoc · ${pct}%</div>
      </div>
    `;
  }).join('')}
</div>

<h2>📅 Calendrier des fêtes religieuses mondiales (${RELIGIOUS_FESTIVALS.length} confessions)</h2>
${RELIGIOUS_FESTIVALS.map(f => `
  <div class="faith-card">
    <h3><span class="faith-emoji">${f.emoji}</span> ${f.faith} (${f.events.length} fêtes)</h3>
    <div class="faith-events">
      ${f.events.map(e => `<span>${e}</span>`).join('')}
    </div>
  </div>
`).join('')}

<h2>🛣 Plan d'action priorisé (3 sprints)</h2>
<div class="section">
  <h3>Sprint 1 — Reclassifier les venues religieuses (1 semaine)</h3>
  <div class="action"><strong>1.1</strong> Migration Prisma : étendre VenueType (CHURCH_CATHOLIC, MOSQUE, SYNAGOGUE, etc.) — <em>2h</em></div>
  <div class="action"><strong>1.2</strong> Cron <code>/api/cron/classify-venues</code> avec Gemini grounded search — <em>1 jour</em></div>
  <div class="action"><strong>1.3</strong> Filtre confessionnel sur <code>/lieux</code> + badge "Inclusif vérifié" — <em>1 jour</em></div>

  <h3>Sprint 2 — Calendrier religieux mondial (1 semaine)</h3>
  <div class="action"><strong>2.1</strong> Modèle Prisma <code>ReligiousEvent</code> + <code>VenueParticipation</code> — <em>3h</em></div>
  <div class="action"><strong>2.2</strong> Seed des ~70 événements religieux principaux — <em>1 jour</em></div>
  <div class="action"><strong>2.3</strong> Page publique <code>/calendrier-religieux</code> (vue liste + calendrier + carte) — <em>2 jours</em></div>

  <h3>Sprint 3 — Prière virtuelle live (2 semaines)</h3>
  <div class="action"><strong>3.1</strong> Refonte <code>/cercles-priere</code> en live SSE avec présence + intentions — <em>3 jours</em></div>
  <div class="action"><strong>3.2</strong> Carte des prières mondiales en direct (heatmap) + bougies 24h — <em>2 jours</em></div>
  <div class="action"><strong>3.3</strong> Avatar IA "Compagnon spirituel" 4 personas (Mère Marie, Sœur Khadija, Rabbin, Maître Zen) — <em>3 jours</em></div>

  <h3>Sprint 4 — Engagement long terme (P3)</h3>
  <div class="action"><strong>4.1</strong> Camino virtuel collectif (gamification pèlerinage) — <em>1 semaine</em></div>
  <div class="action"><strong>4.2</strong> Genius des textes sacrés inclusifs — <em>2 semaines</em></div>
  <div class="action"><strong>4.3</strong> Marketplace officiants LGBT-friendly (mariages religieux) — <em>1 semaine</em></div>
</div>

<h2>📅 Prochains événements en base (${census.events.length})</h2>
<div class="section">
  ${census.events.length === 0
    ? '<p style="color:#a1a1aa">Aucun événement à venir programmé en base. Sprint 2.2 → seed des événements religieux mondiaux.</p>'
    : census.events.map((e: any) => `
      <div style="padding:8px 0;border-bottom:1px solid #27272a">
        <strong>${e.title}</strong>
        <div style="font-size:11px;color:#a1a1aa">${new Date(e.startsAt).toLocaleString('fr-FR')}${e.location ? ' · ' + e.location : ''}${e.city ? ' · ' + e.city : ''}</div>
      </div>
    `).join('')
  }
</div>

<div class="footer">
  Census généré le <b>${date}</b><br/>
  🌈 gld.pixeeplay.com — La foi se conjugue au pluriel.
</div>

</div></body></html>`;
}

export async function GET() {
  try {
    const census = await loadCensus();
    const html = generateHtml(census);
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300, s-maxage=600',
        'x-religious-census-generated-at': new Date().toISOString()
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'religious-census-failed', message: e?.message }, { status: 500 });
  }
}

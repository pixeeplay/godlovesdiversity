'use client';
import { useMemo, useState } from 'react';
import { Tv, Filter, MapPin, Play, ExternalLink, Globe, Search } from 'lucide-react';

/**
 * Webcams live des lieux saints du monde.
 *
 * Sources : flux YouTube live publics + flux dédiés des grandes institutions.
 * Tous les liens sont publics et officiels (pas de scraping).
 *
 * NB : certains streams sont 24/7, d'autres uniquement aux heures d'office.
 *      L'icône 🟢 LIVE indique les streams qui sont historiquement live, mais
 *      l'état réel dépend du moment de la consultation.
 */

interface Webcam {
  id: string;
  name: string;
  city: string;
  country: string;
  faith: string;            // catholic, orthodox, protestant, muslim, jewish, buddhist, hindu, sikh, interfaith
  emoji: string;
  description: string;
  embedUrl: string;          // URL embed YouTube/Vimeo
  externalUrl: string;       // URL canonique
  schedule?: string;         // ex "Messes 7h/12h/18h CET"
  inclusive?: boolean;       // LGBT-friendly notoirement
}

const WEBCAMS: Webcam[] = [
  // Christianisme catholique
  {
    id: 'vatican-st-peter',
    name: 'Basilique Saint-Pierre',
    city: 'Vatican',
    country: 'VA',
    faith: 'catholic',
    emoji: '✝️',
    description: 'Basilique majeure de la chrétienté. Audiences du Pape, messes, angélus.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCxw5Mjvc35MGRukZTV-jHWg',
    externalUrl: 'https://www.vaticannews.va/en.html',
    schedule: 'Audience générale mer 9h, Angélus dim 12h CET',
    inclusive: false
  },
  {
    id: 'lourdes-grotte',
    name: 'Sanctuaire de Lourdes — Grotte Massabielle',
    city: 'Lourdes',
    country: 'FR',
    faith: 'catholic',
    emoji: '🕊️',
    description: 'Grotte des apparitions, prière mariale 24/7. Cierges et procession.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCY6mFrXPq1mH0RonKzIuyZA',
    externalUrl: 'https://www.lourdes-france.org/tv-lourdes/',
    schedule: '24/7 grotte · Messes internationales 9h30 + procession 21h CET',
    inclusive: true
  },
  {
    id: 'taize',
    name: 'Communauté de Taizé',
    city: 'Taizé',
    country: 'FR',
    faith: 'protestant',
    emoji: '🎵',
    description: 'Prière œcuménique chantée. Frère Roger Schutz. Très inclusive.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCoF20oOxnk-1f9XXG_3CRTw',
    externalUrl: 'https://www.taize.fr/en',
    schedule: 'Prières 8h15, 12h20, 20h30 CET',
    inclusive: true
  },
  {
    id: 'notre-dame-paris',
    name: 'Notre-Dame de Paris',
    city: 'Paris',
    country: 'FR',
    faith: 'catholic',
    emoji: '🏰',
    description: 'Cathédrale historique reconstruite après l\'incendie de 2019.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCb9Lk9DLbITcEA3tEcGjdng',
    externalUrl: 'https://www.notredamedeparis.fr',
    schedule: 'Messes quotidiennes',
    inclusive: false
  },
  {
    id: 'medjugorje',
    name: 'Medjugorje',
    city: 'Medjugorje',
    country: 'BA',
    faith: 'catholic',
    emoji: '🌹',
    description: 'Sanctuaire marial bosniaque. Prières et apparitions.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCYTIpoGJW9wKVoG3_RhfVVw',
    externalUrl: 'https://www.medjugorje.hr',
    schedule: 'Rosaire 17h, Messe 18h CET',
    inclusive: false
  },

  // Christianisme orthodoxe
  {
    id: 'mount-athos',
    name: 'Mont Athos — Monastères',
    city: 'Mont Athos',
    country: 'GR',
    faith: 'orthodox',
    emoji: '☦️',
    description: 'République monastique grecque, 2000 moines orthodoxes.',
    embedUrl: 'https://www.youtube.com/embed/videoseries?list=PLxfL8yIXYjcVWYVCRLOEr8YyU4nDyIr3o',
    externalUrl: 'https://athosweblive.com',
    schedule: 'Vêpres 18h, Liturgie 6h30 EET'
  },

  // Islam
  {
    id: 'mecca-haram',
    name: 'Masjid al-Haram (La Mecque)',
    city: 'La Mecque',
    country: 'SA',
    faith: 'muslim',
    emoji: '☪️',
    description: 'La Kaaba, lieu le plus sacré de l\'islam. Tawaf 24/7.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCtUk5shN0XVZxNSP-z3wFlw',
    externalUrl: 'https://makkahlive.net',
    schedule: '5 prières/jour · Tawaf 24/7'
  },
  {
    id: 'medina-prophet',
    name: 'Mosquée du Prophète (Médine)',
    city: 'Médine',
    country: 'SA',
    faith: 'muslim',
    emoji: '🕌',
    description: 'Tombeau du Prophète Muhammad ﷺ. Deuxième lieu saint de l\'islam.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC-WVXcZLXPYEIyUkMgwUhsg',
    externalUrl: 'https://madinahlive.net',
    schedule: '5 prières/jour'
  },
  {
    id: 'al-aqsa',
    name: 'Mosquée Al-Aqsa (Jérusalem)',
    city: 'Jérusalem',
    country: 'IL',
    faith: 'muslim',
    emoji: '🕊️',
    description: 'Esplanade des Mosquées, troisième lieu saint de l\'islam.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC6N5XrFK9Q0_E7r9lXfO_Bw',
    externalUrl: 'https://aqsa.tv',
    schedule: 'Vendredi 12h30 IST'
  },
  {
    id: 'ibn-rushd-berlin',
    name: 'Mosquée Ibn Rushd-Goethe (Berlin)',
    city: 'Berlin',
    country: 'DE',
    faith: 'muslim',
    emoji: '🌈',
    description: 'Mosquée libérale fondée par Seyran Ateş. Mixte, LGBT-friendly, lecture critique.',
    embedUrl: '',  // pas de stream live officiel — page externe
    externalUrl: 'https://ibn-rushd-goethe.de',
    schedule: 'Vendredi 13h CET',
    inclusive: true
  },

  // Judaïsme
  {
    id: 'kotel-jerusalem',
    name: 'Mur des Lamentations (Kotel)',
    city: 'Jérusalem',
    country: 'IL',
    faith: 'jewish',
    emoji: '✡️',
    description: 'Vestige du Second Temple. Prières 24/7.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCsmiTUpV50SJfkbNkPHd4hQ',
    externalUrl: 'https://english.thekotel.org/cameras',
    schedule: '24/7 — couvert/découvert sectionné par genre'
  },
  {
    id: 'beit-simchat-torah',
    name: 'Beit Simchat Torah (NYC)',
    city: 'New York',
    country: 'US',
    faith: 'jewish',
    emoji: '🌈',
    description: 'Plus grande synagogue LGBT au monde. Offices Shabbat ouverts à toutes identités.',
    embedUrl: '',
    externalUrl: 'https://cbst.org/livestream',
    schedule: 'Shabbat ven 18h30 EST, sam 10h EST',
    inclusive: true
  },
  {
    id: 'beit-haverim-paris',
    name: 'Beit Haverim (Paris)',
    city: 'Paris',
    country: 'FR',
    faith: 'jewish',
    emoji: '🌈',
    description: 'Plus ancienne communauté juive LGBT de France (1977).',
    embedUrl: '',
    externalUrl: 'https://beit-haverim.com',
    schedule: 'Shabbat ven 19h30 CET',
    inclusive: true
  },

  // Bouddhisme
  {
    id: 'plum-village',
    name: 'Plum Village (Thich Nhat Hanh)',
    city: 'Loubès-Bernac',
    country: 'FR',
    faith: 'buddhist',
    emoji: '🪷',
    description: 'Monastère bouddhiste fondé par Thich Nhat Hanh. Méditations guidées.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCcv7KJIAafC1_yeKvuYyflw',
    externalUrl: 'https://plumvillage.org',
    schedule: 'Sit méditation 6h, 11h, 17h CET',
    inclusive: true
  },
  {
    id: 'shasta-abbey',
    name: 'Shasta Abbey',
    city: 'Mount Shasta, CA',
    country: 'US',
    faith: 'buddhist',
    emoji: '☸️',
    description: 'Monastère zen Soto LGBT-friendly historique aux États-Unis.',
    embedUrl: '',
    externalUrl: 'https://www.shastaabbey.org',
    schedule: 'Méditations 5h45, 18h PST',
    inclusive: true
  },
  {
    id: 'bodh-gaya',
    name: 'Bodh Gaya — Mahabodhi Temple',
    city: 'Bodh Gaya',
    country: 'IN',
    faith: 'buddhist',
    emoji: '🌳',
    description: 'Lieu de l\'illumination du Bouddha. UNESCO. Pèlerinages internationaux.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC4nPkXg-UBb6MKJQ-_iIa9w',
    externalUrl: 'https://www.bodhgayalive.com',
    schedule: '24/7'
  },

  // Hindouisme
  {
    id: 'varanasi-ganges',
    name: 'Varanasi — Ganga Aarti',
    city: 'Varanasi (Bénarès)',
    country: 'IN',
    faith: 'hindu',
    emoji: '🕉️',
    description: 'Cérémonie du feu quotidienne sur le Gange à Dashashwamedh Ghat.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCOXyR8ub5SeVZ8YZfF7p9KQ',
    externalUrl: 'https://www.varanasilive.com',
    schedule: 'Aarti tous les soirs 18h45 IST'
  },
  {
    id: 'tirupati',
    name: 'Tirumala Tirupati',
    city: 'Tirupati',
    country: 'IN',
    faith: 'hindu',
    emoji: '🛕',
    description: 'Temple de Venkateswara, l\'un des plus visités au monde.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCCS-dhoXowNvFrAoBLh6HwA',
    externalUrl: 'https://www.tirumala.org',
    schedule: 'Sevas dès 3h IST'
  },
  {
    id: 'iskcon-mayapur',
    name: 'ISKCON Mayapur',
    city: 'Mayapur',
    country: 'IN',
    faith: 'hindu',
    emoji: '🪈',
    description: 'Centre mondial Hare Krishna. Galva-108 LGBT-friendly y est actif.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UC0_h0jJUpcbGpnMqYFxvhgg',
    externalUrl: 'https://mayapur.tv',
    schedule: 'Mangal Aarti 4h30 IST',
    inclusive: true
  },

  // Sikhisme
  {
    id: 'golden-temple',
    name: 'Harmandir Sahib (Golden Temple)',
    city: 'Amritsar',
    country: 'IN',
    faith: 'sikh',
    emoji: '☬',
    description: 'Temple d\'Or, lieu le plus sacré du sikhisme.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCYI2_vCSpCyRSHQBL3YeAhg',
    externalUrl: 'https://www.sgpc.net',
    schedule: 'Kirtan 24/7'
  },

  // Inter-religieux
  {
    id: 'taize-rencontres',
    name: 'Communauté de Taizé (Rencontres)',
    city: 'Taizé',
    country: 'FR',
    faith: 'interfaith',
    emoji: '🌍',
    description: '100 000 jeunes/an en pèlerinage œcuménique chrétien inclusif.',
    embedUrl: 'https://www.youtube.com/embed/live_stream?channel=UCoF20oOxnk-1f9XXG_3CRTw',
    externalUrl: 'https://www.taize.fr',
    schedule: '3 prières par jour, multilingue',
    inclusive: true
  }
];

const FAITH_META: Record<string, { label: string; emoji: string; color: string }> = {
  catholic:    { label: 'Catholique',     emoji: '✝️',  color: '#dc2626' },
  protestant:  { label: 'Protestant',     emoji: '✠',   color: '#1e40af' },
  orthodox:    { label: 'Orthodoxe',      emoji: '☦️',  color: '#7c3aed' },
  muslim:      { label: 'Islam',           emoji: '☪️',  color: '#059669' },
  jewish:      { label: 'Judaïsme',       emoji: '✡️',  color: '#3b82f6' },
  buddhist:    { label: 'Bouddhisme',     emoji: '☸️',  color: '#f59e0b' },
  hindu:       { label: 'Hindouisme',     emoji: '🕉️',  color: '#ec4899' },
  sikh:        { label: 'Sikhisme',       emoji: '☬',   color: '#f97316' },
  interfaith:  { label: 'Inter-religieux', emoji: '🌍',  color: '#22d3ee' }
};

export function WebcamsLiveClient() {
  const [activeFaiths, setActiveFaiths] = useState<Set<string>>(new Set());
  const [inclusiveOnly, setInclusiveOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCam, setActiveCam] = useState<Webcam | null>(null);

  const filtered = useMemo(() => {
    return WEBCAMS.filter(c => {
      if (activeFaiths.size > 0 && !activeFaiths.has(c.faith)) return false;
      if (inclusiveOnly && !c.inclusive) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.city.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [activeFaiths, inclusiveOnly, search]);

  function toggleFaith(f: string) {
    setActiveFaiths(prev => {
      const n = new Set(prev);
      if (n.has(f)) n.delete(f); else n.add(f);
      return n;
    });
  }

  const counts: Record<string, number> = {};
  for (const c of WEBCAMS) counts[c.faith] = (counts[c.faith] || 0) + 1;

  return (
    <main className="container-wide py-12 max-w-7xl">
      <header className="text-center mb-6">
        <div className="inline-block bg-gradient-to-br from-rose-500 via-fuchsia-500 to-cyan-500 rounded-2xl p-3 mb-3">
          <Tv size={28} className="text-white" />
        </div>
        <h1 className="font-display font-bold text-3xl md:text-4xl">Webcams live des lieux saints</h1>
        <p className="text-zinc-400 text-sm mt-2 max-w-2xl mx-auto">
          {WEBCAMS.length} sanctuaires, basiliques, mosquées, synagogues, temples bouddhistes/hindous/sikhs en direct du monde entier.
        </p>
      </header>

      {/* Filtres */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center mb-3">
          <Filter size={14} className="text-zinc-500" />
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-widest">Filtrer par confession</span>
          <button
            onClick={() => setActiveFaiths(new Set())}
            className={`text-[11px] px-3 py-1.5 rounded-full font-bold ${activeFaiths.size === 0 ? 'bg-fuchsia-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
          >
            Toutes ({WEBCAMS.length})
          </button>
          {Object.entries(FAITH_META).map(([id, meta]) => {
            if (!counts[id]) return null;
            const active = activeFaiths.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleFaith(id)}
                className="text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition"
                style={{
                  backgroundColor: active ? meta.color : 'rgb(39, 39, 42)',
                  color: active ? 'white' : 'rgb(212, 212, 216)'
                }}
              >
                <span>{meta.emoji}</span> {meta.label} ({counts[id]})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[220px] bg-zinc-950 border border-zinc-700 rounded-lg px-3">
            <Search size={12} className="text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un lieu, une ville…"
              className="bg-transparent flex-1 px-1 py-1.5 text-sm outline-none"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={inclusiveOnly} onChange={(e) => setInclusiveOnly(e.target.checked)} className="accent-fuchsia-500" />
            🌈 LGBT-friendly seulement
          </label>
          <span className="text-[11px] text-zinc-500 ml-auto">{filtered.length} résultats</span>
        </div>
      </section>

      {/* Grid des webcams */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => {
          const meta = FAITH_META[c.faith];
          return (
            <article
              key={c.id}
              className="bg-zinc-900 border-2 rounded-2xl overflow-hidden hover:border-fuchsia-500/50 transition cursor-pointer group"
              style={{ borderColor: meta?.color + '40' }}
              onClick={() => setActiveCam(c)}
            >
              <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                {c.embedUrl ? (
                  <img
                    src={`https://img.youtube.com/vi/${c.embedUrl.match(/embed\/(?:live_stream\?channel=|videoseries\?list=)?([^&?]+)/)?.[1] || ''}/maxresdefault.jpg`}
                    alt={c.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-90 transition"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : null}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-black/60 backdrop-blur-md rounded-full p-4 group-hover:scale-110 transition">
                    <Play size={24} className="text-white" fill="white" />
                  </div>
                </div>
                {c.embedUrl && (
                  <span className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                  </span>
                )}
                {c.inclusive && (
                  <span className="absolute top-2 right-2 bg-gradient-to-r from-pink-500 to-violet-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                    🌈 Inclusif
                  </span>
                )}
                <div className="absolute bottom-2 left-2 text-3xl">{c.emoji}</div>
              </div>
              <div className="p-4">
                <div className="flex items-start gap-2 mb-1">
                  <h3 className="font-bold text-white flex-1">{c.name}</h3>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-1 mb-2">
                  <MapPin size={10} /> {c.city}, {c.country}
                </div>
                <p className="text-xs text-zinc-300 line-clamp-2 mb-2">{c.description}</p>
                {c.schedule && (
                  <div className="text-[10px] text-amber-300 mb-2">⏰ {c.schedule}</div>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: meta.color + '30', color: meta.color }}>
                  {meta.emoji} {meta.label}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      {/* Modal player */}
      {activeCam && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setActiveCam(null)}>
          <div className="bg-zinc-950 border border-fuchsia-500/40 rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeCam.emoji}</span>
                <div>
                  <h2 className="font-bold">{activeCam.name}</h2>
                  <p className="text-[11px] text-zinc-400">{activeCam.city}, {activeCam.country} · {activeCam.schedule}</p>
                </div>
              </div>
              <button onClick={() => setActiveCam(null)} className="text-zinc-400 hover:text-white text-2xl leading-none">&times;</button>
            </header>
            <div className="aspect-video bg-zinc-900">
              {activeCam.embedUrl ? (
                <iframe
                  src={activeCam.embedUrl + '?autoplay=1'}
                  title={activeCam.name}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center p-8">
                  <div>
                    <Globe size={40} className="text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-300 mb-3">Cette communauté n'a pas de stream live YouTube intégré.</p>
                    <a href={activeCam.externalUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-sm font-bold px-5 py-2 rounded-full">
                      Voir sur le site officiel <ExternalLink size={11} className="inline ml-1" />
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 flex flex-wrap gap-2">
              <p className="text-sm text-zinc-300 flex-1">{activeCam.description}</p>
              <a href={activeCam.externalUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                <ExternalLink size={11} /> Site officiel
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 bg-blue-500/5 border border-blue-500/30 rounded-xl p-4 text-xs text-blue-200 text-center">
        💡 Les flux YouTube live sont publics. Si un stream n'est pas actif, c'est probablement hors heures d'office.
        Un lieu saint que tu connais et qui a un stream public ? <a href="/contact?sujet=Webcam+live" className="underline font-bold ml-1">Propose-le</a>.
      </div>
    </main>
  );
}

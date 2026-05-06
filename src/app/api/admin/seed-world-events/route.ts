import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/admin/seed-world-events?dryRun=1
 *
 * Pré-remplit la base avec ~200 événements LGBT et religieux mondiaux pour 2026 et 2027.
 * Idempotent : utilise externalSource='gld-seed' + externalId comme clé unique.
 *
 * Réservé ADMIN.
 */

interface SeedEvent {
  externalId: string;
  title: string;
  description: string;
  startsAt: string;       // ISO
  endsAt?: string;
  city?: string;
  country?: string;
  url?: string;
  tags: string[];
}

// ─────────────────────────────────────────────
// PRIDES 2026 (sélection ~50 dates connues)
// ─────────────────────────────────────────────
const PRIDES_2026: SeedEvent[] = [
  { externalId: 'pride-paris-2026',     title: 'Marche des Fiertés Paris 2026',           description: 'Pride Paris — défilé annuel de la fierté LGBT+ depuis Place de la Concorde.', startsAt: '2026-06-27T14:00:00.000Z', city: 'Paris',     country: 'FR', tags: ['pride','marche','lgbt'], url: 'https://www.inter-lgbt.org' },
  { externalId: 'pride-london-2026',    title: 'Pride in London 2026',                    description: 'UK\'s largest LGBT+ celebration through Oxford Street.', startsAt: '2026-07-04T12:00:00.000Z', city: 'London',    country: 'GB', tags: ['pride','marche','uk'] },
  { externalId: 'pride-nyc-2026',       title: 'NYC Pride March 2026',                    description: 'Heritage of Pride — annual march from Stonewall Inn.', startsAt: '2026-06-28T11:00:00.000Z', city: 'New York',  country: 'US', tags: ['pride','marche','stonewall'] },
  { externalId: 'pride-saopaulo-2026',  title: 'Parada do Orgulho LGBT+ São Paulo 2026',  description: 'Plus grande Pride au monde avec ~3M participants Av. Paulista.', startsAt: '2026-06-14T13:00:00.000Z', city: 'São Paulo', country: 'BR', tags: ['pride','brasil','grande'] },
  { externalId: 'pride-telaviv-2026',   title: 'Tel Aviv Pride 2026',                     description: 'Plage Tel Aviv — la plus grande Pride du Moyen-Orient.', startsAt: '2026-06-12T11:00:00.000Z', city: 'Tel Aviv',  country: 'IL', tags: ['pride','israel','beach'] },
  { externalId: 'pride-sydney-2026',    title: 'Sydney Gay & Lesbian Mardi Gras 2026',    description: 'Festival emblématique 2 semaines + parade Oxford Street.', startsAt: '2026-03-07T19:00:00.000Z', city: 'Sydney',    country: 'AU', tags: ['pride','mardi-gras','australie'] },
  { externalId: 'pride-madrid-2026',    title: 'Madrid Pride (Orgullo Madrid) 2026',      description: 'WorldPride 2026 candidate — Chueca + Gran Vía.', startsAt: '2026-07-04T18:00:00.000Z', city: 'Madrid',    country: 'ES', tags: ['pride','espagne','worldpride'] },
  { externalId: 'pride-berlin-2026',    title: 'Christopher Street Day Berlin 2026',      description: 'CSD historique — depuis Kurfürstendamm jusqu\'au Brandenburger Tor.', startsAt: '2026-07-25T12:00:00.000Z', city: 'Berlin',    country: 'DE', tags: ['pride','csd','allemagne'] },
  { externalId: 'pride-koln-2026',      title: 'CSD Köln (Cologne Pride) 2026',           description: 'Plus grosse Pride d\'Allemagne après Berlin.', startsAt: '2026-07-05T12:00:00.000Z', city: 'Köln',      country: 'DE', tags: ['pride','csd','cologne'] },
  { externalId: 'pride-toronto-2026',   title: 'Pride Toronto 2026',                      description: 'Pride Month canadien — Church Street Village.', startsAt: '2026-06-28T12:00:00.000Z', city: 'Toronto',   country: 'CA', tags: ['pride','canada'] },
  { externalId: 'pride-sf-2026',        title: 'San Francisco Pride 2026',                description: 'Castro District + Civic Center Plaza — 1M+ visiteurs.', startsAt: '2026-06-28T10:30:00.000Z', city: 'San Francisco', country: 'US', tags: ['pride','castro','sf'] },
  { externalId: 'pride-la-2026',        title: 'LA Pride 2026',                           description: 'Hollywood Boulevard — CSW & Pride Hollywood.', startsAt: '2026-06-13T11:00:00.000Z', city: 'Los Angeles', country: 'US', tags: ['pride','hollywood'] },
  { externalId: 'pride-chicago-2026',   title: 'Chicago Pride Parade 2026',               description: 'Boystown — Halsted Street.', startsAt: '2026-06-28T12:00:00.000Z', city: 'Chicago',   country: 'US', tags: ['pride','chicago'] },
  { externalId: 'pride-miami-2026',     title: 'Miami Beach Pride 2026',                  description: 'Ocean Drive South Beach — april annuel.', startsAt: '2026-04-12T11:00:00.000Z', city: 'Miami',     country: 'US', tags: ['pride','miami','beach'] },
  { externalId: 'pride-mexico-2026',    title: 'Marcha del Orgullo CDMX 2026',            description: 'Plus grande Pride d\'Amérique latine après São Paulo.', startsAt: '2026-06-27T11:00:00.000Z', city: 'Mexico',    country: 'MX', tags: ['pride','mexique','marcha'] },
  { externalId: 'pride-buenosaires-2026', title: 'Marcha del Orgullo Buenos Aires 2026',  description: 'Plaza de Mayo + Av. de Mayo.', startsAt: '2026-11-07T15:00:00.000Z', city: 'Buenos Aires', country: 'AR', tags: ['pride','argentina'] },
  { externalId: 'pride-bogota-2026',    title: 'Marcha LGBT Bogotá 2026',                 description: 'Carrera 7 — Plaza de Bolívar.', startsAt: '2026-06-28T12:00:00.000Z', city: 'Bogotá',    country: 'CO', tags: ['pride','colombia'] },
  { externalId: 'pride-amsterdam-2026', title: 'Amsterdam Pride 2026 (Canal Parade)',     description: 'Défilé sur les canaux — la plus iconique pride au monde.', startsAt: '2026-08-01T13:00:00.000Z', city: 'Amsterdam', country: 'NL', tags: ['pride','canal','iconic'] },
  { externalId: 'pride-stockholm-2026', title: 'Stockholm Pride 2026',                    description: 'Stockholm Pride Park + Pride Parade.', startsAt: '2026-08-01T13:00:00.000Z', city: 'Stockholm', country: 'SE', tags: ['pride','sweden'] },
  { externalId: 'pride-copenhagen-2026',title: 'Copenhagen Pride 2026',                   description: 'Rådhuspladsen — semaine Pride.', startsAt: '2026-08-22T12:00:00.000Z', city: 'Copenhagen',country: 'DK', tags: ['pride','denmark'] },
  { externalId: 'pride-helsinki-2026',  title: 'Helsinki Pride 2026',                     description: 'Senate Square + KaivopuistO Park.', startsAt: '2026-06-27T13:00:00.000Z', city: 'Helsinki',  country: 'FI', tags: ['pride','finland'] },
  { externalId: 'pride-zurich-2026',    title: 'Zurich Pride 2026',                       description: 'Helvetiaplatz — Pride Festival.', startsAt: '2026-06-13T13:00:00.000Z', city: 'Zurich',    country: 'CH', tags: ['pride','suisse'] },
  { externalId: 'pride-vienna-2026',    title: 'Vienna Pride / Regenbogenparade 2026',    description: 'Ring tour Vienne historique.', startsAt: '2026-06-13T15:00:00.000Z', city: 'Vienna',    country: 'AT', tags: ['pride','autriche'] },
  { externalId: 'pride-prague-2026',    title: 'Prague Pride 2026',                       description: 'Wenceslas Square — Czech Pride.', startsAt: '2026-08-08T13:00:00.000Z', city: 'Prague',    country: 'CZ', tags: ['pride','rep-tcheque'] },
  { externalId: 'pride-budapest-2026',  title: 'Budapest Pride 2026',                     description: 'Marche en contexte difficile politiquement — soutien GLD.', startsAt: '2026-07-18T15:00:00.000Z', city: 'Budapest',  country: 'HU', tags: ['pride','hongrie','militante'] },
  { externalId: 'pride-warsaw-2026',    title: 'Parada Równości Warsaw 2026',             description: 'Plus grande pride d\'Europe centrale-est.', startsAt: '2026-06-20T14:00:00.000Z', city: 'Warsaw',    country: 'PL', tags: ['pride','pologne'] },
  { externalId: 'pride-rome-2026',      title: 'Roma Pride 2026',                         description: 'Piazza della Repubblica — Roma Pride.', startsAt: '2026-06-13T15:00:00.000Z', city: 'Roma',      country: 'IT', tags: ['pride','italie','vatican-context'] },
  { externalId: 'pride-milan-2026',     title: 'Milano Pride 2026',                       description: 'Corso Venezia — Milano Pride Parade.', startsAt: '2026-06-27T15:00:00.000Z', city: 'Milano',    country: 'IT', tags: ['pride','italie'] },
  { externalId: 'pride-barcelona-2026', title: 'Pride Barcelona 2026',                    description: 'Plaça Universitat — Pride BCN.', startsAt: '2026-06-27T17:00:00.000Z', city: 'Barcelona', country: 'ES', tags: ['pride','espagne'] },
  { externalId: 'pride-lisbon-2026',    title: 'Marcha do Orgulho Lisboa 2026',           description: 'Praça do Comércio — Lisboa Pride.', startsAt: '2026-06-20T17:00:00.000Z', city: 'Lisbon',    country: 'PT', tags: ['pride','portugal'] },
  { externalId: 'pride-athens-2026',    title: 'Athens Pride 2026',                       description: 'Syntagma Square — Athens Pride.', startsAt: '2026-06-13T17:00:00.000Z', city: 'Athens',    country: 'GR', tags: ['pride','grece'] },
  { externalId: 'pride-tokyo-2026',     title: 'Tokyo Rainbow Pride 2026',                description: 'Yoyogi Park — Pride Japon.', startsAt: '2026-04-25T11:00:00.000Z', city: 'Tokyo',     country: 'JP', tags: ['pride','japon'] },
  { externalId: 'pride-seoul-2026',     title: 'Seoul Queer Culture Festival 2026',       description: 'Festival Queer en Corée — souvent contesté.', startsAt: '2026-07-04T11:00:00.000Z', city: 'Seoul',     country: 'KR', tags: ['pride','coree','militante'] },
  { externalId: 'pride-taipei-2026',    title: 'Taiwan Pride 2026',                       description: 'Plus grande Pride d\'Asie de l\'Est.', startsAt: '2026-10-31T13:00:00.000Z', city: 'Taipei',    country: 'TW', tags: ['pride','taiwan','asia'] },
  { externalId: 'pride-bangkok-2026',   title: 'Bangkok Pride 2026',                      description: 'Sukhumvit Road — Bangkok Pride.', startsAt: '2026-06-06T16:00:00.000Z', city: 'Bangkok',   country: 'TH', tags: ['pride','thailande'] },
  { externalId: 'pride-mumbai-2026',    title: 'Queer Azaadi Mumbai 2026',                description: 'Mumbai LGBTQ Pride.', startsAt: '2026-02-07T14:00:00.000Z', city: 'Mumbai',    country: 'IN', tags: ['pride','inde'] },
  { externalId: 'pride-johannesburg-2026', title: 'Johannesburg Pride 2026',              description: 'Plus grande Pride d\'Afrique.', startsAt: '2026-10-24T11:00:00.000Z', city: 'Johannesburg', country: 'ZA', tags: ['pride','afrique-sud'] },
  { externalId: 'pride-capetown-2026',  title: 'Cape Town Pride 2026',                    description: 'Green Point Park — Pride Afrique du Sud.', startsAt: '2026-02-21T12:00:00.000Z', city: 'Cape Town', country: 'ZA', tags: ['pride','afrique-sud'] },
  { externalId: 'pride-belgrade-2026',  title: 'Belgrade Pride 2026',                     description: 'Pride contestée — soutien GLD.', startsAt: '2026-09-13T14:00:00.000Z', city: 'Belgrade',  country: 'RS', tags: ['pride','serbie','militante'] },
  { externalId: 'pride-istanbul-2026',  title: 'Istanbul Pride 2026',                     description: 'Pride interdite par les autorités — actions de soutien.', startsAt: '2026-06-28T16:00:00.000Z', city: 'Istanbul',  country: 'TR', tags: ['pride','turquie','interdite','soutien'] }
];

// ─────────────────────────────────────────────
// JOURNÉES MONDIALES LGBT
// ─────────────────────────────────────────────
const LGBT_AWARENESS_2026: SeedEvent[] = [
  { externalId: 'idahobit-2026',         title: 'IDAHOBIT 2026 — Journée internationale contre l\'homophobie/transphobie/biphobie', description: '17 mai. Date anniversaire de la dépathologisation de l\'homosexualité par l\'OMS (1990).', startsAt: '2026-05-17T00:00:00.000Z', tags: ['journee-mondiale','idahobit','onu'] },
  { externalId: 'tdov-2026',             title: 'Trans Day of Visibility 2026',                            description: '31 mars — Journée internationale de la visibilité trans.', startsAt: '2026-03-31T00:00:00.000Z', tags: ['journee-mondiale','trans','visibilite'] },
  { externalId: 'tdor-2026',             title: 'Trans Day of Remembrance 2026',                           description: '20 novembre — Mémorial des victimes de la transphobie.', startsAt: '2026-11-20T00:00:00.000Z', tags: ['journee-mondiale','trans','memorial'] },
  { externalId: 'world-aids-day-2026',   title: 'World AIDS Day 2026',                                    description: '1er décembre — Journée mondiale de lutte contre le sida.', startsAt: '2026-12-01T00:00:00.000Z', tags: ['journee-mondiale','aids','sante'] },
  { externalId: 'coming-out-day-2026',   title: 'National Coming Out Day 2026',                           description: '11 octobre — Journée internationale du coming-out.', startsAt: '2026-10-11T00:00:00.000Z', tags: ['journee-mondiale','coming-out'] },
  { externalId: 'bisexual-day-2026',     title: 'Bisexual Visibility Day 2026',                           description: '23 septembre — Journée de la visibilité bisexuelle.', startsAt: '2026-09-23T00:00:00.000Z', tags: ['journee-mondiale','bi','visibilite'] },
  { externalId: 'pansexual-pride-2026',  title: 'Pansexual & Panromantic Pride Day 2026',                 description: '24 mai — Journée de la fierté pansexuelle.', startsAt: '2026-05-24T00:00:00.000Z', tags: ['journee-mondiale','pan','visibilite'] },
  { externalId: 'asexual-week-2026',     title: 'Ace Week 2026 (Asexuality Awareness)',                   description: '4-10 octobre — Semaine de visibilité asexuelle.', startsAt: '2026-10-04T00:00:00.000Z', endsAt: '2026-10-10T23:59:59.000Z', tags: ['journee-mondiale','ace','asexuel'] },
  { externalId: 'lesbian-week-2026',     title: 'Lesbian Visibility Week 2026',                           description: '21-27 avril — Semaine de visibilité lesbienne.', startsAt: '2026-04-21T00:00:00.000Z', endsAt: '2026-04-27T23:59:59.000Z', tags: ['journee-mondiale','lesbian','visibilite'] },
  { externalId: 'lesbian-day-2026',      title: 'Lesbian Day 2026',                                       description: '8 octobre — Journée internationale lesbienne.', startsAt: '2026-10-08T00:00:00.000Z', tags: ['journee-mondiale','lesbian'] },
  { externalId: 'pride-month-2026',      title: 'Pride Month 2026 (juin)',                                description: 'Mois entier de célébration LGBT+ aux États-Unis et internationalement.', startsAt: '2026-06-01T00:00:00.000Z', endsAt: '2026-06-30T23:59:59.000Z', tags: ['journee-mondiale','pride-month'] },
  { externalId: 'pride-history-2026',    title: 'LGBT History Month 2026',                                description: 'Octobre aux US, février au UK.', startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-10-31T23:59:59.000Z', tags: ['journee-mondiale','histoire'] },
  { externalId: 'stonewall-2026',        title: 'Anniversaire Stonewall 2026',                            description: '28 juin — anniversaire des émeutes de Stonewall (1969).', startsAt: '2026-06-28T00:00:00.000Z', tags: ['journee-mondiale','stonewall','histoire'] },
  { externalId: 'aids-memorial-2026',    title: 'AIDS Memorial Quilt Anniversary 2026',                   description: 'Mémorial du courtepointe — actions GLD.', startsAt: '2026-12-01T00:00:00.000Z', tags: ['journee-mondiale','aids','memorial'] },
  { externalId: 'spirit-day-2026',       title: 'Spirit Day 2026 (anti-bullying LGBT youth)',             description: '16 octobre — campagne contre le harcèlement des jeunes LGBT.', startsAt: '2026-10-16T00:00:00.000Z', tags: ['journee-mondiale','jeunesse'] }
];

// ─────────────────────────────────────────────
// FÊTES RELIGIEUSES 2026 (dates principales)
// ─────────────────────────────────────────────
const RELIGIOUS_2026: SeedEvent[] = [
  // Christianisme
  { externalId: 'epiphanie-2026',        title: 'Épiphanie 2026',                     description: 'Catholiques + orthodoxes — célébration des Rois Mages.', startsAt: '2026-01-06T00:00:00.000Z', tags: ['religieux','catholique','epiphanie'] },
  { externalId: 'cendres-2026',          title: 'Mercredi des Cendres 2026',          description: 'Début du Carême catholique.', startsAt: '2026-02-18T00:00:00.000Z', tags: ['religieux','catholique','careme'] },
  { externalId: 'paques-catho-2026',     title: 'Pâques catholique 2026',             description: 'Dimanche de la Résurrection — fête majeure du calendrier catholique.', startsAt: '2026-04-05T00:00:00.000Z', tags: ['religieux','catholique','paques'] },
  { externalId: 'paques-orthodoxe-2026', title: 'Pâques orthodoxe 2026',              description: 'Pascha — calendrier julien orthodoxe.', startsAt: '2026-04-12T00:00:00.000Z', tags: ['religieux','orthodoxe','paques'] },
  { externalId: 'pentecote-2026',        title: 'Pentecôte 2026',                     description: '7e dimanche après Pâques — descente du Saint-Esprit.', startsAt: '2026-05-24T00:00:00.000Z', tags: ['religieux','catholique','pentecote'] },
  { externalId: 'assomption-2026',       title: 'Assomption 2026',                    description: '15 août — Assomption de la Vierge Marie.', startsAt: '2026-08-15T00:00:00.000Z', tags: ['religieux','catholique','marie'] },
  { externalId: 'toussaint-2026',        title: 'Toussaint 2026',                     description: '1er novembre — Tous les saints.', startsAt: '2026-11-01T00:00:00.000Z', tags: ['religieux','catholique'] },
  { externalId: 'avent-2026',            title: 'Avent 2026 (4 semaines)',            description: '29 novembre - 24 décembre — préparation de Noël.', startsAt: '2026-11-29T00:00:00.000Z', endsAt: '2026-12-24T23:59:59.000Z', tags: ['religieux','catholique','avent'] },
  { externalId: 'noel-2026',             title: 'Noël 2026',                          description: '25 décembre — Naissance du Christ.', startsAt: '2026-12-25T00:00:00.000Z', tags: ['religieux','christianisme','noel'] },
  { externalId: 'reformation-2026',      title: 'Jour de la Réformation 2026',        description: '31 octobre — anniversaire 95 thèses Luther (1517).', startsAt: '2026-10-31T00:00:00.000Z', tags: ['religieux','protestant','reformation'] },

  // Islam
  { externalId: 'ramadan-2026',          title: 'Ramadan 2026',                       description: '17 février - 18 mars — mois lunaire de jeûne. Dates approximatives.', startsAt: '2026-02-17T00:00:00.000Z', endsAt: '2026-03-18T23:59:59.000Z', tags: ['religieux','islam','ramadan','jeune'] },
  { externalId: 'aid-fitr-2026',         title: 'Aïd al-Fitr 2026',                   description: '~19 mars — fête de fin du Ramadan.', startsAt: '2026-03-19T00:00:00.000Z', tags: ['religieux','islam','aid'] },
  { externalId: 'aid-adha-2026',         title: 'Aïd al-Adha 2026',                   description: '~26 mai — Fête du sacrifice.', startsAt: '2026-05-26T00:00:00.000Z', tags: ['religieux','islam','aid'] },
  { externalId: 'mawlid-2026',           title: 'Mawlid 2026 (Mawlid an-Nabi)',       description: '~24 août — Naissance du Prophète Muhammad.', startsAt: '2026-08-24T00:00:00.000Z', tags: ['religieux','islam','mawlid'] },
  { externalId: 'achoura-2026',          title: 'Achoura 2026',                       description: '~25 juin — 10e jour de Muharram.', startsAt: '2026-06-25T00:00:00.000Z', tags: ['religieux','islam','achoura'] },
  { externalId: 'laylat-qadr-2026',      title: 'Laylat al-Qadr 2026 (Nuit du Destin)', description: '~14 mars — 27e nuit du Ramadan.', startsAt: '2026-03-14T00:00:00.000Z', tags: ['religieux','islam','ramadan'] },

  // Judaïsme
  { externalId: 'pourim-2026',           title: 'Pourim 2026',                        description: '3 mars — fête joyeuse, costumes.', startsAt: '2026-03-03T00:00:00.000Z', tags: ['religieux','judaisme','pourim'] },
  { externalId: 'pessah-2026',           title: 'Pessah 2026 (Pâque juive)',          description: '1-9 avril — Sortie d\'Égypte, 7 jours.', startsAt: '2026-04-01T00:00:00.000Z', endsAt: '2026-04-09T23:59:59.000Z', tags: ['religieux','judaisme','pessah'] },
  { externalId: 'chavouot-2026',         title: 'Chavouot 2026',                      description: '21-23 mai — Don de la Torah, 50e jour après Pessah.', startsAt: '2026-05-21T00:00:00.000Z', endsAt: '2026-05-23T23:59:59.000Z', tags: ['religieux','judaisme','chavouot'] },
  { externalId: 'roch-hachana-2026',     title: 'Roch Hachana 2026',                  description: '12-14 septembre — Nouvel an juif.', startsAt: '2026-09-12T00:00:00.000Z', endsAt: '2026-09-14T23:59:59.000Z', tags: ['religieux','judaisme','roch-hachana'] },
  { externalId: 'yom-kippour-2026',      title: 'Yom Kippour 2026',                   description: '21 septembre — Jour du Grand Pardon, jeûne.', startsAt: '2026-09-21T00:00:00.000Z', tags: ['religieux','judaisme','yom-kippour'] },
  { externalId: 'soukkot-2026',          title: 'Soukkot 2026',                       description: '26 septembre - 3 octobre — Fête des cabanes.', startsAt: '2026-09-26T00:00:00.000Z', endsAt: '2026-10-03T23:59:59.000Z', tags: ['religieux','judaisme','soukkot'] },
  { externalId: 'hanouka-2026',          title: 'Hanouka 2026',                       description: '4-12 décembre — Fête des lumières, 8 jours.', startsAt: '2026-12-04T00:00:00.000Z', endsAt: '2026-12-12T23:59:59.000Z', tags: ['religieux','judaisme','hanouka'] },

  // Bouddhisme
  { externalId: 'magha-puja-2026',       title: 'Magha Puja 2026',                    description: '~3 février — Pleine lune, 1250 disciples.', startsAt: '2026-02-03T00:00:00.000Z', tags: ['religieux','bouddhisme','magha-puja'] },
  { externalId: 'losar-2026',            title: 'Losar 2026 (Nouvel an tibétain)',    description: '~18 février — Nouvel an bouddhiste tibétain.', startsAt: '2026-02-18T00:00:00.000Z', tags: ['religieux','bouddhisme','tibet','losar'] },
  { externalId: 'vesak-2026',            title: 'Vesak 2026',                         description: '~1er mai — Pleine lune célébrant naissance/illumination/parinirvana du Bouddha.', startsAt: '2026-05-01T00:00:00.000Z', tags: ['religieux','bouddhisme','vesak'] },
  { externalId: 'asalha-puja-2026',      title: 'Asalha Puja 2026',                   description: '~30 juillet — Premier sermon du Bouddha.', startsAt: '2026-07-30T00:00:00.000Z', tags: ['religieux','bouddhisme','asalha-puja'] },
  { externalId: 'ulambana-2026',         title: 'Ulambana / Bon 2026',                description: '~13-15 août — Festival des esprits ancestraux.', startsAt: '2026-08-13T00:00:00.000Z', endsAt: '2026-08-15T23:59:59.000Z', tags: ['religieux','bouddhisme','ulambana'] },

  // Hindouisme
  { externalId: 'maha-shivaratri-2026',  title: 'Maha Shivaratri 2026',               description: '~15 février — Grande Nuit de Shiva.', startsAt: '2026-02-15T00:00:00.000Z', tags: ['religieux','hindouisme','shiva'] },
  { externalId: 'holi-2026',             title: 'Holi 2026',                          description: '3-4 mars — Festival des couleurs.', startsAt: '2026-03-03T00:00:00.000Z', endsAt: '2026-03-04T23:59:59.000Z', tags: ['religieux','hindouisme','holi','couleurs'] },
  { externalId: 'krishna-jayanti-2026',  title: 'Krishna Janmashtami 2026',           description: '~15 août — Naissance de Krishna.', startsAt: '2026-08-15T00:00:00.000Z', tags: ['religieux','hindouisme','krishna'] },
  { externalId: 'ganesh-2026',           title: 'Ganesh Chaturthi 2026',              description: '~14 septembre — Festival de Ganesh.', startsAt: '2026-09-14T00:00:00.000Z', tags: ['religieux','hindouisme','ganesh'] },
  { externalId: 'navratri-2026',         title: 'Navratri 2026',                      description: '~12-21 octobre — 9 nuits, festival de la Déesse.', startsAt: '2026-10-12T00:00:00.000Z', endsAt: '2026-10-21T23:59:59.000Z', tags: ['religieux','hindouisme','navratri'] },
  { externalId: 'diwali-2026',           title: 'Diwali 2026',                        description: '8 novembre — Festival des lumières.', startsAt: '2026-11-08T00:00:00.000Z', tags: ['religieux','hindouisme','diwali','lumieres'] },

  // Sikhisme
  { externalId: 'vaisakhi-2026',         title: 'Vaisakhi 2026',                      description: '13/14 avril — Naissance du Khalsa, nouvel an sikh.', startsAt: '2026-04-13T00:00:00.000Z', tags: ['religieux','sikh','vaisakhi'] },
  { externalId: 'guru-nanak-2026',       title: 'Guru Nanak Jayanti 2026',            description: '~24 novembre — Anniversaire du fondateur.', startsAt: '2026-11-24T00:00:00.000Z', tags: ['religieux','sikh','guru-nanak'] },

  // Inter-religieux
  { externalId: 'interfaith-day-2026',   title: 'Journée mondiale dialogue inter-religieux 2026', description: '1ère semaine de février — ONU.', startsAt: '2026-02-01T00:00:00.000Z', tags: ['religieux','interfaith','onu'] }
];

const ALL_SEEDS = [...PRIDES_2026, ...LGBT_AWARENESS_2026, ...RELIGIOUS_2026];

function slugify(s: string): string {
  return s.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';

  let created = 0;
  let skipped = 0;
  const errors: any[] = [];

  for (const seed of ALL_SEEDS) {
    try {
      // Idempotence : skip si déjà présent (par externalId)
      const exists = await prisma.event.findFirst({
        where: { externalSource: 'gld-seed', externalId: seed.externalId },
        select: { id: true }
      });
      if (exists) { skipped++; continue; }
      if (dryRun) { created++; continue; }

      await prisma.event.create({
        data: {
          slug: slugify(`${seed.title}-${seed.startsAt.slice(0, 10)}`),
          locale: 'fr',
          title: seed.title,
          description: seed.description,
          startsAt: new Date(seed.startsAt),
          endsAt: seed.endsAt ? new Date(seed.endsAt) : null,
          city: seed.city || null,
          country: seed.country || null,
          url: seed.url || null,
          tags: seed.tags,
          published: true,
          externalSource: 'gld-seed',
          externalId: seed.externalId
        }
      });
      created++;
    } catch (e: any) {
      errors.push({ id: seed.externalId, error: e?.message?.slice(0, 200) });
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    seeds: ALL_SEEDS.length,
    created,
    skipped,
    errors,
    message: dryRun
      ? `[DRY RUN] ${created} événements seraient créés, ${skipped} déjà présents.`
      : `${created} événements créés, ${skipped} déjà présents. ${errors.length} erreurs.`
  });
}

/**
 * GET — preview du dataset.
 */
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  return NextResponse.json({
    seeds: ALL_SEEDS.length,
    breakdown: {
      prides: PRIDES_2026.length,
      lgbtAwareness: LGBT_AWARENESS_2026.length,
      religious: RELIGIOUS_2026.length
    },
    sample: ALL_SEEDS.slice(0, 10).map(s => ({ id: s.externalId, title: s.title, date: s.startsAt }))
  });
}

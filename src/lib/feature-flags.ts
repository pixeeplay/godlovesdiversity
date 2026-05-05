import { prisma } from './prisma';

/**
 * Liste de toutes les features pilotables par l'admin.
 * Chaque flag est stocké dans Setting avec la clé `feature.X` (valeur "on" ou "off").
 */
export const FEATURE_DEFINITIONS = {
  forum:           { name: 'Forum',                 defaultOn: true,  category: 'community' },
  testimonies:     { name: 'Témoignages vidéo',     defaultOn: true,  category: 'community' },
  peerHelp:        { name: 'Entraide pairs (SOS)',  defaultOn: true,  category: 'security' },
  emergencyContacts: { name: 'Contacts urgence perso', defaultOn: true, category: 'security' },
  shareCards:      { name: 'Cartes de partage',     defaultOn: true,  category: 'viral' },
  referral:        { name: 'Programme parrainage',  defaultOn: true,  category: 'viral' },
  badges:          { name: 'Badges & karma',         defaultOn: true,  category: 'viral' },
  wrapped:         { name: 'Wrapped annuel',         defaultOn: true,  category: 'viral' },
  travelSafe:      { name: 'Voyage safe',           defaultOn: true,  category: 'security' },
  alarmMode:       { name: 'Mode alarme SOS',       defaultOn: true,  category: 'security' },
  calculatorMode:  { name: 'Mode calculatrice',     defaultOn: false, category: 'security' },
  signalement:     { name: 'Signalement collaboratif', defaultOn: true, category: 'community' },
  hebergement:     { name: 'Hébergement urgence',   defaultOn: false, category: 'community' },
  mentor:          { name: 'Mentor 1-1',             defaultOn: false, category: 'community' },
  cerclesPriere:   { name: 'Cercles de prière',      defaultOn: true,  category: 'community' },
  meetups:         { name: 'Meetups IRL',            defaultOn: false, category: 'community' },
  voiceCoach:      { name: 'Voice Coach IA',         defaultOn: true,  category: 'ai' },
  legalAI:         { name: 'Aide juridique IA',     defaultOn: true,  category: 'ai' },
  inclusiveVerse:  { name: 'Verset inclusif IA',    defaultOn: true,  category: 'ai' },
  testimonyAI:     { name: 'Témoignage vidéo IA',   defaultOn: true,  category: 'ai' },
  marketplace:     { name: 'Marketplace artisans',   defaultOn: false, category: 'monetization' },
  crowdfunding:    { name: 'Crowdfunding projets',   defaultOn: false, category: 'monetization' },
  membrePlus:      { name: 'Abonnement Membre+',    defaultOn: false, category: 'monetization' },
  gldLocal:        { name: 'GLD Local par ville',   defaultOn: true,  category: 'community' },
  podcast:         { name: 'Podcast RSS Spotify',   defaultOn: true,  category: 'viral' },
  widget:          { name: 'Widget embeddable',     defaultOn: true,  category: 'viral' },
  dataExport:      { name: 'Export données anonymes', defaultOn: false, category: 'research' },
  prayerChat:      { name: 'Chat cercles de prière', defaultOn: false, category: 'community' }
} as const;

export type FeatureKey = keyof typeof FEATURE_DEFINITIONS;

/** Récupère un flag depuis Settings (avec fallback default). */
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  const def = FEATURE_DEFINITIONS[key];
  if (!def) return false;
  try {
    const s = await prisma.setting.findUnique({ where: { key: `feature.${key}` } });
    if (!s) return def.defaultOn;
    return s.value === 'on';
  } catch {
    return def.defaultOn;
  }
}

/** Récupère TOUS les flags d'un coup (pour le client). */
export async function getAllFeatureFlags(): Promise<Record<string, boolean>> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { startsWith: 'feature.' } }
    });
    const map: Record<string, boolean> = {};
    for (const k of Object.keys(FEATURE_DEFINITIONS)) {
      const row = rows.find(r => r.key === `feature.${k}`);
      map[k] = row ? row.value === 'on' : (FEATURE_DEFINITIONS as any)[k].defaultOn;
    }
    return map;
  } catch {
    const map: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(FEATURE_DEFINITIONS)) {
      map[k] = (v as any).defaultOn;
    }
    return map;
  }
}

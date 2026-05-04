/**
 * Base de contacts d'aide LGBTQ+ par pays.
 * Données vérifiées et mises à jour régulièrement.
 * En cas d'urgence, le bouton du widget chat géolocalise le visiteur
 * et affiche les contacts de son pays.
 */

export type Helpline = {
  name: string;
  phone?: string;        // numéro local
  whatsapp?: string;
  url?: string;
  email?: string;
  description: string;
  hours?: string;        // ex "24/7" ou "Lun-Ven 18h-22h"
  language?: string;     // langues parlées
};

export type CountryHelp = {
  countryCode: string;       // ISO-2 (FR, US, BR…)
  countryName: string;
  riskLevel: 'safe' | 'caution' | 'danger' | 'extreme'; // selon législation
  helplines: Helpline[];
  globalHotline?: string;    // fallback international
};

export const GLOBAL_HOTLINES: Helpline[] = [
  {
    name: 'ILGA — International LGBTI helpline directory',
    url: 'https://ilga.org/help-and-support',
    description: 'Annuaire mondial des associations LGBTI+ par pays',
    language: 'EN/ES/FR',
    hours: '24/7 (annuaire web)'
  },
  {
    name: 'Trans Lifeline (international)',
    url: 'https://translifeline.org',
    description: 'Soutien par et pour les personnes trans',
    language: 'EN/ES',
    hours: '24/7'
  },
  {
    name: 'It Gets Better Project',
    url: 'https://itgetsbetter.org/get-help/',
    description: 'Ressources globales jeunesse LGBTQ+',
    language: 'EN'
  }
];

const data: Record<string, CountryHelp> = {
  FR: {
    countryCode: 'FR', countryName: 'France', riskLevel: 'safe',
    helplines: [
      { name: 'SOS Homophobie', phone: '01 48 06 42 41', url: 'https://www.sos-homophobie.org', description: 'Écoute, soutien, signalement', hours: 'Tous les jours, horaires variables', language: 'FR' },
      { name: 'Le Refuge', phone: '06 31 59 69 50', url: 'https://le-refuge.org', description: 'Hébergement jeunes LGBT en rupture familiale', hours: '24/7', language: 'FR' },
      { name: 'Ligne Azur', phone: '0 810 20 30 40', url: 'https://www.ligneazur.org', description: 'Écoute anonyme jeunes LGBT', hours: 'Lun-Ven 18h-22h, Sam 16h-20h', language: 'FR' },
      { name: 'Espace Santé Trans', url: 'https://espacesantetrans.fr', description: 'Santé et droits trans/intersexe', language: 'FR' }
    ]
  },
  BE: {
    countryCode: 'BE', countryName: 'Belgique', riskLevel: 'safe',
    helplines: [
      { name: 'Tels Quels (Bruxelles)', phone: '02 512 45 87', url: 'https://www.telsquels.be', description: 'Écoute LGBT francophone', language: 'FR' },
      { name: 'Çavaria (NL)', url: 'https://cavaria.be', description: 'Fédération LGBTQI+ flamande', language: 'NL' }
    ]
  },
  CH: {
    countryCode: 'CH', countryName: 'Suisse', riskLevel: 'safe',
    helplines: [
      { name: 'LOS — Lesbenorganisation Schweiz', url: 'https://los.ch', description: 'Soutien lesbien Suisse', language: 'DE/FR/IT' },
      { name: 'Pink Cross', phone: '031 372 33 00', url: 'https://www.pinkcross.ch', description: 'Org gay nationale', language: 'DE/FR/IT' }
    ]
  },
  CA: {
    countryCode: 'CA', countryName: 'Canada', riskLevel: 'safe',
    helplines: [
      { name: 'LGBT Youthline', phone: '1-800-268-9688', url: 'https://www.youthline.ca', description: 'Soutien jeunes LGBT', language: 'EN/FR' },
      { name: 'Trans Lifeline Canada', phone: '1-877-330-6366', description: 'Soutien trans 24/7', language: 'EN' }
    ]
  },
  US: {
    countryCode: 'US', countryName: 'United States', riskLevel: 'safe',
    helplines: [
      { name: 'The Trevor Project', phone: '1-866-488-7386', url: 'https://www.thetrevorproject.org', description: 'Crisis line LGBTQ+ youth', hours: '24/7', language: 'EN/ES' },
      { name: 'GLBT National Help Center', phone: '1-888-843-4564', url: 'https://www.lgbthotline.org', description: 'Peer support', language: 'EN' },
      { name: 'Trans Lifeline', phone: '1-877-565-8860', description: 'Trans peer support', hours: '24/7', language: 'EN/ES' }
    ]
  },
  GB: {
    countryCode: 'GB', countryName: 'United Kingdom', riskLevel: 'safe',
    helplines: [
      { name: 'Switchboard LGBT+', phone: '0800 0119 100', url: 'https://switchboard.lgbt', description: 'National helpline', hours: '10am-10pm', language: 'EN' },
      { name: 'Mermaids (trans youth)', phone: '0808 801 0400', url: 'https://mermaidsuk.org.uk', description: 'Soutien jeunes trans + familles', language: 'EN' }
    ]
  },
  ES: {
    countryCode: 'ES', countryName: 'España', riskLevel: 'safe',
    helplines: [
      { name: 'FELGTBI+', phone: '91 360 46 05', url: 'https://felgtbi.org', description: 'Federación estatal', language: 'ES' },
      { name: 'Cogam (Madrid)', phone: '91 522 45 17', url: 'https://cogam.es', description: 'Centro LGBT Madrid', language: 'ES' }
    ]
  },
  IT: {
    countryCode: 'IT', countryName: 'Italia', riskLevel: 'caution',
    helplines: [
      { name: 'Gay Help Line', phone: '800 713 713', url: 'https://www.gayhelpline.it', description: 'Linea di ascolto', hours: '14h-20h', language: 'IT' },
      { name: 'Arcigay', url: 'https://www.arcigay.it', description: 'Associazione LGBT+', language: 'IT' }
    ]
  },
  PT: {
    countryCode: 'PT', countryName: 'Portugal', riskLevel: 'safe',
    helplines: [
      { name: 'ILGA Portugal', phone: '218 873 918', url: 'https://ilga-portugal.pt', description: 'Linha LGBT', language: 'PT' }
    ]
  },
  BR: {
    countryCode: 'BR', countryName: 'Brasil', riskLevel: 'caution',
    helplines: [
      { name: 'CVV — Centro de Valorização da Vida', phone: '188', url: 'https://www.cvv.org.br', description: 'Apoio emocional 24h', language: 'PT' },
      { name: 'Disque 100', phone: '100', description: 'Direitos humanos (LGBT incluí)', language: 'PT' }
    ]
  },
  DE: {
    countryCode: 'DE', countryName: 'Deutschland', riskLevel: 'safe',
    helplines: [
      { name: 'LSVD', url: 'https://www.lsvd.de', description: 'Verband Lesben und Schwule', language: 'DE' }
    ]
  },
  RU: {
    countryCode: 'RU', countryName: 'Россия / Russia', riskLevel: 'extreme',
    helplines: [
      { name: 'Russian LGBT Network', url: 'https://lgbtnet.org/en', description: 'Aide d\'urgence + relogement (utilise VPN+Tor pour accéder)', language: 'RU/EN' }
    ]
  },
  PL: {
    countryCode: 'PL', countryName: 'Polska', riskLevel: 'caution',
    helplines: [
      { name: 'Lambda Warszawa', phone: '22 628 52 22', url: 'https://lambdawarszawa.org', description: 'Telefon zaufania', language: 'PL/EN' }
    ]
  },
  HU: {
    countryCode: 'HU', countryName: 'Magyarország', riskLevel: 'caution',
    helplines: [
      { name: 'Háttér Society', phone: '+36 1 329 3380', url: 'https://en.hatter.hu', description: 'Information line', language: 'HU/EN' }
    ]
  }
};

export function getCountryHelp(code: string): CountryHelp | null {
  return data[code.toUpperCase()] || null;
}

export function listAllCountries(): string[] {
  return Object.keys(data);
}

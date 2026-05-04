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
    name: '🌍 ILGA World — Annuaire mondial LGBTI',
    url: 'https://ilga.org/help-and-support',
    description: 'Recherche par pays : associations, hotlines, refuges, support juridique',
    language: 'EN/ES/FR',
    hours: '24/7 (web)'
  },
  {
    name: '🏳️‍⚧️ Trans Lifeline (international)',
    phone: '+1-877-565-8860',
    url: 'https://translifeline.org',
    description: 'Pair-aidant·es trans (US/Canada principalement, mais accessible mondial)',
    language: 'EN/ES',
    hours: '24/7'
  },
  {
    name: '✨ It Gets Better Project',
    url: 'https://itgetsbetter.org/get-help/',
    description: 'Ressources globales jeunesse LGBTQ+ avec annuaire d\'aide par pays',
    language: 'EN/ES/PT/multilingue'
  },
  {
    name: '🆘 IASP — International Association for Suicide Prevention',
    url: 'https://www.iasp.info/crisis-centres-helplines/',
    description: 'Annuaire mondial des centres de prévention du suicide par pays',
    language: 'EN'
  },
  {
    name: '🏳️‍🌈 OutRight International — refuge LGBT en danger',
    url: 'https://outrightinternational.org',
    description: 'Aide d\'urgence aux personnes LGBT persécutées (asile, exfiltration, juridique)',
    language: 'EN/ES/FR'
  },
  {
    name: '👥 The Trevor Project (international text)',
    url: 'https://www.thetrevorproject.org/get-help/',
    description: 'Crisis text + chat pour LGBTQ+ moins de 25 ans (US-based mais chat web ouvert mondial)',
    language: 'EN/ES'
  },
  {
    name: '🚓 Asylum Access — demande d\'asile LGBT',
    url: 'https://asylumaccess.org',
    description: 'Aide juridique pour réfugié·es LGBT cherchant l\'asile',
    language: 'EN/ES/FR/AR'
  },
  {
    name: '🌐 Befrienders Worldwide',
    url: 'https://befrienders.org',
    description: 'Annuaire international de centres d\'écoute (suicide, détresse) — pays par pays',
    language: 'EN + multilingue'
  }
];

const data: Record<string, CountryHelp> = {
  FR: {
    countryCode: 'FR', countryName: 'France', riskLevel: 'safe',
    helplines: [
      // === LGBT spécifique ===
      { name: '🏳️‍🌈 Le Refuge — hébergement urgence jeunes LGBT', phone: '06 31 59 69 50', url: 'https://le-refuge.org', description: 'Hébergement immédiat jeunes 14-25 ans LGBT en rupture familiale, accompagnement psy et social', hours: '24/7', language: 'FR' },
      { name: 'SOS Homophobie', phone: '01 48 06 42 41', url: 'https://www.sos-homophobie.org', description: 'Écoute, soutien, signalement, accompagnement plainte', hours: 'Lun-Ven 18h-22h · Sam 14h-16h · Dim 18h-22h', language: 'FR' },
      { name: 'Ligne Azur', phone: '0 810 20 30 40', url: 'https://www.ligneazur.org', description: 'Écoute anonyme jeunes LGBT (questionnement, coming-out)', hours: 'Lun-Ven 18h-22h · Sam 16h-20h', language: 'FR' },
      { name: 'Espace Santé Trans', url: 'https://espacesantetrans.fr', description: 'Santé et droits trans/intersexe — annuaire pro friendly', language: 'FR' },

      // === URGENCES SILENCIEUSES & GÉNÉRALES ===
      { name: '🤫 114 — Appel d\'urgence SILENCIEUX (par SMS / vidéo)', phone: '114', url: 'https://www.urgence114.fr', description: 'Si tu es en danger et NE PEUX PAS PARLER : envoie un SMS au 114 ou utilise la visio LSF. Pour sourd·es, malentendant·es ET situations de danger nécessitant le silence (agression chez soi, violences conjugales en cours…)', hours: '24/7', language: 'FR + LSF' },
      { name: '🚨 17 — Police-Secours', phone: '17', description: 'Urgences police, danger immédiat', hours: '24/7', language: 'FR' },
      { name: '📞 112 — Numéro européen d\'urgence', phone: '112', description: 'Tous types d\'urgence dans toute l\'UE (police, pompiers, SAMU)', hours: '24/7', language: 'FR/EN' },

      // === HARCÈLEMENT SCOLAIRE & CYBER ===
      { name: '🏫 3018 — Harcèlement scolaire & cyberharcèlement', phone: '3018', url: 'https://www.3018.fr', description: 'Net Écoute — anonyme, confidentiel, gratuit. Accompagne les jeunes victimes de harcèlement à l\'école ou en ligne (insultes, photos diffusées, exclusion). Tchat possible aussi.', hours: '7j/7 · 9h-23h', language: 'FR' },
      { name: '📚 3020 — Non au harcèlement', phone: '3020', url: 'https://www.education.gouv.fr/non-au-harcelement', description: 'Plateforme officielle Éducation Nationale — signalement et accompagnement', hours: 'Lun-Ven 9h-20h · Sam 9h-18h', language: 'FR' },

      // === SANTÉ MENTALE & ÉCOUTE ===
      { name: '🆘 3114 — Prévention suicide', phone: '3114', url: 'https://3114.fr', description: 'Anonyme, gratuit, confidentiel, prêté par des soignant·es', hours: '24/7', language: 'FR' },
      { name: '🌱 Fil Santé Jeunes (jeunes 12-25)', phone: '0 800 235 236', url: 'https://www.filsantejeunes.com', description: 'Anonyme, gratuit, écoute santé/sexualité/mal-être/addictions', hours: '7j/7 · 9h-23h', language: 'FR' },
      { name: '🤝 SOS Amitié — écoute (anonyme, 24/7)', phone: '09 72 39 40 50', url: 'https://www.sos-amitie.com', description: 'Pour parler quand ça va mal, sans jugement, par téléphone ou tchat', hours: '24/7', language: 'FR' },

      // === VIOLENCES ===
      { name: '💔 3919 — Violences conjugales (tous publics)', phone: '3919', url: 'https://arretonslesviolences.gouv.fr', description: 'Anonyme, gratuit, confidentiel — femmes, hommes ET non-binaires victimes', hours: '24/7', language: 'FR + 9 langues' },
      { name: '👨 SOS Hommes Battus', phone: '0 800 122 800', description: 'Spécifiquement pour hommes victimes de violences conjugales', hours: 'Lun-Ven 9h-19h', language: 'FR' },
      { name: '👶 119 — Allô Enfance en Danger', phone: '119', url: 'https://www.allo119.gouv.fr', description: 'Mineur·e en danger ou témoin', hours: '24/7', language: 'FR' },
      { name: '🏠 115 — Samu Social (sans-abri)', phone: '115', description: 'Hébergement urgence', hours: '24/7', language: 'FR' },
      { name: '🌐 France Victimes', phone: '116 006', url: 'https://www.france-victimes.fr', description: 'Aide aux victimes (toutes infractions)', hours: '7j/7 · 9h-19h', language: 'FR' }
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
      { name: '🚨 911 — Police/Fire/EMS', phone: '911', description: 'All emergencies', hours: '24/7', language: 'EN' },
      { name: '🆘 988 — Suicide & Crisis Lifeline', phone: '988', url: 'https://988lifeline.org', description: 'Press 3 for LGBTQ+ specialized support (Trevor Project)', hours: '24/7', language: 'EN/ES' },
      { name: '🏳️‍🌈 The Trevor Project (LGBTQ+ youth)', phone: '1-866-488-7386', url: 'https://www.thetrevorproject.org', description: 'Crisis intervention + suicide prevention LGBTQ+ under 25 — text START to 678-678', hours: '24/7', language: 'EN/ES' },
      { name: '🏳️‍⚧️ Trans Lifeline', phone: '1-877-565-8860', url: 'https://translifeline.org', description: 'Trans peer support (by and for trans people)', hours: '24/7', language: 'EN/ES' },
      { name: 'GLBT National Help Center', phone: '1-888-843-4564', url: 'https://www.lgbthotline.org', description: 'Peer-support all ages', hours: 'Mon-Fri 1pm-9pm PT, Sat 9am-2pm', language: 'EN' },
      { name: 'GLBT Youth Talkline', phone: '1-800-246-7743', description: 'Youth 25 & under', language: 'EN' },
      { name: '💔 National Domestic Violence Hotline', phone: '1-800-799-7233', url: 'https://www.thehotline.org', description: 'Confidential, all genders, LGBTQ+ informed', hours: '24/7', language: 'EN/ES + 200 langs' },
      { name: '🏫 StopBullying.gov', url: 'https://www.stopbullying.gov', description: 'Federal anti-bullying resources', language: 'EN/ES' },
      { name: 'Lambda Legal — LGBTQ+ legal help', phone: '1-866-542-8336', url: 'https://www.lambdalegal.org', description: 'Discrimination, civil rights, asylum', language: 'EN/ES' }
    ]
  },
  GB: {
    countryCode: 'GB', countryName: 'United Kingdom', riskLevel: 'safe',
    helplines: [
      { name: '🚨 999 — Police / Ambulance / Fire', phone: '999', description: 'All emergencies', hours: '24/7', language: 'EN' },
      { name: '🤫 SilentSolution — call 999 then press 55', phone: '999', description: 'Silent emergency call: dial 999, listen, press 5-5 if you can\'t speak (police will be alerted)', hours: '24/7', language: 'EN' },
      { name: '🏳️‍🌈 Switchboard LGBT+', phone: '0800 0119 100', url: 'https://switchboard.lgbt', description: 'National listening service, info & referrals', hours: '10am-10pm daily', language: 'EN' },
      { name: '🏳️‍⚧️ Mermaids (trans youth + families)', phone: '0808 801 0400', url: 'https://mermaidsuk.org.uk', description: 'Trans/non-binary under 20 & families', language: 'EN' },
      { name: 'LGBT Foundation', phone: '0345 3 30 30 30', url: 'https://lgbt.foundation', description: 'Helpline, counselling, sexual health', hours: 'Mon-Fri 9am-9pm', language: 'EN' },
      { name: 'Galop — LGBT+ Anti-violence', phone: '0800 999 5428', url: 'https://galop.org.uk', description: 'Hate crime, domestic abuse, sexual violence (LGBT+)', language: 'EN' },
      { name: '🆘 Samaritans', phone: '116 123', url: 'https://samaritans.org', description: 'Emotional support 24/7', hours: '24/7', language: 'EN' },
      { name: '🏫 NSPCC Childline', phone: '0800 1111', description: 'Children & young people', hours: '24/7', language: 'EN' }
    ]
  },
  ES: {
    countryCode: 'ES', countryName: 'España', riskLevel: 'safe',
    helplines: [
      { name: '🚨 112 — Emergencias', phone: '112', description: 'Toda urgencia', hours: '24/7', language: 'ES/EN/CA' },
      { name: '🏳️‍🌈 FELGTBI+', phone: '91 360 46 05', url: 'https://felgtbi.org', description: 'Federación estatal LGTBI+', language: 'ES' },
      { name: 'Cogam (Madrid)', phone: '91 522 45 17', url: 'https://cogam.es', description: 'Centro LGBT Madrid — orientación y servicios', language: 'ES' },
      { name: '💔 016 — Violencia de género', phone: '016', description: 'Atención 24h, 53 idiomas, no deja rastro en factura', hours: '24/7', language: '53 idiomas' },
      { name: '🆘 024 — Línea Atención Conducta Suicida', phone: '024', description: 'Atención psicológica anónima 24/7', hours: '24/7', language: 'ES/EN' },
      { name: 'Teléfono de la Esperanza', phone: '717 003 717', url: 'https://telefonodelaesperanza.org', description: 'Apoyo emocional', hours: '24/7', language: 'ES' },
      { name: '🏫 ANAR — Acoso escolar (menores)', phone: '900 20 20 10', url: 'https://www.anar.org', description: 'Niños y adolescentes víctimas de acoso', hours: '24/7', language: 'ES' }
    ]
  },
  IT: {
    countryCode: 'IT', countryName: 'Italia', riskLevel: 'caution',
    helplines: [
      { name: '🚨 112 — Numero Unico Emergenza', phone: '112', description: 'Polizia/Ambulanza/Vigili del Fuoco', hours: '24/7', language: 'IT/EN' },
      { name: '🏳️‍🌈 Gay Help Line', phone: '800 713 713', url: 'https://www.gayhelpline.it', description: 'Linea nazionale LGBT+ (UNAR)', hours: '14h-20h', language: 'IT' },
      { name: 'Arcigay', url: 'https://www.arcigay.it', description: 'Associazione nazionale LGBT+', language: 'IT' },
      { name: '💔 1522 — Antiviolenza Donna', phone: '1522', description: 'Donne vittime di violenza/stalking', hours: '24/7', language: 'IT + 4 lingue' },
      { name: '🆘 Telefono Amico', phone: '02 2327 2327', url: 'https://www.telefonoamico.it', description: 'Sostegno emotivo', hours: '10-24', language: 'IT' },
      { name: '🏫 114 Emergenza Infanzia', phone: '114', description: 'Bambini in pericolo (anche bullismo)', hours: '24/7', language: 'IT' }
    ]
  },
  PT: {
    countryCode: 'PT', countryName: 'Portugal', riskLevel: 'safe',
    helplines: [
      { name: '🚨 112 — Número de Emergência', phone: '112', description: 'Toda emergência', hours: '24/7', language: 'PT/EN' },
      { name: '🏳️‍🌈 ILGA Portugal', phone: '218 873 918', url: 'https://ilga-portugal.pt', description: 'Linha LGBT — apoio jurídico, social', language: 'PT' },
      { name: '💔 800 202 148 — Violência Doméstica', phone: '800 202 148', description: 'Linha gratuita anónima', hours: '24/7', language: 'PT' },
      { name: '🆘 SOS Voz Amiga', phone: '213 544 545', description: 'Apoio emocional', hours: '21h-24h', language: 'PT' }
    ]
  },
  BR: {
    countryCode: 'BR', countryName: 'Brasil', riskLevel: 'caution',
    helplines: [
      { name: '🚨 190 — Polícia Militar', phone: '190', description: 'Emergência policial', hours: '24/7', language: 'PT' },
      { name: '🚑 192 — SAMU', phone: '192', description: 'Emergência médica', hours: '24/7', language: 'PT' },
      { name: '🆘 188 — CVV (Centro de Valorização da Vida)', phone: '188', url: 'https://www.cvv.org.br', description: 'Apoio emocional / prevenção suicídio', hours: '24/7', language: 'PT' },
      { name: '🏳️‍🌈 Disque 100 — Direitos Humanos (inclui LGBT+)', phone: '100', description: 'Denúncia LGBTfobia, racismo, violência', hours: '24/7', language: 'PT' },
      { name: '💔 180 — Central de Atendimento à Mulher', phone: '180', description: 'Violência doméstica/sexual', hours: '24/7', language: 'PT' },
      { name: '👶 Disque 100 (criança e adolescente)', phone: '100', description: 'Crianças/adolescentes em situação de violência', hours: '24/7', language: 'PT' },
      { name: 'Aliança Nacional LGBTI+', url: 'https://aliancalgbti.org.br', description: 'Rede de organizações brasileiras', language: 'PT' }
    ]
  },
  DE: {
    countryCode: 'DE', countryName: 'Deutschland', riskLevel: 'safe',
    helplines: [
      { name: '🚨 110 / 112 — Notruf', phone: '112', description: '110 Polizei · 112 Feuerwehr/Rettung', hours: '24/7', language: 'DE/EN' },
      { name: '🏳️‍🌈 LSVD — Lesben- und Schwulenverband', url: 'https://www.lsvd.de', description: 'Beratung & politische Vertretung', language: 'DE' },
      { name: 'Mannschaft Magazin / Beratungsstellen LGBT', url: 'https://www.queer.de/beratung.php', description: 'Verzeichnis Beratungsstellen', language: 'DE' },
      { name: '💔 Hilfetelefon Gewalt gegen Frauen', phone: '08000 116 016', url: 'https://www.hilfetelefon.de', description: 'Anonym, kostenfrei, 18 Sprachen', hours: '24/7', language: 'DE + 17' },
      { name: '🆘 Telefonseelsorge', phone: '0800 111 0 111', description: 'Seelische Krise', hours: '24/7', language: 'DE' },
      { name: '🏫 Nummer gegen Kummer (Kinder)', phone: '116 111', url: 'https://www.nummergegenkummer.de', description: 'Kinder & Jugendliche', hours: 'Mo-Sa 14-20h', language: 'DE' }
    ]
  },
  AU: {
    countryCode: 'AU', countryName: 'Australia', riskLevel: 'safe',
    helplines: [
      { name: '🚨 000 — Triple Zero', phone: '000', description: 'Police/Ambulance/Fire', hours: '24/7', language: 'EN' },
      { name: '🏳️‍🌈 QLife', phone: '1800 184 527', url: 'https://qlife.org.au', description: 'LGBTI+ peer support & referral', hours: '3pm-midnight daily', language: 'EN' },
      { name: 'Lifeline Australia', phone: '13 11 14', url: 'https://www.lifeline.org.au', description: 'Crisis support', hours: '24/7', language: 'EN' },
      { name: '🏫 Kids Helpline', phone: '1800 55 1800', description: 'Kids 5-25', hours: '24/7', language: 'EN' }
    ]
  },
  IN: {
    countryCode: 'IN', countryName: 'India', riskLevel: 'caution',
    helplines: [
      { name: '🚨 112 — All emergencies', phone: '112', description: 'Police/Fire/Ambulance', hours: '24/7', language: 'EN/HI + 22' },
      { name: '🏳️‍🌈 Sahodari Foundation', url: 'https://sahodari.org', description: 'Trans + sexual minorities support', language: 'EN/Tamil' },
      { name: 'iCall (TISS)', phone: '9152987821', url: 'https://icallhelpline.org', description: 'Mental health, LGBT-friendly', language: 'EN/HI' },
      { name: 'Vandrevala Foundation', phone: '1860 2662 345', description: 'Mental health crisis 24/7', hours: '24/7', language: 'EN/HI + others' }
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

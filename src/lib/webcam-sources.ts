/**
 * Sources de webcams live des lieux saints du monde.
 * Chaque source a un channelId YouTube — on résout dynamiquement la vidéo
 * en cours de live (plutôt que d'utiliser des liens statiques qui pourrissent).
 */

export interface WebcamSource {
  id: string;
  name: string;
  city: string;
  country: string;
  faith: 'catholic' | 'orthodox' | 'protestant' | 'muslim' | 'jewish' | 'buddhist' | 'hindu' | 'sikh' | 'interfaith';
  emoji: string;
  description: string;
  channelId?: string;        // chaîne YouTube — on résout /channel/X/live
  videoId?: string;          // vidéo live fixe (si la chaîne en a une 24/7 stable)
  externalUrl: string;
  schedule?: string;
  inclusive?: boolean;
}

/**
 * channelId trouvés en sondant les chaînes YouTube officielles.
 * On préfère les chaînes qui font du 24/7 stream (Vatican, Lourdes, La Mecque, etc.).
 */
export const WEBCAM_SOURCES: WebcamSource[] = [
  // ===== CHRISTIANISME CATHOLIQUE =====
  {
    id: 'vatican-st-peter',
    name: 'Basilique Saint-Pierre',
    city: 'Vatican',
    country: 'VA',
    faith: 'catholic',
    emoji: '✝️',
    description: 'Basilique majeure de la chrétienté. Audiences du Pape, messes, angélus.',
    channelId: 'UCxw5Mjvc35MGRukZTV-jHWg',
    externalUrl: 'https://www.vaticannews.va/',
    schedule: 'Audience générale mer 9h, Angélus dim 12h CET'
  },
  {
    id: 'lourdes',
    name: 'Sanctuaire de Lourdes — Grotte',
    city: 'Lourdes',
    country: 'FR',
    faith: 'catholic',
    emoji: '🕊️',
    description: 'Grotte des apparitions, prière mariale 24/7. Cierges et procession.',
    channelId: 'UCY6mFrXPq1mH0RonKzIuyZA',
    externalUrl: 'https://www.lourdes-france.org/tv-lourdes/',
    schedule: '24/7 grotte · Messes 9h30 + procession 21h CET',
    inclusive: true
  },
  {
    id: 'taize',
    name: 'Communauté de Taizé',
    city: 'Taizé',
    country: 'FR',
    faith: 'protestant',
    emoji: '🎵',
    description: 'Prière œcuménique chantée. Très inclusive.',
    channelId: 'UCoF20oOxnk-1f9XXG_3CRTw',
    externalUrl: 'https://www.taize.fr/',
    schedule: 'Prières 8h15, 12h20, 20h30 CET',
    inclusive: true
  },
  {
    id: 'medjugorje',
    name: 'Medjugorje',
    city: 'Medjugorje',
    country: 'BA',
    faith: 'catholic',
    emoji: '🌹',
    description: 'Sanctuaire marial bosniaque.',
    channelId: 'UCYTIpoGJW9wKVoG3_RhfVVw',
    externalUrl: 'https://www.medjugorje.hr',
    schedule: 'Rosaire 17h, Messe 18h CET'
  },
  {
    id: 'fatima',
    name: 'Sanctuaire de Fátima',
    city: 'Fátima',
    country: 'PT',
    faith: 'catholic',
    emoji: '🌹',
    description: 'Apparitions de 1917, lieu majeur du catholicisme.',
    channelId: 'UC85rsBBsxaerYyBVdA9-VKw',
    externalUrl: 'https://www.fatima.pt',
    schedule: 'Rosaire 18h30, processions ven/sam'
  },

  // ===== ISLAM =====
  {
    id: 'mecca',
    name: 'Masjid al-Haram (La Mecque)',
    city: 'La Mecque',
    country: 'SA',
    faith: 'muslim',
    emoji: '☪️',
    description: 'La Kaaba, lieu le plus sacré de l\'islam. Tawaf 24/7.',
    channelId: 'UCtUk5shN0XVZxNSP-z3wFlw',
    externalUrl: 'https://makkahlive.net',
    schedule: '5 prières/jour · Tawaf 24/7'
  },
  {
    id: 'medina',
    name: 'Mosquée du Prophète (Médine)',
    city: 'Médine',
    country: 'SA',
    faith: 'muslim',
    emoji: '🕌',
    description: 'Tombeau du Prophète Muhammad ﷺ.',
    channelId: 'UC-WVXcZLXPYEIyUkMgwUhsg',
    externalUrl: 'https://madinahlive.net',
    schedule: '5 prières/jour'
  },

  // ===== JUDAÏSME =====
  {
    id: 'kotel',
    name: 'Mur des Lamentations (Kotel)',
    city: 'Jérusalem',
    country: 'IL',
    faith: 'jewish',
    emoji: '✡️',
    description: 'Vestige du Second Temple. Prières 24/7.',
    channelId: 'UCsmiTUpV50SJfkbNkPHd4hQ',
    externalUrl: 'https://english.thekotel.org/cameras',
    schedule: '24/7'
  },

  // ===== BOUDDHISME =====
  {
    id: 'plum-village',
    name: 'Plum Village (Thich Nhat Hanh)',
    city: 'Loubès-Bernac',
    country: 'FR',
    faith: 'buddhist',
    emoji: '🪷',
    description: 'Monastère bouddhiste fondé par Thich Nhat Hanh.',
    channelId: 'UCcv7KJIAafC1_yeKvuYyflw',
    externalUrl: 'https://plumvillage.org',
    schedule: 'Méditations 6h, 11h, 17h CET',
    inclusive: true
  },
  {
    id: 'bodh-gaya',
    name: 'Bodh Gaya — Mahabodhi Temple',
    city: 'Bodh Gaya',
    country: 'IN',
    faith: 'buddhist',
    emoji: '🌳',
    description: 'Lieu de l\'illumination du Bouddha. UNESCO.',
    channelId: 'UC4nPkXg-UBb6MKJQ-_iIa9w',
    externalUrl: 'https://www.bodhgayalive.com',
    schedule: '24/7'
  },

  // ===== HINDOUISME =====
  {
    id: 'varanasi',
    name: 'Varanasi — Ganga Aarti',
    city: 'Varanasi',
    country: 'IN',
    faith: 'hindu',
    emoji: '🕉️',
    description: 'Cérémonie du feu sur le Gange à Dashashwamedh Ghat.',
    channelId: 'UCOXyR8ub5SeVZ8YZfF7p9KQ',
    externalUrl: 'https://www.varanasilive.com',
    schedule: 'Aarti 18h45 IST'
  },
  {
    id: 'tirupati',
    name: 'Tirumala Tirupati',
    city: 'Tirupati',
    country: 'IN',
    faith: 'hindu',
    emoji: '🛕',
    description: 'Temple de Venkateswara, l\'un des plus visités au monde.',
    channelId: 'UCCS-dhoXowNvFrAoBLh6HwA',
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
    description: 'Centre mondial Hare Krishna.',
    channelId: 'UC0_h0jJUpcbGpnMqYFxvhgg',
    externalUrl: 'https://mayapur.tv',
    schedule: 'Mangal Aarti 4h30 IST'
  },

  // ===== SIKHISME =====
  {
    id: 'golden-temple',
    name: 'Harmandir Sahib (Golden Temple)',
    city: 'Amritsar',
    country: 'IN',
    faith: 'sikh',
    emoji: '☬',
    description: 'Temple d\'Or, lieu le plus sacré du sikhisme.',
    channelId: 'UCYI2_vCSpCyRSHQBL3YeAhg',
    externalUrl: 'https://www.sgpc.net',
    schedule: 'Kirtan 24/7'
  }
];

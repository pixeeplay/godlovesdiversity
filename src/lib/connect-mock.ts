/**
 * Données mock pour les 3 modes du réseau social GLD Connect.
 * Effaçables depuis /admin/connect (super-admin uniquement).
 * Quand la DB sera branchée, on bascule via Setting `connect.useMockData`.
 */

export type ConnectMode = 'mur' | 'rencontres' | 'pro';

export type MockUser = {
  id: string;
  handle: string;
  name: string;
  age?: number;
  city: string;
  identity: string;        // ex: 'gay', 'lesbienne', 'trans', 'bi', 'allié·e'
  tradition: string;       // ex: 'catholique inclusif', 'soufi', 'agnostique'
  bio: string;
  avatarColor: [string, string]; // gradient pour avatar
  verified: boolean;
};

export type MockPost = {
  id: string;
  authorHandle: string;
  type: 'post' | 'temoignage' | 'priere' | 'photo' | 'event';
  text: string;
  createdAt: string; // ISO
  likes: number;
  prayers: number;
  comments: number;
  imageGradient?: [string, string]; // simulation photo
  circle?: string;
};

export type MockProfileSwipe = {
  userHandle: string;
  intentions: ('amour' | 'amitie_spi' | 'mentor' | 'coloc')[];
  quote?: string;
  distanceKm: number;
};

export type MockProRecord = {
  userHandle: string;
  category: 'pasteur' | 'therapeute' | 'avocat' | 'coach' | 'photographe' | 'lieu';
  categoryLabel: string;
  jobTitle: string;
  pitch: string;
  recommendations: number;
  available: boolean;
  badge?: string;
};

export const MOCK_USERS: MockUser[] = [
  { id: 'u1', handle: 'marc-antoine', name: 'Marc-Antoine', age: 34, city: 'Lyon',     identity: 'gay',       tradition: 'catholique inclusif', bio: 'Catholique queer, fils d\'une famille très pratiquante. J\'aide les autres à concilier foi et identité.', avatarColor: ['#D4537E', '#534AB7'], verified: true },
  { id: 'u2', handle: 'lea-soufie',   name: 'Léa',          age: 29, city: 'Marseille',identity: 'lesbienne', tradition: 'soufie',              bio: 'Doctorante en théologie. J\'organise des iftars inclusifs pendant le Ramadan.', avatarColor: ['#1D9E75', '#378ADD'], verified: true },
  { id: 'u3', handle: 'sami-r',       name: 'Sami',         age: 32, city: 'Bordeaux', identity: 'gay',       tradition: 'soufi inclusif',      bio: 'Musulman queer en chemin. Je cherche quelqu\'un qui sait que la spiritualité et l\'amour ne sont pas opposés. Bonus si tu connais Rumi par cœur.', avatarColor: ['#BA7517', '#D85A30'], verified: true },
  { id: 'u4', handle: 'yael-c',       name: 'Yaël',         age: 27, city: 'Paris',    identity: 'non-binaire',tradition: 'juive libérale',     bio: 'Ingé logiciel, trans non-binaire, très impliqué·e dans la communauté Beit Haverim.', avatarColor: ['#534AB7', '#185FA5'], verified: true },
  { id: 'u5', handle: 'ines-m',       name: 'Inès',         age: 41, city: 'Toulouse', identity: 'bi',        tradition: 'agnostique',          bio: 'Mère de 2 enfants. Mentor pour personnes en coming-out tardif.', avatarColor: ['#993556', '#D4537E'], verified: true },
  { id: 'u6', handle: 'remi-faure',   name: 'Dr Rémi Faure',age: 48, city: 'Paris',    identity: 'gay',       tradition: 'protestant libéral',  bio: 'Psychologue clinicien, 12 ans d\'accompagnement personnes LGBT issues de milieux religieux.', avatarColor: ['#185FA5', '#1D9E75'], verified: true },
  { id: 'u7', handle: 'pere-etienne', name: 'Père Étienne Mallet', age: 52, city: 'Lyon', identity: 'allié·e', tradition: 'catholique inclusif', bio: 'Aumônier diocésain, ancien membre du Hospitalier Saint-Eustache. Accompagnement spirituel des couples LGBT.', avatarColor: ['#D85A30', '#BA7517'], verified: true },
  { id: 'u8', handle: 'sarah-photo',  name: 'Sarah Levin',  age: 31, city: 'Lyon',     identity: 'lesbienne', tradition: 'juive réformée',      bio: 'Photographe spécialisée mariages interreligieux et cérémonies inclusives.', avatarColor: ['#0F6E56', '#1D9E75'], verified: true },
  { id: 'u9', handle: 'marius-k',     name: 'Marius',       age: 26, city: 'Nantes',   identity: 'gay',       tradition: 'agnostique',          bio: 'Étudiant en master, cherche colocs LGBT-friendly + groupe de discussion philo.', avatarColor: ['#7F77DD', '#5DCAA5'], verified: false },
];

export const MOCK_POSTS: MockPost[] = [
  {
    id: 'p1', authorHandle: 'marc-antoine', type: 'temoignage',
    text: 'Hier à la messe de St-Just on m\'a demandé si je « priais pour ma guérison ». J\'ai répondu que je priais surtout pour celle des cœurs fermés. Sourires gênés, applaudissements discrets de 3 mamies au fond. La grâce circule, juste pas dans le sens prévu.',
    createdAt: '2026-05-04T14:30:00Z', likes: 47, prayers: 12, comments: 8,
    imageGradient: ['#FBEAF0', '#EEEDFE']
  },
  {
    id: 'p2', authorHandle: 'lea-soufie', type: 'event',
    text: 'Iftar collectif samedi 18h chez moi — table mixte, tout le monde bienvenu. RSVP en commentaire 🌙',
    createdAt: '2026-05-04T11:00:00Z', likes: 34, prayers: 6, comments: 22,
    circle: 'Ramadan inclusif'
  },
  {
    id: 'p3', authorHandle: 'yael-c', type: 'priere',
    text: 'Demande de prière : ma mère ne me parle plus depuis ma transition. Si vous pouvez tenir une intention pour qu\'on se reparle, ça m\'aiderait énormément. Merci à toustes ❤️',
    createdAt: '2026-05-04T08:15:00Z', likes: 89, prayers: 142, comments: 31
  },
  {
    id: 'p4', authorHandle: 'ines-m', type: 'post',
    text: 'Mentorat coming-out tardif : j\'ai 4 places dispo en mai. Si tu hésites à parler à ta famille passé 35 ans, écris-moi en MP. Premier appel gratuit.',
    createdAt: '2026-05-03T19:45:00Z', likes: 56, prayers: 8, comments: 14
  },
  {
    id: 'p5', authorHandle: 'sarah-photo', type: 'photo',
    text: 'Cérémonie d\'union de Marc & Antoine la semaine dernière à Lyon. 2 confessions, 1 amour, 0 jugement.',
    createdAt: '2026-05-03T16:20:00Z', likes: 213, prayers: 34, comments: 47,
    imageGradient: ['#F4C0D1', '#9FE1CB']
  },
];

export const MOCK_SWIPE_DECK: MockProfileSwipe[] = [
  { userHandle: 'sami-r',    intentions: ['amour', 'amitie_spi'],         quote: 'Je suis l\'oiseau du jardin de l\'autre monde — Rûmî',                       distanceKm: 8 },
  { userHandle: 'yael-c',    intentions: ['amour', 'mentor'],              quote: 'L\'identité, c\'est ce que tu choisis chaque matin.',                       distanceKm: 412 },
  { userHandle: 'marius-k',  intentions: ['amitie_spi', 'coloc'],          quote: 'Cherche coloc qui aime débattre tard et faire la vaisselle tôt.',          distanceKm: 187 },
  { userHandle: 'ines-m',    intentions: ['mentor'],                       quote: 'Tout ce que tu n\'oses pas dire, dis-le moi en premier — on s\'entraîne.', distanceKm: 245 },
  { userHandle: 'lea-soufie',intentions: ['amour', 'amitie_spi'],          quote: 'Quiconque s\'efforce, s\'efforce pour soi-même — Coran 29:6',              distanceKm: 320 },
];

export const MOCK_PRO_DIRECTORY: MockProRecord[] = [
  {
    userHandle: 'remi-faure', category: 'therapeute',
    categoryLabel: '🧠 Thérapeute LGBT-affirmatif',
    jobTitle: 'Psychologue clinicien',
    pitch: 'Psychologue, 12 ans d\'accompagnement personnes LGBT issues de milieux religieux. Premier RDV gratuit pour membres GLD.',
    recommendations: 7, available: true, badge: 'Recommandé par 7 membres'
  },
  {
    userHandle: 'pere-etienne', category: 'pasteur',
    categoryLabel: '⛪ Aumônier inclusif',
    jobTitle: 'Aumônier diocésain',
    pitch: 'Disponible pour entretiens, accompagnement spirituel, bénédictions de couples (privé). Diocèse de Lyon.',
    recommendations: 12, available: true, badge: 'Vérifié diocèse'
  },
  {
    userHandle: 'sarah-photo', category: 'photographe',
    categoryLabel: '📸 Photographe mariage inclusif',
    jobTitle: 'Photographe pro',
    pitch: 'Spécialisée mariages interreligieux, PACS, cérémonies de bénédiction. Devis sur mesure, sliding scale.',
    recommendations: 18, available: true
  },
  {
    userHandle: 'ines-m', category: 'coach',
    categoryLabel: '🎤 Coach coming-out',
    jobTitle: 'Coach certifiée',
    pitch: 'Mentorat pour coming-out tardif (35 ans+) ou coming-out professionnel. Sliding scale.',
    recommendations: 5, available: true
  },
];

export function getUser(handle: string): MockUser | undefined {
  return MOCK_USERS.find((u) => u.handle === handle);
}

export const INTENTION_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  amour:      { label: '💖 Amour',         color: '#4A1B0C', bg: '#FAECE7' },
  amitie_spi: { label: '🕊 Amitié spi',    color: '#04342C', bg: '#E1F5EE' },
  mentor:     { label: '🎓 Mentor',         color: '#26215C', bg: '#EEEDFE' },
  coloc:      { label: '🏠 Coloc',          color: '#412402', bg: '#FAEEDA' }
};

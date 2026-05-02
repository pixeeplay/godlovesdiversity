/**
 * Pays où l'homosexualité est criminalisée ou très réprimée (sources : ILGA World Report, Amnesty International).
 * Codes ISO 3166-1 alpha-2.
 *
 * Cette liste sert à afficher un avertissement à l'utilisateur quand il prend une photo
 * géolocalisée dans un pays à risque, avant l'envoi.
 */

export const RISK_COUNTRIES: Record<string, { name: string; level: 'illegal' | 'death' | 'persecuted' }> = {
  AF: { name: 'Afghanistan',       level: 'death' },
  DZ: { name: 'Algérie',           level: 'illegal' },
  BD: { name: 'Bangladesh',        level: 'illegal' },
  BB: { name: 'Barbade',           level: 'illegal' },
  BN: { name: 'Brunei',            level: 'death' },
  BI: { name: 'Burundi',           level: 'illegal' },
  CM: { name: 'Cameroun',          level: 'illegal' },
  KM: { name: 'Comores',           level: 'illegal' },
  EG: { name: 'Égypte',            level: 'persecuted' },
  ER: { name: 'Érythrée',          level: 'illegal' },
  SZ: { name: 'Eswatini',          level: 'illegal' },
  ET: { name: 'Éthiopie',          level: 'illegal' },
  GM: { name: 'Gambie',            level: 'illegal' },
  GH: { name: 'Ghana',             level: 'illegal' },
  GD: { name: 'Grenade',           level: 'illegal' },
  GN: { name: 'Guinée',            level: 'illegal' },
  GY: { name: 'Guyana',            level: 'illegal' },
  IR: { name: 'Iran',              level: 'death' },
  IQ: { name: 'Irak',              level: 'illegal' },
  JM: { name: 'Jamaïque',          level: 'illegal' },
  KE: { name: 'Kenya',             level: 'illegal' },
  KI: { name: 'Kiribati',          level: 'illegal' },
  KW: { name: 'Koweït',            level: 'illegal' },
  LB: { name: 'Liban',             level: 'illegal' },
  LR: { name: 'Liberia',           level: 'illegal' },
  LY: { name: 'Libye',             level: 'illegal' },
  MW: { name: 'Malawi',            level: 'illegal' },
  MY: { name: 'Malaisie',          level: 'illegal' },
  MV: { name: 'Maldives',          level: 'illegal' },
  MR: { name: 'Mauritanie',        level: 'death' },
  MA: { name: 'Maroc',             level: 'illegal' },
  MM: { name: 'Myanmar',           level: 'illegal' },
  NA: { name: 'Namibie',           level: 'persecuted' },
  NG: { name: 'Nigeria',           level: 'death' },
  KP: { name: 'Corée du Nord',     level: 'persecuted' },
  OM: { name: 'Oman',              level: 'illegal' },
  PK: { name: 'Pakistan',          level: 'illegal' },
  PS: { name: 'Palestine',         level: 'illegal' },
  PG: { name: 'Papouasie-Nouvelle-Guinée', level: 'illegal' },
  QA: { name: 'Qatar',             level: 'death' },
  RU: { name: 'Russie',            level: 'persecuted' },
  KN: { name: 'Saint-Kitts-et-Nevis', level: 'illegal' },
  LC: { name: 'Sainte-Lucie',      level: 'illegal' },
  VC: { name: 'Saint-Vincent-et-les-Grenadines', level: 'illegal' },
  WS: { name: 'Samoa',             level: 'illegal' },
  SA: { name: 'Arabie saoudite',   level: 'death' },
  SN: { name: 'Sénégal',           level: 'illegal' },
  SL: { name: 'Sierra Leone',      level: 'illegal' },
  SG: { name: 'Singapour',         level: 'persecuted' },
  SB: { name: 'Îles Salomon',      level: 'illegal' },
  SO: { name: 'Somalie',           level: 'death' },
  SS: { name: 'Soudan du Sud',     level: 'illegal' },
  LK: { name: 'Sri Lanka',         level: 'illegal' },
  SD: { name: 'Soudan',            level: 'death' },
  SY: { name: 'Syrie',             level: 'illegal' },
  TZ: { name: 'Tanzanie',          level: 'illegal' },
  TG: { name: 'Togo',              level: 'illegal' },
  TO: { name: 'Tonga',             level: 'illegal' },
  TN: { name: 'Tunisie',           level: 'illegal' },
  TM: { name: 'Turkménistan',      level: 'illegal' },
  TV: { name: 'Tuvalu',            level: 'illegal' },
  AE: { name: 'Émirats arabes unis', level: 'death' },
  UG: { name: 'Ouganda',           level: 'death' },
  UZ: { name: 'Ouzbékistan',       level: 'illegal' },
  YE: { name: 'Yémen',             level: 'death' },
  ZM: { name: 'Zambie',            level: 'illegal' },
  ZW: { name: 'Zimbabwe',          level: 'illegal' }
};

export function getRiskInfo(countryCode?: string | null) {
  if (!countryCode) return null;
  return RISK_COUNTRIES[countryCode.toUpperCase()] || null;
}

/** Reverse-géocode rapide : on accepte aussi un nom de pays en français/anglais courant */
const NAME_TO_CODE: Record<string, string> = {
  iran: 'IR', 'arabia': 'SA', 'arabie saoudite': 'SA', russie: 'RU', russia: 'RU',
  qatar: 'QA', 'emirats arabes unis': 'AE', uae: 'AE', maroc: 'MA', morocco: 'MA',
  egypte: 'EG', egypt: 'EG', algerie: 'DZ', algeria: 'DZ', tunisie: 'TN',
  liban: 'LB', lebanon: 'LB', nigeria: 'NG', kenya: 'KE', uganda: 'UG', ouganda: 'UG',
  tanzania: 'TZ', tanzanie: 'TZ', cameroun: 'CM', cameroon: 'CM', ghana: 'GH',
  senegal: 'SN', mauritanie: 'MR', mauritania: 'MR', soudan: 'SD', sudan: 'SD',
  yemen: 'YE', yémen: 'YE', somalia: 'SO', somalie: 'SO', afghanistan: 'AF',
  pakistan: 'PK', bangladesh: 'BD', malaisie: 'MY', malaysia: 'MY',
  singapore: 'SG', singapour: 'SG', indonesie: 'ID', indonesia: 'ID'
};
export function lookupRiskByName(name?: string | null) {
  if (!name) return null;
  const k = name.toLowerCase().trim();
  const code = NAME_TO_CODE[k];
  return code ? { code, ...RISK_COUNTRIES[code] } : null;
}

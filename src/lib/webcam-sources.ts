/**
 * Sources webcam suggérées pour la plateforme parislgbt + francelgbt.
 * Webcams publiques de lieux emblématiques LGBT-friendly ou de Marches des Fiertés (lives saisonniers).
 *
 * À enrichir via /admin/webcams ou cron /api/cron/webcams-discover.
 */

export type WebcamSource = {
  id: string;
  name: string;
  city: string;
  country: string;
  category: 'pride' | 'place' | 'venue' | 'event';
  description: string;
  externalUrl: string;
  schedule?: string;
  inclusive?: boolean;
  active: boolean;
};

export const SEED_WEBCAM_SOURCES: WebcamSource[] = [
  {
    id: 'paris-marais-rdpc',
    name: 'Rue des Archives — Le Marais',
    city: 'Paris',
    country: 'FR',
    category: 'place',
    description: 'Cœur historique LGBT du Marais parisien. Live été pendant Pride.',
    externalUrl: 'https://www.skylinewebcams.com/',
    schedule: 'Live saisonnier juin-septembre',
    inclusive: true,
    active: true
  },
  {
    id: 'paris-bastille-pride',
    name: 'Bastille — Pride Paris',
    city: 'Paris',
    country: 'FR',
    category: 'pride',
    description: 'Point de départ historique de la Marche des Fiertés Paris.',
    externalUrl: 'https://www.skylinewebcams.com/',
    schedule: 'Live le jour de la Marche (fin juin)',
    inclusive: true,
    active: true
  },
  {
    id: 'lisbon-bairro-alto',
    name: 'Bairro Alto — Lisbonne',
    city: 'Lisbon',
    country: 'PT',
    category: 'place',
    description: 'Quartier gay de Lisbonne, bars et clubs LGBT.',
    externalUrl: 'https://www.skylinewebcams.com/',
    schedule: '24/7',
    inclusive: true,
    active: true
  },
  {
    id: 'sao-paulo-paulista',
    name: 'Avenida Paulista — São Paulo Pride',
    city: 'São Paulo',
    country: 'BR',
    category: 'pride',
    description: "Plus grande Marche des Fiertés au monde (~3M de personnes).",
    externalUrl: 'https://www.skylinewebcams.com/',
    schedule: 'Live le jour du Pride (juin)',
    inclusive: true,
    active: true
  }
];

export default SEED_WEBCAM_SOURCES;


// Backward-compat alias (some imports use WEBCAM_SOURCES)
export const WEBCAM_SOURCES = SEED_WEBCAM_SOURCES;

/**
 * site-configs.ts
 * Branding par scope (domaine).
 * Utilisé comme valeurs par défaut quand les settings DB ne sont pas renseignés.
 */
import type { Scope } from './scope';

export type SiteConfig = {
  name: string;           // Ex: "Paris LGBT"
  domain: string;         // Ex: "parislgbt.com"
  tagline: string;
  hashtag: string;
  heroTitleA: string;
  heroTitleB: string;
  heroSubtitle: string;
  accentColor: string;    // CSS hex
  navLogoLines: string[]; // Texte fallback logo dans la navbar
  metaDescription: string;
  ogImagePath: string;
};

export const SITE_CONFIGS: Record<Scope, SiteConfig> = {
  paris: {
    name: 'Paris LGBT',
    domain: 'parislgbt.com',
    tagline: 'Le hub queer de Paris',
    hashtag: '#parislgbt',
    heroTitleA: 'PARIS',
    heroTitleB: 'LGBT 365',
    heroSubtitle: 'Le hub queer de Paris. Soirées, lieux safe, agenda Pride, ressources santé. Indépendant · sans pub.',
    accentColor: '#FF2BB1',
    navLogoLines: ['PARIS', 'LGBT', '.com'],
    metaDescription: 'Découvrez les soirées, lieux LGBT-friendly, associations et ressources santé à Paris. Le hub queer de la capitale.',
    ogImagePath: '/og/paris.jpg',
  },
  france: {
    name: 'LGBT France',
    domain: 'lgbtfrance.fr',
    tagline: 'Le hub queer de toute la France',
    hashtag: '#lgbtfrance',
    heroTitleA: 'LGBT',
    heroTitleB: 'FRANCE 365',
    heroSubtitle: 'Le hub queer de toute la France. Toutes les Marches des Fiertés, lieux safe, associations, ressources. Indépendant · sans pub.',
    accentColor: '#6D28D9',
    navLogoLines: ['LGBT', 'FRANCE', '.fr'],
    metaDescription: 'Découvrez les événements, lieux LGBT-friendly, associations et ressources santé dans toute la France.',
    ogImagePath: '/og/france.jpg',
  },
  staging: {
    name: 'LGBT Staging',
    domain: 'lgbt.pixeeplay.com',
    tagline: 'Environnement de staging',
    hashtag: '#lgbtstaging',
    heroTitleA: 'LGBT',
    heroTitleB: 'STAGING',
    heroSubtitle: 'Environnement de test multi-domaine.',
    accentColor: '#10B981',
    navLogoLines: ['LGBT', 'STAGING'],
    metaDescription: 'Staging',
    ogImagePath: '/og/paris.jpg',
  },
  dev: {
    name: 'LGBT Dev',
    domain: 'localhost',
    tagline: 'Dev local',
    hashtag: '#lgbtdev',
    heroTitleA: 'LGBT',
    heroTitleB: 'DEV',
    heroSubtitle: 'Mode développement local.',
    accentColor: '#FF2BB1',
    navLogoLines: ['LGBT', 'DEV'],
    metaDescription: 'Dev',
    ogImagePath: '/og/paris.jpg',
  },
};

export function getSiteConfig(scope: Scope): SiteConfig {
  return SITE_CONFIGS[scope] ?? SITE_CONFIGS.dev;
}

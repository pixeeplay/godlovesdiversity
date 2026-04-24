/**
 * Wrapper léger autour de l'API du site web.
 * - Lit la base depuis app.json (extra.apiBase) avec fallback prod
 * - Ajoute automatiquement le token device pour /api/mobile/*
 */
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const API_BASE: string =
  (Constants.expoConfig?.extra?.apiBase as string) || 'https://gld.pixeeplay.com';

async function getDeviceToken() {
  try {
    return await SecureStore.getItemAsync('gld-device-token');
  } catch {
    return null;
  }
}

export async function setDeviceToken(token: string) {
  await SecureStore.setItemAsync('gld-device-token', token);
}

type FetchOpts = RequestInit & { needsAuth?: boolean };

export async function api(path: string, opts: FetchOpts = {}) {
  const headers = new Headers(opts.headers || {});
  if (opts.needsAuth) {
    const token = await getDeviceToken();
    if (token) headers.set('X-Device-Token', token);
  }
  if (!headers.has('Content-Type') && opts.body && !(opts.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const r = await fetch(url, { ...opts, headers });
  if (!r.ok) {
    let msg = `${r.status}`;
    try {
      const j = await r.json();
      msg = j.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return r.json();
}

export const endpoints = {
  banners: () => api('/api/menu').then(() => null), // placeholder, banners n'a pas d'endpoint public yet
  menu: (locale = 'fr') => api(`/api/menu?locale=${locale}`),
  photos: (params: Record<string, string> = {}) =>
    api('/api/photos?' + new URLSearchParams(params).toString()),
  branding: () => api('/api/branding'),
  uploadPhoto: (formData: FormData) =>
    api('/api/mobile/upload', { method: 'POST', body: formData, needsAuth: true }),
  uploadPhotoPublic: (formData: FormData) =>
    api('/api/upload', { method: 'POST', body: formData }),
  chat: (question: string, history: { role: string; text: string }[] = []) =>
    api('/api/ai/chat', { method: 'POST', body: JSON.stringify({ question, history }) }),
  verse: (theme = '') => api(`/api/ai/verse?theme=${encodeURIComponent(theme)}`),
  subscribeNewsletter: (email: string, locale = 'fr') =>
    api('/api/newsletter/subscribe', { method: 'POST', body: JSON.stringify({ email, locale }) })
};

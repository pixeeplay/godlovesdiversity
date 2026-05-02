'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Tracker analytics interne, anonyme et RGPD-friendly.
 * À monter dans le layout root (juste 1 fois).
 */
export function PageTracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith('/admin')) return;
    // Fire and forget
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    }).catch(() => {});
  }, [path]);
  return null;
}

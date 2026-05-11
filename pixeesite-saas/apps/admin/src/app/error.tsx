'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[Pixeesite] Global error caught:', error);
  }, [error]);

  const isPatternError = error?.message?.toLowerCase().includes('did not match the expected pattern');

  return (
    <div style={{
      minHeight: '60vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
    }}>
      <div style={{ fontSize: 48 }}>{isPatternError ? '🧹' : '⚠️'}</div>
      <h1 style={{ margin: 0, fontSize: 22, textAlign: 'center' }}>
        {isPatternError ? 'Cache navigateur obsolète' : 'Une erreur est survenue'}
      </h1>
      <p style={{ opacity: 0.7, fontSize: 14, textAlign: 'center', maxWidth: 600 }}>
        {isPatternError
          ? <>Ton navigateur a chargé une version périmée de Pixeesite. Vide le cache : <kbd style={{ background: '#27272a', padding: '2px 8px', borderRadius: 4 }}>Cmd</kbd> + <kbd style={{ background: '#27272a', padding: '2px 8px', borderRadius: 4 }}>Shift</kbd> + <kbd style={{ background: '#27272a', padding: '2px 8px', borderRadius: 4 }}>R</kbd> pour forcer le rechargement.</>
          : error.message || 'Quelque chose s\'est mal passé.'}
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => { try { window.location.reload(); } catch {} }}
          style={{ background: 'linear-gradient(135deg, #d946ef, #06b6d4)', color: 'white', border: 0, padding: '10px 20px', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
          🔄 Recharger
        </button>
        <button onClick={() => reset()}
          style={{ background: '#27272a', color: 'white', border: '1px solid #3f3f46', padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>
          Réessayer
        </button>
      </div>
      {error.digest && (
        <div style={{ fontSize: 10, opacity: 0.4, marginTop: 12 }}>Error ID: {error.digest}</div>
      )}
      <details style={{ marginTop: 12, opacity: 0.5, fontSize: 11, maxWidth: 600 }}>
        <summary style={{ cursor: 'pointer' }}>Détails techniques</summary>
        <pre style={{ background: '#0a0a0f', padding: 12, borderRadius: 8, marginTop: 8, overflow: 'auto', fontSize: 10, whiteSpace: 'pre-wrap' }}>
          {error.message}
          {error.stack && `\n\n${error.stack.split('\n').slice(0, 8).join('\n')}`}
        </pre>
      </details>
    </div>
  );
}

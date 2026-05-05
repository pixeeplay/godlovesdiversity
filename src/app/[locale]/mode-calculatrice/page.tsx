'use client';
import { useState } from 'react';
import { Calculator, Lock, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SECRET_PIN = '1969'; // Stonewall — modifiable via /admin/settings plus tard

export default function P() {
  const [enabled, setEnabled] = useState(false);
  const [display, setDisplay] = useState('0');
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const router = useRouter();

  function press(k: string) {
    if (k === 'C') { setDisplay('0'); setPinInput(''); return; }
    if (k === '=') {
      // Le code secret = pin tapé sans signes
      if (pinInput === SECRET_PIN) {
        setPinUnlocked(true);
        setTimeout(() => router.push('/'), 800);
        return;
      }
      try { setDisplay(String(eval(display.replace('×', '*').replace('÷', '/')))); } catch { setDisplay('Err'); }
      return;
    }
    if (/^\d$/.test(k)) setPinInput(p => (p + k).slice(-4));
    setDisplay(d => d === '0' ? k : d + k);
  }

  function activate() {
    setEnabled(true);
    document.title = 'Calculatrice';
  }

  if (!enabled) {
    return (
      <main className="container-wide py-12 max-w-2xl">
        <header className="text-center mb-6">
          <div className="inline-block bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-2xl p-3 mb-3"><Calculator size={28} className="text-white" /></div>
          <h1 className="font-display font-bold text-3xl mb-2">🔢 Mode calculatrice</h1>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto">Pour les pays hostiles : ton navigateur ressemble à une <strong>calculatrice ordinaire</strong>. Tape le code secret <strong>{SECRET_PIN}</strong> puis = pour revenir à GLD.</p>
        </header>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200 mb-4">
          ⚠ <strong>Limite</strong> : ce n'est pas un déguisement complet — l'historique navigateur garde la trace de gld.pixeeplay.com. Pour vraie discrétion : VPN + navigation privée + <Link href="/voyage-safe"><a className="underline">checklist voyage</a></Link>.
        </div>
        <button onClick={activate} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2">
          <Eye size={16} /> Activer le mode calculatrice
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-zinc-100" style={{ background: '#e5e7eb' }}>
      <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs">
        <div className="bg-zinc-100 rounded-2xl p-4 mb-3 text-right">
          <div className="text-3xl font-mono text-zinc-900 truncate">{display}</div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {['C', '÷', '×', '⌫', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '.', '00'].map(k => (
            <button key={k} onClick={() => press(k)} className={`py-3 rounded-xl text-zinc-900 font-bold text-lg ${k === '=' ? 'bg-orange-500 text-white col-span-1' : 'bg-zinc-200 hover:bg-zinc-300'}`}>
              {k}
            </button>
          ))}
        </div>
        {pinUnlocked && (
          <div className="mt-3 bg-emerald-100 border border-emerald-300 rounded p-2 text-xs text-emerald-800 text-center">🔓 GLD se charge…</div>
        )}
      </div>
    </main>
  );
}
import Link from 'next/link';

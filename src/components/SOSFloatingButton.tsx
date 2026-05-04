'use client';
import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { EmergencyModal } from './EmergencyModal';

/**
 * Bouton SOS flottant, séparé du widget chat — plus visible et plus accessible.
 * Toujours visible en bas à gauche (mobile + desktop).
 */
export function SOSFloatingButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Urgence — aide LGBT immédiate"
        className="fixed bottom-6 left-6 z-[55] group"
      >
        {/* Halo pulsant */}
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
        {/* Bouton */}
        <span className="relative bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 text-white rounded-full px-4 py-3 shadow-2xl shadow-red-500/50 flex items-center gap-2 font-bold border-2 border-white/20 transition group-hover:scale-110">
          <ShieldAlert size={22} />
          <span className="text-sm">SOS</span>
        </span>
        {/* Tooltip */}
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl border border-zinc-700">
          🆘 Aide LGBT immédiate · Confidentiel
        </span>
      </button>

      {open && <EmergencyModal onClose={() => setOpen(false)} />}
    </>
  );
}

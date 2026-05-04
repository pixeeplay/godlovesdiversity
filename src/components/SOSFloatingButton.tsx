'use client';
import { useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { EmergencyModal } from './EmergencyModal';
import { AlarmMode } from './AlarmMode';

/**
 * Bouton SOS flottant avec :
 * - Clic court → ouvre la modale d'aide (5 onglets)
 * - APPUI LONG (>1.2s) → mode alarme : sirène + voix forte "AIDEZ-MOI APPELEZ LA POLICE"
 *
 * Pendant l'appui long, anneau de progression visible qui se remplit.
 */
export function SOSFloatingButton() {
  const [open, setOpen] = useState(false);
  const [alarm, setAlarm] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);
  const startTimeRef = useRef<number>(0);

  const LONG_PRESS_MS = 1200;

  function startPress(e: React.PointerEvent | React.TouchEvent | React.MouseEvent) {
    e.preventDefault();
    setPressing(true);
    setProgress(0);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, (elapsed / LONG_PRESS_MS) * 100);
      setProgress(pct);
    }, 30);

    timerRef.current = setTimeout(() => {
      // ALARME !
      clearInterval(intervalRef.current);
      setPressing(false);
      setProgress(0);
      setAlarm(true);
      // Vibration : 3 buzz longs pour confirmer
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    }, LONG_PRESS_MS);
  }

  function endPress(triggerOpen: boolean) {
    const wasPressed = pressing;
    setPressing(false);
    setProgress(0);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;

    if (triggerOpen && wasPressed && !alarm) {
      // Clic court → modale aide
      setOpen(true);
    }
  }

  return (
    <>
      <div className="fixed bottom-6 left-6 z-[55] group select-none">
        {/* Halo pulsant ambient */}
        <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30 pointer-events-none" />

        {/* Anneau de progression appui long */}
        {pressing && (
          <svg className="absolute inset-0 -m-2 pointer-events-none" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              stroke="white" strokeWidth="6"
              strokeDasharray={`${(progress / 100) * 282.7} 282.7`}
              strokeLinecap="round"
              className="transition-all"
            />
          </svg>
        )}

        {/* Bouton */}
        <button
          aria-label="SOS — clic court : aide / appui long : alarme"
          onPointerDown={startPress}
          onPointerUp={() => endPress(true)}
          onPointerLeave={() => endPress(false)}
          onPointerCancel={() => endPress(false)}
          onContextMenu={(e) => e.preventDefault()}
          className={`relative bg-gradient-to-br ${pressing ? 'from-red-700 to-red-900 scale-95' : 'from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500'} text-white rounded-full px-4 py-3 shadow-2xl shadow-red-500/50 flex items-center gap-2 font-bold border-2 border-white/20 transition-all group-hover:scale-110 cursor-pointer`}
        >
          <ShieldAlert size={22} className={pressing ? 'animate-pulse' : ''} />
          <span className="text-sm">{pressing ? `${Math.round(progress)}%` : 'SOS'}</span>
        </button>

        {/* Tooltip */}
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-zinc-900 text-white text-[11px] px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap shadow-xl border border-zinc-700">
          <div>🆘 <strong>Clic court</strong> → aide LGBT</div>
          <div>🚨 <strong>Appui long</strong> → alarme sirène + voix</div>
        </div>
      </div>

      {open && <EmergencyModal onClose={() => setOpen(false)} />}
      {alarm && <AlarmMode onClose={() => setAlarm(false)} />}
    </>
  );
}

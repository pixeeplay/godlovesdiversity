'use client';
import { useEffect, useState } from 'react';

interface Props {
  targetDate: string; // YYYY-MM-DD
}

function calc(target: string) {
  const t = new Date(target + 'T12:00:00').getTime();
  const now = Date.now();
  const diff = Math.max(0, t - now);
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    expired: diff <= 0
  };
}

export function PrideCountdown({ targetDate }: Props) {
  const [tick, setTick] = useState(() => calc(targetDate));

  useEffect(() => {
    setTick(calc(targetDate));
    const id = setInterval(() => setTick(calc(targetDate)), 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (tick.expired) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-sm font-bold">
        🎉 C&apos;est aujourd&apos;hui !
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {[
        { v: tick.days, l: 'jours' },
        { v: tick.hours, l: 'heures' },
        { v: tick.minutes, l: 'min' },
        { v: tick.seconds, l: 'sec' }
      ].map((it, i) => (
        <div key={i} className="text-center">
          <div className="bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-white/10 rounded-xl px-3 md:px-4 py-2 md:py-3 min-w-[60px] md:min-w-[80px]">
            <div className="text-2xl md:text-4xl font-display font-black text-white tabular-nums">
              {String(it.v).padStart(2, '0')}
            </div>
            <div className="text-[9px] md:text-[10px] uppercase tracking-widest text-white/50 mt-0.5">{it.l}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

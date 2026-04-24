'use client';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
      className={`relative w-9 h-9 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] hover:bg-[color:var(--surface-strong)] flex items-center justify-center transition ${className}`}
    >
      <Sun size={16} className={`absolute transition ${theme === 'dark' ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-45'}`} />
      <Moon size={16} className={`absolute transition ${theme === 'dark' ? 'opacity-0 scale-0 rotate-45' : 'opacity-100 scale-100 rotate-0'}`} />
    </button>
  );
}

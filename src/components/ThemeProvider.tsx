'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void; setTheme: (t: Theme) => void }>({
  theme: 'dark',
  toggle: () => {},
  setTheme: () => {}
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    // Lit ce que le script anti-flash a déjà appliqué
    const cur = document.documentElement.classList.contains('light') ? 'light' : 'dark';
    setThemeState(cur);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
    try { localStorage.setItem('gld-theme', t); } catch {}
  }, []);

  const toggle = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

/** Script à inliner dans <head> pour éviter le flash blanc/noir */
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('gld-theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    document.documentElement.classList.add(t);
  } catch(e){ document.documentElement.classList.add('dark'); }
})();
`.trim();

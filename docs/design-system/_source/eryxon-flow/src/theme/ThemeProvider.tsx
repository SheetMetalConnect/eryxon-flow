import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light' | 'auto';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'eryxon-theme-mode';

interface ThemeContextType {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'auto',
  resolvedTheme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'auto') {
    return stored;
  }
  return 'auto';
};

const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
};

const applyThemeToDocument = (resolvedTheme: ResolvedTheme) => {
  const root = document.documentElement;

  if (resolvedTheme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
  }
};

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode
}) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return defaultMode ?? getStoredTheme();
  });

  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() => {
    return getSystemTheme();
  });

  const resolvedTheme = useMemo(() => {
    return mode === 'auto' ? systemTheme : mode;
  }, [mode, systemTheme]);

  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode, resolvedTheme]);

  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'light' : 'dark';
      setSystemTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  const setTheme = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState(current => {
      // Cycle through: auto -> light -> dark -> auto
      if (current === 'auto') return 'light';
      if (current === 'light') return 'dark';
      return 'auto';
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setTheme,
      toggleTheme,
    }),
    [mode, resolvedTheme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

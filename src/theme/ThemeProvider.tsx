import React, { createContext, useContext, useMemo, useEffect, useState, useCallback } from 'react';

/**
 * ERYXON MES THEME PROVIDER - Dark/Light/Auto Mode Support
 *
 * Pure CSS-based theme provider using CSS custom properties
 *
 * This provider supports:
 * - 'dark': Always use dark theme
 * - 'light': Always use light theme
 * - 'auto': Follow system/browser preference (default)
 *
 * Features:
 * - Persists user preference to localStorage
 * - Detects browser color scheme preference
 * - Syncs HTML class for Tailwind CSS
 * - No MUI dependency - pure CSS custom properties
 */

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

// Get system preference
const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

// Get stored preference
const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'auto';
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light' || stored === 'auto') {
    return stored;
  }
  // Default to 'auto' which follows browser settings
  return 'auto';
};

// Resolve the actual theme based on mode
const resolveTheme = (mode: ThemeMode): ResolvedTheme => {
  if (mode === 'auto') {
    return getSystemTheme();
  }
  return mode;
};

// Apply theme to document
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
  // Initialize with stored preference or default
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return defaultMode ?? getStoredTheme();
  });

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    return resolveTheme(mode);
  });

  // Update resolved theme when mode changes
  useEffect(() => {
    const resolved = resolveTheme(mode);
    setResolvedTheme(resolved);
    applyThemeToDocument(resolved);
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newTheme = e.matches ? 'light' : 'dark';
      setResolvedTheme(newTheme);
      applyThemeToDocument(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mode]);

  // Apply initial theme on mount
  useEffect(() => {
    applyThemeToDocument(resolvedTheme);
  }, []);

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

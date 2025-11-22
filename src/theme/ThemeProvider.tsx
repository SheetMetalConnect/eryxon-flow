import React, { createContext, useContext, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import theme from './theme';

// Import Inter font
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';

/**
 * ERYXON MES THEME PROVIDER - DARK MODE ONLY
 *
 * This provider now only supports dark mode.
 * The theme toggle functionality is kept for backward compatibility
 * but does nothing since we only have dark mode.
 */

type ThemeMode = 'dark';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void; // Kept for backward compatibility, does nothing
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
});

export const useThemeMode = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Always use dark mode
  const mode: ThemeMode = 'dark';

  // No-op toggle function for backward compatibility
  const toggleTheme = () => {
    // Dark mode only - toggle does nothing
    console.info('Eryxon MES uses dark mode only');
  };

  const contextValue = useMemo(
    () => ({
      mode,
      toggleTheme,
    }),
    [mode]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

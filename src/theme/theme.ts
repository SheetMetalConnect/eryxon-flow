import { createTheme, alpha } from '@mui/material/styles';

/**
 * ERYXON MES THEME - DARK MODE ONLY
 * Modern dark-first theme matching the design system
 *
 * Design Philosophy:
 * - Deep black backgrounds for reduced eye strain
 * - Beautiful blue accents (#1e90ff)
 * - Glass morphism effects for depth
 * - Touch-optimized for operators
 * - Consistent with CSS design system
 */

// Brand Colors - Matching design-system.css
const brandColors = {
  // Primary blues
  dodgerBlue: '#1e90ff',      // Main brand blue
  lightBlue: '#4a9eff',       // Lighter blue for accents

  // Backgrounds
  deepBlack: '#0a0a0a',       // Main background
  darkSurface: '#141414',     // Card surface
  darkElevated: '#1f1f1f',    // Elevated surface

  // Semantic colors
  success: '#34a853',         // Green
  warning: '#fbbc05',         // Yellow/Amber
  error: '#ea4335',           // Red
  info: '#0891b2',            // Cyan

  // Neutrals
  textPrimary: '#e0e0e0',     // Primary text
  textSecondary: '#a0a0a0',   // Muted text
  borderColor: '#555555',     // Borders
};

// Create the dark theme (the only theme)
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: brandColors.dodgerBlue,
      light: brandColors.lightBlue,
      dark: '#0066cc',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#333333',
      light: '#444444',
      dark: '#1f1f1f',
      contrastText: '#e0e0e0',
    },
    error: {
      main: brandColors.error,
      light: '#f15c52',
      dark: '#d32f22',
      contrastText: '#ffffff',
    },
    warning: {
      main: brandColors.warning,
      light: '#fcc839',
      dark: '#c79400',
      contrastText: '#0a0a0a',
    },
    info: {
      main: brandColors.info,
      light: '#22d3ee',
      dark: '#06748c',
      contrastText: '#ffffff',
    },
    success: {
      main: brandColors.success,
      light: '#4cbb6e',
      dark: '#288542',
      contrastText: '#ffffff',
    },
    text: {
      primary: brandColors.textPrimary,
      secondary: brandColors.textSecondary,
      disabled: alpha(brandColors.textPrimary, 0.38),
    },
    background: {
      default: brandColors.deepBlack,
      paper: brandColors.darkSurface,
    },
    divider: alpha('#ffffff', 0.1),
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      fontSize: '2.25rem',
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
      color: brandColors.textPrimary,
    },
    h2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
      color: brandColors.textPrimary,
    },
    h3: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.375,
      color: brandColors.textPrimary,
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
      color: brandColors.textPrimary,
    },
    h5: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
      color: brandColors.textPrimary,
    },
    h6: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
      color: brandColors.textPrimary,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.5,
      color: brandColors.textPrimary,
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.5,
      color: brandColors.textPrimary,
    },
    button: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
      fontSize: '0.875rem',
      letterSpacing: '0.01em',
    },
    caption: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.5,
      color: brandColors.textSecondary,
    },
    overline: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      color: brandColors.textSecondary,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  // Enhanced shadows for dark mode
  shadows: [
    'none',
    '0px 1px 2px rgba(0, 0, 0, 0.3)',
    '0px 2px 4px rgba(0, 0, 0, 0.4)',
    '0px 3px 6px rgba(0, 0, 0, 0.4)',
    '0px 4px 8px rgba(0, 0, 0, 0.5)',
    '0px 5px 10px rgba(0, 0, 0, 0.5)',
    '0px 6px 12px rgba(0, 0, 0, 0.5)',
    '0px 7px 14px rgba(0, 0, 0, 0.5)',
    '0px 8px 16px rgba(0, 0, 0, 0.6)',
    '0px 9px 18px rgba(0, 0, 0, 0.6)',
    '0px 10px 20px rgba(0, 0, 0, 0.6)',
    '0px 11px 22px rgba(0, 0, 0, 0.6)',
    '0px 12px 24px rgba(0, 0, 0, 0.6)',
    '0px 13px 26px rgba(0, 0, 0, 0.6)',
    '0px 14px 28px rgba(0, 0, 0, 0.6)',
    '0px 15px 30px rgba(0, 0, 0, 0.6)',
    '0px 16px 32px rgba(0, 0, 0, 0.7)',
    '0px 17px 34px rgba(0, 0, 0, 0.7)',
    '0px 18px 36px rgba(0, 0, 0, 0.7)',
    '0px 19px 38px rgba(0, 0, 0, 0.7)',
    '0px 20px 40px rgba(0, 0, 0, 0.7)',
    '0px 21px 42px rgba(0, 0, 0, 0.7)',
    '0px 22px 44px rgba(0, 0, 0, 0.7)',
    '0px 23px 46px rgba(0, 0, 0, 0.7)',
    '0px 24px 48px rgba(0, 0, 0, 0.7)',
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: brandColors.deepBlack,
          color: brandColors.textPrimary,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(30, 144, 255, 0.3)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
        contained: {
          background: `linear-gradient(135deg, ${brandColors.dodgerBlue}, ${brandColors.lightBlue})`,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          '&:hover': {
            background: `linear-gradient(135deg, ${brandColors.lightBlue}, ${brandColors.dodgerBlue})`,
            boxShadow: '0px 4px 12px rgba(30, 144, 255, 0.4)',
          },
        },
        outlined: {
          borderColor: brandColors.borderColor,
          '&:hover': {
            borderColor: brandColors.dodgerBlue,
            backgroundColor: alpha(brandColors.dodgerBlue, 0.1),
          },
        },
        text: {
          '&:hover': {
            backgroundColor: alpha(brandColors.dodgerBlue, 0.1),
          },
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
        sizeLarge: {
          padding: '10px 20px',
          fontSize: '0.9375rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          backgroundColor: alpha(brandColors.darkSurface, 0.7),
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            borderColor: 'rgba(255, 255, 255, 0.2)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: brandColors.darkSurface,
          backgroundImage: 'none',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.4)',
        },
        elevation3: {
          boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.5)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: brandColors.darkElevated,
            '& fieldset': {
              borderColor: brandColors.borderColor,
            },
            '&:hover fieldset': {
              borderColor: brandColors.textSecondary,
            },
            '&.Mui-focused fieldset': {
              borderColor: brandColors.dodgerBlue,
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          backgroundColor: alpha(brandColors.darkSurface, 0.95),
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${alpha('#ffffff', 0.06)}`,
        },
        head: {
          fontWeight: 600,
          backgroundColor: alpha(brandColors.dodgerBlue, 0.1),
          borderBottom: `2px solid ${alpha(brandColors.dodgerBlue, 0.3)}`,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: brandColors.darkElevated,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          fontSize: '0.875rem',
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: brandColors.dodgerBlue,
            '& + .MuiSwitch-track': {
              backgroundColor: brandColors.dodgerBlue,
              opacity: 0.5,
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          borderRadius: 8,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: brandColors.darkElevated,
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: alpha(brandColors.dodgerBlue, 0.1),
          },
          '&.Mui-selected': {
            backgroundColor: alpha(brandColors.dodgerBlue, 0.2),
            '&:hover': {
              backgroundColor: alpha(brandColors.dodgerBlue, 0.25),
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: alpha('#ffffff', 0.06),
        },
      },
    },
  },
});

// Export only the dark theme
export { theme as default, brandColors };

// For backward compatibility, export as both light and dark
export const darkTheme = theme;
export const lightTheme = theme; // Same as dark since we only have dark mode now

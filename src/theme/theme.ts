import { createTheme, alpha } from '@mui/material/styles';

// Eryxon MES Brand Colors - Industrial Modern Palette
const brandColors = {
  // Primary colors
  primarySlate: '#3a4656', // Deep Slate Blue - industrial strength
  primaryBlue: '#0080ff',  // Electric Blue - modern tech accent
  // Legacy colors for backward compatibility
  legacyBlue: '#47B5E2',
  legacyPurple: '#6658A3',
  dark: '#1a1f29',         // Near black
  // Semantic colors
  success: '#148853',      // Emerald
  warning: '#ff9900',      // Amber
  error: '#eb4034',        // Crimson
  info: '#0d9fc9',         // Cyan
};

// Create light theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.primarySlate,
      dark: '#2a3442',
      light: '#4a5866',
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandColors.primaryBlue,
      dark: '#0066cc',
      light: '#3399ff',
      contrastText: '#ffffff',
    },
    error: {
      main: brandColors.error,
      light: '#f15c52',
      dark: '#d32f22',
    },
    warning: {
      main: brandColors.warning,
      light: '#ffad33',
      dark: '#cc7a00',
    },
    info: {
      main: brandColors.info,
      light: '#3db3d6',
      dark: '#0a7fa1',
    },
    success: {
      main: brandColors.success,
      light: '#3aa370',
      dark: '#0f6d42',
    },
    text: {
      primary: '#1a1f29',
      secondary: alpha('#1a1f29', 0.7),
      disabled: alpha('#1a1f29', 0.38),
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    divider: alpha('#1a1f29', 0.12),
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    h1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      fontSize: '2.25rem', // Slightly smaller due to Inter's better legibility
      lineHeight: 1.25,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 700,
      fontSize: '1.875rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.375,
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1.125rem',
      lineHeight: 1.5,
    },
    h6: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body1: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.5,
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
    },
    overline: {
      fontFamily: '"Inter", sans-serif',
      fontWeight: 500,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  shadows: [
    'none',
    '0px 2px 4px rgba(35, 31, 32, 0.08)',
    '0px 4px 8px rgba(35, 31, 32, 0.12)',
    '0px 6px 12px rgba(35, 31, 32, 0.14)',
    '0px 8px 16px rgba(35, 31, 32, 0.16)',
    '0px 10px 20px rgba(35, 31, 32, 0.18)',
    '0px 12px 24px rgba(35, 31, 32, 0.20)',
    '0px 14px 28px rgba(35, 31, 32, 0.22)',
    '0px 16px 32px rgba(35, 31, 32, 0.24)',
    '0px 18px 36px rgba(35, 31, 32, 0.26)',
    '0px 20px 40px rgba(35, 31, 32, 0.28)',
    '0px 22px 44px rgba(35, 31, 32, 0.30)',
    '0px 24px 48px rgba(35, 31, 32, 0.32)',
    '0px 26px 52px rgba(35, 31, 32, 0.34)',
    '0px 28px 56px rgba(35, 31, 32, 0.36)',
    '0px 30px 60px rgba(35, 31, 32, 0.38)',
    '0px 32px 64px rgba(35, 31, 32, 0.40)',
    '0px 34px 68px rgba(35, 31, 32, 0.42)',
    '0px 36px 72px rgba(35, 31, 32, 0.44)',
    '0px 38px 76px rgba(35, 31, 32, 0.46)',
    '0px 40px 80px rgba(35, 31, 32, 0.48)',
    '0px 42px 84px rgba(35, 31, 32, 0.50)',
    '0px 44px 88px rgba(35, 31, 32, 0.52)',
    '0px 46px 92px rgba(35, 31, 32, 0.54)',
    '0px 48px 96px rgba(35, 31, 32, 0.56)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: '0.875rem',
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(35, 31, 32, 0.12)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 12px rgba(35, 31, 32, 0.16)',
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
          borderRadius: 12,
          boxShadow: '0px 4px 12px rgba(35, 31, 32, 0.08)',
          '&:hover': {
            boxShadow: '0px 6px 16px rgba(35, 31, 32, 0.12)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0px 2px 4px rgba(35, 31, 32, 0.08)',
        },
        elevation2: {
          boxShadow: '0px 4px 8px rgba(35, 31, 32, 0.12)',
        },
        elevation3: {
          boxShadow: '0px 6px 12px rgba(35, 31, 32, 0.14)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
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
          borderRadius: 12,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: alpha(brandColors.primarySlate, 0.06),
        },
      },
    },
  },
});

// Create dark theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: brandColors.primaryBlue,
      dark: '#0066cc',
      light: '#3399ff',
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandColors.primarySlate,
      dark: '#2a3442',
      light: '#4a5866',
      contrastText: '#ffffff',
    },
    error: {
      main: '#f15c52',
      light: '#f47970',
      dark: '#d32f22',
    },
    warning: {
      main: '#ffad33',
      light: '#ffbd5c',
      dark: '#cc7a00',
    },
    info: {
      main: '#3db3d6',
      light: '#60c1dd',
      dark: '#0a7fa1',
    },
    success: {
      main: '#3aa370',
      light: '#5cb589',
      dark: '#0f6d42',
    },
    text: {
      primary: '#f5f7fa',
      secondary: alpha('#f5f7fa', 0.7),
      disabled: alpha('#f5f7fa', 0.38),
    },
    background: {
      default: '#0f1419',
      paper: '#1a1f29',
    },
    divider: alpha('#ffffff', 0.12),
  },
  typography: lightTheme.typography,
  shape: lightTheme.shape,
  spacing: lightTheme.spacing,
  components: {
    ...lightTheme.components,
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: alpha(brandColors.primaryBlue, 0.12),
        },
      },
    },
  },
});

export { lightTheme, darkTheme, brandColors };

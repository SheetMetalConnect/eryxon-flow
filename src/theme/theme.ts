import { createTheme, alpha } from '@mui/material/styles';

// Sheet Metal Connect Brand Colors
const brandColors = {
  primaryBlue: '#47B5E2',
  primaryPurple: '#6658A3',
  dark: '#231F20',
  // Derived colors for success/warning/error
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#47B5E2',
};

// Create light theme
const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brandColors.primaryBlue,
      dark: '#3A92B8',
      light: '#6FC4E8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: brandColors.primaryPurple,
      dark: '#524682',
      light: '#8179B5',
      contrastText: '#ffffff',
    },
    error: {
      main: brandColors.error,
    },
    warning: {
      main: brandColors.warning,
    },
    info: {
      main: brandColors.info,
    },
    success: {
      main: brandColors.success,
    },
    text: {
      primary: brandColors.dark,
      secondary: alpha(brandColors.dark, 0.7),
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    divider: alpha(brandColors.dark, 0.12),
  },
  typography: {
    fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
    },
    h2: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
    },
    h3: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.4,
    },
    h4: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
    },
    h6: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body1: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 500,
      textTransform: 'none',
      fontSize: '0.875rem',
    },
    caption: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 400,
      fontSize: '0.75rem',
    },
    overline: {
      fontFamily: '"Montserrat", sans-serif',
      fontWeight: 500,
      fontSize: '0.75rem',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
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
          backgroundColor: alpha(brandColors.primaryBlue, 0.08),
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
      dark: '#3A92B8',
      light: '#6FC4E8',
      contrastText: brandColors.dark,
    },
    secondary: {
      main: brandColors.primaryPurple,
      dark: '#524682',
      light: '#8179B5',
      contrastText: '#ffffff',
    },
    error: {
      main: brandColors.error,
    },
    warning: {
      main: brandColors.warning,
    },
    info: {
      main: brandColors.info,
    },
    success: {
      main: brandColors.success,
    },
    text: {
      primary: '#FFFFFF',
      secondary: alpha('#FFFFFF', 0.7),
    },
    background: {
      default: brandColors.dark,
      paper: '#2C2829',
    },
    divider: alpha('#FFFFFF', 0.12),
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
          backgroundColor: alpha(brandColors.primaryPurple, 0.15),
        },
      },
    },
  },
});

export { lightTheme, darkTheme, brandColors };

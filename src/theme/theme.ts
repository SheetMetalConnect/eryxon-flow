/**
 * ERYXON MES THEME - CSS Custom Properties Based
 *
 * This file exports theme-related constants and types.
 * All actual theming is handled via CSS custom properties in design-system.css
 *
 * The ThemeProvider manages the 'dark'/'light' class on :root
 * which triggers CSS variable switching.
 */

// Re-export types from ThemeProvider
export type { ThemeMode, ResolvedTheme } from './ThemeProvider';

// Brand colors for reference (matching design-system.css)
export const brandColors = {
  dark: {
    primary: '#1e90ff',
    primaryLight: '#4a9eff',
    background: '#0a0a0a',
    surface: '#141414',
    text: '#e0e0e0',
    textMuted: '#a0a0a0',
    border: '#555555',
    success: '#34a853',
    warning: '#fbbc05',
    error: '#ea4335',
    info: '#0891b2',
  },
  light: {
    primary: '#0066cc',
    primaryLight: '#1e90ff',
    background: '#ffffff',
    surface: '#fafafa',
    text: '#262626',
    textMuted: '#5e5e5e',
    border: '#cccccc',
    success: '#2d8a47',
    warning: '#c79400',
    error: '#d32f22',
    info: '#06748c',
  },
};

// Status colors (used across the app)
export const statusColors = {
  active: 'hsl(var(--status-active))',
  completed: 'hsl(var(--status-completed))',
  onHold: 'hsl(var(--status-on-hold))',
  blocked: 'hsl(var(--status-blocked))',
  pending: 'hsl(var(--status-pending))',
};

// Stage colors
export const stageColors = {
  default: 'hsl(var(--stage-default))',
  cutting: 'hsl(var(--stage-cutting))',
  bending: 'hsl(var(--stage-bending))',
  welding: 'hsl(var(--stage-welding))',
  assembly: 'hsl(var(--stage-assembly))',
  finishing: 'hsl(var(--stage-finishing))',
};

// Severity colors
export const severityColors = {
  critical: 'hsl(var(--severity-critical))',
  high: 'hsl(var(--severity-high))',
  medium: 'hsl(var(--severity-medium))',
  low: 'hsl(var(--severity-low))',
};

export default brandColors;

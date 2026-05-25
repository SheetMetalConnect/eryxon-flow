export type { ThemeMode, ResolvedTheme } from './ThemeProvider';

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

/** Shared 3D viewer constants (theme-independent) */
const viewerShared = {
  /** Neutral warm gray — matches Onshape/Fusion 360 defaults */
  modelDefault: 0xD0D0C8,
  modelMetalness: 0.2,
  modelRoughness: 0.65,

  /** Measurement accent & markers */
  measurementAccent: 0xFF6B00,
  measurementMarker: 0xFF6B00,
  measurementMarkerScale: 0.008,
  measurementMarkerMinSize: 3,
  measurementLineWidth: 2,

  /** Per-type line colors */
  linePointToPoint: 0xFF6B00,
  lineFaceDistance: 0x00E676,
  lineFaceAngle: 0xFFD600,
  lineRadius: 0xFF40FF,

  /** Snap indicator colors */
  snapVertex: 0xFF6B00,
  snapEdge: 0x00bcd4,
  snapFace: 0x4caf50,
};

/** Theme-specific 3D viewer palettes */
export const viewerThemes = {
  light: {
    ...viewerShared,
    sceneBackground: 0xf5f5f5,
    gridMajor: 0x666666,
    gridMinor: 0xaaaaaa,
    gridMajorOpacity: 0.45,
    gridMinorOpacity: 0.2,
    edgeColor: 0x1a3a8a,
    edgeOpacity: 1.0,
    /** Lighting intensities */
    ambientIntensity: 0.5,
    keyLightIntensity: 1.0,
    fillLightIntensity: 0.5,
    backLightIntensity: 0.3,
  },
  dark: {
    ...viewerShared,
    sceneBackground: 0x1a1a2e,
    gridMajor: 0x888888,
    gridMinor: 0x444455,
    gridMajorOpacity: 0.35,
    gridMinorOpacity: 0.15,
    edgeColor: 0x6b9fff,
    edgeOpacity: 0.85,
    /** Lighting — boost ambient & fill so model stays visible on dark bg */
    ambientIntensity: 0.7,
    keyLightIntensity: 1.0,
    fillLightIntensity: 0.6,
    backLightIntensity: 0.4,
  },
} as const;

export type ViewerThemePalette = typeof viewerThemes.light;

/** @deprecated Use viewerThemes[resolvedTheme] instead — kept for back-compat */
export const viewerColors = viewerThemes.light;

export const statusColors = {
  active: 'hsl(var(--status-active))',
  completed: 'hsl(var(--status-completed))',
  onHold: 'hsl(var(--status-on-hold))',
  blocked: 'hsl(var(--status-blocked))',
  pending: 'hsl(var(--status-pending))',
};

export const stageColors = {
  default: 'hsl(var(--stage-default))',
  cutting: 'hsl(var(--stage-cutting))',
  bending: 'hsl(var(--stage-bending))',
  welding: 'hsl(var(--stage-welding))',
  assembly: 'hsl(var(--stage-assembly))',
  finishing: 'hsl(var(--stage-finishing))',
};

export const severityColors = {
  critical: 'hsl(var(--severity-critical))',
  high: 'hsl(var(--severity-high))',
  medium: 'hsl(var(--severity-medium))',
  low: 'hsl(var(--severity-low))',
};

export default brandColors;

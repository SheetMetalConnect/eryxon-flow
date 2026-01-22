/**
 * STEPViewer Constants
 * 
 * Centralized configuration following Three.js best practices.
 * All magic numbers extracted for maintainability and consistency.
 */

// =============================================================================
// MATERIAL DEFAULTS (PBR settings for industrial/machined metal look)
// =============================================================================

export const MATERIAL_DEFAULTS = {
  /** Metalness - lower values for industrial/machined appearance */
  METALNESS: 0.4,
  /** Roughness - higher values for matte industrial appearance */
  ROUGHNESS: 0.8,
} as const;

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  /** Steel blue - professional CAD look for metal parts */
  PART: 0x6b8cae,
  
  /** Edge/contour color - black for visibility */
  EDGE: 0x000000,
  
  /** Background color - light gray */
  BACKGROUND: 0xf5f5f5,
  
  /** Grid colors */
  GRID: {
    CENTER: 0x444444,
    LINES: 0x888888,
  },
  
  /** Dimension line colors (axis-specific) */
  DIMENSIONS: {
    X: 0x4a9eff, // Blue
    Y: 0x34a853, // Green
    Z: 0xfbbc05, // Yellow
  },
} as const;

// =============================================================================
// LIGHTING DEFAULTS (Two-light setup: HemisphereLight + DirectionalLight)
// =============================================================================

export const LIGHTING_DEFAULTS = {
  /** HemisphereLight settings - ambient-like sky/ground lighting */
  HEMISPHERE: {
    SKY_COLOR: 0xffffff,
    GROUND_COLOR: 0x444444,
    INTENSITY: 0.6,
  },
  
  /** DirectionalLight settings - primary light source */
  DIRECTIONAL: {
    COLOR: 0xffffff,
    INTENSITY: 1.2,
    /** Position multipliers relative to scene size */
    POSITION: {
      X: 0.5,
      Y: 0.75,
      Z: 0.5,
    },
  },
} as const;

// =============================================================================
// EDGE RENDERING DEFAULTS
// =============================================================================

export const EDGE_DEFAULTS = {
  /** Line width (note: >1 only works on Windows with ANGLE backend) */
  WIDTH: 1,
  
  /** Edge opacity */
  OPACITY: 0.8,
  
  /** Threshold angle in degrees for computed edges (EdgesGeometry) */
  THRESHOLD_ANGLE: 30,
} as const;

// =============================================================================
// CAMERA DEFAULTS
// =============================================================================

export const CAMERA_DEFAULTS = {
  /** Field of view in degrees */
  FOV: 50,
  
  /** Near clipping plane */
  NEAR: 0.1,
  
  /** Far clipping plane */
  FAR: 10000,
  
  /** OrbitControls damping factor */
  DAMPING_FACTOR: 0.1,
  
  /** Distance multiplier for initial camera position */
  INITIAL_DISTANCE_MULTIPLIER: 2,
} as const;

// =============================================================================
// GRID DEFAULTS
// =============================================================================

export const GRID_DEFAULTS = {
  /** Minimum grid size */
  MIN_SIZE: 1000,
  
  /** Multiplier relative to model size */
  SIZE_MULTIPLIER: 3,
  
  /** Grid divisions bounds */
  MIN_DIVISIONS: 10,
  MAX_DIVISIONS: 100,
  
  /** Grid transparency */
  OPACITY: 0.35,
} as const;

// =============================================================================
// PERFORMANCE SETTINGS
// =============================================================================

export const PERFORMANCE_DEFAULTS = {
  /** 
   * Pixel ratio divisor for high-DPI displays.
   * devicePixelRatio / 1.5 gives good balance of quality and performance.
   */
  PIXEL_RATIO_DIVISOR: 1.5,
} as const;

// =============================================================================
// EXPLOSION VIEW SETTINGS
// =============================================================================

export const EXPLOSION_DEFAULTS = {
  /** Base distance multiplier relative to model size */
  BASE_DISTANCE_MULTIPLIER: 0.4,
  
  /** Slider range */
  MIN_FACTOR: 0,
  MAX_FACTOR: 2,
  STEP: 0.1,
  
  /** Default explosion factor */
  DEFAULT_FACTOR: 1,
} as const;

// =============================================================================
// DIMENSION VISUALIZATION
// =============================================================================

export const DIMENSION_DEFAULTS = {
  /** Offset multiplier for dimension lines (relative to max dimension) */
  OFFSET_MULTIPLIER: 0.15,
  
  /** Cap length multiplier relative to offset */
  CAP_LENGTH_MULTIPLIER: 0.3,
  
  /** Arrow length multiplier relative to offset */
  ARROW_LENGTH_MULTIPLIER: 0.2,
  
  /** Arrow width multiplier relative to offset */
  ARROW_WIDTH_MULTIPLIER: 0.08,
  
  /** Extension line multiplier */
  EXTENSION_MULTIPLIER: 1.2,
  
  /** Extension line opacity */
  EXTENSION_OPACITY: 0.4,
  
  /** Main line opacity */
  LINE_OPACITY: 0.9,
} as const;

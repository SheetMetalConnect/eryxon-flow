/**
 * CAD Backend Configuration
 *
 * Centralized configuration for 3D model processing backends.
 *
 * Supported Modes:
 * - 'custom': Eryxon3D Docker-based backend (recommended)
 * - 'byob': Bring Your Own Backend (placeholder for CAD Exchanger SDK, etc.)
 * - 'frontend': Browser-only processing via occt-import-js (fallback)
 */

export type CADBackendMode = 'custom' | 'byob' | 'frontend';

export interface CADBackendConfig {
  /** Active backend mode */
  mode: CADBackendMode;

  /** Custom backend (Eryxon3D) configuration */
  custom: {
    enabled: boolean;
    url: string;
    apiKey: string;
    timeout: number;
  };

  /** Bring Your Own Backend configuration (placeholder) */
  byob: {
    enabled: boolean;
    url: string;
    apiKey: string;
    timeout: number;
    /** Custom headers for authentication */
    headers?: Record<string, string>;
  };

  /** Frontend-only processing configuration */
  frontend: {
    enabled: boolean;
    /** OCCT WASM CDN URL */
    wasmUrl: string;
    /** Max file size for browser processing (bytes) */
    maxFileSize: number;
  };

  /** Feature flags */
  features: {
    /** Enable PMI extraction */
    pmiExtraction: boolean;
    /** Enable thumbnail generation */
    thumbnails: boolean;
    /** Enable geometry tessellation */
    geometry: boolean;
  };
}

/**
 * Default configuration with custom backend enabled
 */
const defaultConfig: CADBackendConfig = {
  mode: 'custom',

  custom: {
    enabled: true,
    url: import.meta.env.VITE_CAD_SERVICE_URL || 'http://localhost:8888',
    apiKey: import.meta.env.VITE_CAD_SERVICE_API_KEY || '',
    timeout: 120000, // 2 minutes
  },

  byob: {
    enabled: false,
    url: import.meta.env.VITE_BYOB_CAD_URL || '',
    apiKey: import.meta.env.VITE_BYOB_CAD_API_KEY || '',
    timeout: 120000,
    headers: {},
  },

  frontend: {
    enabled: true, // Always available as fallback
    wasmUrl: 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.24/dist/occt-import-js.js',
    maxFileSize: 50 * 1024 * 1024, // 50MB
  },

  features: {
    pmiExtraction: true,
    thumbnails: false, // Not yet fully supported
    geometry: true,
  },
};

/**
 * Current active configuration (mutable for runtime updates)
 */
let activeConfig: CADBackendConfig = { ...defaultConfig };

/**
 * Get the current CAD backend configuration
 */
export function getCADConfig(): CADBackendConfig {
  return activeConfig;
}

/**
 * Update the CAD backend configuration
 */
export function setCADConfig(config: Partial<CADBackendConfig>): void {
  activeConfig = {
    ...activeConfig,
    ...config,
    custom: { ...activeConfig.custom, ...config.custom },
    byob: { ...activeConfig.byob, ...config.byob },
    frontend: { ...activeConfig.frontend, ...config.frontend },
    features: { ...activeConfig.features, ...config.features },
  };
}

/**
 * Set the active backend mode
 */
export function setCADBackendMode(mode: CADBackendMode): void {
  activeConfig.mode = mode;
}

/**
 * Check if a specific backend is available
 */
export function isBackendAvailable(mode: CADBackendMode): boolean {
  switch (mode) {
    case 'custom':
      return activeConfig.custom.enabled && !!activeConfig.custom.url;
    case 'byob':
      return activeConfig.byob.enabled && !!activeConfig.byob.url;
    case 'frontend':
      return activeConfig.frontend.enabled;
    default:
      return false;
  }
}

/**
 * Get the URL for the active backend
 */
export function getActiveBackendUrl(): string | null {
  switch (activeConfig.mode) {
    case 'custom':
      return activeConfig.custom.url;
    case 'byob':
      return activeConfig.byob.url;
    case 'frontend':
      return null; // No URL for frontend-only
    default:
      return null;
  }
}

/**
 * Get API key for the active backend
 */
export function getActiveApiKey(): string {
  switch (activeConfig.mode) {
    case 'custom':
      return activeConfig.custom.apiKey;
    case 'byob':
      return activeConfig.byob.apiKey;
    default:
      return '';
  }
}

/**
 * Get timeout for the active backend
 */
export function getActiveTimeout(): number {
  switch (activeConfig.mode) {
    case 'custom':
      return activeConfig.custom.timeout;
    case 'byob':
      return activeConfig.byob.timeout;
    case 'frontend':
      return 60000; // 1 minute for browser processing
    default:
      return 120000;
  }
}

/**
 * Determine the best available backend mode
 *
 * Priority: custom > byob > frontend
 */
export function determineBestBackend(): CADBackendMode {
  if (isBackendAvailable('custom')) return 'custom';
  if (isBackendAvailable('byob')) return 'byob';
  return 'frontend';
}

/**
 * Initialize configuration from environment variables
 */
export function initCADConfig(): void {
  // Check for mode override from environment
  const envMode = import.meta.env.VITE_CAD_BACKEND_MODE as CADBackendMode | undefined;
  if (envMode && ['custom', 'byob', 'frontend'].includes(envMode)) {
    activeConfig.mode = envMode;
  } else {
    // Auto-detect best available backend
    activeConfig.mode = determineBestBackend();
  }

  console.log(`[CAD Config] Active backend mode: ${activeConfig.mode}`);
}

// Initialize on module load
initCADConfig();

export default {
  getConfig: getCADConfig,
  setConfig: setCADConfig,
  setMode: setCADBackendMode,
  isAvailable: isBackendAvailable,
  getUrl: getActiveBackendUrl,
  getApiKey: getActiveApiKey,
  getTimeout: getActiveTimeout,
  determineBest: determineBestBackend,
};

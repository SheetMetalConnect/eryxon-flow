import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Eryxon Flow — Capacitor configuration for the native iOS shop-floor app.
 *
 * The app id mirrors the domain so universal links / push topics line up with
 * `app.eryxon.eu`. The web bundle ships in `dist/` (Vite build output) so the
 * standard `npm run build && npx cap sync ios` flow works unchanged.
 */
const config: CapacitorConfig = {
  appId: "eu.eryxon.flow",
  appName: "Eryxon Flow",
  webDir: "dist",
  // Use a stable scheme that matches the iOS bundle so cookies / OAuth callbacks
  // come back to the right origin. `https` keeps Service Worker + secure
  // contexts happy on device.
  server: {
    iosScheme: "https",
    // Cleartext is disabled — the production backend is HTTPS only. Local dev
    // can override via CAPACITOR_SERVER_URL.
    androidScheme: "https",
  },
  ios: {
    // Operators wear gloves: prevent zoom from being triggered by accidental
    // double-taps on critical action buttons.
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
    backgroundColor: "#111927",
    // Keep WebView responsive on iPad Pro M-series — disables a few legacy
    // accessibility hacks that cause jank during 120Hz scroll.
    handleApplicationNotifications: true,
    scrollEnabled: true,
    overrideUserInterfaceStyle: "unspecified",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: "#111927",
      iosSpinnerStyle: "large",
      spinnerColor: "#2563eb",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#111927",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "native",
      style: "DARK",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Eryxon Flow — unified Capacitor configuration for iOS / iPadOS *and*
 * Android (phone + tablet).
 *
 * The same React 18 bundle ships to both platforms; this config wires the
 * native shell. `appId` mirrors the domain so universal/app links and push
 * topics line up with `app.eryxon.eu`. Web assets are emitted to `dist/` by
 * Vite (`npm run build`) and copied into `ios/App/App/public/` and
 * `android/app/src/main/assets/public/` by `npx cap sync`.
 *
 * `CAPACITOR_SERVER_URL` lets developers point the WebView at a remote
 * dev/prod URL (e.g. https://app.eryxon.eu) for live-reload or a hosted
 * bundle without rebuilding the app.
 */
const remoteUrl = process.env.CAPACITOR_SERVER_URL?.trim() || undefined;

const config: CapacitorConfig = {
  appId: "eu.eryxon.flow",
  appName: "Eryxon Flow",
  webDir: "dist",
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
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
    backgroundColor: "#0B1220",
  },
  // Default to the bundled web assets unless an explicit override is set.
  // `iosScheme: 'https'` matches the iOS bundle origin so cookies / OAuth
  // callbacks come back consistently. Cleartext stays off in production.
  server: remoteUrl
    ? {
        url: remoteUrl,
        cleartext: remoteUrl.startsWith("http://"),
        iosScheme: remoteUrl.startsWith("http://") ? "http" : "https",
        androidScheme: remoteUrl.startsWith("http://") ? "http" : "https",
      }
    : {
        iosScheme: "https",
        androidScheme: "https",
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      // iOS background — the Android splash uses its own resource pointer
      // below which lets Android Studio render the device-correct asset.
      backgroundColor: "#0B1220",
      iosSpinnerStyle: "large",
      spinnerColor: "#2563eb",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0B1220",
      // iOS overlays the WebView (so we honor safe-area-inset-top from CSS),
      // while Android renders an opaque bar behind the system clock.
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
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#2563EB",
      sound: "beep.wav",
    },
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;

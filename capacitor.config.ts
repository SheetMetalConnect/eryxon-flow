import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Eryxon Flow — Android (Capacitor) configuration
 *
 * Targets phone + tablet (Pixel, Samsung Tab, Lenovo, etc).
 * Web assets are emitted by Vite to dist/ and copied into android/app/src/main/assets/public.
 *
 * Server.url: set CAPACITOR_SERVER_URL to point the WebView at a remote dev/prod
 * URL (e.g. https://app.eryxon.eu) for live-reload or a hosted bundle.
 */
const remoteUrl = process.env.CAPACITOR_SERVER_URL?.trim() || undefined;

const config: CapacitorConfig = {
  appId: "eu.eryxon.flow",
  appName: "Eryxon Flow",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
    backgroundColor: "#0B1220",
  },
  server: remoteUrl
    ? {
        url: remoteUrl,
        cleartext: remoteUrl.startsWith("http://"),
        androidScheme: remoteUrl.startsWith("http://") ? "http" : "https",
      }
    : {
        androidScheme: "https",
      },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0B1220",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0B1220",
      overlaysWebView: false,
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

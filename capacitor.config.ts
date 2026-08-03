import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sindcopilot.app",
  appName: "SindCopilot",
  webDir: "dist/client",
  server: {
    androidScheme: "https",
    cleartext: false,
  },
  android: {
    backgroundColor: "#0f172a",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1600,
      launchAutoHide: true,
      backgroundColor: "#0f172a",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#f8fafc",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "LIGHT",
      resizeOnFullScreen: true,
    },
  },
};

export default config;

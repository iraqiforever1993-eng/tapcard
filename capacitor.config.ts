import type { CapacitorConfig } from '@capacitor/cli';

/**
 * TapCard – Capacitor configuration
 *
 * server.url makes the native app load the live deployed web app directly,
 * so iterating on the web app updates both iOS and Android automatically –
 * no rebuild/reinstall needed. For a production / offline-capable build,
 * delete the `server` block, run `npm run build` and `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: 'com.tapcard.app',
  appName: 'TapCard',
  webDir: 'dist/public',
  server: {
    // Live, hosted web app – updates flow through automatically.
    url: 'https://delightful-faloodeh-cf893f.netlify.app/#/',
    cleartext: false,
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    // Use https scheme so cookies / fetch behave like a real web origin.
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0EA5E9',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0EA5E9',
    },
  },
};

export default config;

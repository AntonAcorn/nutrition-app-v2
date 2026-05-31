import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aiduparc.rumblyeats',
  appName: 'Rumbly Eats',
  webDir: 'dist',
  server: {
    url: 'https://rumblyeats.org',
    cleartext: false,
    // Without this, any same-origin link with target="_blank" would still
    // bounce to Safari/Chrome. Explicitly keep all rumblyeats.org paths
    // inside the WebView; subdomains (accounts.google.com, etc.) are
    // intentionally NOT listed so OAuth providers still surface in the
    // proper native browser sheet.
    allowNavigation: ['rumblyeats.org', 'www.rumblyeats.org'],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#000000',
    },
  },
  ios: {
    packageClassList: ['GoogleSignInPlugin'],
  },
}

export default config

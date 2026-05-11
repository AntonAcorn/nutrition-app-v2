import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aiduparc.rumblyeats',
  appName: 'Rumbly Eats',
  webDir: 'dist',
  server: {
    url: 'https://rumblyeats.org',
    cleartext: false,
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

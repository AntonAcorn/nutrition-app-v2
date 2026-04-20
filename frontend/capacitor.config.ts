import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.aiduparc.nutrition',
  appName: 'Nutrition',
  webDir: 'dist',
  server: {
    // Load the live production site so all API calls stay same-origin
    // and session cookies work without CORS complexity
    url: 'https://puzometr.org',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
  },
}

export default config

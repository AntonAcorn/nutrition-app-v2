import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import App from './app/App'
import './styles/index.css'
import { initAnalytics } from './shared/lib/analytics'

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
  })
}

if (Capacitor.isNativePlatform()) {
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {})
  StatusBar.setBackgroundColor({ color: '#000000' }).catch(() => {})
}

initAnalytics()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<p style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>Something went wrong. Please reload the page.</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

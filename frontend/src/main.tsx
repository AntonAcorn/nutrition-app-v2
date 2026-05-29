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

function ErrorFallback() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.6)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', minHeight: '60vh', justifyContent: 'center' }}>
      <p style={{ margin: 0, fontSize: '1.05rem' }}>Something went wrong.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ background: 'rgba(123, 97, 255, 0.22)', border: '1px solid rgba(123, 97, 255, 0.4)', color: '#ddd6fe', borderRadius: '12px', padding: '10px 22px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}
      >
        Reload
      </button>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <App />
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './styles.css'
import { initAnalytics } from './shared/lib/analytics'

initAnalytics()

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

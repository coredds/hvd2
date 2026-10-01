import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './styles/index.css'
import { createDownloadEventAdapter } from './lib/downloadEventAdapter'

const transport = window.electronAPITransport
if (transport) {
  window.electronAPI = {
    ...transport,
    downloads: { ...transport.downloads, ...createDownloadEventAdapter(transport.downloads) },
  }
}

console.log('[main] Starting renderer...')
console.log('[main] electronAPI exists:', typeof window.electronAPI !== 'undefined')

const rootEl = document.getElementById('root')
if (!rootEl) {
  console.error('[main] #root element not found!')
  throw new Error('Root element not found')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

console.log('[main] Render complete')

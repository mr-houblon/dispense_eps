import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupPwaUpdates } from './pwa'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DatabaseGate } from './components/DatabaseGate'

setupPwaUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DatabaseGate>
        <App />
      </DatabaseGate>
    </ErrorBoundary>
  </StrictMode>,
)

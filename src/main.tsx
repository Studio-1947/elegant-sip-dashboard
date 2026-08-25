import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initTheme } from './lib/theme'
import App from './App'
import { DatasetProvider } from './lib/datasetContext'
import { ToastProvider } from './components/ui/Toast'
import { AuthGate } from './components/layout/LoginScreen'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing from index.html')

/* Before the first paint: otherwise the page renders light and then flips,
   which is the one thing a theme setting must never do. */
initTheme()

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      {/* Nothing below this line renders until the gate opens - including the
          DatasetProvider, so the figures are not even read out of storage
          while the sign-in screen is up. */}
      <AuthGate>
        <DatasetProvider>
          <App />
        </DatasetProvider>
      </AuthGate>
    </ToastProvider>
  </StrictMode>,
)

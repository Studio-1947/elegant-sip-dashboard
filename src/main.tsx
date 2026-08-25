import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { DatasetProvider } from './lib/datasetContext'
import { ToastProvider } from './components/ui/Toast'

const container = document.getElementById('root')
if (!container) throw new Error('Root container missing from index.html')

createRoot(container).render(
  <StrictMode>
    <ToastProvider>
      <DatasetProvider>
        <App />
      </DatasetProvider>
    </ToastProvider>
  </StrictMode>,
)

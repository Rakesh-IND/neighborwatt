import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import './index.css'
import App from './App.tsx'
import { initStore } from './stores/app-store'

// Initialise the demo store (seeds sample accounts and offers on first run) before first render.
initStore().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

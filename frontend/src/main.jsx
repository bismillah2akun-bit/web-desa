import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './admin.css'
import App from './App.jsx'
import ConfirmProvider from './components/ConfirmProvider'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfirmProvider><App /></ConfirmProvider>
  </StrictMode>,
)

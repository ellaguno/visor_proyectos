import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Intentar importar directamente desde node_modules
import '../node_modules/frappe-gantt/dist/frappe-gantt.css';
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

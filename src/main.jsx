import React from 'react'
import ReactDOM from 'react-dom/client'
import AppContent from './App.jsx'
import './index.css'
import { KpiProvider } from './store/kpiStore'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <KpiProvider>
      <AppContent />
    </KpiProvider>
  </React.StrictMode>,
)

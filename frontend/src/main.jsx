import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// 1. Set your base Render URL
axios.defaults.baseURL = import.meta.env.VITE_API_URL || "https://mindactions-api.onrender.com";

// 2. Add this interceptor to automatically fix ALL your paths
axios.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith('/api')) {
    config.url = config.url.replace(/^\/api/, '');
  }
  return config;
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
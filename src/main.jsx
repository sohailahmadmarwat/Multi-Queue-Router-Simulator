import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { BrowserRouter } from 'react-router-dom';
import { SimulationProvider } from './context/SimulationContext.jsx';
import './styles.css';
import './pages/learning.css';
import './enhancements.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><SimulationProvider><App /></SimulationProvider></BrowserRouter></React.StrictMode>,
);

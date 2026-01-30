
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { db } from './services/db.ts';

const rawHistoricalData = `Data,Turno,Dinheiro,Credito,Debito,Pix
2025-05-02,Manhã,1488.06,2593.06,1488.06,312.52
2025-05-02,Tarde,1479.52,2515.72,2171.65,1234.22
2025-05-03,Manhã,1813.56,1470.05,2510.65,1112.58
2025-05-03,Tarde,1050.0,893.3,880.29,486.62
2025-05-05,Manhã,1973.25,1611.59,1035.56,649.77
2025-05-05,Tarde,1776.6,1531.61,1103.68,688.44
2025-05-06,Manhã,1293.0,1063.65,1353.78,666.18
2025-05-06,Tarde,2041.0,2536.96,1855.11,1103.4
2025-05-07,Manhã,2041.0,2536.96,1855.11,1103.4
2025-05-07,Tarde,1998.06,772.71,1221.05,941.6
2025-05-08,Manhã,2668.0,1870.97,1872.5,1103.53
2025-05-08,Tarde,1243.04,1238.89,1603.3,662.03
2025-05-09,Manhã,1805.51,1384.85,1417.79,672.61
2025-05-09,Tarde,1660.0,1821.57,1523.77,401.37
2025-10-18,Manhã,1505.69,2086.11,754.0,494.39
2025-12-18,Tarde,698.0,1134.23,1134.23,522.83`;

// Executa a semeadura de dados apenas se o banco estiver vazio
try {
  const seededCount = db.seedInitialData(rawHistoricalData);
  if (seededCount > 0) {
    console.debug(`[Startup] ${seededCount} registros históricos iniciais carregados.`);
  }
} catch (e) {
  console.error("[Startup] Falha na semeadura de dados:", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

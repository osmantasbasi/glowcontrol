
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMqttClient } from './services/mqttClient'
import { Buffer } from 'buffer'

// Make Buffer available globally
window.Buffer = Buffer

// Initialize MQTT client
initMqttClient().catch(error => {
  console.error('Failed to initialize MQTT client:', error);
});

createRoot(document.getElementById("root")!).render(<App />);

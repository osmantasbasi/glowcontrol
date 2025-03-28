
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMqttClient } from './services/mqttClient'

// Initialize MQTT client
initMqttClient().catch(error => {
  console.error('Failed to initialize MQTT client:', error);
});

createRoot(document.getElementById("root")!).render(<App />);

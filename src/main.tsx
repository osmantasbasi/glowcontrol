
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMqttClient } from './services/mqttClient'
import { toast } from 'sonner'

// Initialize MQTT client with better error handling
const initializeMqtt = async () => {
  try {
    await initMqttClient();
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    toast.error('Failed to connect to MQTT backend. Check that the backend service is running.');
  }
};

// Start the initialization process
initializeMqtt();

createRoot(document.getElementById("root")!).render(<App />);

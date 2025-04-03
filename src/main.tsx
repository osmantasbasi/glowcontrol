
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initMqttClient } from './services/mqttClient'
import { toast } from 'sonner'

// Initialize MQTT client with better error handling
const initializeMqtt = async () => {
  console.info('🚀 Application starting, initializing MQTT connection...');
  try {
    await initMqttClient();
  } catch (error) {
    console.error('❌ Unhandled error in MQTT initialization:', error);
    toast.error('Failed to connect to MQTT backend. Check that the backend service is running.');
  }
};

// Start the initialization process
initializeMqtt();

// Render the React application
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

console.info('📱 Frontend application rendered successfully');

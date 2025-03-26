
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { connectMqtt, loadCertificates } from './services/mqttService'

// Initialize MQTT client from saved certificates
const certificates = loadCertificates();
if (certificates && (certificates.ca || certificates.cert || certificates.key)) {
  // Connect with saved certificates
  connectMqtt('192.168.2.127', 8883);
} else {
  // Connect without certificates
  connectMqtt('192.168.2.127', 1883);
}

createRoot(document.getElementById("root")!).render(<App />);


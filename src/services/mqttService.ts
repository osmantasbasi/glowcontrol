
import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { toast } from 'sonner';

// Event types
export type MqttConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

// Event callbacks
interface MqttCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (topic: string, message: Buffer) => void;
  onError?: (error: Error) => void;
  onStatusChange?: (status: MqttConnectionStatus, error?: Error) => void;
}

// Certificate data
interface MqttCertificates {
  ca?: string;
  cert?: string;
  key?: string;
}

let client: MqttClient | null = null;
let currentStatus: MqttConnectionStatus = 'disconnected';
const callbacks: MqttCallbacks = {};

// Store loaded certificates
let certificates: MqttCertificates = {};

// Load certificates from local storage
export const loadCertificates = (): MqttCertificates => {
  try {
    const savedCerts = localStorage.getItem('mqttCertificates');
    if (savedCerts) {
      return JSON.parse(savedCerts);
    }
  } catch (error) {
    console.error('Error loading certificates from localStorage:', error);
  }
  return {};
};

// Save certificates to local storage
export const saveCertificates = (certs: MqttCertificates): void => {
  try {
    localStorage.setItem('mqttCertificates', JSON.stringify(certs));
    certificates = certs;
  } catch (error) {
    console.error('Error saving certificates to localStorage:', error);
    toast.error('Failed to save certificates');
  }
};

// Set certificate files
export const setCertificates = (ca?: string, cert?: string, key?: string): void => {
  const certs: MqttCertificates = {
    ca: ca || certificates.ca,
    cert: cert || certificates.cert,
    key: key || certificates.key
  };
  
  saveCertificates(certs);
  toast.success('Certificates updated');
};

// Update and notify status changes
const updateStatus = (status: MqttConnectionStatus, error?: Error) => {
  currentStatus = status;
  if (callbacks.onStatusChange) {
    callbacks.onStatusChange(status, error);
  }
};

// Connect to MQTT broker
export const connectMqtt = (
  host: string = '192.168.2.127',
  port: number = 8883,
  clientId: string = `wled-controller-${Math.random().toString(16).substring(2, 10)}`,
  username?: string,
  password?: string,
  callbacks?: MqttCallbacks
): void => {
  // Set callbacks
  if (callbacks) {
    Object.assign(callbacks, callbacks);
  }

  // Check if already connected
  if (client && client.connected) {
    console.log('Already connected to MQTT broker');
    return;
  }

  // Load certificates if not loaded
  if (Object.keys(certificates).length === 0) {
    certificates = loadCertificates();
  }

  updateStatus('connecting');

  // Configure secure connection options
  const options: IClientOptions = {
    clientId,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
    rejectUnauthorized: true
  };

  // Add authentication if provided
  if (username) {
    options.username = username;
  }
  if (password) {
    options.password = password;
  }

  // Add certificates if available
  if (certificates.ca) {
    options.ca = certificates.ca;
  }
  if (certificates.cert) {
    options.cert = certificates.cert;
  }
  if (certificates.key) {
    options.key = certificates.key;
  }

  // Create connection URL for secure MQTT
  const protocol = certificates.ca ? 'mqtts' : 'mqtt';
  const connectUrl = `${protocol}://${host}:${port}`;

  try {
    // Connect to broker
    client = mqtt.connect(connectUrl, options);

    // Set up event handlers
    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      updateStatus('connected');
      if (callbacks.onConnect) {
        callbacks.onConnect();
      }
      toast.success('Connected to MQTT broker');
    });

    client.on('disconnect', () => {
      console.log('Disconnected from MQTT broker');
      updateStatus('disconnected');
      if (callbacks.onDisconnect) {
        callbacks.onDisconnect();
      }
    });

    client.on('error', (error) => {
      console.error('MQTT connection error:', error);
      updateStatus('error', error);
      if (callbacks.onError) {
        callbacks.onError(error);
      }
      toast.error(`MQTT Error: ${error.message}`);
    });

    client.on('message', (topic, message) => {
      if (callbacks.onMessage) {
        callbacks.onMessage(topic, message);
      }
    });
  } catch (error) {
    console.error('Error connecting to MQTT broker:', error);
    updateStatus('error', error instanceof Error ? error : new Error(String(error)));
    toast.error(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Disconnect from MQTT broker
export const disconnectMqtt = (): void => {
  if (client && client.connected) {
    client.end(true);
    updateStatus('disconnected');
    console.log('Disconnected from MQTT broker');
  }
};

// Subscribe to topic
export const subscribe = (topic: string): void => {
  if (client && client.connected) {
    client.subscribe(topic, (error) => {
      if (error) {
        console.error(`Error subscribing to ${topic}:`, error);
        toast.error(`Failed to subscribe to ${topic}`);
      } else {
        console.log(`Subscribed to ${topic}`);
      }
    });
  } else {
    console.error('Cannot subscribe: MQTT client not connected');
    toast.error('Cannot subscribe: Not connected to MQTT broker');
  }
};

// Publish message
export const publish = (topic: string, message: string): void => {
  if (client && client.connected) {
    client.publish(topic, message, (error) => {
      if (error) {
        console.error(`Error publishing to ${topic}:`, error);
        toast.error(`Failed to publish message to ${topic}`);
      }
    });
  } else {
    console.error('Cannot publish: MQTT client not connected');
    toast.error('Cannot publish: Not connected to MQTT broker');
  }
};

// Register callbacks
export const registerCallbacks = (newCallbacks: MqttCallbacks): void => {
  Object.assign(callbacks, newCallbacks);
};

// Get current connection status
export const getConnectionStatus = (): MqttConnectionStatus => {
  return currentStatus;
};

// Get client ID
export const getClientId = (): string | undefined => {
  return client?.options.clientId;
};

// Helper for uploading certificate files
export const handleCertificateUpload = async (file: File, type: 'ca' | 'cert' | 'key'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      resolve(content);
    };
    reader.onerror = () => {
      reject(new Error('Failed to read certificate file'));
    };
    reader.readAsText(file);
  });
};

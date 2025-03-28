
import * as awsIot from 'aws-iot-device-sdk';
import { toast } from 'sonner';

// MQTT connection status
export enum MqttConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// AWS IoT device client
let iotDevice: awsIot.device | null = null;
let connectionStatus: MqttConnectionStatus = MqttConnectionStatus.DISCONNECTED;
let reconnectTimer: NodeJS.Timeout | null = null;
const MAX_RECONNECT_DELAY = 60000; // 1 minute
let reconnectAttempts = 0;

// AWS IoT configuration
const AWS_IOT_CONFIG = {
  host: 'amz.iot.mqtt',
  port: 8883,
  clientId: `glowcontrol-${Math.random().toString(16).substring(2, 10)}`,
  baseTopic: '/client_id/api', // Base topic template
  reconnectPeriod: 5000, // 5 seconds
};

// AWS IoT certificates
const CERTIFICATES = {
  keyPath: 'YOUR_CLIENT_KEY_PATH_HERE',
  certPath: 'YOUR_CLIENT_CERT_PATH_HERE',
  caPath: 'YOUR_CA_CERT_PATH_HERE',
  // For browser-based applications, you may need to use the actual content
  privateKey: `-----BEGIN RSA PRIVATE KEY-----
YOUR_CLIENT_KEY_CONTENT_HERE
-----END RSA PRIVATE KEY-----`,
  clientCert: `-----BEGIN CERTIFICATE-----
YOUR_CLIENT_CERT_CONTENT_HERE
-----END CERTIFICATE-----`,
  caCert: `-----BEGIN CERTIFICATE-----
YOUR_CA_CERT_CONTENT_HERE
-----END CERTIFICATE-----`
};

// Store active clientId for topic construction
let activeClientId: string | null = null;

// Get the actual topic to publish to based on active client ID
export const getPublishTopic = (): string => {
  if (!activeClientId) {
    return AWS_IOT_CONFIG.baseTopic; // Default if no client ID is set
  }
  return AWS_IOT_CONFIG.baseTopic.replace('client_id', activeClientId);
};

// Set active client ID for topic construction
export const setActiveClientId = (clientId: string): void => {
  activeClientId = clientId;
  console.log(`Active client ID set to: ${clientId}`);
  console.log(`Publishing topic is now: ${getPublishTopic()}`);
};

// Callbacks for status changes
const statusListeners: Array<(status: MqttConnectionStatus) => void> = [];

// Register a listener for connection status changes
export const onConnectionStatusChange = (callback: (status: MqttConnectionStatus) => void) => {
  statusListeners.push(callback);
  // Immediately call with current status
  callback(connectionStatus);
  return () => {
    const index = statusListeners.indexOf(callback);
    if (index !== -1) {
      statusListeners.splice(index, 1);
    }
  };
};

// Update connection status and notify listeners
const updateConnectionStatus = (status: MqttConnectionStatus) => {
  connectionStatus = status;
  statusListeners.forEach(listener => listener(status));
};

// Initialize AWS IoT Device client
export const initMqttClient = async (): Promise<void> => {
  if (iotDevice) {
    console.log('AWS IoT client already initialized');
    return;
  }

  try {
    updateConnectionStatus(MqttConnectionStatus.CONNECTING);
    
    console.log(`Connecting to AWS IoT endpoint at ${AWS_IOT_CONFIG.host}`);
    
    // Set up AWS IoT device configuration
    const deviceOptions = {
      host: AWS_IOT_CONFIG.host,
      port: AWS_IOT_CONFIG.port,
      clientId: AWS_IOT_CONFIG.clientId,
      // If we're in a browser environment, we need to use WebSocket
      protocol: 'wss',
      // For browser environments or when using WebSocket, 
      // we use AWS Signature Version 4 authentication instead of certificates
      // For direct TLS connections using certificates, we would use:
      // keyPath: CERTIFICATES.keyPath,
      // certPath: CERTIFICATES.certPath, 
      // caPath: CERTIFICATES.caPath,
      
      // Reconnection settings
      reconnectPeriod: AWS_IOT_CONFIG.reconnectPeriod,
      
      // Debug settings
      debug: false,
    };
    
    // Create AWS IoT device instance
    iotDevice = new awsIot.device(deviceOptions);

    // Register event handlers
    iotDevice.on('connect', () => {
      console.log('Connected to AWS IoT');
      updateConnectionStatus(MqttConnectionStatus.CONNECTED);
      toast.success('Connected to AWS IoT');
      reconnectAttempts = 0;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      
      // Subscribe to base topic
      const baseTopic = AWS_IOT_CONFIG.baseTopic.replace('client_id', '+');
      iotDevice!.subscribe(baseTopic);
      console.log(`Subscribed to topic: ${baseTopic}`);
    });

    iotDevice.on('message', (topic, payload) => {
      console.log(`Received message on topic ${topic}:`, payload.toString());
      try {
        const message = JSON.parse(payload.toString());
        // Handle incoming message if needed
      } catch (error) {
        console.warn('Failed to parse incoming message:', error);
      }
    });

    iotDevice.on('error', (error) => {
      console.error('AWS IoT connection error:', error);
      updateConnectionStatus(MqttConnectionStatus.ERROR);
      toast.error(`AWS IoT error: ${error.message || 'Unknown error'}`);
    });

    iotDevice.on('offline', () => {
      console.log('AWS IoT client is offline');
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
      toast.error('AWS IoT connection lost');
      scheduleReconnect();
    });

    iotDevice.on('close', () => {
      console.log('AWS IoT connection closed');
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
    });

  } catch (error) {
    console.error('Failed to initialize AWS IoT client:', error);
    updateConnectionStatus(MqttConnectionStatus.ERROR);
    toast.error(`Failed to initialize AWS IoT client: ${error instanceof Error ? error.message : String(error)}`);
    scheduleReconnect();
  }
};

// Function to handle reconnection with exponential backoff
const scheduleReconnect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  
  reconnectAttempts++;
  const delay = Math.min(
    AWS_IOT_CONFIG.reconnectPeriod * Math.pow(2, reconnectAttempts - 1),
    MAX_RECONNECT_DELAY
  );
  
  console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts})`);
  
  reconnectTimer = setTimeout(() => {
    console.log('Attempting to reconnect to AWS IoT');
    initMqttClient();
  }, delay);
};

// Get current connection status
export const getMqttConnectionStatus = (): MqttConnectionStatus => {
  return connectionStatus;
};

// Publish a message to the AWS IoT topic
export const publishMessage = async (payload: Record<string, any>): Promise<boolean> => {
  if (!iotDevice || connectionStatus !== MqttConnectionStatus.CONNECTED) {
    console.error('AWS IoT client not connected');
    toast.error('Cannot publish: AWS IoT client not connected');
    return false;
  }

  try {
    const topic = getPublishTopic();
    console.log(`Publishing message to topic: ${topic}`);
    
    const stringPayload = JSON.stringify(payload);
    return new Promise<boolean>((resolve) => {
      iotDevice!.publish(topic, stringPayload, { qos: 1 }, (error?: Error) => {
        if (error) {
          console.error('Failed to publish message:', error);
          toast.error(`Failed to publish message: ${error.message}`);
          resolve(false);
        } else {
          console.log('Message published successfully');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Error publishing message:', error);
    toast.error(`Error publishing message: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

// Clean up AWS IoT connection
export const cleanupMqttClient = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!iotDevice) {
      resolve();
      return;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // Disconnect the device
    iotDevice.end(false, () => {
      iotDevice = null;
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
      console.log('AWS IoT client cleaned up');
      resolve();
    });
  });
};

// Export current connection status for direct access
export const isConnected = (): boolean => {
  return connectionStatus === MqttConnectionStatus.CONNECTED;
};

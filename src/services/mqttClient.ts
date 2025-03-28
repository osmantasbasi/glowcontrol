
import mqtt, { MqttClient, IClientOptions, IConnackPacket } from 'mqtt';
import fs from 'fs';
import { toast } from 'sonner';

// MQTT connection status
export enum MqttConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// MQTT client singleton and state
let mqttClient: MqttClient | null = null;
let connectionStatus: MqttConnectionStatus = MqttConnectionStatus.DISCONNECTED;
let reconnectTimer: NodeJS.Timeout | null = null;
const MAX_RECONNECT_DELAY = 60000; // 1 minute
let reconnectAttempts = 0;

// MQTT configuration
const MQTT_CONFIG = {
  host: 'amz.iot.mqtt',
  port: 8883,
  clientId: `glowcontrol-${Math.random().toString(16).substring(2, 10)}`,
  topic: '/client_id/api',
  reconnectPeriod: 5000, // 5 seconds
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

// Initialize MQTT client
export const initMqttClient = async (): Promise<void> => {
  if (mqttClient) {
    console.log('MQTT client already initialized');
    return;
  }

  try {
    updateConnectionStatus(MqttConnectionStatus.CONNECTING);
    
    // MQTT.js options for secure connection
    const options: IClientOptions = {
      clientId: MQTT_CONFIG.clientId,
      host: MQTT_CONFIG.host,
      port: MQTT_CONFIG.port,
      protocol: 'mqtts',
      rejectUnauthorized: true,
      reconnectPeriod: MQTT_CONFIG.reconnectPeriod,
      // Load certificates for TLS
      key: fs.readFileSync('/certs/client-key.pem'),
      cert: fs.readFileSync('/certs/client-cert.pem'),
      ca: fs.readFileSync('/certs/ca-cert.pem')
    };

    const brokerUrl = `mqtts://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}`;
    console.log(`Connecting to MQTT broker at ${brokerUrl}`);
    
    mqttClient = mqtt.connect(brokerUrl, options);

    // Set up event handlers
    mqttClient.on('connect', (packet: IConnackPacket) => {
      console.log('Connected to MQTT broker:', packet);
      updateConnectionStatus(MqttConnectionStatus.CONNECTED);
      toast.success('Connected to MQTT broker');
      reconnectAttempts = 0;
      
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    mqttClient.on('error', (error) => {
      console.error('MQTT connection error:', error);
      updateConnectionStatus(MqttConnectionStatus.ERROR);
      toast.error(`MQTT error: ${error.message}`);
    });

    mqttClient.on('offline', () => {
      console.log('MQTT client is offline');
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
      toast.error('MQTT broker connection lost');
      scheduleReconnect();
    });

    mqttClient.on('disconnect', () => {
      console.log('MQTT client disconnected');
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
    });

    mqttClient.on('reconnect', () => {
      console.log('Attempting to reconnect to MQTT broker');
      updateConnectionStatus(MqttConnectionStatus.CONNECTING);
    });

    mqttClient.on('close', () => {
      console.log('MQTT connection closed');
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
    });

  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    updateConnectionStatus(MqttConnectionStatus.ERROR);
    toast.error(`Failed to initialize MQTT client: ${error instanceof Error ? error.message : String(error)}`);
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
    MQTT_CONFIG.reconnectPeriod * Math.pow(2, reconnectAttempts - 1),
    MAX_RECONNECT_DELAY
  );
  
  console.log(`Scheduling reconnection in ${delay}ms (attempt ${reconnectAttempts})`);
  
  reconnectTimer = setTimeout(() => {
    console.log('Attempting to reconnect to MQTT broker');
    initMqttClient();
  }, delay);
};

// Get current connection status
export const getMqttConnectionStatus = (): MqttConnectionStatus => {
  return connectionStatus;
};

// Publish a message to the MQTT topic
export const publishMessage = async (payload: Record<string, any>): Promise<boolean> => {
  if (!mqttClient || !mqttClient.connected) {
    console.error('MQTT client not connected');
    toast.error('Cannot publish: MQTT client not connected');
    return false;
  }

  try {
    const stringPayload = JSON.stringify(payload);
    return new Promise<boolean>((resolve) => {
      mqttClient!.publish(MQTT_CONFIG.topic, stringPayload, { qos: 1 }, (error) => {
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

// Clean up MQTT connection
export const cleanupMqttClient = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!mqttClient) {
      resolve();
      return;
    }

    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    mqttClient.end(false, {}, () => {
      mqttClient = null;
      updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
      console.log('MQTT client cleaned up');
      resolve();
    });
  });
};

// Export current connection status for direct access
export const isConnected = (): boolean => {
  return connectionStatus === MqttConnectionStatus.CONNECTED;
};

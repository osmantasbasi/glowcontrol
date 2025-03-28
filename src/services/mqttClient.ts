
import mqtt, { MqttClient, IClientOptions, IConnackPacket } from 'mqtt';
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
  baseTopic: '/client_id/api', // Base topic template
  reconnectPeriod: 5000, // 5 seconds
};

// Store active clientId for topic construction
let activeClientId: string | null = null;

// Get the actual topic to publish to based on active client ID
export const getPublishTopic = (): string => {
  if (!activeClientId) {
    return MQTT_CONFIG.baseTopic; // Default if no client ID is set
  }
  return MQTT_CONFIG.baseTopic.replace('client_id', activeClientId);
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

// Initialize MQTT client
export const initMqttClient = async (): Promise<void> => {
  if (mqttClient) {
    console.log('MQTT client already initialized');
    return;
  }

  try {
    updateConnectionStatus(MqttConnectionStatus.CONNECTING);
    
    // In browser environments, we need to use WSS instead of TLS
    // MQTT.js options for WebSocket connection
    const options: IClientOptions = {
      clientId: MQTT_CONFIG.clientId,
      clean: true,
      reconnectPeriod: MQTT_CONFIG.reconnectPeriod,
      connectTimeout: 30000, // 30 seconds
    };

    // We're running in a browser, so we need to use WebSockets
    // The actual WebSocket connection will be established by the broker
    // For AWS IoT Core, the URL format is typically wss://endpoint/mqtt
    const brokerUrl = `wss://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/mqtt`;
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
    const topic = getPublishTopic();
    console.log(`Publishing message to topic: ${topic}`);
    
    const stringPayload = JSON.stringify(payload);
    return new Promise<boolean>((resolve) => {
      mqttClient!.publish(topic, stringPayload, { qos: 1 }, (error) => {
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

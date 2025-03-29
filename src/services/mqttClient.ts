
import { toast } from 'sonner';

// MQTT connection status
export enum MqttConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error'
}

// Backend API URL - Make this configurable
// The frontend deployment needs to specify the actual backend URL
const BACKEND_API_URL = import.meta.env.VITE_MQTT_BACKEND_URL || 'http://localhost:5000';

// Store active clientId for topic construction
let activeClientId: string | null = null;
let connectionStatus: MqttConnectionStatus = MqttConnectionStatus.DISCONNECTED;

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

// Get the publish topic
export const getPublishTopic = (): string => {
  if (!activeClientId) {
    return '/client_id/api'; // Default if no client ID is set
  }
  return `/client_id/api`.replace('client_id', activeClientId);
};

// Set active client ID for topic construction
export const setActiveClientId = async (clientId: string): Promise<void> => {
  try {
    activeClientId = clientId;
    console.log(`Active client ID set to: ${clientId}`);
    console.log(`Publishing topic is now: ${getPublishTopic()}`);
    
    // Notify the backend about the new active client ID
    const response = await fetch(`${BACKEND_API_URL}/set-client`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clientId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to set active client ID on backend');
    }
    
    console.log('Backend notified of active client ID');
  } catch (error) {
    console.error('Error setting active client ID:', error);
    toast.error(`Error setting active client ID: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Initialize MQTT client
export const initMqttClient = async (): Promise<void> => {
  try {
    updateConnectionStatus(MqttConnectionStatus.CONNECTING);
    console.log('Connecting to MQTT broker via backend service');
    console.log(`Using backend API URL: ${BACKEND_API_URL}`);
    
    const response = await fetch(`${BACKEND_API_URL}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to connect to MQTT broker');
    }
    
    const data = await response.json();
    
    if (data.success) {
      updateConnectionStatus(MqttConnectionStatus.CONNECTED);
      toast.success('Connected to MQTT broker');
      console.log('Connected to MQTT broker via backend service');
      
      // Start polling for status
      startStatusPolling();
    } else {
      throw new Error(data.error || 'Failed to connect to MQTT broker');
    }
  } catch (error) {
    console.error('Failed to initialize MQTT client:', error);
    updateConnectionStatus(MqttConnectionStatus.ERROR);
    toast.error(`Failed to initialize MQTT client: ${error instanceof Error ? error.message : String(error)}`);
    
    // Display a more helpful error message
    if (error instanceof TypeError && (error.message === 'Failed to fetch' || error.message.includes('network'))) {
      toast.error('Backend server appears to be offline. Please ensure the backend is running at: ' + BACKEND_API_URL);
      console.error('MQTT backend server appears to be offline. Please check if the Python backend is running at:', BACKEND_API_URL);
    }
  }
};

// Poll for connection status from the backend
const startStatusPolling = () => {
  // Clear any existing polling interval
  if (window._mqttStatusPollingInterval) {
    clearInterval(window._mqttStatusPollingInterval);
  }
  
  // Create new polling interval - Fix the type issue by using NodeJS.Timeout
  window._mqttStatusPollingInterval = setInterval(async () => {
    try {
      const response = await fetch(`${BACKEND_API_URL}/status`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch status from backend');
      }
      
      const data = await response.json();
      
      // Update the connection status
      if (data.status === 'connected' && connectionStatus !== MqttConnectionStatus.CONNECTED) {
        updateConnectionStatus(MqttConnectionStatus.CONNECTED);
      } else if (data.status === 'connecting' && connectionStatus !== MqttConnectionStatus.CONNECTING) {
        updateConnectionStatus(MqttConnectionStatus.CONNECTING);
      } else if (data.status === 'disconnected' && connectionStatus !== MqttConnectionStatus.DISCONNECTED) {
        updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
      } else if (data.status === 'error' && connectionStatus !== MqttConnectionStatus.ERROR) {
        updateConnectionStatus(MqttConnectionStatus.ERROR);
        if (data.error) {
          console.error('MQTT connection error:', data.error);
        }
      }
    } catch (error) {
      console.error('Error polling for status:', error);
      updateConnectionStatus(MqttConnectionStatus.ERROR);
      
      // Stop polling if we can't reach the backend
      clearInterval(window._mqttStatusPollingInterval);
      window._mqttStatusPollingInterval = undefined;
    }
  }, 5000); // Poll every 5 seconds
  
  // Return a cleanup function
  return () => {
    if (window._mqttStatusPollingInterval) {
      clearInterval(window._mqttStatusPollingInterval);
      window._mqttStatusPollingInterval = undefined;
    }
  };
};

// Declare the polling interval on the window object
declare global {
  interface Window {
    _mqttStatusPollingInterval?: NodeJS.Timeout;  // Fixed: Changed from number to NodeJS.Timeout
  }
}

// Publish a message to the MQTT topic
export const publishMessage = async (payload: Record<string, any>): Promise<boolean> => {
  try {
    console.log(`Publishing message to topic: ${getPublishTopic()}`);
    console.log('Payload:', payload);
    
    const response = await fetch(`${BACKEND_API_URL}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to publish message to backend');
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Message published successfully');
      return true;
    } else {
      throw new Error(data.error || 'Failed to publish message');
    }
  } catch (error) {
    console.error('Error publishing message:', error);
    toast.error(`Error publishing message: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

// Clean up MQTT connection
export const cleanupMqttClient = async (): Promise<void> => {
  try {
    const response = await fetch(`${BACKEND_API_URL}/disconnect`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to disconnect from MQTT broker');
    }
    
    updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
    console.log('MQTT client cleaned up');
    
    // Stop polling when disconnected
    if (window._mqttStatusPollingInterval) {
      clearInterval(window._mqttStatusPollingInterval);
      window._mqttStatusPollingInterval = undefined;
    }
  } catch (error) {
    console.error('Error cleaning up MQTT client:', error);
    toast.error(`Error cleaning up MQTT client: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Export current connection status for direct access
export const isConnected = (): boolean => {
  return connectionStatus === MqttConnectionStatus.CONNECTED;
};

// Get current connection status
export const getMqttConnectionStatus = (): MqttConnectionStatus => {
  return connectionStatus;
};

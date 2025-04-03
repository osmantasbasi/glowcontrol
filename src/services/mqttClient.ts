
import { toast } from 'sonner';

// MQTT connection status
export enum MqttConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
  MOCK = 'mock' // Add a new status for mock mode
}

// Backend API URL Options
// 1. Use environment variable VITE_MQTT_BACKEND_URL if set
// 2. Try localhost:5000 as fallback
// 3. If in demo mode, try the window origin (same domain) as last resort
const getBackendUrl = () => {
  // Primary: Use environment variable if available
  const envUrl = import.meta.env.VITE_MQTT_BACKEND_URL;
  if (envUrl) return envUrl;
  
  // Fallback: Use localhost in development
  const localhostUrl = 'http://localhost:5000';
  
  // Last resort: If in browser, try same origin for demo/preview mode
  // This assumes backend might be proxied or hosted at the same origin in production
  if (typeof window !== 'undefined') {
    // Extract origin (protocol + host) from current window location
    const windowOrigin = window.location.origin;
    
    // In development we can test with localhost
    if (import.meta.env.DEV) {
      console.info('🧪 Development mode detected, using localhost backend URL:', localhostUrl);
      return localhostUrl;
    }
    
    // In production/preview, try same origin
    console.info('🔍 Production mode detected, trying same-origin backend URL');
    return `${windowOrigin}/api/mqtt`;
  }
  
  return localhostUrl;
};

// Check if we should use mock mode
const useMockMode = () => {
  // Allow forcing mock mode via URL parameter
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('mockMqtt')) {
      return true;
    }
  }

  // Use mock if in development and environment variable is set
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_MQTT === 'true') {
    return true;
  }
  
  return false;
};

// Backend API URL - Made more configurable with fallbacks
const BACKEND_API_URL = getBackendUrl();
const MOCK_MODE = useMockMode();

if (MOCK_MODE) {
  console.info('🔶 MQTT Mock Mode enabled - no backend connection required');
} else {
  console.info(`🌐 MQTT Backend URL configured as: ${BACKEND_API_URL}`);
}

// Store active clientId for topic construction
let activeClientId: string | null = null;
let connectionStatus: MqttConnectionStatus = MqttConnectionStatus.DISCONNECTED;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Mock data storage
const mockState = {
  devices: {},
  messages: []
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

// Get the publish topic
export const getPublishTopic = (): string => {
  if (!activeClientId) {
    return '/client_id/api'; // Default if no client ID is set
  }
  return `/client_id/api`.replace('client_id', activeClientId);
};

// Set active client ID for topic construction
export const setActiveClientId = async (clientId: string): Promise<void> => {
  if (MOCK_MODE) {
    activeClientId = clientId;
    console.log(`🔶 Mock: Active client ID set to: ${clientId}`);
    console.log(`🔶 Mock: Publishing topic is now: ${getPublishTopic()}`);
    return;
  }

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

// Initialize MQTT client with retry mechanism
export const initMqttClient = async (retryCount = 0): Promise<void> => {
  // If in mock mode, set status to MOCK and return immediately
  if (MOCK_MODE) {
    console.info('🔶 Initializing MQTT mock service');
    updateConnectionStatus(MqttConnectionStatus.MOCK);
    console.info('✅ MQTT mock service initialized successfully');
    toast.success('Connected to MQTT mock service');
    return;
  }

  // Update internal retry count
  connectionRetryCount = retryCount;
  
  try {
    updateConnectionStatus(MqttConnectionStatus.CONNECTING);
    console.info(`🔄 Connecting to MQTT broker via backend service (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS + 1})`);
    console.info(`🌐 Using backend API URL: ${BACKEND_API_URL}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${BACKEND_API_URL}/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to connect to MQTT broker');
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.info('✅ Connected to MQTT broker via backend service');
      console.info('📡 MQTT Connection Details:', data);
      updateConnectionStatus(MqttConnectionStatus.CONNECTED);
      toast.success('Connected to MQTT broker');
      
      // Reset retry count on successful connection
      connectionRetryCount = 0;
      
      // Start polling for status with more detailed logging
      startStatusPolling();
    } else {
      throw new Error(data.error || 'Failed to connect to MQTT broker');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to initialize MQTT client: ${errorMessage}`, error);
    updateConnectionStatus(MqttConnectionStatus.ERROR);
    
    // Handle network errors with more detailed messages
    if (error instanceof TypeError && (errorMessage === 'Failed to fetch' || errorMessage.includes('network'))) {
      const backendError = 'MQTT backend server appears to be offline';
      console.error(`🔴 ${backendError}. Please check if the Python backend is running at:`, BACKEND_API_URL);
      
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const nextRetry = retryCount + 1;
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff with max 10s
        
        console.info(`🔄 Connection attempt failed. Retrying in ${delay/1000}s (attempt ${nextRetry}/${MAX_RETRY_ATTEMPTS})...`);
        toast.error(`${backendError}. Retrying in ${delay/1000}s...`);
        
        // Retry connection after delay
        setTimeout(() => {
          initMqttClient(nextRetry);
        }, delay);
      } else {
        // Max retries reached
        toast.error(`${backendError}. Please ensure the backend is running at: ${BACKEND_API_URL}`);
        console.error(`🛑 Maximum retry attempts (${MAX_RETRY_ATTEMPTS}) reached. Giving up.`);
        
        // Suggest mock mode in development
        if (import.meta.env.DEV) {
          console.info('💡 Tip: Add ?mockMqtt=true to the URL to enable mock mode during development');
          toast('Tip: Add ?mockMqtt=true to the URL to enable mock mode', {
            description: 'This will allow you to develop without the backend running',
            action: {
              label: 'Enable Mock',
              onClick: () => {
                // Create a new URL with the mockMqtt parameter
                const url = new URL(window.location.href);
                url.searchParams.set('mockMqtt', 'true');
                window.location.href = url.toString();
              }
            }
          });
        }
      }
    } else {
      // For other errors
      toast.error(`Failed to initialize MQTT client: ${errorMessage}`);
    }
  }
};

// Poll for connection status from the backend
const startStatusPolling = () => {
  // Skip polling in mock mode
  if (MOCK_MODE) return () => {};

  // Clear any existing polling interval
  if (window._mqttStatusPollingInterval) {
    clearInterval(window._mqttStatusPollingInterval);
  }
  
  // Create new polling interval
  window._mqttStatusPollingInterval = setInterval(async () => {
    try {
      console.debug('🔄 Polling MQTT status...');
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${BACKEND_API_URL}/status`, {
        signal: controller.signal
      }).finally(() => clearTimeout(timeoutId));
      
      if (!response.ok) {
        throw new Error('Failed to fetch status from backend');
      }
      
      const data = await response.json();
      console.debug('📊 MQTT Status Update:', data);
      
      // Update the connection status with logging
      if (data.status === 'connected' && connectionStatus !== MqttConnectionStatus.CONNECTED) {
        console.info('✅ MQTT Connection Active');
        updateConnectionStatus(MqttConnectionStatus.CONNECTED);
      } else if (data.status === 'connecting' && connectionStatus !== MqttConnectionStatus.CONNECTING) {
        console.info('🔄 MQTT Connecting...');
        updateConnectionStatus(MqttConnectionStatus.CONNECTING);
      } else if (data.status === 'disconnected' && connectionStatus !== MqttConnectionStatus.DISCONNECTED) {
        console.info('⚪ MQTT Disconnected');
        updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
      } else if (data.status === 'error' && connectionStatus !== MqttConnectionStatus.ERROR) {
        console.error('❌ MQTT Connection Error');
        updateConnectionStatus(MqttConnectionStatus.ERROR);
        if (data.error) {
          console.error('🔴 MQTT Error Details:', data.error);
        }
      }
    } catch (error) {
      console.error('❌ Error polling for status:', error);
      updateConnectionStatus(MqttConnectionStatus.ERROR);
      
      // No need to clear interval here - keep trying to reconnect
      // Only clear if we're sure the backend is unreachable
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('🔴 Backend appears to be offline during status polling');
        clearInterval(window._mqttStatusPollingInterval);
        window._mqttStatusPollingInterval = undefined;
        
        // Attempt to reconnect after brief delay
        setTimeout(() => {
          if (connectionStatus !== MqttConnectionStatus.CONNECTED) {
            console.info('🔄 Attempting to reconnect to backend...');
            initMqttClient(0); // Start fresh reconnection attempt
          }
        }, 5000);
      }
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
    _mqttStatusPollingInterval?: NodeJS.Timeout;
  }
}

// Publish a message to the MQTT topic
export const publishMessage = async (payload: Record<string, any>): Promise<boolean> => {
  // Mock mode publishing
  if (MOCK_MODE) {
    console.log(`🔶 Mock: Publishing message to topic: ${getPublishTopic()}`);
    console.log('🔶 Mock: Payload:', payload);
    
    // Store message in mock state
    mockState.messages.push({
      topic: getPublishTopic(),
      payload,
      timestamp: new Date()
    });
    
    // Log success
    console.log('✅ Mock: Message published successfully');
    return true;
  }

  try {
    console.log(`Publishing message to topic: ${getPublishTopic()}`);
    console.log('Payload:', payload);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${BACKEND_API_URL}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to publish message to backend');
    }
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Message published successfully');
      return true;
    } else {
      throw new Error(data.error || 'Failed to publish message');
    }
  } catch (error) {
    console.error('❌ Error publishing message:', error);
    toast.error(`Error publishing message: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

// Clean up MQTT connection
export const cleanupMqttClient = async (): Promise<void> => {
  // In mock mode, just update the status
  if (MOCK_MODE) {
    console.info('🔶 Mock: Cleaning up MQTT mock service');
    updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
    console.log('✅ Mock: MQTT mock service disconnected');
    return;
  }

  try {
    console.info('🧹 Cleaning up MQTT client connection...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${BACKEND_API_URL}/disconnect`, {
      method: 'POST',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to disconnect from MQTT broker');
    }
    
    updateConnectionStatus(MqttConnectionStatus.DISCONNECTED);
    console.log('✅ MQTT client cleaned up successfully');
    
    // Stop polling when disconnected
    if (window._mqttStatusPollingInterval) {
      clearInterval(window._mqttStatusPollingInterval);
      window._mqttStatusPollingInterval = undefined;
    }
  } catch (error) {
    console.error('❌ Error cleaning up MQTT client:', error);
    toast.error(`Error cleaning up MQTT client: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Export current connection status for direct access
export const isConnected = (): boolean => {
  // In mock mode, always return true
  if (MOCK_MODE) return true;
  return connectionStatus === MqttConnectionStatus.CONNECTED;
};

// Get current connection status
export const getMqttConnectionStatus = (): MqttConnectionStatus => {
  return connectionStatus;
};



import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { toast } from 'sonner';

// Default MQTT connection options
const defaultOptions: IClientOptions = {
  keepalive: 60,
  clientId: `glowcontrol_${Math.random().toString(16).substring(2, 10)}`,
  protocolId: 'MQTT',
  protocolVersion: 4,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
};

// Default broker URL - always use localhost:1883
const DEFAULT_BROKER_URL = 'ws://localhost:9001'; // Try WebSocket connection instead of direct TCP/MQTT

// Custom event type for connection status changes
type ConnectionStatusListener = (connected: boolean) => void;

class MqttService {
  private client: MqttClient | null = null;
  private subscribers: Map<string, Array<(message: string) => void>> = new Map();
  private clientId: string = '';
  private brokerUrl: string = DEFAULT_BROKER_URL;
  private connectOptions: IClientOptions = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private connectionStatusListeners: ConnectionStatusListener[] = [];
  private lastError: string | null = null;
  
  // Add a connection status listener
  addConnectionStatusListener(listener: ConnectionStatusListener): void {
    this.connectionStatusListeners.push(listener);
  }
  
  // Remove a connection status listener
  removeConnectionStatusListener(listener: ConnectionStatusListener): void {
    this.connectionStatusListeners = this.connectionStatusListeners.filter(l => l !== listener);
  }
  
  // Notify all listeners of connection status change
  private notifyConnectionStatusChange(connected: boolean): void {
    this.connectionStatusListeners.forEach(listener => listener(connected));
  }
  
  // Get last error
  getLastError(): string | null {
    return this.lastError;
  }
  
  // Connect to MQTT broker - try both localhost:1883 and WebSocket
  connect(brokerUrl: string = DEFAULT_BROKER_URL, clientId: string, options: IClientOptions = {}): Promise<boolean> {
    return new Promise((resolve) => {
      // Reset the last error
      this.lastError = null;
      
      // Save the connection details for potential reconnection
      this.brokerUrl = DEFAULT_BROKER_URL; // Default to WebSocket
      this.clientId = clientId;
      this.connectOptions = { ...options };
      this.reconnectAttempts = 0;
      
      // If already connected, disconnect first
      if (this.client && this.client.connected) {
        this.disconnect();
      }
      
      try {
        // Try to connect with WebSocket first
        const mqttOptions = { 
          ...defaultOptions, 
          ...options,
          clientId: clientId || defaultOptions.clientId, // Use provided client ID or generate one
          reconnectPeriod: 0 // Disable automatic reconnection to handle it manually
        };
        
        console.log(`Attempting to connect to MQTT broker at ${DEFAULT_BROKER_URL}`);
        this.client = mqtt.connect(DEFAULT_BROKER_URL, mqttOptions);
        
        // Set up event handlers
        this.client.on('connect', () => {
          this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
          this.lastError = null;
          toast.success('Connected to MQTT broker');
          this.notifyConnectionStatusChange(true);
          resolve(true);
        });
        
        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          this.lastError = err.message;
          toast.error(`MQTT error: ${err.message}`);
          if (!this.client?.connected) {
            this.notifyConnectionStatusChange(false);
            
            // If WebSocket fails, try direct MQTT
            if (DEFAULT_BROKER_URL.startsWith('ws') && this.reconnectAttempts === 0) {
              console.log('WebSocket connection failed, trying direct MQTT connection...');
              this.client?.end(true);
              this.client = mqtt.connect('mqtt://localhost:1883', mqttOptions);
              
              // Set up event handlers for the new connection
              this.client.on('connect', () => {
                this.reconnectAttempts = 0;
                this.lastError = null;
                toast.success('Connected to MQTT broker');
                this.notifyConnectionStatusChange(true);
                resolve(true);
              });
              
              this.client.on('error', (err) => {
                console.error('Direct MQTT connection error:', err);
                this.lastError = err.message;
                toast.error(`MQTT error: ${err.message}. Check if the broker is running and accessible.`);
                this.notifyConnectionStatusChange(false);
                resolve(false);
              });
            } else {
              resolve(false);
            }
          }
        });
        
        this.client.on('message', (topic, message) => {
          const messageStr = message.toString();
          
          // Notify all subscribers for this topic
          const topicSubscribers = this.subscribers.get(topic);
          if (topicSubscribers) {
            topicSubscribers.forEach(callback => callback(messageStr));
          }
        });
        
        this.client.on('disconnect', () => {
          toast.info('Disconnected from MQTT broker');
          this.notifyConnectionStatusChange(false);
        });
        
        this.client.on('close', () => {
          console.log('MQTT connection closed');
          this.notifyConnectionStatusChange(false);
        });
        
        this.client.on('offline', () => {
          console.log('MQTT client is offline');
          this.lastError = 'Connection lost';
          toast.error('MQTT broker connection lost');
          this.notifyConnectionStatusChange(false);
        });
      } catch (error) {
        console.error('Failed to connect to MQTT broker:', error);
        this.lastError = (error as Error).message;
        toast.error(`Failed to connect: ${(error as Error).message}`);
        this.notifyConnectionStatusChange(false);
        resolve(false);
      }
    });
  }
  
  // Manual reconnect method
  reconnect(): Promise<boolean> {
    if (this.clientId) {
      this.reconnectAttempts = 0; // Reset reconnect attempts for manual reconnection
      toast.info('Attempting to reconnect to MQTT broker...');
      return this.connect(this.brokerUrl, this.clientId, this.connectOptions);
    } else {
      const randomClientId = `glowcontrol_${Math.random().toString(16).substring(2, 10)}`;
      toast.info(`Connecting with generated client ID: ${randomClientId}`);
      return this.connect(this.brokerUrl, randomClientId, this.connectOptions);
    }
  }
  
  // Disconnect from broker
  disconnect() {
    if (this.client) {
      this.client.end(true); // Force disconnect
      this.client = null;
      this.subscribers.clear();
      this.notifyConnectionStatusChange(false);
    }
  }
  
  // Subscribe to a topic
  subscribe(topic: string, callback: (message: string) => void) {
    if (!this.client || !this.client.connected) {
      toast.error('Not connected to MQTT broker');
      return false;
    }
    
    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Error subscribing to ${topic}:`, err);
        toast.error(`Failed to subscribe to ${topic}`);
        return;
      }
      
      // Add callback to subscribers list
      if (!this.subscribers.has(topic)) {
        this.subscribers.set(topic, []);
      }
      
      this.subscribers.get(topic)?.push(callback);
    });
    
    return true;
  }
  
  // Unsubscribe from a topic
  unsubscribe(topic: string, callback?: (message: string) => void) {
    if (!this.client || !this.client.connected) {
      return false;
    }
    
    this.client.unsubscribe(topic);
    
    // Remove specific callback or all callbacks for the topic
    if (callback && this.subscribers.has(topic)) {
      const callbacks = this.subscribers.get(topic) || [];
      this.subscribers.set(
        topic,
        callbacks.filter(cb => cb !== callback)
      );
    } else {
      this.subscribers.delete(topic);
    }
    
    return true;
  }
  
  // Publish a message to a topic
  publish(topic: string, message: string, options = {}) {
    if (!this.client || !this.client.connected) {
      toast.error('Not connected to MQTT broker');
      return false;
    }
    
    this.client.publish(topic, message, options, (err) => {
      if (err) {
        console.error(`Error publishing to ${topic}:`, err);
        toast.error(`Failed to publish to ${topic}`);
      }
    });
    
    return true;
  }
  
  // Publish JSON data to the client_id/api topic
  publishToApi(data: any, options = {}) {
    if (!this.clientId) {
      toast.error('No client ID available. Connect first with a client ID.');
      return false;
    }
    
    const topic = `${this.clientId}/api`;
    const jsonMessage = JSON.stringify(data);
    
    return this.publish(topic, jsonMessage, options);
  }
  
  // Check if connected
  isConnected(): boolean {
    return !!(this.client && this.client.connected);
  }
  
  // Get current client ID
  getClientId(): string {
    return this.clientId;
  }
}

// Create singleton instance
const mqttService = new MqttService();
export default mqttService;

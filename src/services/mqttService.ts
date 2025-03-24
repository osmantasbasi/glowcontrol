
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

class MqttService {
  private client: MqttClient | null = null;
  private subscribers: Map<string, Array<(message: string) => void>> = new Map();
  private clientId: string = '';
  
  // Connect to MQTT broker
  connect(brokerUrl: string, clientId: string, options: IClientOptions = {}): Promise<boolean> {
    return new Promise((resolve) => {
      // Save the client ID
      this.clientId = clientId;
      
      // If already connected, disconnect first
      if (this.client && this.client.connected) {
        this.disconnect();
      }
      
      try {
        // Create connection with merged options and custom client ID
        const mqttOptions = { 
          ...defaultOptions, 
          ...options,
          clientId: clientId || defaultOptions.clientId // Use provided client ID or generate one
        };
        
        this.client = mqtt.connect(brokerUrl, mqttOptions);
        
        // Set up event handlers
        this.client.on('connect', () => {
          toast.success('Connected to MQTT broker');
          resolve(true);
        });
        
        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          toast.error(`MQTT error: ${err.message}`);
          resolve(false);
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
        });
        
        this.client.on('reconnect', () => {
          toast.info('Reconnecting to MQTT broker...');
        });
      } catch (error) {
        console.error('Failed to connect to MQTT broker:', error);
        toast.error(`Failed to connect: ${(error as Error).message}`);
        resolve(false);
      }
    });
  }
  
  // Disconnect from broker
  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.subscribers.clear();
      this.clientId = '';
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

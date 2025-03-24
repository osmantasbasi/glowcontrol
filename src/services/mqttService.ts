
import mqtt from 'mqtt';
import { Buffer as BufferPolyfill } from 'buffer';

// Ensure Buffer is available globally with multiple fallbacks
if (typeof window !== 'undefined') {
  if (!window.Buffer) {
    console.warn("Buffer not defined in global scope, setting it now");
    window.Buffer = BufferPolyfill;
  }
  
  // Verify Buffer is properly initialized
  console.log('MQTT Service - Buffer check:', !!window.Buffer);
  console.log('MQTT Service - Buffer.from check:', typeof window.Buffer?.from === 'function');
  
  // Provide fallback if Buffer.from is missing
  if (!window.Buffer.from) {
    console.warn("Buffer.from not available, providing fallback");
    window.Buffer.from = BufferPolyfill.from;
  }
}

// Add process object for browser environment
if (typeof window !== 'undefined' && !window.process) {
  window.process = { env: {} } as any;
}

const MQTT_BROKER = 'ws://192.168.2.127:8083/mqtt'; // WebSocket protocol

export interface MQTTMessage {
  topic: string;
  payload: string;
}

class MQTTService {
  private client: mqtt.MqttClient | null = null;
  private messageCallbacks: ((message: MQTTMessage) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private isConnected = false;

  connect() {
    if (this.client) {
      this.client.end();
    }

    try {
      console.log('Attempting to connect to MQTT broker:', MQTT_BROKER);
      console.log('Buffer available:', !!window.Buffer);
      console.log('Buffer.from available:', typeof window.Buffer?.from === 'function');
      
      this.client = mqtt.connect(MQTT_BROKER, {
        clientId: `glowcontrol_${Math.random().toString(16).substr(2, 8)}`,
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        console.log('Connected to MQTT broker');
        this.isConnected = true;
        this.connectionCallbacks.forEach(callback => callback(true));
      });

      this.client.on('error', (err) => {
        console.error('MQTT connection error:', err);
        this.isConnected = false;
        this.connectionCallbacks.forEach(callback => callback(false));
      });

      this.client.on('close', () => {
        console.log('MQTT connection closed');
        this.isConnected = false;
        this.connectionCallbacks.forEach(callback => callback(false));
      });

      this.client.on('message', (topic, message) => {
        const payload = message.toString();
        console.log(`Received message on ${topic}:`, payload);
        
        this.messageCallbacks.forEach(callback => {
          callback({
            topic,
            payload,
          });
        });
      });
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      this.isConnected = false;
      this.connectionCallbacks.forEach(callback => callback(false));
    }
  }

  subscribe(topic: string) {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot subscribe, not connected to MQTT broker');
      return;
    }

    this.client.subscribe(topic, (err) => {
      if (err) {
        console.error(`Error subscribing to ${topic}:`, err);
      } else {
        console.log(`Subscribed to ${topic}`);
      }
    });
  }

  publish(topic: string, message: string | object) {
    if (!this.client || !this.isConnected) {
      console.warn('Cannot publish, not connected to MQTT broker');
      return false;
    }

    const payload = typeof message === 'object' ? JSON.stringify(message) : message;
    
    this.client.publish(topic, payload, (err) => {
      if (err) {
        console.error(`Error publishing to ${topic}:`, err);
        return false;
      }
    });
    
    return true;
  }

  onMessage(callback: (message: MQTTMessage) => void) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionCallbacks.push(callback);
    callback(this.isConnected);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  disconnect() {
    if (this.client) {
      this.client.end();
      this.client = null;
      this.isConnected = false;
    }
  }
}

// Create a singleton instance
const mqttService = new MQTTService();

export default mqttService;

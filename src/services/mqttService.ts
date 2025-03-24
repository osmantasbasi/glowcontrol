(function ensureBufferForMQTT() {
  if (typeof window !== 'undefined') {
    console.log('MQTT Service - initializing Buffer before imports');
    
    try {
      // Check if Buffer and Buffer.from are available
      if (!window.Buffer || typeof window.Buffer.from !== 'function') {
        console.warn('Buffer.from not available in MQTT service, fixing it');
        
        // Use buffer from CDN (loaded in index.html)
        if (typeof window.buffer !== 'undefined' && window.buffer.Buffer) {
          console.log('Using buffer from CDN in MQTT service');
          window.Buffer = window.buffer.Buffer;
        } else {
          console.log('Attempting to load Buffer from module in MQTT service');
          // Try to load from buffer module as fallback
          const BufferModule = require('buffer');
          window.Buffer = BufferModule.Buffer;
        }
      }
      
      // Verify Buffer.from is available
      if (!window.Buffer || typeof window.Buffer.from !== 'function') {
        throw new Error('Buffer.from is still not available after initialization in MQTT service');
      }
      
      // Test Buffer.from functionality
      console.log('MQTT Service - Buffer.from available:', typeof window.Buffer.from === 'function');
      const testBuffer = window.Buffer.from('test');
      console.log('Buffer.from test in MQTT service:', testBuffer instanceof Uint8Array);
    } catch (e) {
      console.error('Failed to initialize Buffer in MQTT service:', e);
    }
  }
})();

// Only proceed with imports after Buffer is initialized
import mqtt from 'mqtt';

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
      console.log('Buffer check in connect method:');
      console.log('- Buffer available:', !!window.Buffer);
      console.log('- Buffer.from available:', typeof window.Buffer?.from === 'function');
      
      // Verify Buffer.from one more time before connecting
      if (!window.Buffer || typeof window.Buffer.from !== 'function') {
        throw new Error('Buffer.from is not available before MQTT connect');
      }
      
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

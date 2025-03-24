
// Define globalThis for browsers that don't have it
if (typeof globalThis === 'undefined') {
  (window as any).globalThis = window;
}

// Create a complete Buffer polyfill if needed before any imports
(function ensureCompleteBufferForMQTT() {
  if (typeof window !== 'undefined') {
    console.log('MQTT Service - initializing Buffer before imports');
    
    try {
      // Make sure process.env is available
      if (!window.process) {
        window.process = { env: {} } as any;
      }
      
      // Check if Buffer exists and has from method
      if (!window.Buffer || typeof window.Buffer.from !== 'function') {
        console.warn('Buffer.from not available in MQTT service, fixing it');
        
        // Use buffer from CDN (loaded in index.html)
        if (typeof window.buffer !== 'undefined' && window.buffer.Buffer) {
          console.log('Using buffer from CDN in MQTT service');
          window.Buffer = window.buffer.Buffer;
          
          // Ensure from method exists
          if (typeof window.Buffer.from !== 'function') {
            console.log('Creating Buffer.from implementation in MQTT service');
            window.Buffer.from = function(data: any, encoding?: string): Uint8Array {
              if (typeof data === 'string') {
                return new window.Buffer(data, encoding);
              }
              return new window.Buffer(data);
            };
          }
        } else {
          // No buffer polyfill available, create a minimal one
          console.warn('Creating minimal Buffer polyfill in MQTT service');
          
          class MinimalBuffer extends Uint8Array {
            constructor(arg: any, encodingOrOffset?: any, length?: number) {
              let buffer;
              if (typeof arg === 'number') {
                buffer = new Uint8Array(arg);
              } else if (typeof arg === 'string') {
                // Basic string to buffer conversion
                buffer = new TextEncoder().encode(arg);
              } else if (arg instanceof ArrayBuffer || ArrayBuffer.isView(arg)) {
                buffer = new Uint8Array(arg);
              } else {
                buffer = new Uint8Array(0);
              }
              super(buffer);
            }
            
            static from(data: any, encoding?: string): MinimalBuffer {
              if (typeof data === 'string') {
                return new MinimalBuffer(data, encoding);
              }
              return new MinimalBuffer(data);
            }
            
            toString(encoding?: string): string {
              return new TextDecoder().decode(this);
            }
          }
          
          window.Buffer = MinimalBuffer as any;
        }
      }
      
      // Make Buffer globally available
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).Buffer = window.Buffer;
      }
      
      // Test Buffer.from
      if (typeof window.Buffer?.from === 'function') {
        console.log('MQTT Service - Buffer.from test:');
        const testBuffer = window.Buffer.from('test');
        console.log('Result:', testBuffer instanceof Uint8Array, 'Length:', testBuffer.length);
      } else {
        console.error('Buffer.from still not available after initialization');
      }
    } catch (e) {
      console.error('Failed to initialize Buffer in MQTT service:', e);
    }
  }
})();

// Wait to import MQTT until Buffer is initialized
import mqtt from 'mqtt';

// Add process object for browser environment if not already done
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

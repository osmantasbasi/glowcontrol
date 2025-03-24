
import mqtt, { MqttClient } from 'mqtt';
import { toast } from 'sonner';
import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment
window.Buffer = Buffer;

let mqttClient: MqttClient | null = null;
const BROKER_URL = 'ws://192.168.2.127:8083/mqtt'; // Using WebSocket connection
const DEFAULT_QOS = 1;

export const connectMqtt = (): Promise<MqttClient> => {
  return new Promise((resolve, reject) => {
    if (mqttClient && mqttClient.connected) {
      resolve(mqttClient);
      return;
    }
    
    try {
      console.log('Connecting to MQTT broker:', BROKER_URL);
      const client = mqtt.connect(BROKER_URL, {
        clientId: `wled-control-${Math.random().toString(16).substr(2, 8)}`,
        keepalive: 60,
        reconnectPeriod: 1000,
        protocol: 'ws', // WebSocket protocol
      });
      
      client.on('connect', () => {
        console.log('Connected to MQTT broker');
        mqttClient = client;
        resolve(client);
      });
      
      client.on('error', (err) => {
        console.error('MQTT error:', err);
        toast.error('MQTT connection error');
        reject(err);
      });
      
      client.on('offline', () => {
        console.log('MQTT client offline');
        toast.error('MQTT broker offline');
      });
      
      client.on('reconnect', () => {
        console.log('Attempting to reconnect to MQTT broker');
      });
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      toast.error('Failed to connect to MQTT broker');
      reject(error);
    }
  });
};

export const getMqttClient = (): MqttClient | null => {
  return mqttClient;
};

export const publishToDevice = (clientId: string, payload: any): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!mqttClient || !mqttClient.connected) {
        await connectMqtt();
      }
      
      if (!mqttClient) {
        reject(new Error('Failed to establish MQTT connection'));
        return;
      }
      
      const topic = `/${clientId}`;
      const message = JSON.stringify(payload);
      
      console.log(`Publishing to ${topic}:`, message);
      mqttClient.publish(topic, message, { qos: DEFAULT_QOS }, (error) => {
        if (error) {
          console.error('MQTT publish error:', error);
          reject(error);
          return;
        }
        
        console.log('Message published successfully');
        resolve();
      });
    } catch (error) {
      console.error('Error publishing MQTT message:', error);
      reject(error);
    }
  });
};

export const subscribeTo = (topic: string, callback: (message: any) => void): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!mqttClient || !mqttClient.connected) {
        await connectMqtt();
      }
      
      if (!mqttClient) {
        reject(new Error('Failed to establish MQTT connection'));
        return;
      }
      
      mqttClient.subscribe(topic, { qos: DEFAULT_QOS }, (error) => {
        if (error) {
          console.error(`Error subscribing to ${topic}:`, error);
          reject(error);
          return;
        }
        
        console.log(`Subscribed to ${topic}`);
        resolve();
      });
      
      mqttClient.on('message', (receivedTopic, message) => {
        if (receivedTopic === topic) {
          try {
            const parsedMessage = JSON.parse(message.toString());
            callback(parsedMessage);
          } catch (error) {
            console.error('Error parsing MQTT message:', error);
          }
        }
      });
    } catch (error) {
      console.error('Error subscribing to MQTT topic:', error);
      reject(error);
    }
  });
};

export const unsubscribeFrom = (topic: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!mqttClient || !mqttClient.connected) {
      resolve();
      return;
    }
    
    mqttClient.unsubscribe(topic, (error) => {
      if (error) {
        console.error(`Error unsubscribing from ${topic}:`, error);
        reject(error);
        return;
      }
      
      console.log(`Unsubscribed from ${topic}`);
      resolve();
    });
  });
};

export const disconnectMqtt = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!mqttClient) {
      resolve();
      return;
    }
    
    mqttClient.end(true, {}, () => {
      console.log('Disconnected from MQTT broker');
      mqttClient = null;
      resolve();
    });
  });
};


// WLED API service

type WLEDState = {
  on: boolean;
  brightness: number;
  color: {
    r: number;
    g: number;
    b: number;
  };
  effect: number;
  speed: number;
  intensity: number;
  seg?: SegmentData[];
};

type SegmentData = {
  id: number;
  start: number;
  stop: number;
  len: number;
  col: [number, number, number][];
  fx: number;
  sx: number;
  ix: number;
  on: boolean;
  bri: number;
  grp?: number;
  spc?: number;
  of?: number;
  frz?: boolean;
  cct?: number;
  set?: number;
  pal?: number;
  c1?: number;
  c2?: number;
  c3?: number;
  sel?: boolean;
  rev?: boolean;
  mi?: boolean;
  o1?: boolean;
  o2?: boolean;
  o3?: boolean;
  si?: number;
  m12?: number;
  [key: string]: any;
};

type WLEDInfo = {
  name: string;
  version: string;
  ledCount: number;
  effects: string[];
  palettes: string[];
};

type NetworkConfig = {
  protocol: 'http' | 'https';
  ipAddress: string;
  port?: number;
  autoDetect?: boolean;
};

class WLEDApi {
  private baseUrl: string;
  private socketConnection: WebSocket | null = null;
  private onUpdateCallbacks: ((state: WLEDState) => void)[] = [];
  private networkConfig: NetworkConfig;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: number = 2000; // Start with 2 seconds
  private initialized: boolean = false;
  private connectionFailed: boolean = false;

  constructor(ipAddress: string, port?: number) {
    // Remove any protocol prefixes if they exist
    const cleanIpAddress = ipAddress.replace(/(^\w+:|^)\/\//, '');
    
    this.networkConfig = {
      protocol: 'http',
      ipAddress: cleanIpAddress,
      port: port
    };
    
    this.baseUrl = this.buildBaseUrl();
  }

  private buildBaseUrl(): string {
    const { protocol, ipAddress, port } = this.networkConfig;
    return `${protocol}://${ipAddress}${port ? `:${port}` : ''}`;
  }

  // Detect if the device is on the local network by trying different common IP addresses
  async detectDevice(): Promise<string | null> {
    console.log('Attempting to detect WLED device on network...');
    
    // Common IP addresses for WLED devices and common local network patterns
    const commonAddresses = [
      '192.168.1.4', 
      '192.168.0.4',
      '192.168.1.2',
      '192.168.0.2',
      'wled.local'
    ];
    
    // Try each address with a short timeout
    for (const ip of commonAddresses) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        
        const response = await fetch(`http://${ip}/json/info`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`WLED device found at ${ip}`);
          return ip;
        }
      } catch (e) {
        // Ignore errors for auto-detection
      }
    }
    
    // If all common addresses fail, try to discover devices on the network
    // This is more complex and requires network scan capabilities
    // For now, we'll return null if no devices are found
    console.log('No WLED devices detected on common addresses');
    return null;
  }

  // Helper method to handle network requests with timeout and retry logic
  private async makeRequest(
    endpoint: string, 
    options: RequestInit = {}, 
    timeoutMs: number = 5000,
    retries: number = 1
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`Making request to: ${url}`);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(id);
      
      if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status}`);
      }
      
      // If we get here, we have a successful connection
      this.connectionFailed = false;
      this.initialized = true;
      
      return response;
    } catch (error: any) {
      clearTimeout(id);
      
      // Check if it's a timeout error
      if (error.name === 'AbortError') {
        console.error('Request timed out. Check if the device is reachable.');
        
        // Try to detect if we're on the same network
        if (this.networkConfig.ipAddress === '192.168.1.1' && !this.initialized) {
          console.log('Attempting to auto-detect device...');
          const detectedIp = await this.detectDevice();
          if (detectedIp) {
            this.setNetworkAddress(detectedIp);
            
            // Try the request again with the new IP
            if (retries > 0) {
              console.log(`Retrying request with detected IP: ${detectedIp}`);
              return this.makeRequest(endpoint, options, timeoutMs, retries - 1);
            }
          }
        }
        
        this.connectionFailed = true;
        throw new Error('Request timed out. Check if the device is on the same network and reachable.');
      }
      
      // Network error - could be CORS, connection refused, etc.
      console.error('Network error:', error);
      this.connectionFailed = true;
      
      throw new Error(`Network error: ${error.message}`);
    }
  }

  isConnectionFailed(): boolean {
    return this.connectionFailed;
  }

  async getInfo(): Promise<WLEDInfo> {
    try {
      const response = await this.makeRequest('/json/info');
      const data = await response.json();
      
      return {
        name: data.name || 'WLED Device',
        version: data.ver || 'Unknown',
        ledCount: data.leds?.count || 0,
        effects: data.effects || [],
        palettes: data.palettes || [],
      };
    } catch (error) {
      console.error('Error fetching WLED info:', error);
      throw error;
    }
  }

  async getState(): Promise<WLEDState> {
    try {
      const response = await this.makeRequest('/json/state');
      const data = await response.json();
      
      return {
        on: data.on || false,
        brightness: data.bri || 0,
        color: {
          r: data.seg?.[0]?.col?.[0]?.[0] || 255,
          g: data.seg?.[0]?.col?.[0]?.[1] || 255,
          b: data.seg?.[0]?.col?.[0]?.[2] || 255,
        },
        effect: data.seg?.[0]?.fx || 0,
        speed: data.seg?.[0]?.sx || 128,
        intensity: data.seg?.[0]?.ix || 128,
        seg: data.seg || [],
      };
    } catch (error) {
      console.error('Error fetching WLED state:', error);
      throw error;
    }
  }

  async setColor(r: number, g: number, b: number): Promise<void> {
    try {
      await this.makeRequest('/json/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seg: [{ col: [[r, g, b]] }],
        }),
      });
      
      return;
    } catch (error) {
      console.error('Error setting color:', error);
      throw error;
    }
  }

  async setBrightness(brightness: number): Promise<void> {
    try {
      await this.makeRequest('/json/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bri: brightness,
        }),
      });
      
      return;
    } catch (error) {
      console.error('Error setting brightness:', error);
      throw error;
    }
  }

  async setSegmentColor(segmentId: number, r: number, g: number, b: number): Promise<void> {
    try {
      const payload: any = {
        seg: []
      };
      
      // Fill the array up to the segment we want to modify
      for (let i = 0; i <= segmentId; i++) {
        if (i === segmentId) {
          payload.seg.push({ id: segmentId, col: [[r, g, b]] });
        } else {
          payload.seg.push(null); // Placeholder to keep array indexes aligned with segment IDs
        }
      }
      
      await this.makeRequest('/json/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      return;
    } catch (error) {
      console.error('Error setting segment color:', error);
      throw error;
    }
  }

  async setSegmentEffect(segmentId: number, effectId: number, speed?: number, intensity?: number): Promise<void> {
    try {
      const payload: any = {
        seg: []
      };
      
      // Fill the array up to the segment we want to modify
      for (let i = 0; i <= segmentId; i++) {
        if (i === segmentId) {
          const segmentData: any = { id: segmentId, fx: effectId };
          
          if (speed !== undefined) {
            segmentData.sx = speed;
          }
          
          if (intensity !== undefined) {
            segmentData.ix = intensity;
          }
          
          payload.seg.push(segmentData);
        } else {
          payload.seg.push(null); // Placeholder to keep array indexes aligned with segment IDs
        }
      }
      
      await this.makeRequest('/json/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      return;
    } catch (error) {
      console.error('Error setting segment effect:', error);
      throw error;
    }
  }

  async togglePower(on?: boolean): Promise<void> {
    try {
      await this.makeRequest('/json/state', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          on: on === undefined ? 'toggle' : on,
        }),
      });
      
      return;
    } catch (error) {
      console.error('Error toggling power:', error);
      throw error;
    }
  }

  connectWebSocket(): void {
    try {
      // Close existing connection if any
      if (this.socketConnection) {
        this.socketConnection.close();
      }
      
      // WebSocket URL should use ws:// or wss:// depending on the protocol
      const wsProtocol = this.networkConfig.protocol === 'https' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${this.networkConfig.ipAddress}${this.networkConfig.port ? `:${this.networkConfig.port}` : ''}/ws`;
      
      console.log(`Connecting to WebSocket at: ${wsUrl}`);
      
      // Create new WebSocket connection
      this.socketConnection = new WebSocket(wsUrl);
      
      this.socketConnection.onopen = () => {
        console.log('WebSocket connection established');
        // Reset reconnect attempts on successful connection
        this.reconnectAttempts = 0;
        this.reconnectTimeout = 2000;
        this.connectionFailed = false;
        this.initialized = true;
      };
      
      this.socketConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.state) {
            const state: WLEDState = {
              on: data.state.on || false,
              brightness: data.state.bri || 0,
              color: {
                r: data.state.seg?.[0]?.col?.[0]?.[0] || 255,
                g: data.state.seg?.[0]?.col?.[0]?.[1] || 255,
                b: data.state.seg?.[0]?.col?.[0]?.[2] || 255,
              },
              effect: data.state.seg?.[0]?.fx || 0,
              speed: data.state.seg?.[0]?.sx || 128,
              intensity: data.state.seg?.[0]?.ix || 128,
              seg: data.state.seg || [],
            };
            
            this.onUpdateCallbacks.forEach(callback => callback(state));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socketConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionFailed = true;
      };
      
      this.socketConnection.onclose = (event) => {
        console.log(`WebSocket connection closed with code: ${event.code}`);
        
        // Attempt to reconnect with exponential backoff, unless we've hit max attempts
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          // Exponential backoff - double the timeout with each attempt (up to 30 seconds)
          this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
          
          console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectTimeout/1000} seconds...`);
          
          setTimeout(() => this.connectWebSocket(), this.reconnectTimeout);
        } else {
          console.log('Maximum reconnect attempts reached. Giving up.');
          this.connectionFailed = true;
        }
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
      this.connectionFailed = true;
    }
  }

  // Set a custom IP address and port after initialization
  setNetworkAddress(ipAddress: string, port?: number): void {
    // Remove any protocol prefixes if they exist
    const cleanIpAddress = ipAddress.replace(/(^\w+:|^)\/\//, '');
    
    this.networkConfig.ipAddress = cleanIpAddress;
    if (port !== undefined) {
      this.networkConfig.port = port;
    }
    
    this.baseUrl = this.buildBaseUrl();
    
    // Reset connection failure status when changing IP
    this.connectionFailed = false;
    this.initialized = false;
    
    // Reconnect WebSocket if active
    if (this.socketConnection) {
      this.connectWebSocket();
    }
  }

  onUpdate(callback: (state: WLEDState) => void): void {
    this.onUpdateCallbacks.push(callback);
  }

  disconnect(): void {
    if (this.socketConnection) {
      this.socketConnection.close();
      this.socketConnection = null;
    }
    this.onUpdateCallbacks = [];
  }
}

// Create a singleton instance - will be initialized with real IP later
let wledApiInstance: WLEDApi | null = null;

export const initializeWledApi = (ipAddress: string, port?: number) => {
  wledApiInstance = new WLEDApi(ipAddress, port);
  return wledApiInstance;
};

export const getWledApi = (): WLEDApi => {
  if (!wledApiInstance) {
    // Default to a local IP for development, will be replaced by user input
    wledApiInstance = new WLEDApi('192.168.1.1');
  }
  return wledApiInstance;
};

export type { WLEDState, WLEDInfo, NetworkConfig };

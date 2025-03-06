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
};

type WLEDInfo = {
  name: string;
  version: string;
  ledCount: number;
  effects: string[];
  palettes: string[];
};

class WLEDApi {
  private baseUrl: string;
  private socketConnection: WebSocket | null = null;
  private onUpdateCallbacks: ((state: WLEDState) => void)[] = [];

  constructor(ipAddress: string) {
    this.baseUrl = `http://${ipAddress}`;
  }

  async getInfo(): Promise<WLEDInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/json/info`);
      if (!response.ok) throw new Error('Failed to fetch WLED info');
      
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
      const response = await fetch(`${this.baseUrl}/json/state`);
      if (!response.ok) throw new Error('Failed to fetch WLED state');
      
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
      };
    } catch (error) {
      console.error('Error fetching WLED state:', error);
      throw error;
    }
  }

  async setColor(r: number, g: number, b: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          seg: [{ col: [[r, g, b]] }],
        }),
      });
      
      if (!response.ok) throw new Error('Failed to set color');
      
      return;
    } catch (error) {
      console.error('Error setting color:', error);
      throw error;
    }
  }

  async setBrightness(brightness: number): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bri: brightness,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to set brightness');
      
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
      
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment color');
      
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
      
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment effect');
      
      return;
    } catch (error) {
      console.error('Error setting segment effect:', error);
      throw error;
    }
  }

  async togglePower(on?: boolean): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          on: on === undefined ? 'toggle' : on,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to toggle power');
      
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
      
      // Create new WebSocket connection
      this.socketConnection = new WebSocket(`ws://${this.baseUrl.replace('http://', '')}/ws`);
      
      this.socketConnection.onopen = () => {
        console.log('WebSocket connection established');
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
            };
            
            this.onUpdateCallbacks.forEach(callback => callback(state));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      this.socketConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      this.socketConnection.onclose = () => {
        console.log('WebSocket connection closed');
        // Attempt to reconnect after a delay
        setTimeout(() => this.connectWebSocket(), 5000);
      };
    } catch (error) {
      console.error('Error establishing WebSocket connection:', error);
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

export const initializeWledApi = (ipAddress: string) => {
  wledApiInstance = new WLEDApi(ipAddress);
  return wledApiInstance;
};

export const getWledApi = (): WLEDApi => {
  if (!wledApiInstance) {
    // Default to a local IP for development, will be replaced by user input
    wledApiInstance = new WLEDApi('192.168.1.1');
  }
  return wledApiInstance;
};

export type { WLEDState, WLEDInfo };

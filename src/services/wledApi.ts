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
  segments?: any[]; // Store full segment data
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
      // Fetch both state and segments in a single request
      const response = await fetch(`${this.baseUrl}/json`);
      if (!response.ok) throw new Error('Failed to fetch WLED state');
      
      const data = await response.json();
      
      // Return full state including effects and palettes if available
      return {
        on: data.state?.on || false,
        brightness: data.state?.bri || 0,
        color: {
          r: data.state?.seg?.[0]?.col?.[0]?.[0] || 255,
          g: data.state?.seg?.[0]?.col?.[0]?.[1] || 255,
          b: data.state?.seg?.[0]?.col?.[0]?.[2] || 255,
        },
        effect: data.state?.seg?.[0]?.fx || 0,
        speed: data.state?.seg?.[0]?.sx || 128,
        intensity: data.state?.seg?.[0]?.ix || 128,
        segments: data.state?.seg || [],
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

  async setSegmentColor(segmentId: number, r: number, g: number, b: number, slot: number = 0): Promise<void> {
    try {
      // Get current segment data to preserve other color slots
      const state = await this.getState();
      const segment = state.segments?.find(s => s.id === segmentId);
      
      // Initialize colors array, preserving existing colors
      const colors = segment?.col ? [...segment.col] : [[0,0,0],[0,0,0],[0,0,0]];
      
      // Update only the specified color slot
      colors[slot] = [r, g, b];
      
      const payload = {
        seg: [{
          id: segmentId,
          col: colors
        }]
      };
      
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

  async setSegmentPalette(segmentId: number, paletteId: number): Promise<void> {
    try {
      const payload = {
        seg: [{
          id: segmentId,
          pal: paletteId
        }]
      };
      
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment palette');
      
      return;
    } catch (error) {
      console.error('Error setting segment palette:', error);
      throw error;
    }
  }

  async setSegmentEffect(segmentId: number, effectId: number, speed?: number, intensity?: number): Promise<void> {
    try {
      const payload: any = {
        seg: [{
          id: segmentId,
          fx: effectId
        }]
      };
      
      if (speed !== undefined) {
        payload.seg[0].sx = speed;
      }
      
      if (intensity !== undefined) {
        payload.seg[0].ix = intensity;
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

  async addSegment(id: number, start: number, stop: number): Promise<void> {
    try {
      const payload = {
        seg: [{
          id: id,
          start: start,
          stop: stop,
          len: stop - start,
          col: [
            [255, 0, 0],
            [0, 255, 0],
            [0, 0, 255]
          ],
          fx: 0,
          sx: 128,
          ix: 128,
          pal: 0,
          on: true
        }]
      };
      
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to add segment');
      
      return;
    } catch (error) {
      console.error('Error adding segment:', error);
      throw error;
    }
  }

  async deleteSegment(segmentId: number): Promise<void> {
    try {
      const payload = {
        seg: [{
          id: segmentId,
          stop: 0  // Setting stop to 0 deletes the segment in WLED
        }]
      };
      
      const response = await fetch(`${this.baseUrl}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to delete segment');
      
      return;
    } catch (error) {
      console.error('Error deleting segment:', error);
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
              segments: data.state.seg || [],
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

import { toast } from 'sonner';

export interface WLEDState {
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
  segments?: any[];
}

export interface WLEDInfo {
  name: string;
  version: string;
  ledCount: number;
  effects: string[];
  palettes: string[];
}

// Singleton instance of the API
let wledApiInstance: any = null;

export const initializeWledApi = (clientId: string) => {
  console.log(`Initializing WLED API with clientId: ${clientId}`);
  
  // Create a new API instance
  wledApiInstance = {
    clientId,
    websocket: null as WebSocket | null,
    updateCallbacks: [] as ((state: WLEDState) => void)[],
    
    getState: async (): Promise<WLEDState> => {
      try {
        const response = await fetch(`http://${clientId}/json/state`);
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
          segments: data.seg || [],
        };
      } catch (error) {
        console.error('Error fetching WLED state:', error);
        throw error;
      }
    },
    
    getInfo: async (): Promise<WLEDInfo> => {
      try {
        const response = await fetch(`http://${clientId}/json`);
        if (!response.ok) throw new Error('Failed to fetch WLED info');
        
        const data = await response.json();
        return {
          name: data.info?.name || 'WLED Device',
          version: data.info?.ver || 'Unknown',
          ledCount: data.info?.leds?.count || 0,
          effects: data.effects || [],
          palettes: data.palettes || [],
        };
      } catch (error) {
        console.error('Error fetching WLED info:', error);
        throw error;
      }
    },
    
    setColor: async (r: number, g: number, b: number): Promise<void> => {
      try {
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seg: [
              {
                col: [
                  [r, g, b]
                ]
              }
            ]
          }),
        });
        
        if (!response.ok) throw new Error('Failed to set color');
      } catch (error) {
        console.error('Error setting color:', error);
        throw error;
      }
    },
    
    setBrightness: async (brightness: number): Promise<void> => {
      try {
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            bri: brightness
          }),
        });
        
        if (!response.ok) throw new Error('Failed to set brightness');
      } catch (error) {
        console.error('Error setting brightness:', error);
        throw error;
      }
    },
    
    setEffect: async (effectId: number, speed?: number, intensity?: number): Promise<void> => {
      try {
        const payload: any = {
          seg: [{
            fx: effectId
          }]
        };
        
        if (speed !== undefined) {
          payload.seg[0].sx = speed;
        }
        
        if (intensity !== undefined) {
          payload.seg[0].ix = intensity;
        }
        
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) throw new Error('Failed to set effect');
      } catch (error) {
        console.error('Error setting effect:', error);
        throw error;
      }
    },
    
    togglePower: async (on?: boolean): Promise<void> => {
      try {
        const state = on === undefined ? null : on;
        
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            on: state
          }),
        });
        
        if (!response.ok) throw new Error('Failed to toggle power');
      } catch (error) {
        console.error('Error toggling power:', error);
        throw error;
      }
    },
    
    setSegmentColor: async (segmentId: number, r: number, g: number, b: number, slot: number = 0): Promise<void> => {
      try {
        // Get current segment data to preserve other color slots
        const state = await wledApiInstance.getState();
        const segment = state.segments?.find((s: any) => s.id === segmentId);
        
        // Initialize colors array, preserving existing colors
        const colors = segment?.col ? [...segment.col] : [[0,0,0],[0,0,0],[0,0,0]];
        
        // Update only the specified color slot
        colors[slot] = [r, g, b];
        
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seg: [{
              id: segmentId,
              col: colors
            }]
          }),
        });
        
        if (!response.ok) throw new Error('Failed to set segment color');
      } catch (error) {
        console.error('Error setting segment color:', error);
        throw error;
      }
    },
    
    setSegmentPalette: async (segmentId: number, paletteId: number): Promise<void> => {
      try {
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seg: [{
              id: segmentId,
              pal: paletteId
            }]
          }),
        });
        
        if (!response.ok) throw new Error('Failed to set segment palette');
      } catch (error) {
        console.error('Error setting segment palette:', error);
        throw error;
      }
    },
    
    addSegment: async (segmentId: number, startLed: number, endLed: number): Promise<void> => {
      try {
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seg: [{
              id: segmentId,
              start: startLed,
              stop: endLed,
              grp: 1,
              spc: 0,
              on: true
            }]
          }),
        });
        
        if (!response.ok) throw new Error('Failed to add segment');
      } catch (error) {
        console.error('Error adding segment:', error);
        throw error;
      }
    },
    
    deleteSegment: async (segmentId: number): Promise<void> => {
      try {
        const response = await fetch(`http://${clientId}/json/state`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            seg: [{
              id: segmentId,
              stop: 0 // Setting stop to 0 deletes the segment
            }]
          }),
        });
        
        if (!response.ok) throw new Error('Failed to delete segment');
      } catch (error) {
        console.error('Error deleting segment:', error);
        throw error;
      }
    },
    
    connectWebSocket: (): void => {
      try {
        // Close existing connection if any
        if (wledApiInstance.websocket) {
          wledApiInstance.websocket.close();
        }
        
        // Create new WebSocket connection
        const ws = new WebSocket(`ws://${clientId}/ws`);
        
        ws.onopen = () => {
          console.log('WebSocket connection established');
          toast.success('Live updates connected');
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Create a state object from the WebSocket data
            const state: WLEDState = {
              on: data.on !== undefined ? data.on : false,
              brightness: data.bri !== undefined ? data.bri : 0,
              color: {
                r: data.seg?.[0]?.col?.[0]?.[0] || 255,
                g: data.seg?.[0]?.col?.[0]?.[1] || 255,
                b: data.seg?.[0]?.col?.[0]?.[2] || 255,
              },
              effect: data.seg?.[0]?.fx || 0,
              speed: data.seg?.[0]?.sx || 128,
              intensity: data.seg?.[0]?.ix || 128,
            };
            
            // Notify all registered callbacks
            wledApiInstance.updateCallbacks.forEach((callback: (state: WLEDState) => void) => {
              callback(state);
            });
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          toast.error('Live updates connection error');
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed');
        };
        
        wledApiInstance.websocket = ws;
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
        toast.error('Failed to connect to live updates');
      }
    },
    
    onUpdate: (callback: (state: WLEDState) => void): (() => void) => {
      wledApiInstance.updateCallbacks.push(callback);
      
      // Return a function to unregister the callback
      return () => {
        const index = wledApiInstance.updateCallbacks.indexOf(callback);
        if (index !== -1) {
          wledApiInstance.updateCallbacks.splice(index, 1);
        }
      };
    },
    
    disconnect: (): void => {
      if (wledApiInstance.websocket) {
        wledApiInstance.websocket.close();
        wledApiInstance.websocket = null;
      }
      wledApiInstance.updateCallbacks = [];
    }
  };
  
  return wledApiInstance;
};

export const getWledApi = () => {
  if (!wledApiInstance) {
    throw new Error('WLED API not initialized. Call initializeWledApi first.');
  }
  return wledApiInstance;
};

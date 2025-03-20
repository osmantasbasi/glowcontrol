import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getWledApi, initializeWledApi, WLEDState, WLEDInfo } from '../services/wledApi';
import { toast } from 'sonner';

interface WLEDDevice {
  id: string;
  name: string;
  ipAddress: string;
  connected: boolean;
}

interface WLEDContextType {
  devices: WLEDDevice[];
  activeDevice: WLEDDevice | null;
  deviceState: WLEDState | null;
  deviceInfo: WLEDInfo | null;
  isLoading: boolean;
  addDevice: (name: string, ipAddress: string) => void;
  removeDevice: (id: string) => void;
  setActiveDevice: (id: string) => void;
  setColor: (r: number, g: number, b: number) => Promise<void>;
  setBrightness: (brightness: number) => Promise<void>;
  setEffect: (effectId: number, speed?: number, intensity?: number) => Promise<void>;
  togglePower: (on?: boolean) => Promise<void>;
  setSegmentColor: (segmentId: number, r: number, g: number, b: number, slot?: number) => Promise<void>;
  setSegmentEffect: (segmentId: number, effectId: number, speed?: number, intensity?: number) => Promise<void>;
  setSegmentBrightness: (segmentId: number, brightness: number) => Promise<void>;
  setSegmentPower: (segmentId: number, on: boolean) => Promise<void>;
  setSegmentLedRange: (segmentId: number, start: number, stop: number) => Promise<void>;
}

const WLEDContext = createContext<WLEDContextType | undefined>(undefined);

interface WLEDProviderProps {
  children: ReactNode;
}

export const WLEDProvider: React.FC<WLEDProviderProps> = ({ children }) => {
  const [devices, setDevices] = useState<WLEDDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<WLEDDevice | null>(null);
  const [deviceState, setDeviceState] = useState<WLEDState | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<WLEDInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pollingInterval, setPollingInterval] = useState<number | null>(null);

  useEffect(() => {
    const savedDevices = localStorage.getItem('wledDevices');
    if (savedDevices) {
      const parsedDevices = JSON.parse(savedDevices);
      setDevices(parsedDevices);
      
      if (parsedDevices.length > 0) {
        const activeDeviceId = localStorage.getItem('activeWledDevice');
        if (activeDeviceId) {
          const device = parsedDevices.find((d: WLEDDevice) => d.id === activeDeviceId);
          if (device) {
            handleSetActiveDevice(device.id);
          } else {
            handleSetActiveDevice(parsedDevices[0].id);
          }
        } else {
          handleSetActiveDevice(parsedDevices[0].id);
        }
      }
    }
  }, []);

  // Set up polling for device state every second
  useEffect(() => {
    if (activeDevice && activeDevice.connected) {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
      
      // Initial fetch
      fetchDeviceState();
      
      const intervalId = window.setInterval(fetchDeviceState, 1000);
      
      setPollingInterval(intervalId);
      
      return () => {
        clearInterval(intervalId);
        setPollingInterval(null);
      };
    }
  }, [activeDevice]);

  const fetchDeviceState = async () => {
    if (!activeDevice) return;
    
    try {
      // Fetch both state and info to get the latest segments data
      const response = await fetch(`http://${activeDevice.ipAddress}/json`);
      if (!response.ok) throw new Error('Failed to fetch WLED data');
      
      const data = await response.json();
      
      // Update state with full data including segments
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
        
        setDeviceState(state);
      }
      
      // Update info if available
      if (data.info && !deviceInfo) {
        setDeviceInfo({
          name: data.info.name || 'WLED Device',
          version: data.info.ver || 'Unknown',
          ledCount: data.info.leds?.count || 0,
          effects: data.effects || [],
          palettes: data.palettes || [],
        });
      }
    } catch (error) {
      console.error('Error polling device state:', error);
      setDevices(prev => 
        prev.map(d => 
          d.id === activeDevice.id ? { ...d, connected: false } : d
        )
      );
      clearInterval(pollingInterval!);
      setPollingInterval(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('wledDevices', JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    if (activeDevice) {
      localStorage.setItem('activeWledDevice', activeDevice.id);
    }
  }, [activeDevice]);

  const addDevice = (name: string, ipAddress: string) => {
    const newDevice: WLEDDevice = {
      id: Date.now().toString(),
      name,
      ipAddress,
      connected: false,
    };
    
    setDevices(prev => [...prev, newDevice]);
    
    if (devices.length === 0) {
      handleSetActiveDevice(newDevice.id);
    }
    
    toast.success(`Added device: ${name}`);
  };

  const removeDevice = (id: string) => {
    setDevices(prev => prev.filter(device => device.id !== id));
    
    if (activeDevice?.id === id) {
      const remainingDevices = devices.filter(device => device.id !== id);
      if (remainingDevices.length > 0) {
        handleSetActiveDevice(remainingDevices[0].id);
      } else {
        setActiveDevice(null);
        setDeviceState(null);
        setDeviceInfo(null);
      }
    }
    
    toast.success('Device removed');
  };

  const handleSetActiveDevice = async (id: string) => {
    try {
      setIsLoading(true);
      
      const device = devices.find(d => d.id === id);
      if (!device) throw new Error('Device not found');
      
      setActiveDevice(device);
      
      const api = initializeWledApi(device.ipAddress);
      
      // Fetch both the state and info in a single request
      const response = await fetch(`http://${device.ipAddress}/json`);
      if (!response.ok) throw new Error('Failed to fetch WLED data');
      
      const data = await response.json();
      
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
        
        setDeviceState(state);
      }
      
      if (data.info) {
        setDeviceInfo({
          name: data.info.name || 'WLED Device',
          version: data.info.ver || 'Unknown',
          ledCount: data.info.leds?.count || 0,
          effects: data.effects || [],
          palettes: data.palettes || [],
        });
      }
      
      api.connectWebSocket();
      
      api.onUpdate((state) => {
        setDeviceState(prev => ({
          ...state,
          segments: prev?.segments || []
        }));
      });
      
      setDevices(prev => 
        prev.map(d => 
          d.id === id ? { ...d, connected: true } : d
        )
      );
      
      toast.success(`Connected to ${device.name}`);
    } catch (error) {
      console.error('Error connecting to device:', error);
      toast.error('Failed to connect to device');
      
      setDevices(prev => 
        prev.map(d => 
          d.id === id ? { ...d, connected: false } : d
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const setColor = async (r: number, g: number, b: number) => {
    try {
      const api = getWledApi();
      await api.setColor(r, g, b);
      
      if (deviceState) {
        setDeviceState({
          ...deviceState,
          color: { r, g, b },
        });
      }
    } catch (error) {
      console.error('Error setting color:', error);
      toast.error('Failed to set color');
    }
  };

  const setBrightness = async (brightness: number) => {
    try {
      const api = getWledApi();
      await api.setBrightness(brightness);
      
      if (deviceState) {
        setDeviceState({
          ...deviceState,
          brightness,
        });
      }
    } catch (error) {
      console.error('Error setting brightness:', error);
      toast.error('Failed to set brightness');
    }
  };

  const setEffect = async (effectId: number, speed?: number, intensity?: number) => {
    if (!activeDevice) {
      toast.error('No active device');
      return;
    }
    
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
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set effect');
      
      if (deviceState) {
        setDeviceState({
          ...deviceState,
          effect: effectId,
          ...(speed !== undefined && { speed }),
          ...(intensity !== undefined && { intensity }),
        });
      }
    } catch (error) {
      console.error('Error setting effect:', error);
      toast.error('Failed to set effect');
    }
  };

  const togglePower = async (on?: boolean) => {
    try {
      const api = getWledApi();
      await api.togglePower(on);
      
      if (deviceState) {
        const newState = on === undefined ? !deviceState.on : on;
        setDeviceState({
          ...deviceState,
          on: newState,
        });
      }
    } catch (error) {
      console.error('Error toggling power:', error);
      toast.error('Failed to toggle power');
    }
  };

  const setSegmentColor = async (segmentId: number, r: number, g: number, b: number, slot: number = 0) => {
    if (!activeDevice) {
      toast.error('No active device');
      return;
    }
    
    try {
      const payload: any = {
        seg: [{
          id: segmentId,
          col: []
        }]
      };
      
      // Create all color slots up to the one we're setting
      for (let i = 0; i <= slot; i++) {
        if (i === slot) {
          payload.seg[0].col[i] = [r, g, b];
        } else if (i < slot) {
          // Keep existing colors or set to black if they don't exist
          const segment = deviceState?.segments?.find(s => s.id === segmentId);
          if (segment && segment.col && segment.col[i]) {
            payload.seg[0].col[i] = segment.col[i];
          } else {
            payload.seg[0].col[i] = [0, 0, 0];
          }
        }
      }
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment color');
      
      // Update the local state
      if (deviceState && deviceState.segments) {
        const updatedSegments = deviceState.segments.map(seg => {
          if (seg.id === segmentId) {
            const newCol = [...(seg.col || [])];
            if (!newCol[slot]) {
              // Ensure the array has enough elements
              while (newCol.length <= slot) {
                newCol.push([0, 0, 0]);
              }
            }
            newCol[slot] = [r, g, b];
            return { ...seg, col: newCol };
          }
          return seg;
        });
        
        setDeviceState({
          ...deviceState,
          segments: updatedSegments,
        });
      }
      
      return;
    } catch (error) {
      console.error('Error setting segment color:', error);
      toast.error('Failed to set segment color');
    }
  };

  const setSegmentEffect = async (segmentId: number, effectId: number, speed?: number, intensity?: number) => {
    if (!activeDevice) {
      toast.error('No active device');
      return;
    }
    
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
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment effect');
      
      // Update the local state
      if (deviceState && deviceState.segments) {
        const updatedSegments = deviceState.segments.map(seg => {
          if (seg.id === segmentId) {
            return { 
              ...seg, 
              fx: effectId,
              ...(speed !== undefined && { sx: speed }),
              ...(intensity !== undefined && { ix: intensity }),
            };
          }
          return seg;
        });
        
        setDeviceState({
          ...deviceState,
          segments: updatedSegments,
        });
      }
      
      return;
    } catch (error) {
      console.error('Error setting segment effect:', error);
      toast.error('Failed to set segment effect');
    }
  };

  const setSegmentBrightness = async (segmentId: number, brightness: number) => {
    if (!activeDevice) {
      toast.error('No active device');
      return;
    }
    
    try {
      const payload: any = {
        seg: [{
          id: segmentId,
          bri: brightness
        }]
      };
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment brightness');
      
      // Update the local state
      if (deviceState && deviceState.segments) {
        const updatedSegments = deviceState.segments.map(seg => {
          if (seg.id === segmentId) {
            return { ...seg, bri: brightness };
          }
          return seg;
        });
        
        setDeviceState({
          ...deviceState,
          segments: updatedSegments,
        });
      }
      
      return;
    } catch (error) {
      console.error('Error setting segment brightness:', error);
      toast.error('Failed to set segment brightness');
    }
  };

  const setSegmentPower = async (segmentId: number, on: boolean) => {
    if (!activeDevice) {
      toast.error('No active device');
      return;
    }
    
    try {
      const payload: any = {
        seg: [{
          id: segmentId,
          on: on
        }]
      };
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment power');
      
      // Update the local state
      if (deviceState && deviceState.segments) {
        const updatedSegments = deviceState.segments.map(seg => {
          if (seg.id === segmentId) {
            return { ...seg, on };
          }
          return seg;
        });
        
        setDeviceState({
          ...deviceState,
          segments: updatedSegments,
        });
      }
      
      return;
    } catch (error) {
      console.error('Error setting segment power:', error);
      toast.error('Failed to set segment power');
    }
  };

  const setSegmentLedRange = async (segmentId: number, start: number, stop: number) => {
    if (!activeDevice) {
      toast.error('No active device');
      return;
    }
    
    try {
      const len = stop - start + 1;
      
      const payload: any = {
        seg: [{
          id: segmentId,
          start: start,
          stop: stop + 1, // WLED uses exclusive stop value
          len: len
        }]
      };
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment LED range');
      
      // Update the local state
      if (deviceState && deviceState.segments) {
        const updatedSegments = deviceState.segments.map(seg => {
          if (seg.id === segmentId) {
            return { 
              ...seg, 
              start,
              stop: stop + 1, // WLED uses exclusive stop
              len
            };
          }
          return seg;
        });
        
        setDeviceState({
          ...deviceState,
          segments: updatedSegments,
        });
      }
      
      return;
    } catch (error) {
      console.error('Error setting segment LED range:', error);
      toast.error('Failed to set segment LED range');
    }
  };

  return (
    <WLEDContext.Provider
      value={{
        devices,
        activeDevice,
        deviceState,
        deviceInfo,
        isLoading,
        addDevice,
        removeDevice,
        setActiveDevice: handleSetActiveDevice,
        setColor,
        setBrightness,
        setEffect,
        togglePower,
        setSegmentColor,
        setSegmentEffect,
        setSegmentBrightness,
        setSegmentPower,
        setSegmentLedRange,
      }}
    >
      {children}
    </WLEDContext.Provider>
  );
};

export const useWLED = () => {
  const context = useContext(WLEDContext);
  if (context === undefined) {
    throw new Error('useWLED must be used within a WLEDProvider');
  }
  return context;
};

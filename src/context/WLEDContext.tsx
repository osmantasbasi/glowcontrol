import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { getWledApi, initializeWledApi, WLEDInfo } from '../services/wledApi';
import { toast } from 'sonner';

interface WLEDState {
  on?: boolean;
  brightness?: number;
  color?: { r: number; g: number; b: number };
  effect?: number;
  speed?: number;
  intensity?: number;
  seg?: Segment[];
}

interface WLEDDevice {
  id: string;
  name: string;
  ipAddress: string;
  connected: boolean;
}

interface Segment {
  id: number;
  start: number;
  stop: number;
  len: number;
  grp: number;
  spc: number;
  of: number;
  on: boolean;
  frz: boolean;
  bri: number;
  cct: number;
  set: number;
  col: [number, number, number][];
  fx: number;
  sx: number;
  ix: number;
  pal: number;
  c1: number;
  c2: number;
  c3: number;
  sel: boolean;
  rev: boolean;
  mi: boolean;
  o1: boolean;
  o2: boolean;
  o3: boolean;
  si: number;
  m12: number;
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
  setSegmentColor: (segmentId: number, r: number, g: number, b: number) => Promise<void>;
  setSegmentEffect: (segmentId: number, effectId: number, speed?: number, intensity?: number) => Promise<void>;
  getSegments: () => Segment[];
  updateSegment: (segmentId: number, segmentData: Partial<Segment>) => Promise<void>;
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
  const [segments, setSegments] = useState<Segment[]>([]);
  const pollingRef = useRef<number | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    localStorage.setItem('wledDevices', JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
    if (activeDevice) {
      localStorage.setItem('activeWledDevice', activeDevice.id);
      
      startPolling();
      
      return () => {
        stopPolling();
      };
    }
  }, [activeDevice]);
  
  const startPolling = () => {
    if (!activeDevice) return;
    
    stopPolling();
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        if (!activeDevice) return;
        
        const response = await fetch(`http://${activeDevice.ipAddress}/json`);
        if (!response.ok) throw new Error('Failed to fetch WLED state');
        
        const data = await response.json();
        
        setDeviceState(data.state);
        
        if (data.state && data.state.seg) {
          setSegments(data.state.seg);
        }
        
        if (!deviceInfo && data.info) {
          setDeviceInfo(data.info);
        }
        
        pollingRef.current = 0;
      } catch (error) {
        console.error('Error polling WLED device:', error);
        
        if (pollingRef.current !== null) {
          pollingRef.current += 1;
          
          if (pollingRef.current > 5) {
            setDevices(prev => 
              prev.map(d => 
                d.id === activeDevice.id ? { ...d, connected: false } : d
              )
            );
            stopPolling();
            toast.error('Lost connection to WLED device');
          }
        }
      }
    }, 800);
  };
  
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

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
        stopPolling();
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
      
      api.connectWebSocket();
      
      api.onUpdate((state) => {
        setDeviceState(state);
        if (state && state.seg) {
          setSegments(state.seg);
        }
      });
      
      const [state, info] = await Promise.all([
        api.getState(),
        api.getInfo(),
      ]);
      
      setDeviceState(state);
      setDeviceInfo(info);
      
      if (state && state.seg) {
        setSegments(state.seg);
      }
      
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
    try {
      if (!activeDevice) return;
      
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

  const setSegmentColor = async (segmentId: number, r: number, g: number, b: number) => {
    try {
      if (!activeDevice) return;
      
      const payload = {
        seg: [{
          id: segmentId,
          col: [[r, g, b]]
        }]
      };
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to set segment color');
    } catch (error) {
      console.error('Error setting segment color:', error);
      toast.error('Failed to set segment color');
    }
  };

  const setSegmentEffect = async (segmentId: number, effectId: number, speed?: number, intensity?: number) => {
    try {
      if (!activeDevice) return;
      
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
    } catch (error) {
      console.error('Error setting segment effect:', error);
      toast.error('Failed to set segment effect');
    }
  };
  
  const getSegments = () => {
    return segments;
  };
  
  const updateSegment = async (segmentId: number, segmentData: Partial<Segment>) => {
    try {
      if (!activeDevice) return;
      
      const payload = {
        seg: [{
          id: segmentId,
          ...segmentData
        }]
      };
      
      const response = await fetch(`http://${activeDevice.ipAddress}/json/state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to update segment');
      
      const updatedSegments = segments.map(seg => 
        seg.id === segmentId ? { ...seg, ...segmentData } : seg
      );
      
      setSegments(updatedSegments);
      
      if (deviceState) {
        setDeviceState({
          ...deviceState,
          seg: updatedSegments
        });
      }
      
    } catch (error) {
      console.error('Error updating segment:', error);
      toast.error('Failed to update segment');
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
        getSegments,
        updateSegment,
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

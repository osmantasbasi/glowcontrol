
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
  setSegmentColor: (segmentId: number, r: number, g: number, b: number) => Promise<void>;
  setSegmentEffect: (segmentId: number, effectId: number, speed?: number, intensity?: number) => Promise<void>;
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
      
      api.connectWebSocket();
      
      api.onUpdate((state) => {
        setDeviceState(state);
      });
      
      const [state, info] = await Promise.all([
        api.getState(),
        api.getInfo(),
      ]);
      
      setDeviceState(state);
      setDeviceInfo(info);
      
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
      const api = getWledApi();
      
      // Create the payload for the API
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
      
      // Make the API request with fetch directly since the method doesn't exist
      const response = await fetch(`http://${activeDevice?.ipAddress}/json/state`, {
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
      const api = getWledApi();
      await api.setSegmentColor(segmentId, r, g, b);
    } catch (error) {
      console.error('Error setting segment color:', error);
      toast.error('Failed to set segment color');
    }
  };

  const setSegmentEffect = async (segmentId: number, effectId: number, speed?: number, intensity?: number) => {
    try {
      const api = getWledApi();
      await api.setSegmentEffect(segmentId, effectId, speed, intensity);
    } catch (error) {
      console.error('Error setting segment effect:', error);
      toast.error('Failed to set segment effect');
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


import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import BrightnessSlider from './BrightnessSlider';
import DeviceManager from './DeviceManager';
import StripPreview from './StripPreview';
import { Button } from '@/components/ui/button';
import { Power, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { saveConfiguration, loadConfiguration } from '@/services/configService';

const ControlPanel: React.FC = () => {
  const { deviceState, deviceInfo, togglePower, setColor, setBrightness, activeDevice } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 255, b: 255});
  const isMobile = useIsMobile();
  
  useEffect(() => {
    if (deviceState) {
      setCurrentColor(deviceState.color);
    }
  }, [deviceState]);

  // Load saved configuration when active device changes
  useEffect(() => {
    if (activeDevice && activeDevice.ipAddress) {
      const savedConfig = loadConfiguration(activeDevice.ipAddress);
      if (savedConfig) {
        console.log('Loaded saved configuration for', activeDevice.ipAddress);
      }
    }
  }, [activeDevice]);

  const handleColorChange = (color: {r: number, g: number, b: number}) => {
    setCurrentColor(color);
    
    try {
      if (deviceState) {
        const timeoutId = setTimeout(() => {
          setColor(color.r, color.g, color.b);
        }, 50);
        
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error setting color:', error);
    }
  };

  const handleSaveConfiguration = () => {
    if (activeDevice && deviceState) {
      // Get segments from the deviceState
      const segments = deviceState.segments || [];
      
      saveConfiguration(activeDevice.ipAddress, {
        segments,
        deviceState,
        deviceInfo: deviceInfo || null
      });
      
      toast.success('Configuration saved successfully');
    } else {
      toast.error('No active device or device state to save');
    }
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto p-2 sm:p-4">
      <header className="mb-2 sm:mb-4 flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-medium gradient-text">GlowControl</h1>
        
        <div className="flex items-center gap-2">
          {deviceState && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSaveConfiguration}
                className="rounded-full transition-all duration-300 bg-white/10 text-white hover:bg-white/20"
              >
                <Save size={isMobile ? 16 : 18} />
                <span className="sr-only">Save Config</span>
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => togglePower()}
                className={cn(
                  "rounded-full transition-all duration-300",
                  deviceState.on 
                    ? "bg-white/10 text-white hover:bg-white/20" 
                    : "bg-white/5 text-white/40 hover:bg-white/10"
                )}
              >
                <Power size={isMobile ? 16 : 18} />
                <span className="sr-only">Power</span>
              </Button>
            </>
          )}
        </div>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-4">
        <div className="md:col-span-3">
          <DeviceManager className="animate-fade-in" />
        </div>
        
        <div className="md:col-span-9">
          <div className="space-y-2 sm:space-y-4">
            {deviceInfo && deviceState && (
              <>
                <StripPreview className="animate-fade-in" />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4">
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-medium text-white/70 mb-3">Color</h3>
                    <ColorPicker 
                      color={currentColor} 
                      onChange={handleColorChange} 
                    />
                  </div>
                  
                  <div className="glass-card p-4">
                    <h3 className="text-sm font-medium text-white/70 mb-3">Brightness</h3>
                    <BrightnessSlider 
                      value={deviceState.brightness || 0} 
                      onChange={setBrightness} 
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

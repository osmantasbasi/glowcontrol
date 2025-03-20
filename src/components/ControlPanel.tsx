
import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import BrightnessSlider from './BrightnessSlider';
import DeviceManager from './DeviceManager';
import StripPreview from './StripPreview';
import { Button } from '@/components/ui/button';
import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';

const ControlPanel: React.FC = () => {
  const { deviceState, deviceInfo, togglePower, setColor, setBrightness } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 255, b: 255});
  
  useEffect(() => {
    if (deviceState) {
      setCurrentColor(deviceState.color);
    }
  }, [deviceState]);

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

  return (
    <div className="relative w-full max-w-5xl mx-auto p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-medium gradient-text">GlowControl</h1>
        
        {deviceState && (
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
            <Power size={18} />
            <span className="sr-only">Power</span>
          </Button>
        )}
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <DeviceManager className="animate-fade-in" />
        </div>
        
        <div className="md:col-span-9">
          <div className="space-y-4">
            {deviceInfo && deviceState && (
              <StripPreview className="animate-fade-in" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

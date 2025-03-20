
import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import DeviceManager from './DeviceManager';
import StripPreview from './StripPreview';
import { Button } from '@/components/ui/button';
import { Power } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const ControlPanel: React.FC = () => {
  const { deviceState, deviceInfo, togglePower } = useWLED();
  const isMobile = useIsMobile();
  
  // For mobile view, we'll show a more compact layout
  return (
    <div className={cn(
      "relative w-full", 
      isMobile ? "max-w-full mx-auto p-2" : "max-w-5xl mx-auto p-4"
    )}>
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-medium gradient-text">GlowControl</h1>
        
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
          {deviceInfo && deviceState && (
            <StripPreview className="animate-fade-in mb-4" />
          )}
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

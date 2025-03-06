
import React from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EffectSelectorProps {
  className?: string;
}

const EffectSelector: React.FC<EffectSelectorProps> = ({ className }) => {
  const { deviceInfo, deviceState, setEffect } = useWLED();

  if (!deviceInfo || !deviceState) {
    return (
      <div className={cn("glass-card p-4", className)}>
        <h3 className="text-sm font-medium text-white/70">Effects</h3>
        <div className="mt-2 text-sm text-white/50">No device connected</div>
      </div>
    );
  }

  const handleEffectClick = (index: number) => {
    setEffect(index);
  };

  return (
    <div className={cn("glass-card p-4", className)}>
      <h3 className="text-sm font-medium text-white/70">Effects</h3>
      
      <ScrollArea className="h-[220px] mt-2 pr-4">
        <div className="grid grid-cols-2 gap-2">
          {deviceInfo.effects.map((effect, index) => (
            <button
              key={index}
              className={cn(
                "p-2 text-left text-xs transition-all rounded-md",
                deviceState.effect === index 
                  ? "bg-white/20 shadow-md" 
                  : "hover:bg-white/10"
              )}
              onClick={() => handleEffectClick(index)}
            >
              {effect}
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default EffectSelector;

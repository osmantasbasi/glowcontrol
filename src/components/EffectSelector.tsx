
import React from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';
import { Sparkles } from 'lucide-react';

interface EffectSelectorProps {
  className?: string;
  onEffectSelect?: (effectId: number) => void;
}

const EffectSelector: React.FC<EffectSelectorProps> = ({ className, onEffectSelect }) => {
  const { deviceState, deviceInfo, setEffect } = useWLED();

  const handleEffectClick = (effectId: number) => {
    setEffect(effectId);
    
    if (onEffectSelect) {
      onEffectSelect(effectId);
    }
  };

  if (!deviceInfo?.effects || deviceInfo.effects.length === 0) {
    return (
      <div className={cn("p-4 text-center text-sm text-white/50", className)}>
        Loading effects or no effects available. Please connect to a WLED device.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {deviceInfo.effects.slice(0, 20).map((effect, index) => (
          <button
            key={index}
            onClick={() => handleEffectClick(index)}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all",
              deviceState?.effect === index
                ? "bg-white/20 border-cyan-400 text-white"
                : "bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
            )}
          >
            <Sparkles size={24} className="mb-2 text-cyan-300" />
            <span className="text-xs text-center">{effect}</span>
          </button>
        ))}
      </div>
      
      {deviceInfo.effects.length > 20 && (
        <div>
          <select
            value={deviceState?.effect || 0}
            onChange={(e) => handleEffectClick(parseInt(e.target.value))}
            className="w-full p-2 rounded bg-black/20 text-sm border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
          >
            {deviceInfo.effects.map((effect, index) => (
              <option key={index} value={index}>
                {effect}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default EffectSelector;


import React from 'react';
import { Droplet, Triangle, Box } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface ColorSlotSelectorProps {
  selectedSlot: number;
  onSelectSlot: (slot: number) => void;
  slotColors: Array<{r: number, g: number, b: number}>;
}

const ColorSlotSelector: React.FC<ColorSlotSelectorProps> = ({
  selectedSlot,
  onSelectSlot,
  slotColors,
}) => {
  const isMobile = useIsMobile();
  
  const slots = [
    { id: 0, icon: <Droplet size={isMobile ? 16 : 20} />, label: "Primary" },
    { id: 1, icon: <Triangle size={isMobile ? 16 : 20} />, label: "Secondary" },
    { id: 2, icon: <Box size={isMobile ? 16 : 20} />, label: "Tertiary" },
  ];

  return (
    <div className="p-2 sm:p-4 bg-black/30 rounded-lg">
      <h3 className="text-xs sm:text-sm font-medium text-white/70 mb-2">Color Slots</h3>
      <div className="flex items-center gap-2 sm:gap-3">
        {slots.map((slot) => {
          const color = slotColors[slot.id] || { r: 0, g: 0, b: 0 };
          const rgbString = `rgb(${color.r}, ${color.g}, ${color.b})`;
          
          return (
            <button
              key={slot.id}
              onClick={() => onSelectSlot(slot.id)}
              className={cn(
                "flex flex-col items-center p-2 sm:p-3 rounded-lg transition-all",
                selectedSlot === slot.id
                  ? "bg-white/20 border border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105"
                  : "bg-black/40 border border-white/10 hover:bg-black/50 hover:border-white/20"
              )}
            >
              <div 
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full mb-1 flex items-center justify-center"
                style={{ backgroundColor: rgbString }}
              >
                <span className={cn(
                  "text-white/80",
                  (color.r + color.g + color.b) / 3 > 128 ? "text-black/70" : "text-white/90"
                )}>
                  {slot.icon}
                </span>
              </div>
              <span className="text-xs font-medium">{slot.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorSlotSelector;

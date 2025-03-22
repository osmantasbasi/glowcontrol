
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
    { id: 0, icon: <Droplet size={isMobile ? 14 : 16} />, label: "Primary" },
    { id: 1, icon: <Triangle size={isMobile ? 14 : 16} />, label: "Secondary" },
    { id: 2, icon: <Box size={isMobile ? 14 : 16} />, label: "Tertiary" },
  ];

  return (
    <div className="bg-black/30 rounded-lg p-2 sm:p-4 w-full">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {slots.map((slot) => {
          const color = slotColors[slot.id] || { r: 0, g: 0, b: 0 };
          const rgbString = `rgb(${color.r}, ${color.g}, ${color.b})`;
          
          return (
            <button
              key={slot.id}
              onClick={() => onSelectSlot(slot.id)}
              className={cn(
                "flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg transition-all flex-1",
                selectedSlot === slot.id
                  ? "bg-white/20 border border-cyan-400 shadow-sm shadow-cyan-500/20 scale-105"
                  : "bg-black/40 border border-white/10 hover:bg-black/50 hover:border-white/20"
              )}
            >
              <div 
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: rgbString }}
              >
                <span className={cn(
                  "text-white/80",
                  (color.r + color.g + color.b) / 3 > 128 ? "text-black/70" : "text-white/90"
                )}>
                  {slot.icon}
                </span>
              </div>
              <span className="text-xs font-medium hidden sm:inline">{slot.label}</span>
              <span className="text-xs font-medium inline sm:hidden">{slot.id + 1}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ColorSlotSelector;


import React from 'react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';

interface PaletteSelectorProps {
  palettes: string[];
  selectedPalette: number;
  onChange: (paletteId: number) => void;
  className?: string;
}

const PaletteSelector: React.FC<PaletteSelectorProps> = ({ 
  palettes, 
  selectedPalette, 
  onChange, 
  className 
}) => {
  if (!palettes || palettes.length === 0) {
    return (
      <div className={cn("p-4 text-center text-sm text-white/50", className)}>
        No palettes available. Please connect to a WLED device.
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Select 
        value={selectedPalette.toString()} 
        onValueChange={(value) => onChange(parseInt(value))}
      >
        <SelectTrigger className="w-full bg-black/30 border-white/20 text-white hover:bg-black/40">
          <SelectValue placeholder="Select a palette" />
        </SelectTrigger>
        <SelectContent className="bg-black/90 border-white/10 text-white max-h-80">
          <SelectGroup>
            <SelectLabel className="text-cyan-300">Palettes</SelectLabel>
            {palettes.map((palette, index) => (
              <SelectItem 
                key={index} 
                value={index.toString()}
                className="hover:bg-white/10 focus:bg-white/10 data-[state=checked]:bg-cyan-900/30 data-[state=checked]:text-cyan-100"
              >
                <div className="flex items-center gap-2">
                  <Palette size={14} className="text-cyan-300" />
                  <span>{palette}</span>
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
};

export default PaletteSelector;


import React from 'react';
import { Slider } from "@/components/ui/slider";
import { cn } from '@/lib/utils';
import { Sun } from 'lucide-react';

interface BrightnessSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  showLabel?: boolean;
}

const BrightnessSlider: React.FC<BrightnessSliderProps> = ({ 
  value, 
  onChange,
  className,
  showLabel = true
}) => {
  const handleChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  return (
    <div className={cn("w-full flex flex-col space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/70">Brightness</label>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Sun size={14} className="text-cyan-300" />
        
        <Slider
          value={[value]}
          min={1}
          max={255}
          step={1}
          onValueChange={handleChange}
          className="flex-1 h-1.5"
        />
        
        <Sun size={18} className="text-cyan-300" />
      </div>
    </div>
  );
};

export default BrightnessSlider;

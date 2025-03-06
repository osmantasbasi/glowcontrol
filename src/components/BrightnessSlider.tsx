
import React from 'react';
import { Slider } from "@/components/ui/slider";
import { cn } from '@/lib/utils';
import { Sun } from 'lucide-react';

interface BrightnessSliderProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

const BrightnessSlider: React.FC<BrightnessSliderProps> = ({ 
  value, 
  onChange,
  className
}) => {
  const handleChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  return (
    <div className={cn("w-full flex flex-col space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm text-white/70">Brightness</label>
        <div className="text-sm font-medium">{Math.round((value / 255) * 100)}%</div>
      </div>
      
      <div className="flex items-center space-x-4">
        <Sun size={16} className="text-cyan-300" />
        
        <Slider
          value={[value]}
          min={1}
          max={255}
          step={1}
          onValueChange={handleChange}
          className="flex-1"
        />
        
        <Sun size={20} className="text-cyan-300" />
      </div>
    </div>
  );
};

export default BrightnessSlider;

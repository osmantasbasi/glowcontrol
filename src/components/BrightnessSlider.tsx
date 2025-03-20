
import React from 'react';
import { Slider } from "@/components/ui/slider";
import { cn } from '@/lib/utils';
import { Sun, Zap, Activity } from 'lucide-react';

interface SliderProps {
  type?: 'brightness' | 'speed' | 'intensity';
  value: number;
  onChange: (value: number) => void;
  className?: string;
  showLabel?: boolean;
  min?: number;
  max?: number;
}

const ControlSlider: React.FC<SliderProps> = ({ 
  type = 'brightness',
  value, 
  onChange,
  className,
  showLabel = true,
  min = 1,
  max = 255
}) => {
  const handleChange = (newValue: number[]) => {
    onChange(newValue[0]);
  };

  const getIcon = () => {
    switch (type) {
      case 'brightness':
        return { small: <Sun size={14} className="text-cyan-300" />, large: <Sun size={18} className="text-cyan-300" /> };
      case 'speed':
        return { small: <Zap size={14} className="text-cyan-300" />, large: <Zap size={18} className="text-cyan-300" /> };
      case 'intensity':
        return { small: <Activity size={14} className="text-cyan-300" />, large: <Activity size={18} className="text-cyan-300" /> };
      default:
        return { small: <Sun size={14} className="text-cyan-300" />, large: <Sun size={18} className="text-cyan-300" /> };
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'brightness': return 'Brightness';
      case 'speed': return 'Speed';
      case 'intensity': return 'Intensity';
      default: return 'Brightness';
    }
  };

  const icons = getIcon();

  return (
    <div className={cn("w-full flex flex-col space-y-1", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-white/70">{getLabel()}</label>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        {icons.small}
        
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={1}
          onValueChange={handleChange}
          className="flex-1 h-1.5"
        />
        
        {icons.large}
      </div>
    </div>
  );
};

export default ControlSlider;

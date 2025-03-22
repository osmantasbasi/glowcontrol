
import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Save, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ColorSlot {
  colors: Array<{r: number, g: number, b: number}>;
  name?: string;
}

interface SegmentColorSlotsProps {
  selectedSlot: number;
  onSlotSelect: (slotIndex: number) => void;
  onColorChange: (slotIndex: number, color: {r: number, g: number, b: number}, segmentId?: number) => void;
}

const DEFAULT_SLOTS: ColorSlot[] = [
  {
    name: "Slot 1",
    colors: [
      { r: 255, g: 0, b: 0 },    // Red
      { r: 0, g: 0, b: 0 },      // Black
      { r: 0, g: 0, b: 0 }       // Black
    ]
  },
  {
    name: "Slot 2",
    colors: [
      { r: 0, g: 255, b: 0 },    // Green
      { r: 0, g: 0, b: 0 },      // Black
      { r: 0, g: 0, b: 0 }       // Black
    ]
  },
  {
    name: "Slot 3",
    colors: [
      { r: 0, g: 0, b: 255 },    // Blue
      { r: 0, g: 0, b: 0 },      // Black
      { r: 0, g: 0, b: 0 }       // Black
    ]
  },
  {
    name: "RGB",
    colors: [
      { r: 255, g: 0, b: 0 },    // Red
      { r: 0, g: 255, b: 0 },    // Green
      { r: 0, g: 0, b: 255 }     // Blue
    ]
  },
  {
    name: "Sunset",
    colors: [
      { r: 255, g: 136, b: 0 },  // Orange
      { r: 255, g: 40, b: 80 },  // Red-Pink
      { r: 155, g: 0, b: 255 }   // Purple
    ]
  },
  {
    name: "Cool",
    colors: [
      { r: 0, g: 255, b: 255 },  // Cyan
      { r: 0, g: 100, b: 255 },  // Blue
      { r: 155, g: 255, b: 255 } // Light Cyan
    ]
  }
];

const SegmentColorSlots: React.FC<SegmentColorSlotsProps> = ({ 
  selectedSlot, 
  onSlotSelect,
  onColorChange
}) => {
  const { deviceState, activeDevice, setSegmentColor } = useWLED();
  const [colorSlots, setColorSlots] = useState<ColorSlot[]>(() => {
    try {
      const savedSlots = localStorage.getItem('wledColorSlots');
      return savedSlots ? JSON.parse(savedSlots) : DEFAULT_SLOTS;
    } catch (error) {
      console.error('Error loading color slots:', error);
      return DEFAULT_SLOTS;
    }
  });
  
  const [selectedSegment, setSelectedSegment] = useState<number | null>(null);
  const [activeColorIndex, setActiveColorIndex] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem('wledColorSlots', JSON.stringify(colorSlots));
    } catch (error) {
      console.error('Error saving color slots:', error);
    }
  }, [colorSlots]);

  useEffect(() => {
    // Select the first segment by default if one exists
    if (deviceState?.segments?.length > 0 && selectedSegment === null) {
      setSelectedSegment(deviceState.segments[0].id);
    }
  }, [deviceState?.segments, selectedSegment]);

  const handleSegmentSelect = (segmentId: number) => {
    setSelectedSegment(segmentId);
  };

  const handleSlotSelect = (slotIndex: number) => {
    onSlotSelect(slotIndex);
    
    if (selectedSegment !== null) {
      const slot = colorSlots[slotIndex];
      if (slot) {
        // Apply each color in the slot to the corresponding color slot in the segment
        slot.colors.forEach((color, colorIndex) => {
          if (deviceState && selectedSegment !== null) {
            const timeoutId = setTimeout(() => {
              setSegmentColor(selectedSegment, color.r, color.g, color.b, colorIndex);
              onColorChange(colorIndex, color, selectedSegment);
            }, 50 * colorIndex); // Stagger the color changes
            
            return () => clearTimeout(timeoutId);
          }
        });
        
        toast.success(`Applied ${slot.name || `Slot ${slotIndex + 1}`} to segment ${selectedSegment}`);
      }
    } else {
      toast.info("Select a segment first", {
        description: "Click on a triangle before applying colors"
      });
    }
  };

  const handleColorIndexSelect = (colorIndex: number) => {
    setActiveColorIndex(colorIndex);
  };

  const updateCurrentSlotColor = (color: {r: number, g: number, b: number}) => {
    if (selectedSlot >= 0 && selectedSlot < colorSlots.length) {
      const updatedSlots = [...colorSlots];
      
      // Make sure the colors array has the active color index
      while (updatedSlots[selectedSlot].colors.length <= activeColorIndex) {
        updatedSlots[selectedSlot].colors.push({ r: 0, g: 0, b: 0 });
      }
      
      updatedSlots[selectedSlot].colors[activeColorIndex] = color;
      setColorSlots(updatedSlots);
      
      toast.success(`Updated color ${activeColorIndex + 1} in ${updatedSlots[selectedSlot].name || `Slot ${selectedSlot + 1}`}`);
    }
  };

  const getCurrentColorFromDevice = () => {
    if (deviceState && selectedSegment !== null) {
      const segment = deviceState.segments?.find(s => s.id === selectedSegment);
      if (segment && segment.col && segment.col[activeColorIndex]) {
        return {
          r: segment.col[activeColorIndex][0],
          g: segment.col[activeColorIndex][1],
          b: segment.col[activeColorIndex][2]
        };
      }
    }
    return { r: 255, g: 255, b: 255 };
  };

  const saveCurrentColorToSlot = () => {
    const currentColor = getCurrentColorFromDevice();
    updateCurrentSlotColor(currentColor);
  };

  // Helper to determine if a color is dark (for text contrast)
  const isColorDark = (color: { r: number; g: number; b: number }): boolean => {
    const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
    return luminance < 0.5;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white/90">Color Slots</h3>
          <Button 
            size="sm" 
            variant="outline"
            onClick={saveCurrentColorToSlot}
            className="h-7 text-xs bg-black/20 border-white/20 text-white hover:bg-black/40"
          >
            <Save size={12} className="mr-1" />
            Save Current
          </Button>
        </div>
        
        {/* Segment selector */}
        {deviceState?.segments && deviceState.segments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deviceState.segments.map((segment, index) => (
              <Button 
                key={segment.id}
                size="sm"
                variant={selectedSegment === segment.id ? "default" : "outline"}
                onClick={() => handleSegmentSelect(segment.id)}
                className={cn(
                  "h-7 text-xs",
                  selectedSegment === segment.id 
                    ? "bg-cyan-600 text-white hover:bg-cyan-500" 
                    : "bg-black/20 border-white/20 text-white hover:bg-black/40"
                )}
              >
                Segment {index + 1}
              </Button>
            ))}
          </div>
        )}
        
        {/* Color index selector */}
        <div className="flex flex-wrap gap-1">
          {[0, 1, 2].map((colorIndex) => (
            <Button 
              key={colorIndex}
              size="sm"
              variant={activeColorIndex === colorIndex ? "default" : "outline"}
              onClick={() => handleColorIndexSelect(colorIndex)}
              className={cn(
                "h-7 text-xs",
                activeColorIndex === colorIndex 
                  ? "bg-cyan-600 text-white hover:bg-cyan-500" 
                  : "bg-black/20 border-white/20 text-white hover:bg-black/40"
              )}
            >
              Color {colorIndex + 1}
            </Button>
          ))}
        </div>

        {/* Color slots display */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {colorSlots.map((slot, slotIndex) => (
            <button
              key={slotIndex}
              onClick={() => handleSlotSelect(slotIndex)}
              className={cn(
                "relative h-16 rounded-md border transition-all",
                selectedSlot === slotIndex 
                  ? "border-cyan-400 scale-105 z-10 shadow-lg shadow-cyan-500/20" 
                  : "border-white/20 hover:border-white/40"
              )}
            >
              <div className="absolute inset-0 rounded-md overflow-hidden">
                <div className="flex h-full">
                  {slot.colors.map((color, colorIndex) => (
                    <div 
                      key={colorIndex}
                      className="flex-1 h-full"
                      style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                    />
                  ))}
                </div>
              </div>
              <div className="absolute bottom-1 left-1 right-1 text-xs font-medium px-1 rounded bg-black/40 line-clamp-1">
                {slot.name || `Slot ${slotIndex + 1}`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SegmentColorSlots;

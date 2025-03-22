
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Triangle, Palette, Plus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

interface TriangleColorSlotsProps {
  className?: string;
}

const DEFAULT_COLOR_SLOTS = [
  // Slot 1: Primary colors
  [
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 }
  ],
  // Slot 2: Pastels
  [
    { r: 255, g: 179, b: 186 },
    { r: 186, g: 255, b: 201 },
    { r: 186, g: 225, b: 255 }
  ],
  // Slot 3: Warm colors
  [
    { r: 255, g: 87, b: 51 },
    { r: 255, g: 189, b: 51 },
    { r: 254, g: 134, b: 127 }
  ]
];

const TriangleColorSlots: React.FC<TriangleColorSlotsProps> = ({ className }) => {
  const { deviceState, setTriangleColorSlot } = useWLED();
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const [editMode, setEditMode] = useState(false);
  
  // Create a state to store color sets that can be applied to segments
  const [colorSets, setColorSets] = useState<{r: number, g: number, b: number}[][]>(DEFAULT_COLOR_SLOTS);
  
  // Current editing colors
  const [editingColors, setEditingColors] = useState<{r: number, g: number, b: number}[]>([...DEFAULT_COLOR_SLOTS[0]]);
  
  const handleSelectSlot = (index: number) => {
    setSelectedSlot(index);
    setEditingColors([...colorSets[index]]);
    setSelectedColorIndex(0);
  };
  
  const handleEditColor = (color: {r: number, g: number, b: number}) => {
    const newColors = [...editingColors];
    newColors[selectedColorIndex] = color;
    setEditingColors(newColors);
  };
  
  const handleSaveColors = () => {
    const newColorSets = [...colorSets];
    newColorSets[selectedSlot] = [...editingColors];
    setColorSets(newColorSets);
    setEditMode(false);
    toast.success(`Saved colors to slot ${selectedSlot + 1}`);
  };
  
  const handleCancelEdit = () => {
    setEditingColors([...colorSets[selectedSlot]]);
    setEditMode(false);
  };
  
  const handleApplyColors = async () => {
    try {
      await setTriangleColorSlot(selectedSlot, colorSets[selectedSlot]);
    } catch (error) {
      console.error('Error applying colors:', error);
      toast.error('Failed to apply colors');
    }
  };
  
  const getSegmentCount = () => {
    return deviceState?.segments?.filter(s => s.stop !== 0).length || 0;
  };
  
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-white/80 flex items-center gap-1">
          <Triangle size={14} className="text-cyan-300" />
          <span>Triangle Color Slots</span>
        </h3>
      </div>
      
      <div className="p-3 border border-white/10 rounded-md bg-black/20">
        <Tabs defaultValue="slot1" className="w-full">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="slot1" onClick={() => handleSelectSlot(0)}>Slot 1</TabsTrigger>
            <TabsTrigger value="slot2" onClick={() => handleSelectSlot(1)}>Slot 2</TabsTrigger>
            <TabsTrigger value="slot3" onClick={() => handleSelectSlot(2)}>Slot 3</TabsTrigger>
          </TabsList>
          
          {[0, 1, 2].map((slotIndex) => (
            <TabsContent key={slotIndex} value={`slot${slotIndex + 1}`} className="focus:outline-none">
              {editMode && selectedSlot === slotIndex ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {editingColors.map((color, index) => (
                      <div 
                        key={index}
                        className={cn(
                          "p-3 rounded-md h-12 flex items-center justify-center cursor-pointer transition-all",
                          selectedColorIndex === index ? "ring-2 ring-cyan-500 scale-105" : "hover:scale-105"
                        )}
                        style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                        onClick={() => setSelectedColorIndex(index)}
                      />
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <ColorPicker 
                      color={editingColors[selectedColorIndex]} 
                      onChange={handleEditColor}
                    />
                  </div>
                  
                  <div className="flex justify-between mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="text-xs bg-black/20 border-white/10 text-white/80"
                    >
                      <X size={12} className="mr-1" />
                      Cancel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveColors}
                      className="text-xs bg-cyan-950/50 border-cyan-500/30 text-cyan-300"
                    >
                      <Check size={12} className="mr-1" />
                      Save Colors
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {colorSets[slotIndex].map((color, index) => (
                      <div 
                        key={index}
                        className="p-3 rounded-md h-12 transition-all hover:scale-105"
                        style={{ backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})` }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex justify-between mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditMode(true)}
                      className="text-xs bg-black/20 border-white/10 text-white/80"
                    >
                      <Palette size={12} className="mr-1" />
                      Edit Colors
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleApplyColors}
                      className="text-xs bg-cyan-950/50 border-cyan-500/30 text-cyan-300"
                    >
                      <Triangle size={12} className="mr-1" />
                      Apply to {getSegmentCount()} triangles
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      <div className="text-xs text-white/50 mt-1 italic">
        These color slots let you apply predefined color sets to all your triangle segments.
      </div>
    </div>
  );
};

export default TriangleColorSlots;

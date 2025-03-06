
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  effect: number;
  position: { x: number; y: number };
}

interface SegmentTrianglesProps {
  className?: string;
}

const SegmentTriangles: React.FC<SegmentTrianglesProps> = ({ className }) => {
  const { deviceInfo, setColor, setEffect } = useWLED();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const handleAddSegment = () => {
    const newSegment: Segment = {
      id: Date.now(),
      color: { r: 255, g: 0, b: 0 },
      effect: 0,
      position: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10 }, // Random position between 10-80%
    };
    setSegments([...segments, newSegment]);
  };

  const handleRemoveSegment = (id: number) => {
    setSegments(segments.filter(segment => segment.id !== id));
    if (selectedSegment?.id === id) {
      setSelectedSegment(null);
    }
  };

  const handleSegmentClick = (segment: Segment) => {
    setSelectedSegment(segment);
    // Apply this segment's settings to the WLED device
    setColor(segment.color.r, segment.color.g, segment.color.b);
    setEffect(segment.effect);
  };

  const handleColorChange = (color: { r: number; g: number; b: number }) => {
    if (!selectedSegment) return;
    
    // Update local state
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, color } 
        : seg
    ));
    
    // Update selected segment
    setSelectedSegment({ ...selectedSegment, color });
    
    // Apply to device
    setColor(color.r, color.g, color.b);
  };

  const handleEffectChange = (effectId: number) => {
    if (!selectedSegment) return;
    
    // Update local state
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, effect: effectId } 
        : seg
    ));
    
    // Update selected segment
    setSelectedSegment({ ...selectedSegment, effect: effectId });
    
    // Apply to device
    setEffect(effectId);
  };

  // Handle drag functionality
  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.dataTransfer.setData("segmentId", segment.id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const segmentId = parseInt(e.dataTransfer.getData("segmentId"));
    const container = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    setSegments(segments.map(seg => 
      seg.id === segmentId 
        ? { ...seg, position: { x, y } } 
        : seg
    ));
  };

  return (
    <div className={cn("glass-card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/70">Segments</h3>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleAddSegment}
          className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20"
        >
          <Plus size={16} className="text-cyan-300" />
          <span className="sr-only">Add Segment</span>
        </Button>
      </div>

      <div 
        className="relative h-[200px] border border-white/10 rounded-md bg-black/20"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {segments.map((segment) => (
          <Popover key={segment.id}>
            <PopoverTrigger asChild>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, segment)}
                onClick={() => handleSegmentClick(segment)}
                className={cn(
                  "absolute cursor-move transition-transform hover:scale-110 active:scale-95",
                  selectedSegment?.id === segment.id && "ring-2 ring-cyan-300"
                )}
                style={{
                  left: `${segment.position.x}%`,
                  top: `${segment.position.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <Triangle 
                  size={30} 
                  fill={`rgb(${segment.color.r}, ${segment.color.g}, ${segment.color.b})`} 
                  color="white"
                  strokeWidth={1}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-60 glass border-0 backdrop-blur-lg p-3">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Segment #{segments.indexOf(segment) + 1}</h4>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveSegment(segment.id)}
                    className="h-6 w-6 rounded-full hover:bg-white/10"
                  >
                    <Trash size={14} className="text-red-400" />
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-xs text-white/70">Color</h5>
                  <ColorPicker 
                    color={segment.color}
                    onChange={handleColorChange}
                    className="w-full"
                  />
                </div>
                
                {deviceInfo?.effects && (
                  <div className="space-y-2">
                    <h5 className="text-xs text-white/70">Effect</h5>
                    <select
                      value={segment.effect}
                      onChange={(e) => handleEffectChange(parseInt(e.target.value))}
                      className="w-full p-2 rounded bg-black/20 text-xs border border-white/10"
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
            </PopoverContent>
          </Popover>
        ))}

        {segments.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-white/40">
            Click the + button to add segments
          </div>
        )}
      </div>
    </div>
  );
};

export default SegmentTriangles;

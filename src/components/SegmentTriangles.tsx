
import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move } from 'lucide-react';
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
  const { deviceInfo, deviceState, setColor, setEffect, setSegmentColor, setSegmentEffect } = useWLED();
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [draggedSegment, setDraggedSegment] = useState<Segment | null>(null);

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
    
    // Update specific segment in WLED
    const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
    if (segmentIndex !== -1) {
      setSegmentColor(segmentIndex, color.r, color.g, color.b);
    }
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
    
    // Apply to device and specific segment
    setEffect(effectId);
    
    // Update specific segment in WLED
    const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
    if (segmentIndex !== -1) {
      setSegmentEffect(segmentIndex, effectId);
    }
  };

  // Handle drag functionality
  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.dataTransfer.setData("segmentId", segment.id.toString());
    setDraggedSegment(segment);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedSegment) {
      e.currentTarget.classList.add('bg-cyan-500/10');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-cyan-500/10');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-cyan-500/10');
    
    const segmentId = parseInt(e.dataTransfer.getData("segmentId"));
    const container = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    setSegments(segments.map(seg => 
      seg.id === segmentId 
        ? { ...seg, position: { x, y } } 
        : seg
    ));
    
    setDraggedSegment(null);
  };

  return (
    <div className={cn("glass-card p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-md font-medium text-white/80">LED Segments</h3>
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
        className="relative h-[300px] border border-white/10 rounded-md bg-black/20 transition-colors"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
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
                  "absolute cursor-move transition-all duration-300 hover:scale-110 active:scale-95 hover:z-10",
                  selectedSegment?.id === segment.id ? "ring-2 ring-cyan-300 z-20" : "z-10"
                )}
                style={{
                  left: `${segment.position.x}%`,
                  top: `${segment.position.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div className="relative">
                  <Triangle 
                    size={40} 
                    fill={`rgb(${segment.color.r}, ${segment.color.g}, ${segment.color.b})`} 
                    color="white"
                    strokeWidth={1}
                    className="drop-shadow-lg"
                  />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
                    {segments.indexOf(segment) + 1}
                  </div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 glass border-0 backdrop-blur-lg p-3">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium text-sm">Segment #{segments.indexOf(segment) + 1}</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-full hover:bg-white/10"
                    >
                      <Move size={14} className="text-cyan-300" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveSegment(segment.id)}
                      className="h-6 w-6 rounded-full hover:bg-white/10"
                    >
                      <Trash size={14} className="text-red-400" />
                    </Button>
                  </div>
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
                      className="w-full p-2 rounded bg-black/20 text-xs border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-white/40">
            <Triangle size={40} className="mb-2 text-cyan-300/30" />
            <p>Click the + button to add segments</p>
            <p className="text-xs mt-2">Drag triangles to position them</p>
          </div>
        )}
      </div>
      
      {segments.length > 0 && (
        <div className="mt-4 text-xs text-white/50 italic">
          Tip: Click triangles to edit, drag to reposition
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;


import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  effect: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
}

interface SegmentTrianglesProps {
  className?: string;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  selectedSegment: Segment | null;
  setSelectedSegment: React.Dispatch<React.SetStateAction<Segment | null>>;
  editMode?: 'segment' | 'color' | 'effect';
}

const SegmentTriangles: React.FC<SegmentTrianglesProps> = ({ 
  className, 
  segments, 
  setSegments, 
  selectedSegment, 
  setSelectedSegment,
  editMode = 'segment'
}) => {
  const { deviceInfo, deviceState, setColor, setEffect, setSegmentColor, setSegmentEffect } = useWLED();
  const [draggedSegment, setDraggedSegment] = useState<Segment | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [startMousePosition, setStartMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const LEDS_PER_SEGMENT = 30; // Define a constant for LEDs per segment

  const calculateNextLedRange = (): { start: number; end: number } => {
    if (segments.length === 0) {
      return { start: 0, end: LEDS_PER_SEGMENT - 1 };
    }
    
    // Find the highest end LED from existing segments
    const highestEnd = Math.max(...segments.map(seg => seg.leds.end));
    const start = highestEnd + 1;
    const end = start + LEDS_PER_SEGMENT - 1;
    
    // Make sure we don't exceed the device's LED count
    const maxLed = deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300;
    return { 
      start: Math.min(start, maxLed), 
      end: Math.min(end, maxLed) 
    };
  };

  const handleAddSegment = () => {
    const ledRange = calculateNextLedRange();
    
    const newSegment: Segment = {
      id: Date.now(),
      color: { r: 255, g: 0, b: 0 },
      effect: 0,
      position: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10 }, // Random position between 10-80%
      rotation: 0,
      leds: ledRange
    };
    setSegments([...segments, newSegment]);
  };

  const handleRemoveSegment = (id: number) => {
    setSegments(segments.filter(segment => segment.id !== id));
    if (selectedSegment?.id === id) {
      setSelectedSegment(null);
    }
  };

  const handleSegmentClick = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event from bubbling to container
    setSelectedSegment(segment);
    // Apply this segment's settings to the WLED device
    setColor(segment.color.r, segment.color.g, segment.color.b);
    setEffect(segment.effect);
  };

  // Handle click on container to deselect
  const handleContainerClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the container, not on its children
    if (e.target === e.currentTarget) {
      setSelectedSegment(null);
    }
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

  const handleLEDRangeChange = (values: number[]) => {
    if (!selectedSegment || values.length !== 2) return;
    
    const leds = { start: values[0], end: values[1] };
    
    // Update local state
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds } 
        : seg
    ));
    
    // Update selected segment
    setSelectedSegment({ ...selectedSegment, leds });
  };

  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.stopPropagation(); // Prevent event from bubbling
    setSelectedSegment(segment);
    
    // Store the segment data including rotation
    e.dataTransfer.setData("segmentId", segment.id.toString());
    e.dataTransfer.setData("segmentRotation", segment.rotation.toString());
    
    // Create a custom ghost image that includes the rotation
    const ghostElement = document.createElement('div');
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    ghostElement.style.left = '-1000px';
    ghostElement.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24" transform="rotate(${segment.rotation})">
      <polygon points="12,2 22,22 2,22" fill="rgb(${segment.color.r},${segment.color.g},${segment.color.b})" stroke="rgba(0,0,0,0.5)" stroke-width="1" />
    </svg>`;
    document.body.appendChild(ghostElement);
    
    e.dataTransfer.setDragImage(ghostElement, 20, 20);
    
    // Clean up the ghost element after a short delay
    setTimeout(() => {
      document.body.removeChild(ghostElement);
    }, 100);
    
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
    // Get the rotation from dataTransfer
    const rotation = parseFloat(e.dataTransfer.getData("segmentRotation")) || 0;
    
    const container = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    // Update the position while preserving the rotation
    setSegments(segments.map(seg => 
      seg.id === segmentId 
        ? { ...seg, position: { x, y } } 
        : seg
    ));
    
    setDraggedSegment(null);
  };

  const handleRotateStart = (segment: Segment, e: React.MouseEvent) => {
    // Stop the event from propagating to parent handlers
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedSegment(segment);
    setIsRotating(true);
    
    // Calculate the center of the triangle
    const triangleElements = document.querySelectorAll(`[data-segment-id="${segment.id}"]`);
    if (triangleElements.length) {
      const triangleElement = triangleElements[0] as HTMLElement;
      const rect = triangleElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate initial angle (in radians)
      const initialAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      );
      
      setRotationStartAngle(initialAngle);
      setStartMousePosition({ x: e.clientX, y: e.clientY });
    }
    
    // Set up event listeners
    document.addEventListener('mousemove', handleRotateMove);
    document.addEventListener('mouseup', handleRotateEnd);
  };

  const handleRotateMove = (e: MouseEvent) => {
    if (!isRotating || !selectedSegment) return;
    
    // Find the triangle element
    const triangleElements = document.querySelectorAll(`[data-segment-id="${selectedSegment.id}"]`);
    if (!triangleElements.length) return;
    
    const triangleElement = triangleElements[0] as HTMLElement;
    const rect = triangleElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate the current angle
    const currentAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    );
    
    // Calculate the angle difference in degrees
    const angleDiff = (currentAngle - rotationStartAngle) * (180 / Math.PI);
    
    // Calculate new rotation by adding the difference to the current rotation
    let newRotation = selectedSegment.rotation + angleDiff;
    
    // Normalize rotation angle to 0-360 degrees
    newRotation = newRotation % 360;
    if (newRotation < 0) newRotation += 360;
    
    // Update the rotation of the segment
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, rotation: newRotation } 
        : seg
    ));
    
    // Also update the selected segment
    setSelectedSegment({
      ...selectedSegment,
      rotation: newRotation
    });
    
    // Update the rotation start angle for the next move
    setRotationStartAngle(currentAngle);
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
    document.removeEventListener('mousemove', handleRotateMove);
    document.removeEventListener('mouseup', handleRotateEnd);
  };

  const showControls = editMode === 'segment';

  return (
    <div className={cn("glass-card p-4", className)}>
      {showControls && (
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
      )}

      <div 
        ref={containerRef}
        className="relative h-[300px] border border-white/10 rounded-md bg-black/20 transition-colors"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleContainerClick}
      >
        {segments.map((segment) => (
          <Popover key={segment.id}>
            <PopoverTrigger asChild>
              <div
                data-segment-id={segment.id}
                draggable={showControls}
                onDragStart={showControls ? (e) => handleDragStart(e, segment) : undefined}
                onClick={(e) => handleSegmentClick(segment, e)}
                className={cn(
                  "absolute cursor-move transition-all duration-300 hover:scale-110 active:scale-95 hover:z-10 group",
                  selectedSegment?.id === segment.id ? "ring-2 ring-cyan-300 z-20" : "z-10"
                )}
                style={{
                  left: `${segment.position.x}%`,
                  top: `${segment.position.y}%`,
                  transform: `translate(-50%, -50%) rotate(${segment.rotation}deg)`,
                }}
              >
                <div className="relative">
                  <Triangle 
                    size={40} 
                    fill={`rgb(${segment.color.r}, ${segment.color.g}, ${segment.color.b})`} 
                    color="rgba(0, 0, 0, 0.5)"
                    strokeWidth={1}
                    className={cn(
                      "drop-shadow-lg transition-all",
                      // Visualization of the effect with animation classes
                      segment.effect === 1 && "animate-pulse",
                      segment.effect === 2 && "animate-fade-in",
                      segment.effect === 3 && "animate-spin",
                      segment.effect === 4 && "animate-bounce",
                    )}
                  />
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
                    {segments.indexOf(segment) + 1}
                  </div>
                  
                  {showControls && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering parent onClick
                        handleRotateStart(segment, e);
                      }}
                      className="absolute -top-3 -right-3 h-6 w-6 bg-cyan-500/20 rounded-full opacity-0 group-hover:opacity-100 hover:bg-cyan-500/40 z-30 transition-all"
                    >
                      <RotateCw size={12} className="text-white" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverTrigger>
            {showControls && (
              <PopoverContent className="w-64 glass border-0 backdrop-blur-lg p-3">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-sm">Segment #{segments.indexOf(segment) + 1}</h4>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-white/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotateStart(segment, e);
                        }}
                      >
                        <RotateCw size={14} className="text-cyan-300" />
                      </Button>
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
                  
                  <div className="space-y-2">
                    <h5 className="text-xs text-white/70">LED Range ({segment.leds.start} - {segment.leds.end})</h5>
                    <Slider
                      value={[segment.leds.start, segment.leds.end]}
                      min={0}
                      max={deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300}
                      step={1}
                      onValueChange={handleLEDRangeChange}
                      className="mt-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <h5 className="text-xs text-white/70">Rotation</h5>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs">{Math.round(segment.rotation)}°</span>
                      <Slider
                        value={[segment.rotation]}
                        min={0}
                        max={359}
                        step={1}
                        onValueChange={(values) => {
                          if (values.length > 0) {
                            const newRotation = values[0];
                            setSegments(segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, rotation: newRotation } 
                                : seg
                            ));
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                rotation: newRotation
                              });
                            }
                          }
                        }}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            )}
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
      
      {segments.length > 0 && showControls && (
        <div className="mt-4 text-xs text-white/50 italic">
          <p>Tip: Click triangles to edit, drag to reposition, use the <RotateCw size={10} className="inline" /> button to rotate</p>
          <p className="mt-1">Drag triangles freely to position them anywhere</p>
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;


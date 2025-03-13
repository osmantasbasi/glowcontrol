
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
  connectedTo?: number; // ID of segment this is connected to
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
  const MAGNETIC_THRESHOLD = 30; // Distance in pixels for magnetic connection

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
    // Remove connections to this segment
    const updatedSegments = segments.map(seg => {
      if (seg.connectedTo === id) {
        const { connectedTo, ...restSegment } = seg;
        return restSegment;
      }
      return seg;
    });

    setSegments(updatedSegments.filter(segment => segment.id !== id));
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

  // Get pixel distance between two segments for magnetic connection
  const getDistanceBetweenSegments = (seg1: Segment, seg2: Segment): number => {
    if (!containerRef.current) return Infinity;
    
    const container = containerRef.current.getBoundingClientRect();
    
    // Convert percentage positions to pixels
    const seg1X = (seg1.position.x / 100) * container.width;
    const seg1Y = (seg1.position.y / 100) * container.height;
    const seg2X = (seg2.position.x / 100) * container.width;
    const seg2Y = (seg2.position.y / 100) * container.height;
    
    // Calculate Euclidean distance
    return Math.sqrt(Math.pow(seg1X - seg2X, 2) + Math.pow(seg1Y - seg2Y, 2));
  };

  // Check for magnetic connections
  const checkMagneticConnection = (currentSegment: Segment) => {
    let closestSegment: Segment | null = null;
    let minDistance = MAGNETIC_THRESHOLD;
    
    // Find the closest segment within threshold
    segments.forEach(segment => {
      if (segment.id !== currentSegment.id) {
        const distance = getDistanceBetweenSegments(currentSegment, segment);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestSegment = segment;
        }
      }
    });
    
    return closestSegment;
  };

  // Handle magnetic connection
  const connectSegments = (sourceId: number, targetId: number) => {
    setSegments(segments.map(seg => {
      if (seg.id === sourceId) {
        return { ...seg, connectedTo: targetId };
      }
      return seg;
    }));
  };

  // Handle drag functionality
  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.dataTransfer.setData("segmentId", segment.id.toString());
    setDraggedSegment(segment);
    
    // If this segment is connected to another, break the connection
    if (segment.connectedTo) {
      setSegments(segments.map(seg => {
        if (seg.id === segment.id) {
          const { connectedTo, ...rest } = seg;
          return rest;
        }
        return seg;
      }));
    }
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
    
    // First update the position
    const updatedSegments = segments.map(seg => 
      seg.id === segmentId 
        ? { ...seg, position: { x, y } } 
        : seg
    );
    
    setSegments(updatedSegments);
    
    // Check for magnetic connections
    const droppedSegment = updatedSegments.find(seg => seg.id === segmentId);
    if (droppedSegment) {
      const closestSegment = checkMagneticConnection(droppedSegment);
      
      if (closestSegment) {
        // Connect them
        connectSegments(droppedSegment.id, closestSegment.id);
      }
    }
    
    setDraggedSegment(null);
  };

  // Improved rotation functionality
  const handleRotateStart = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedSegment(segment);
    setIsRotating(true);
    
    // Record the starting mouse position
    setStartMousePosition({ x: e.clientX, y: e.clientY });
    
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
    
    // Calculate the new angle based on the mouse position relative to center
    const angle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    ) * (180 / Math.PI);
    
    // Apply rotation directly (no need for subtraction which was causing issues)
    const newRotation = angle;
    
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
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
    document.removeEventListener('mousemove', handleRotateMove);
    document.removeEventListener('mouseup', handleRotateEnd);
  };

  // Determine if we should show the controls (add button, etc.) based on the edit mode
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
      >
        {segments.map((segment) => {
          // Determine position based on connections
          let position = { ...segment.position };
          let connectedSegment: Segment | undefined;
          
          if (segment.connectedTo) {
            connectedSegment = segments.find(seg => seg.id === segment.connectedTo);
            if (connectedSegment) {
              // Apply the same position as the connected segment
              position = { ...connectedSegment.position };
            }
          }
          
          return (
            <Popover key={segment.id}>
              <PopoverTrigger asChild>
                <div
                  data-segment-id={segment.id}
                  draggable={showControls}
                  onDragStart={showControls ? (e) => handleDragStart(e, segment) : undefined}
                  onClick={() => handleSegmentClick(segment)}
                  className={cn(
                    "absolute cursor-move transition-all duration-300 hover:scale-110 active:scale-95 hover:z-10 group",
                    segment.connectedTo ? "ring-1 ring-cyan-500/50" : "",
                    selectedSegment?.id === segment.id ? "ring-2 ring-cyan-300 z-20" : "z-10"
                  )}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                    transform: `translate(-50%, -50%) rotate(${segment.rotation}deg)`,
                  }}
                >
                  <div className="relative">
                    <Triangle 
                      size={40} 
                      fill={`rgb(${segment.color.r}, ${segment.color.g}, ${segment.color.b})`} 
                      color="white"
                      strokeWidth={1}
                      className={cn(
                        "drop-shadow-lg",
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
                    
                    {/* Rotation button - only show in segment edit mode */}
                    {showControls && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onMouseDown={(e) => handleRotateStart(segment, e)}
                        className="absolute -top-2 -right-2 h-5 w-5 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 hover:bg-white/30 z-30"
                      >
                        <RotateCw size={10} className="text-white" />
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
                          onMouseDown={(e) => handleRotateStart(segment, e)}
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
                    
                    {segment.connectedTo && (
                      <div className="space-y-2">
                        <h5 className="text-xs text-white/70">Connected To</h5>
                        <div className="flex justify-between">
                          <span className="text-xs">
                            Segment #{segments.findIndex(s => s.id === segment.connectedTo) + 1}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSegments(segments.map(seg => {
                                if (seg.id === segment.id) {
                                  const { connectedTo, ...rest } = seg;
                                  return rest;
                                }
                                return seg;
                              }));
                            }}
                            className="h-5 text-xs hover:bg-white/10 text-red-400"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              )}
            </Popover>
          );
        })}

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
          <p>Tip: Click triangles to edit, drag to reposition, use rotate button to change orientation</p>
          <p className="mt-1">Drag triangles close to each other to connect them magnetically, disconnect from popover menu</p>
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;

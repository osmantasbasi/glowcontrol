
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';

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
  const { deviceInfo, deviceState, setColor, setEffect, setSegmentColor, setSegmentEffect, setBrightness } = useWLED();
  const [draggedSegment, setDraggedSegment] = useState<Segment | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [startMousePosition, setStartMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const LEDS_PER_SEGMENT = 30;

  const calculateNextLedRange = (): { start: number; end: number } => {
    if (segments.length === 0) {
      return { start: 0, end: LEDS_PER_SEGMENT - 1 };
    }
    
    const highestEnd = Math.max(...segments.map(seg => seg.leds.end));
    const start = highestEnd + 1;
    const end = start + LEDS_PER_SEGMENT - 1;
    
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
      position: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10 },
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
    e.stopPropagation();
    setSelectedSegment(segment);
    setColor(segment.color.r, segment.color.g, segment.color.b);
    setEffect(segment.effect);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedSegment(null);
    }
  };

  const handleColorChange = (color: { r: number; g: number; b: number }) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, color } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, color });
    
    setColor(color.r, color.g, color.b);
    
    const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
    if (segmentIndex !== -1) {
      setSegmentColor(segmentIndex, color.r, color.g, color.b);
    }
  };

  const handleEffectChange = (effectId: number) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, effect: effectId } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, effect: effectId });
    
    setEffect(effectId);
    
    const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
    if (segmentIndex !== -1) {
      setSegmentEffect(segmentIndex, effectId);
    }
  };

  const handleLEDRangeChange = (values: number[]) => {
    if (!selectedSegment || values.length !== 2) return;
    
    const leds = { start: values[0], end: values[1] };
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, leds });
  };

  const handleLEDInputChange = (type: 'start' | 'end', value: string) => {
    if (!selectedSegment) return;
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    const maxLed = deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300;
    const validValue = Math.min(Math.max(0, numValue), maxLed);
    
    let start = selectedSegment.leds.start;
    let end = selectedSegment.leds.end;
    
    if (type === 'start') {
      start = validValue;
      // Ensure start doesn't exceed end
      if (start > end) end = start;
    } else {
      end = validValue;
      // Ensure end isn't less than start
      if (end < start) start = end;
    }
    
    const leds = { start, end };
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, leds });
  };

  const handleRotationInputChange = (value: string) => {
    if (!selectedSegment) return;
    
    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) return;
    
    // Normalize rotation to 0-359
    let rotation = numValue % 360;
    if (rotation < 0) rotation += 360;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, rotation } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, rotation });
  };

  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.stopPropagation();
    setSelectedSegment(segment);
    
    e.dataTransfer.setData("segmentId", segment.id.toString());
    e.dataTransfer.setData("segmentRotation", segment.rotation.toString());
    
    const ghostElement = document.createElement('div');
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    ghostElement.style.left = '-1000px';
    ghostElement.innerHTML = `<svg width="40" height="40" viewBox="0 0 24 24">
      <polygon points="12,2 22,22 2,22" fill="rgb(${segment.color.r},${segment.color.g},${segment.color.b})" stroke="rgba(0,0,0,0.5)" stroke-width="1" transform="rotate(${segment.rotation}, 12, 12)" />
    </svg>`;
    document.body.appendChild(ghostElement);
    
    e.dataTransfer.setDragImage(ghostElement, 20, 20);
    
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
    const rotation = parseFloat(e.dataTransfer.getData("segmentRotation")) || 0;
    
    const segmentToUpdate = segments.find(seg => seg.id === segmentId);
    if (!segmentToUpdate) return;
    
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    
    // Calculate percentage position within container
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    setSegments(segments.map(seg => 
      seg.id === segmentId 
        ? { ...seg, position: { x, y }, rotation } 
        : seg
    ));
    
    if (selectedSegment?.id === segmentId) {
      setSelectedSegment({ ...selectedSegment, position: { x, y }, rotation });
    }
    
    setDraggedSegment(null);
  };

  const handleRotateStart = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedSegment(segment);
    setIsRotating(true);
    
    const triangleElements = document.querySelectorAll(`[data-segment-id="${segment.id}"]`);
    if (triangleElements.length) {
      const triangleElement = triangleElements[0] as HTMLElement;
      const rect = triangleElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const initialAngle = Math.atan2(
        e.clientY - centerY,
        e.clientX - centerX
      );
      
      setRotationStartAngle(initialAngle);
      setStartMousePosition({ x: e.clientX, y: e.clientY });
    }
    
    document.addEventListener('mousemove', handleRotateMove);
    document.addEventListener('mouseup', handleRotateEnd);
  };

  const handleRotateMove = (e: MouseEvent) => {
    if (!isRotating || !selectedSegment) return;
    
    const triangleElements = document.querySelectorAll(`[data-segment-id="${selectedSegment.id}"]`);
    if (!triangleElements.length) return;
    
    const triangleElement = triangleElements[0] as HTMLElement;
    const rect = triangleElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const currentAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    );
    
    const angleDiff = (currentAngle - rotationStartAngle) * (180 / Math.PI);
    
    let newRotation = selectedSegment.rotation + angleDiff;
    
    newRotation = newRotation % 360;
    if (newRotation < 0) newRotation += 360;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, rotation: newRotation } 
        : seg
    ));
    
    setSelectedSegment({
      ...selectedSegment,
      rotation: newRotation
    });
    
    setRotationStartAngle(currentAngle);
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
    document.removeEventListener('mousemove', handleRotateMove);
    document.removeEventListener('mouseup', handleRotateEnd);
  };

  // Keyboard movement for selected segment
  useEffect(() => {
    if (!selectedSegment) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSegment) return;
      
      // Only handle arrow keys
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      e.preventDefault();
      
      const step = e.shiftKey ? 1 : 0.5; // Larger steps with shift key
      const { x, y } = selectedSegment.position;
      
      let newX = x;
      let newY = y;
      
      switch (e.key) {
        case 'ArrowLeft':
          newX = Math.max(0, x - step);
          break;
        case 'ArrowRight':
          newX = Math.min(100, x + step);
          break;
        case 'ArrowUp':
          newY = Math.max(0, y - step);
          break;
        case 'ArrowDown':
          newY = Math.min(100, y + step);
          break;
      }
      
      if (newX !== x || newY !== y) {
        setSegments(segments.map(seg => 
          seg.id === selectedSegment.id 
            ? { ...seg, position: { x: newX, y: newY } } 
            : seg
        ));
        
        setSelectedSegment({
          ...selectedSegment,
          position: { x: newX, y: newY }
        });
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSegment, segments, setSelectedSegment, setSegments]);

  const showControls = editMode === 'segment';

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
  };

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
                  transformOrigin: "center center"
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
                        e.stopPropagation();
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
                      <div className="flex flex-col space-y-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full hover:bg-white/10"
                          onClick={() => {
                            const newY = Math.max(0, segment.position.y - 1);
                            setSegments(segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, y: newY } } 
                                : seg
                            ));
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, y: newY }
                              });
                            }
                          }}
                        >
                          <ArrowUp size={14} className="text-cyan-300" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full hover:bg-white/10"
                          onClick={() => {
                            const newY = Math.min(100, segment.position.y + 1);
                            setSegments(segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, y: newY } } 
                                : seg
                            ));
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, y: newY }
                              });
                            }
                          }}
                        >
                          <ArrowDown size={14} className="text-cyan-300" />
                        </Button>
                      </div>
                      <div className="flex flex-col space-y-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full hover:bg-white/10"
                          onClick={() => {
                            const newX = Math.max(0, segment.position.x - 1);
                            setSegments(segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, x: newX } } 
                                : seg
                            ));
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, x: newX }
                              });
                            }
                          }}
                        >
                          <ArrowLeft size={14} className="text-cyan-300" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 rounded-full hover:bg-white/10"
                          onClick={() => {
                            const newX = Math.min(100, segment.position.x + 1);
                            setSegments(segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, x: newX } } 
                                : seg
                            ));
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, x: newX }
                              });
                            }
                          }}
                        >
                          <ArrowRight size={14} className="text-cyan-300" />
                        </Button>
                      </div>
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
                    <h5 className="text-xs text-white/70">LED Range</h5>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="number"
                        value={segment.leds.start}
                        onChange={(e) => handleLEDInputChange('start', e.target.value)}
                        className="w-16 h-8 text-sm bg-black/20 border-white/10"
                        min={0}
                        max={deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300}
                      />
                      <span className="text-xs text-white/50">to</span>
                      <Input
                        type="number"
                        value={segment.leds.end}
                        onChange={(e) => handleLEDInputChange('end', e.target.value)}
                        className="w-16 h-8 text-sm bg-black/20 border-white/10"
                        min={0}
                        max={deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300}
                      />
                    </div>
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
                      <Input
                        type="number"
                        value={Math.round(segment.rotation)}
                        onChange={(e) => handleRotationInputChange(e.target.value)}
                        className="w-16 h-8 text-sm bg-black/20 border-white/10"
                        min={0}
                        max={359}
                      />
                      <span className="text-xs">degrees</span>
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
                  
                  <div className="space-y-2">
                    <h5 className="text-xs text-white/70">Brightness</h5>
                    <Slider
                      value={[deviceState?.brightness || 128]}
                      min={1}
                      max={255}
                      step={1}
                      onValueChange={(values) => {
                        if (values.length > 0) {
                          handleBrightnessChange(values[0]);
                        }
                      }}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-white/50">
                      <span>Min</span>
                      <span>{deviceState?.brightness || 128}</span>
                      <span>Max</span>
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
          <p className="mt-1">Use arrow keys to move selected triangle precisely</p>
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;

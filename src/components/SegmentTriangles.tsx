import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Power, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  color2?: { r: number; g: number; b: number };
  color3?: { r: number; g: number; b: number };
  effect: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
  brightness: number;
  on: boolean;
  speed: number;
  intensity: number;
  palette: number;
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
  
  const [ledStart, setLedStart] = useState<string>('0');
  const [ledEnd, setLedEnd] = useState<string>('30');
  const [rotationValue, setRotationValue] = useState<string>('0');
  const [speedValue, setSpeedValue] = useState<string>('128');
  const [intensityValue, setIntensityValue] = useState<string>('128');
  
  const LEDS_PER_SEGMENT = 31;
  const MAX_SEGMENTS = 10;

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
    if (segments.length >= MAX_SEGMENTS) {
      toast.error(`Maximum of ${MAX_SEGMENTS} segments allowed`);
      return;
    }
    
    const ledRange = calculateNextLedRange();
    
    const newSegment: Segment = {
      id: Date.now(),
      color: { r: 255, g: 0, b: 0 },
      color2: { r: 0, g: 255, b: 0 },
      color3: { r: 0, g: 0, b: 255 },
      effect: 0,
      position: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10 },
      rotation: 0,
      leds: ledRange,
      brightness: 255,
      on: true,
      speed: 128,
      intensity: 128,
      palette: 0
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
    setIsEditModalOpen(true);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedSegment(null);
    }
  };

  const handleColorChange = (color: { r: number; g: number; b: number }, slot: number = 1) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => {
      if (seg.id === selectedSegment.id) {
        if (slot === 1) {
          return { ...seg, color };
        } else if (slot === 2) {
          return { ...seg, color2: color };
        } else if (slot === 3) {
          return { ...seg, color3: color };
        }
        return seg;
      }
      return seg;
    }));
    
    if (slot === 1) {
      setSelectedSegment({ ...selectedSegment, color });
      
      try {
        if (deviceState) {
          setColor(color.r, color.g, color.b);
          
          const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
          if (segmentIndex !== -1) {
            setSegmentColor(segmentIndex, color.r, color.g, color.b);
          }
        }
      } catch (error) {
        console.log('Error handling color change:', error);
      }
    } else if (slot === 2 && selectedSegment.color2) {
      setSelectedSegment({ ...selectedSegment, color2: color });
    } else if (slot === 3 && selectedSegment.color3) {
      setSelectedSegment({ ...selectedSegment, color3: color });
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
    
    try {
      if (deviceState) {
        setEffect(effectId);
        
        const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
        if (segmentIndex !== -1) {
          setSegmentEffect(segmentIndex, effectId, selectedSegment.speed, selectedSegment.intensity);
        }
      }
    } catch (error) {
      console.log('Error handling effect change:', error);
    }
  };

  const handlePaletteChange = (paletteId: number) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, palette: paletteId } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, palette: paletteId });
  };

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeColorSlot, setActiveColorSlot] = useState(1);

  useEffect(() => {
    if (selectedSegment) {
      setLedStart(selectedSegment.leds.start.toString());
      setLedEnd(selectedSegment.leds.end.toString());
      setRotationValue(Math.round(selectedSegment.rotation).toString());
      setSpeedValue(selectedSegment.speed.toString());
      setIntensityValue(selectedSegment.intensity.toString());
    } else {
      setLedStart('0');
      setLedEnd('30');
      setRotationValue('0');
      setSpeedValue('128');
      setIntensityValue('128');
    }
  }, [selectedSegment]);

  const handleLEDRangeChange = (values: number[]) => {
    if (!selectedSegment || values.length !== 2) return;
    
    const leds = { start: values[0], end: values[1] };
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, leds });
    setLedStart(leds.start.toString());
    setLedEnd(leds.end.toString());
  };

  const handleLEDInputChange = (type: 'start' | 'end', value: string) => {
    if (!selectedSegment) return;
    
    if (type === 'start') {
      setLedStart(value);
      updateSegmentSettings('ledStart', value);
    } else {
      setLedEnd(value);
      updateSegmentSettings('ledEnd', value);
    }
  };

  const handleRotationInputChange = (value: string) => {
    if (!selectedSegment) return;
    setRotationValue(value);
    updateSegmentSettings('rotation', value);
  };

  const handleSpeedInputChange = (value: string) => {
    if (!selectedSegment) return;
    setSpeedValue(value);
    updateSegmentSettings('speed', value);
  };

  const handleIntensityInputChange = (value: string) => {
    if (!selectedSegment) return;
    setIntensityValue(value);
    updateSegmentSettings('intensity', value);
  };

  const updateSegmentSettings = (field: 'ledStart' | 'ledEnd' | 'rotation' | 'speed' | 'intensity', value: string) => {
    if (!selectedSegment) return;
    
    const maxLed = deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300;
    
    let leds = { ...selectedSegment.leds };
    let rotation = selectedSegment.rotation;
    let speed = selectedSegment.speed;
    let intensity = selectedSegment.intensity;
    
    if (field === 'ledStart') {
      const start = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(start)) {
        const validStart = Math.min(Math.max(0, start), maxLed);
        leds.start = validStart;
        
        if (validStart > leds.end) {
          leds.end = validStart;
          setLedEnd(validStart.toString());
        }
      }
    } else if (field === 'ledEnd') {
      const end = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(end)) {
        const validEnd = Math.min(Math.max(leds.start, end), maxLed);
        leds.end = validEnd;
      }
    } else if (field === 'rotation') {
      const newRotation = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(newRotation)) {
        let validRotation = newRotation % 360;
        if (validRotation < 0) validRotation += 360;
        rotation = validRotation;
      }
    } else if (field === 'speed') {
      const newSpeed = value === '' ? 128 : parseInt(value, 10);
      if (!isNaN(newSpeed)) {
        speed = Math.min(Math.max(0, newSpeed), 255);
      }
    } else if (field === 'intensity') {
      const newIntensity = value === '' ? 128 : parseInt(value, 10);
      if (!isNaN(newIntensity)) {
        intensity = Math.min(Math.max(0, newIntensity), 255);
      }
    }
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds, rotation, speed, intensity } 
        : seg
    ));
    
    setSelectedSegment({
      ...selectedSegment,
      leds,
      rotation,
      speed,
      intensity
    });
    
    if ((field === 'speed' || field === 'intensity') && deviceState) {
      try {
        const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
        if (segmentIndex !== -1) {
          setSegmentEffect(segmentIndex, selectedSegment.effect, speed, intensity);
        }
      } catch (error) {
        console.log('Error updating segment effect:', error);
      }
    }
  };

  const handleBrightnessChange = (value: number) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, brightness: value } 
        : seg
    ));
    
    setSelectedSegment({
      ...selectedSegment,
      brightness: value
    });
    
    try {
      if (deviceState) {
        setBrightness(value);
      }
    } catch (error) {
      console.log('Error setting brightness:', error);
    }
  };

  const handlePowerToggle = (on: boolean) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, on } 
        : seg
    ));
    
    setSelectedSegment({
      ...selectedSegment,
      on
    });
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
    ghostElement.innerHTML = `<svg width="80" height="80" viewBox="0 0 24 24">
      <polygon points="12,2 22,22 2,22" fill="rgb(${segment.color.r},${segment.color.g},${segment.color.b})" stroke="rgba(0,0,0,0.5)" stroke-width="1" transform="rotate(${segment.rotation}, 12, 12)" />
    </svg>`;
    document.body.appendChild(ghostElement);
    
    e.dataTransfer.setDragImage(ghostElement, 40, 40);
    
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

  useEffect(() => {
    if (!selectedSegment) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedSegment) return;
      
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      e.preventDefault();
      
      const step = e.shiftKey ? 1 : 0.5;
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

  return (
    <>
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
          className="relative h-[350px] border border-white/10 rounded-md bg-black/20 transition-colors"
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
                    selectedSegment?.id === segment.id ? "ring-2 ring-cyan-300 z-20" : "z-10",
                    !segment.on && "opacity-50"
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
                      size={70} 
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
                <PopoverContent className="w-72 glass border-0 backdrop-blur-lg p-3">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Switch 
                          checked={selectedSegment?.on || false} 
                          onCheckedChange={handlePowerToggle}
                          className="data-[state=checked]:bg-cyan-500" 
                        />
                        <h4 className="font-medium text-sm">Segment #{segments.indexOf(segment) + 1}</h4>
                      </div>
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
                          onClick={() => handleRemoveSegment(segment.id)}
                          className="h-6 w-6 rounded-full hover:bg-white/10"
                        >
                          <Trash size={14} className="text-red-400" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-xs text-white/50 text-center">Colors</h5>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <div className="text-xs text-white/50 text-center">Primary</div>
                          <ColorPicker 
                            color={segment.color}
                            onChange={(color) => handleColorChange(color, 1)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-white/50 text-center">Secondary</div>
                          <ColorPicker 
                            color={segment.color2 || { r: 0, g: 255, b: 0 }}
                            onChange={(color) => handleColorChange(color, 2)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-white/50 text-center">Tertiary</div>
                          <ColorPicker 
                            color={segment.color3 || { r: 0, g: 0, b: 255 }}
                            onChange={(color) => handleColorChange(color, 3)}
                            className="w-full"
                          />
                        </div>
                      </div>
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
                    
                    {deviceInfo?.palettes && (
                      <div className="space-y-2">
                        <h5 className="text-xs text-white/70">Palette</h5>
                        <select
                          value={segment.palette}
                          onChange={(e) => handlePaletteChange(parseInt(e.target.value))}
                          className="w-full p-2 rounded bg-black/20 text-xs border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
                        >
                          {deviceInfo.palettes.map((palette, index) => (
                            <option key={index} value={index}>
                              {palette}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-2">
                      <h5 className="text-xs text-white/70">Effect Speed</h5>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="text"
                          value={speedValue}
                          onChange={(e) => handleSpeedInputChange(e.target.value)}
                          className="w-16 h-8 text-sm bg-black/20 border-white/10"
                          placeholder="128"
                        />
                        <Slider
                          value={[segment.speed]}
                          min={0}
                          max={255}
                          step={1}
                          onValueChange={(values) => {
                            if (values.length > 0) {
                              const newSpeed = values[0];
                              handleSpeedInputChange(newSpeed.toString());
                            }
                          }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-xs text-white/70">Effect Intensity</h5>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="text"
                          value={intensityValue}
                          onChange={(e) => handleIntensityInputChange(e.target.value)}
                          className="w-16 h-8 text-sm bg-black/20 border-white/10"
                          placeholder="128"
                        />
                        <Slider
                          value={[segment.intensity]}
                          min={0}
                          max={255}
                          step={1}
                          onValueChange={(values) => {
                            if (values.length > 0) {
                              const newIntensity = values[0];
                              handleIntensityInputChange(newIntensity.toString());
                            }
                          }}
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h5 className="text-xs text-white/70">LED Range</h5>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="text"
                          value={ledStart}
                          onChange={(e) => handleLEDInputChange('start', e.target.value)}
                          className="w-16 h-8 text-sm bg-black/20 border-white/10"
                          placeholder="0"
                        />
                        <span className="text-xs text-white/50">to</span>
                        <Input
                          type="text"
                          value={ledEnd}
                          onChange={(e) => handleLEDInputChange('end', e.target.value)}
                          className="w-16 h-8 text-sm bg-black/20 border-white/10"
                          placeholder="30"
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
                          type="text"
                          value={rotationValue}
                          onChange={(e) => handleRotationInputChange(e.target.value)}
                          className="w-16 h-8 text-sm bg-black/20 border-white/10"
                          placeholder="0"
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
                                setRotationValue(Math.round(newRotation).toString());
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
                        value={[segment.brightness]}
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
                        <span>{segment.brightness}</span>
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
              <Triangle size={70} className="mb-2 text-cyan-300/30" />
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
      
      {isEditModalOpen && selectedSegment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/10 rounded-lg w-full max-w-lg shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setSegments(segments.map(seg => 
                      seg.id === selectedSegment.id 
                        ? { ...seg, on: !seg.on } 
                        : seg
                    ));
                  }}
                  className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                    selectedSegment.on 
                      ? "bg-white/10 text-white hover:bg-white/20" 
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  }`}
                >
                  <Power size={18} />
                </button>
                <h3 className="text-white font-medium">Triangle {segments.findIndex(s => s.id === selectedSegment.id) + 1}</h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[70vh]">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/70 mb-3">Colors</h4>
                
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1">
                    <ColorPicker
                      color={selectedSegment.color}
                      onChange={(color) => {
                        setSegments(segments.map(seg => 
                          seg.id === selectedSegment.id 
                            ? { ...seg, color } 
                            : seg
                        ));
                      }}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div 
                      className={`w-12 h-12 rounded-md cursor-pointer ${activeColorSlot === 1 ? 'ring-2 ring-cyan-400' : 'ring-1 ring-white/20'}`}
                      style={{backgroundColor: `rgb(${selectedSegment.color.r}, ${selectedSegment.color.g}, ${selectedSegment.color.b})`}}
                      onClick={() => setActiveColorSlot(1)}
                    />
                    <div 
                      className={`w-12 h-12 rounded-md cursor-pointer ${activeColorSlot === 2 ? 'ring-2 ring-cyan-400' : 'ring-1 ring-white/20'}`}
                      style={{backgroundColor: selectedSegment.color2 ? 
                        `rgb(${selectedSegment.color2.r}, ${selectedSegment.color2.g}, ${selectedSegment.color2.b})` : 
                        'rgba(255, 255, 255, 0.1)'
                      }}
                      onClick={() => {
                        if (!selectedSegment.color2) {
                          setSegments(segments.map(seg => 
                            seg.id === selectedSegment.id 
                              ? { ...seg, color2: {r: 0, g: 127, b: 255} } 
                              : seg
                          ));
                        }
                        setActiveColorSlot(2);
                      }}
                    />
                    <div 
                      className={`w-12 h-12 rounded-md cursor-pointer ${activeColorSlot === 3 ? 'ring-2 ring-cyan-400' : 'ring-1 ring-white/20'}`}
                      style={{backgroundColor: selectedSegment.color3 ? 
                        `rgb(${selectedSegment.color3.r}, ${selectedSegment.color3.g}, ${selectedSegment.color3.b})` : 
                        'rgba(255, 255, 255, 0.1)'
                      }}
                      onClick={() => {
                        if (!selectedSegment.color3) {
                          setSegments(segments.map(seg => 
                            seg.id === selectedSegment.id 
                              ? { ...seg, color3: {r: 255, g: 0, b: 127} } 
                              : seg
                          ));
                        }
                        setActiveColorSlot(3);
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Effect</label>
                    <select
                      value={selectedSegment.effect || 0}
                      onChange={(e) => {
                        const effectId = parseInt(e.target.value);
                        setSegments(segments.map(seg => 
                          seg.id === selectedSegment.id 
                            ? { ...seg, effect: effectId } 
                            : seg
                        ));
                      }}
                      className="w-full p-2 rounded bg-black/20 text-sm border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
                    >
                      {deviceInfo?.effects?.map((effect, index) => (
                        <option key={index} value={index}>
                          {effect}
                        </option>
                      )) || (
                        <option value={0}>Solid</option>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Palette</label>
                    <select
                      value={selectedSegment.palette || 0}
                      onChange={(e) => {
                        const paletteId = parseInt(e.target.value);
                        setSegments(segments.map(seg => 
                          seg.id === selectedSegment.id 
                            ? { ...seg, palette: paletteId } 
                            : seg
                        ));
                      }}
                      className="w-full p-2 rounded bg-black/20 text-sm border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
                    >
                      {deviceInfo?.palettes?.map((palette, index) => (
                        <option key={index} value={index}>
                          {palette}
                        </option>
                      )) || (
                        <option value={0}>Default</option>
                      )}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-white/70">Brightness</label>
                  <span className="text-sm text-white/70">{selectedSegment.brightness}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={selectedSegment.brightness}
                  onChange={(e) => {
                    const brightness = parseInt(e.target.value);
                    setSegments(segments.map(seg => 
                      seg.id === selectedSegment.id 
                        ? { ...seg, brightness } 
                        : seg
                    ));
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-white/70">Effect Speed</label>
                  <span className="text-sm text-white/70">{selectedSegment.speed || 128}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={selectedSegment.speed || 128}
                  onChange={(e) => {
                    const speed = parseInt(e.target.value);
                    setSegments(segments.map(seg => 
                      seg.id === selectedSegment.id 
                        ? { ...seg, speed } 
                        : seg
                    ));
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-white/70">Effect Intensity</label>
                  <span className="text-sm text-white/70">{selectedSegment.intensity || 128}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={selectedSegment.intensity || 128}
                  onChange={(e) => {
                    const intensity = parseInt(e.target.value);
                    setSegments(segments.map(seg => 
                      seg.id === selectedSegment.id 
                        ? { ...seg, intensity } 
                        : seg
                    ));
                  }}
                  className="w-full"
                />
              </div>
              
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/70 mb-3">LED Range</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">Start LED</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedSegment.leds.start}
                      onChange={(e) => {
                        const start = parseInt(e.target.value);
                        setSegments(segments.map(seg => 
                          seg.id === selectedSegment.id 
                            ? { ...seg, leds: { ...seg.leds, start } } 
                            : seg
                        ));
                      }}
                      className="w-full p-2 rounded bg-black/20 text-sm border border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-white/70 mb-1 block">End LED</label>
                    <input
                      type="number"
                      min="0"
                      value={selectedSegment.leds.end}
                      onChange={(e) => {
                        const end = parseInt(e.target.value);
                        setSegments(segments.map(seg => 
                          seg.id === selectedSegment.id 
                            ? { ...seg, leds: { ...seg.leds, end } } 
                            : seg
                        ));
                      }}
                      className="w-full p-2 rounded bg-black/20 text-sm border border-white/10"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-500 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SegmentTriangles;

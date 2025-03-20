
import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Palette, Power, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import BrightnessSlider from './BrightnessSlider';

interface WLEDSegment {
  id: number;
  start: number;
  stop: number;
  len: number;
  grp: number;
  spc: number;
  of: number;
  on: boolean;
  frz: boolean;
  bri: number;
  cct: number;
  set: number;
  col: [number, number, number][];
  fx: number;
  sx: number;
  ix: number;
  pal: number;
  c1: number;
  c2: number;
  c3: number;
  sel: boolean;
  rev: boolean;
  mi: boolean;
  o1: boolean;
  o2: boolean;
  o3: boolean;
  si: number;
  m12: number;
}

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  color2?: { r: number; g: number; b: number };
  color3?: { r: number; g: number; b: number };
  effect: number;
  effectSpeed?: number;
  effectIntensity?: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
  brightness?: number;
  on?: boolean;
  palette?: number;
  start?: number;
  stop?: number;
  len?: number;
  col?: [number, number, number][];
}

interface SegmentTrianglesProps {
  className?: string;
  segments: Segment[];
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>;
  selectedSegment: Segment | null;
  setSelectedSegment: React.Dispatch<React.SetStateAction<Segment | null>>;
  editMode?: 'segment' | 'color' | 'effect';
  updateWLEDSegments?: (segmentData: Partial<Segment>[]) => Promise<void>;
}

const TRIANGLE_SIZE = 90; // Fixed triangle size
const LEDS_PER_SEGMENT = 30;

const SegmentTriangles: React.FC<SegmentTrianglesProps> = ({ 
  className, 
  segments, 
  setSegments, 
  selectedSegment, 
  setSelectedSegment,
  editMode = 'segment',
  updateWLEDSegments
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [showPopover, setShowPopover] = useState(false);
  const [newSegmentPosition, setNewSegmentPosition] = useState({ x: 0, y: 0 });
  const [newSegmentColor, setNewSegmentColor] = useState({ r: 255, g: 0, b: 255 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const { deviceInfo } = useWLED();
  const maxLeds = deviceInfo?.ledCount || 300;
  const [segmentConfig, setSegmentConfig] = useState({
    start: 0,
    length: LEDS_PER_SEGMENT,
  });

  useEffect(() => {
    if (selectedSegment) {
      setSegmentConfig({
        start: selectedSegment.leds.start,
        length: selectedSegment.leds.end - selectedSegment.leds.start,
      });
    }
  }, [selectedSegment]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setNewSegmentPosition({ x, y });
      setShowPopover(true);
    }
  };

  const addSegment = () => {
    const nextId = segments.length > 0 ? Math.max(...segments.map(s => s.id)) + 1 : 0;
    const startLed = segmentConfig.start;
    const endLed = startLed + segmentConfig.length;
    
    const newSegment: Segment = {
      id: nextId,
      color: newSegmentColor,
      effect: 0,
      position: newSegmentPosition,
      rotation: 0,
      leds: { start: startLed, end: endLed },
      brightness: 255,
      on: true,
      palette: 0,
      start: startLed,
      stop: endLed,
      len: segmentConfig.length,
      col: [[newSegmentColor.r, newSegmentColor.g, newSegmentColor.b]]
    };
    
    setSegments([...segments, newSegment]);
    setSelectedSegment(newSegment);
    setShowPopover(false);

    // Update the WLED device with the new segment
    if (updateWLEDSegments) {
      updateWLEDSegments([newSegment]).catch(err => {
        console.error("Failed to add segment to WLED:", err);
        toast.error("Failed to add segment to WLED");
      });
    }
  };

  const handleSegmentClick = (e: React.MouseEvent, segment: Segment) => {
    e.stopPropagation();
    setSelectedSegment(segment);
  };

  const deleteSegment = (e: React.MouseEvent, segmentId: number) => {
    e.stopPropagation();
    
    const segmentToDelete = segments.find(seg => seg.id === segmentId);
    
    if (segmentToDelete && updateWLEDSegments) {
      // Send delete request to WLED
      updateWLEDSegments([{
        id: segmentId,
        stop: 0,
        len: 0,
        start: 0
      }]).catch(err => {
        console.error("Failed to delete segment from WLED:", err);
        toast.error("Failed to delete segment from WLED");
      });
    }
    
    const updatedSegments = segments.filter(s => s.id !== segmentId);
    setSegments(updatedSegments);
    
    if (selectedSegment && selectedSegment.id === segmentId) {
      setSelectedSegment(null);
    }
  };

  const startDrag = (e: React.MouseEvent, segment: Segment) => {
    e.stopPropagation();
    setIsDragging(true);
    setSelectedSegment(segment);
    setDragStartPosition({ x: e.clientX, y: e.clientY });
  };

  const startRotation = (e: React.MouseEvent, segment: Segment) => {
    e.stopPropagation();
    setIsRotating(true);
    setSelectedSegment(segment);
    
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = segment.position.x + TRIANGLE_SIZE / 2;
      const centerY = segment.position.y + TRIANGLE_SIZE / 2;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
      setRotationStartAngle(angle * (180 / Math.PI) - segment.rotation);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && selectedSegment && canvasRef.current) {
      const deltaX = e.clientX - dragStartPosition.x;
      const deltaY = e.clientY - dragStartPosition.y;
      
      setDragStartPosition({ x: e.clientX, y: e.clientY });
      
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { 
              ...seg, 
              position: { 
                x: seg.position.x + deltaX, 
                y: seg.position.y + deltaY 
              } 
            } 
          : seg
      ));
    } else if (isRotating && selectedSegment && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const centerX = selectedSegment.position.x + TRIANGLE_SIZE / 2;
      const centerY = selectedSegment.position.y + TRIANGLE_SIZE / 2;
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const angle = Math.atan2(mouseY - centerY, mouseX - centerX) * (180 / Math.PI);
      const newRotation = angle - rotationStartAngle;
      
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, rotation: newRotation } 
          : seg
      ));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsRotating(false);
  };

  const getTriangleStyle = (segment: Segment) => {
    const { color, position, rotation } = segment;
    const rgbColor = `rgb(${color.r}, ${color.g}, ${color.b})`;
    
    return {
      width: `${TRIANGLE_SIZE}px`,
      height: `${TRIANGLE_SIZE}px`,
      backgroundColor: rgbColor,
      position: 'absolute' as const,
      left: `${position.x}px`,
      top: `${position.y}px`,
      transform: `rotate(${rotation}deg)`,
      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      cursor: isDragging || isRotating ? 'grabbing' : 'grab',
      opacity: segment.on === false ? 0.3 : 1,
      transition: isDragging || isRotating ? 'none' : 'all 0.2s ease',
    };
  };

  const moveSegment = (direction: 'up' | 'down' | 'left' | 'right', pixels = 10) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => {
      if (seg.id === selectedSegment.id) {
        const { x, y } = seg.position;
        let newX = x;
        let newY = y;
        
        switch (direction) {
          case 'up': newY -= pixels; break;
          case 'down': newY += pixels; break;
          case 'left': newX -= pixels; break;
          case 'right': newX += pixels; break;
        }
        
        return { ...seg, position: { x: newX, y: newY } };
      }
      return seg;
    }));
  };

  const rotateSegment = (degrees = 15) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => {
      if (seg.id === selectedSegment.id) {
        return { ...seg, rotation: seg.rotation + degrees };
      }
      return seg;
    }));
  };

  const toggleSegmentPower = () => {
    if (!selectedSegment) return;
    
    const newState = !(selectedSegment.on ?? true);
    
    setSegments(segments.map(seg => {
      if (seg.id === selectedSegment.id) {
        return { ...seg, on: newState };
      }
      return seg;
    }));
    
    setSelectedSegment({...selectedSegment, on: newState});
    
    // Update WLED device
    if (updateWLEDSegments) {
      updateWLEDSegments([{
        id: selectedSegment.id,
        on: newState
      }]).catch(err => {
        console.error("Failed to update segment power state:", err);
        toast.error("Failed to update segment power state");
      });
    }
  };

  const handleBrightnessChange = (value: number) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => {
      if (seg.id === selectedSegment.id) {
        return { ...seg, brightness: value };
      }
      return seg;
    }));
    
    setSelectedSegment({...selectedSegment, brightness: value});
    
    // Update WLED device
    if (updateWLEDSegments) {
      updateWLEDSegments([{
        id: selectedSegment.id,
        brightness: value
      }]).catch(err => {
        console.error("Failed to update segment brightness:", err);
        toast.error("Failed to update segment brightness");
      });
    }
  };

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-black/20 border border-white/10", className)}>
      <div 
        ref={canvasRef} 
        className="relative w-full h-[300px] md:h-[400px] overflow-hidden" 
        onClick={editMode === 'segment' ? handleCanvasClick : undefined}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {segments.map(segment => (
          <div
            key={segment.id}
            style={getTriangleStyle(segment)}
            onClick={(e) => handleSegmentClick(e, segment)}
            onMouseDown={(e) => startDrag(e, segment)}
            className={cn(
              "segment-triangle hover:shadow-lg",
              selectedSegment?.id === segment.id && "ring-2 ring-white"
            )}
          >
            {editMode === 'segment' && selectedSegment?.id === segment.id && (
              <div className="absolute bottom-0 right-0 flex items-center m-1">
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="h-6 w-6 rounded-full" 
                  onClick={(e) => deleteSegment(e, segment.id)}
                >
                  <Trash size={12} />
                </Button>
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-6 w-6 rounded-full ml-1" 
                  onClick={(e) => { e.stopPropagation(); startRotation(e, segment); }}
                >
                  <RotateCw size={12} />
                </Button>
              </div>
            )}
            
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-white font-bold">
              {segment.id}
            </div>
          </div>
        ))}
        
        {editMode === 'segment' && (
          <Popover open={showPopover} onOpenChange={setShowPopover}>
            <PopoverTrigger asChild>
              <div style={{ 
                position: 'absolute',
                left: newSegmentPosition.x - 15,
                top: newSegmentPosition.y - 15,
                width: 30,
                height: 30
              }}>
                {showPopover && <Plus className="text-white" />}
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Add New Segment</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="startLed">Start LED</Label>
                  <Input 
                    id="startLed" 
                    type="number" 
                    value={segmentConfig.start} 
                    onChange={(e) => setSegmentConfig({...segmentConfig, start: Number(e.target.value)})}
                    min={0}
                    max={maxLeds - segmentConfig.length}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ledLength">LED Length</Label>
                  <Input 
                    id="ledLength" 
                    type="number" 
                    value={segmentConfig.length} 
                    onChange={(e) => setSegmentConfig({...segmentConfig, length: Number(e.target.value)})}
                    min={1}
                    max={maxLeds - segmentConfig.start}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Segment Color</Label>
                  <ColorPicker 
                    color={newSegmentColor} 
                    onChange={setNewSegmentColor}
                    size={150}
                  />
                </div>
                
                <Button onClick={addSegment} className="w-full">
                  Add Segment
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {selectedSegment && editMode === 'segment' && (
        <div className="p-4 border-t border-white/10 space-y-3 bg-black/30">
          <div className="flex flex-wrap gap-2 justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8" 
              onClick={() => moveSegment('up')}
            >
              <ArrowUp size={14} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8" 
              onClick={() => moveSegment('down')}
            >
              <ArrowDown size={14} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8" 
              onClick={() => moveSegment('left')}
            >
              <ArrowLeft size={14} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8" 
              onClick={() => moveSegment('right')}
            >
              <ArrowRight size={14} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8" 
              onClick={() => rotateSegment(-15)}
            >
              <RotateCw size={14} className="transform -scale-x-100" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 w-8" 
              onClick={() => rotateSegment(15)}
            >
              <RotateCw size={14} />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "h-8 w-8",
                selectedSegment.on === false ? "bg-red-900/30 text-red-300" : "bg-green-900/30 text-green-300"
              )}
              onClick={toggleSegmentPower}
            >
              <Power size={14} />
            </Button>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/70">Brightness</span>
              <span className="text-xs text-white/50">{selectedSegment.brightness ?? 255}</span>
            </div>
            <Slider 
              value={[selectedSegment.brightness ?? 255]}
              min={0}
              max={255}
              step={1}
              onValueChange={(values) => {
                if (values.length > 0) {
                  handleBrightnessChange(values[0]);
                }
              }}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/70">LED Range</span>
              <span className="text-xs text-white/50">
                {selectedSegment.leds.start} - {selectedSegment.leds.end}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;

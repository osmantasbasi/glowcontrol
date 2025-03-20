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
  const { deviceInfo, deviceState, setColor, setEffect, updateSegment, getSegments } = useWLED();
  const [draggedSegment, setDraggedSegment] = useState<Segment | null>(null);
  const [isRotating, setIsRotating] = useState(false);
  const [rotationStartAngle, setRotationStartAngle] = useState(0);
  const [startMousePosition, setStartMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [ledStart, setLedStart] = useState<string>('');
  const [ledEnd, setLedEnd] = useState<string>('');
  const [rotationValue, setRotationValue] = useState<string>('');
  const [effectSpeed, setEffectSpeed] = useState<number>(128);
  const [effectIntensity, setEffectIntensity] = useState<number>(128);
  const [segmentBrightness, setSegmentBrightness] = useState<number>(255);
  const [colorTabActive, setColorTabActive] = useState<string>('color1');
  
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wledSegments' && e.newValue) {
        try {
          const updatedSegments = JSON.parse(e.newValue);
          setSegments(updatedSegments);
        } catch (err) {
          console.error('Error parsing segments from storage:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setSegments]);

  useEffect(() => {
    const savedSegments = localStorage.getItem('wledSegments');
    if (savedSegments) {
      try {
        const parsed = JSON.parse(savedSegments);
        setSegments(parsed);
      } catch (e) {
        console.error('Error loading segments:', e);
      }
    }
  }, [setSegments]);

  useEffect(() => {
    localStorage.setItem('wledSegments', JSON.stringify(segments));
    
    const event = new CustomEvent('segmentsUpdated', { 
      detail: segments,
      bubbles: true 
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
  }, [segments]);

  useEffect(() => {
    const handleSegmentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setSegments(customEvent.detail);
      }
    };

    window.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    document.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    
    return () => {
      window.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
      document.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    };
  }, [setSegments]);

  const calculateNextLedRange = (): { start: number; end: number } => {
    if (segments.length === 0) {
      return { start: 0, end: LEDS_PER_SEGMENT - 1 };
    }
    
    const segmentIndex = segments.length;
    const start = segmentIndex * LEDS_PER_SEGMENT;
    const end = start + LEDS_PER_SEGMENT - 1;
    
    const maxLed = deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300;
    return { 
      start: Math.min(start, maxLed), 
      end: Math.min(end, maxLed) 
    };
  };

  const recalculateLedRanges = () => {
    if (segments.length === 0) return;
    
    const sortedSegments = [...segments].sort((a, b) => a.leds.start - b.leds.start);
    
    const updatedSegments = sortedSegments.map((segment, index) => {
      const start = index * LEDS_PER_SEGMENT;
      const end = start + LEDS_PER_SEGMENT - 1;
      
      return {
        ...segment,
        leds: { start, end }
      };
    });
    
    setSegments(updatedSegments);
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
    
    updatedSegments.forEach((segment, index) => {
      updateSegment(index, {
        id: index,
        start: segment.leds.start,
        stop: segment.leds.end,
        len: segment.leds.end - segment.leds.start + 1
      });
    });
  };

  const handleAddSegment = () => {
    try {
      if (segments.length >= 12) {
        toast.error("Maximum of 12 triangles reached");
        return;
      }
      
      const ledRange = calculateNextLedRange();
      const segmentId = segments.length;
      
      const newSegment: Segment = {
        id: segmentId,
        color: { r: 255, g: 0, b: 0 },
        color2: { r: 0, g: 255, b: 0 },
        color3: { r: 0, g: 0, b: 255 },
        effect: 0,
        effectSpeed: 128,
        effectIntensity: 128,
        position: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10 },
        rotation: 0,
        leds: ledRange,
        brightness: 255,
        on: true,
        palette: 0
      };
      
      const updatedSegments = [...segments, newSegment];
      setSegments(updatedSegments);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      document.dispatchEvent(event);
      
      updateSegment(segmentId, {
        id: segmentId,
        start: ledRange.start,
        stop: ledRange.end,
        len: ledRange.end - ledRange.start + 1,
        on: true,
        col: [[255, 0, 0], [0, 255, 0], [0, 0, 255]],
        fx: 0,
        sx: 128,
        ix: 128,
        bri: 255,
        pal: 0
      });
      
      toast.success("New segment added");
      console.log("New segment added:", newSegment);
    } catch (error) {
      console.error("Error adding segment:", error);
      toast.error("Failed to add segment");
    }
  };

  const handleRemoveSegment = (id: number, e?: React.MouseEvent) => {
    try {
      if (e) {
        e.stopPropagation();
        e.preventDefault();
      }
      
      const segmentIndex = segments.findIndex(s => s.id === id);
      if (segmentIndex === -1) return;
      
      const updatedSegments = segments.filter(segment => segment.id !== id);
      
      const reindexedSegments = updatedSegments.map((seg, index) => ({
        ...seg,
        id: index
      }));
      
      setSegments(reindexedSegments);
      
      if (selectedSegment?.id === id) {
        setSelectedSegment(null);
      }
      
      setSelectedSegments(prevSelected => prevSelected.filter(segId => segId !== id));
      
      localStorage.setItem('wledSegments', JSON.stringify(reindexedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: reindexedSegments,
        bubbles: true 
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
      
      try {
        setTimeout(() => {
          recalculateLedRanges();
        }, 50);
      } catch (error) {
        console.error("Error removing segment:", error);
      }
      
      toast.success("Segment removed");
    } catch (error) {
      console.error("Error removing segment:", error);
      toast.error("Failed to remove segment");
    }
  };

  const handleSegmentClick = (segment: Segment, e: React.MouseEvent) => {
    try {
      e.stopPropagation();
      
      if (isMultiSelectMode) {
        if (selectedSegments.includes(segment.id)) {
          setSelectedSegments(prevSelected => prevSelected.filter(id => id !== segment.id));
        } else {
          setSelectedSegments(prevSelected => [...prevSelected, segment.id]);
        }
      } else {
        setSelectedSegment(segment);
        
        if (segment.color) {
          const r = segment.color.r;
          const g = segment.color.g;
          const b = segment.color.b;
          setColor(r, g, b);
        }
        
        if (segment.effect !== undefined) {
          setEffect(segment.effect);
        }
        
        if (segment.effectSpeed !== undefined) {
          setEffectSpeed(segment.effectSpeed);
        }
        
        if (segment.effectIntensity !== undefined) {
          setEffectIntensity(segment.effectIntensity);
        }
        
        if (segment.brightness !== undefined) {
          setSegmentBrightness(segment.brightness);
        }
      }
    } catch (error) {
      console.error("Error handling segment click:", error);
      toast.error("Error selecting segment");
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedSegment(null);
      
      if (isMultiSelectMode) {
        setSelectedSegments([]);
      }
    }
  };

  const handleColorChange = (color: { r: number; g: number; b: number }) => {
    try {
      if (isMultiSelectMode && selectedSegments.length > 0) {
        const updatedSegments = segments.map(seg => {
          if (selectedSegments.includes(seg.id)) {
            if (colorTabActive === 'color1') {
              return { ...seg, color };
            } else if (colorTabActive === 'color2') {
              return { ...seg, color2: color };
            } else if (colorTabActive === 'color3') {
              return { ...seg, color3: color };
            }
            return seg;
          }
          return seg;
        });
        
        setSegments(updatedSegments);
        localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
        
        const event = new CustomEvent('segmentsUpdated', { 
          detail: updatedSegments,
          bubbles: true 
        });
        window.dispatchEvent(event);
        
        setColor(color.r, color.g, color.b);
        
        selectedSegments.forEach(segId => {
          const segmentIndex = segments.findIndex(seg => seg.id === segId);
          if (segmentIndex !== -1) {
            const colorIndex = colorTabActive === 'color1' ? 0 : colorTabActive === 'color2' ? 1 : 2;
            const colArray: [number, number, number][] = [];
            
            if (colorIndex === 0) {
              colArray.push([color.r, color.g, color.b]);
            } else {
              colArray.push([0, 0, 0]);
              if (colorIndex === 1) {
                colArray.push([color.r, color.g, color.b]);
              } else {
                colArray.push([0, 0, 0]);
                colArray.push([color.r, color.g, color.b]);
              }
            }
            
            updateSegment(segmentIndex, { col: colArray });
          }
        });
        
        return;
      }
      
      if (!selectedSegment) return;
      
      let updatedSegment;
      let wledColorUpdate: [number, number, number][] = [];
      
      if (colorTabActive === 'color1') {
        updatedSegment = { ...selectedSegment, color };
        wledColorUpdate = [
          [color.r, color.g, color.b] as [number, number, number],
          selectedSegment.color2 ? [selectedSegment.color2.r, selectedSegment.color2.g, selectedSegment.color2.b] as [number, number, number] : [0, 0, 0] as [number, number, number],
          selectedSegment.color3 ? [selectedSegment.color3.r, selectedSegment.color3.g, selectedSegment.color3.b] as [number, number, number] : [0, 0, 0] as [number, number, number]
        ];
      } else if (colorTabActive === 'color2') {
        updatedSegment = { ...selectedSegment, color2: color };
        wledColorUpdate = [
          [selectedSegment.color.r, selectedSegment.color.g, selectedSegment.color.b] as [number, number, number],
          [color.r, color.g, color.b] as [number, number, number],
          selectedSegment.color3 ? [selectedSegment.color3.r, selectedSegment.color3.g, selectedSegment.color3.b] as [number, number, number] : [0, 0, 0] as [number, number, number]
        ];
      } else if (colorTabActive === 'color3') {
        updatedSegment = { ...selectedSegment, color3: color };
        wledColorUpdate = [
          [selectedSegment.color.r, selectedSegment.color.g, selectedSegment.color.b] as [number, number, number],
          selectedSegment.color2 ? [selectedSegment.color2.r, selectedSegment.color2.g, selectedSegment.color2.b] as [number, number, number] : [0, 0, 0] as [number, number, number],
          [color.r, color.g, color.b] as [number, number, number]
        ];
      } else {
        updatedSegment = { ...selectedSegment, color };
        wledColorUpdate = [
          [color.r, color.g, color.b] as [number, number, number],
          [0, 0, 0] as [number, number, number],
          [0, 0, 0] as [number, number, number]
        ];
      }
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      setColor(color.r, color.g, color.b);
      
      updateSegment(selectedSegment.id, {
        col: wledColorUpdate
      });
    } catch (error) {
      console.error("Error handling color change:", error);
      toast.error("Error updating color");
    }
  };

  const handleEffectChange = (effectId: number) => {
    try {
      if (isMultiSelectMode && selectedSegments.length > 0) {
        const updatedSegments = segments.map(seg => 
          selectedSegments.includes(seg.id) 
            ? { ...seg, effect: effectId } 
            : seg
        );
        
        setSegments(updatedSegments);
        localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
        
        const event = new CustomEvent('segmentsUpdated', { 
          detail: updatedSegments,
          bubbles: true 
        });
        window.dispatchEvent(event);
        
        setEffect(effectId);
        
        selectedSegments.forEach(segId => {
          const segmentIndex = segments.findIndex(seg => seg.id === segId);
          if (segmentIndex !== -1) {
            updateSegment(segmentIndex, { fx: effectId });
          }
        });
        
        return;
      }
      
      if (!selectedSegment) return;
      
      const updatedSegment = { ...selectedSegment, effect: effectId };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      setEffect(effectId);
      
      updateSegment(selectedSegment.id, { fx: effectId });
    } catch (error) {
      console.error("Error handling effect change:", error);
      toast.error("Error updating effect");
    }
  };

  const handlePaletteChange = (paletteId: number) => {
    try {
      if (!selectedSegment) return;
      
      const updatedSegment = { ...selectedSegment, palette: paletteId };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      updateSegment(selectedSegment.id, { pal: paletteId });
    } catch (error) {
      console.error("Error handling palette change:", error);
      toast.error("Error updating palette");
    }
  };

  const handleEffectSpeedChange = (speed: number) => {
    try {
      if (!selectedSegment) return;
      
      const updatedSegment = { ...selectedSegment, effectSpeed: speed };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      setEffectSpeed(speed);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      updateSegment(selectedSegment.id, { sx: speed });
    } catch (error) {
      console.error("Error handling effect speed change:", error);
      toast.error("Error updating effect speed");
    }
  };

  const handleEffectIntensityChange = (intensity: number) => {
    try {
      if (!selectedSegment) return;
      
      const updatedSegment = { ...selectedSegment, effectIntensity: intensity };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      setEffectIntensity(intensity);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      updateSegment(selectedSegment.id, { ix: intensity });
    } catch (error) {
      console.error("Error handling effect intensity change:", error);
      toast.error("Error updating effect intensity");
    }
  };

  const handleTogglePower = (segmentId: number) => {
    try {
      if (!selectedSegment) return;
      
      const newOnState = !(selectedSegment.on ?? true);
      
      const updatedSegment = { ...selectedSegment, on: newOnState };
      
      const updatedSegments = segments.map(seg => 
        seg.id === segmentId 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      updateSegment(selectedSegment.id, { on: newOnState });
      
      toast.success(newOnState ? "Segment turned on" : "Segment turned off");
    } catch (error) {
      console.error("Error toggling power:", error);
      toast.error("Error toggling segment power");
    }
  };

  useEffect(() => {
    if (selectedSegment) {
      setLedStart(selectedSegment.leds.start.toString());
      setLedEnd(selectedSegment.leds.end.toString());
      setRotationValue(Math.round(selectedSegment.rotation).toString());
      setEffectSpeed(selectedSegment.effectSpeed ?? 128);
      setEffectIntensity(selectedSegment.effectIntensity ?? 128);
      setSegmentBrightness(selectedSegment.brightness ?? 255);
    }
  }, [selectedSegment]);

  const handleLEDRangeChange = (values: number[]) => {
    try {
      if (!selectedSegment || values.length !== 2) return;
      
      const leds = { start: values[0], end: values[1] };
      
      const updatedSegment = { ...selectedSegment, leds };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      setLedStart(leds.start.toString());
      setLedEnd(leds.end.toString());
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true 
      });
      window.dispatchEvent(event);
      
      updateSegment(selectedSegment.id, { 
        start: leds.start, 
        stop: leds.end,
        len: leds.end - leds.start + 1
      });
    } catch (error) {
      console.error("Error handling LED range change:", error);
      toast.error("Error updating LED range");
    }
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

  const handleSegmentBrightnessChange = (brightness: number) => {
    try {
      if (!selectedSegment) return;
      
      const updatedSegment = { ...selectedSegment, brightness };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      setSegmentBrightness(brightness);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      window.dispatchEvent(event);
      
      updateSegment(selectedSegment.id, { bri: brightness });
    } catch (error) {
      console.error("Error handling segment brightness change:", error);
      toast.error("Error updating segment brightness");
    }
  };

  const updateSegmentSettings = (field: 'ledStart' | 'ledEnd' | 'rotation', value: string) => {
    try {
      if (!selectedSegment) return;
      
      const maxLed = deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300;
      
      let leds = { ...selectedSegment.leds };
      let rotation = selectedSegment.rotation;
      
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
      }
      
      const updatedSegment = {
        ...selectedSegment,
        leds,
        rotation
      };
      
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? updatedSegment
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment(updatedSegment);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true 
      });
      window.dispatchEvent(event);
      
      if (field === 'ledStart' || field === 'ledEnd') {
        updateSegment(selectedSegment.id, { 
          start: leds.start, 
          stop: leds.end,
          len: leds.end - leds.start + 1
        });
      }
    } catch (error) {
      console.error("Error updating segment settings:", error);
      toast.error("Error updating segment settings");
    }
  };

  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    try {
      e.stopPropagation();
      
      if (isMultiSelectMode && selectedSegments.length > 0) {
        if (selectedSegments.includes(segment.id)) {
          e.dataTransfer.setData("multiSelect", "true");
          e.dataTransfer.setData("segmentId", segment.id.toString());
          setDraggedSegment(segment);
        } else {
          setSelectedSegment(segment);
          e.dataTransfer.setData("segmentId", segment.id.toString());
          e.dataTransfer.setData("segmentRotation", segment.rotation.toString());
          setDraggedSegment(segment);
        }
      } else {
        setSelectedSegment(segment);
        e.dataTransfer.setData("segmentId", segment.id.toString());
        e.dataTransfer.setData("segmentRotation", segment.rotation.toString());
        setDraggedSegment(segment);
      }
      
      const ghostElement = document.createElement('div');
      ghostElement.style.position = 'absolute';
      ghostElement.style.top = '-1000px';
      ghostElement.style.left = '-1000px';
      ghostElement.innerHTML = `<svg width="${TRIANGLE_SIZE}" height="${TRIANGLE_SIZE}" viewBox="0 0 24 24">
        <polygon points="12,2 22,22 2,22" fill="rgb(${segment.color.r},${segment.color.g},${segment.color.b})" stroke="rgba(0,0,0,0.5)" stroke-width="1" transform="rotate(${segment.rotation}, 12, 12)" />
      </svg>`;
      document.body.appendChild(ghostElement);
      
      e.dataTransfer.setDragImage(ghostElement, TRIANGLE_SIZE/2, TRIANGLE_SIZE/2);
      
      setTimeout(() => {
        document.body.removeChild(ghostElement);
      }, 100);
    } catch (error) {
      console.error("Error in drag start:", error);
      toast.error("Error starting drag operation");
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
    try {
      e.preventDefault();
      e.currentTarget.classList.remove('bg-cyan-500/10');
      
      const isMultiDrop = e.dataTransfer.getData("multiSelect") === "true";
      const segmentId = parseInt(e.dataTransfer.getData("segmentId"));
      const rotation = parseFloat(e.dataTransfer.getData("segmentRotation")) || 0;
      
      const container = containerRef.current?.getBoundingClientRect();
      if (!container) return;
      
      const x = Math.round(((e.clientX - container.left) / container.width) * 100);
      const y = Math.round(((e.clientY - container.top) / container.height) * 100);
      
      let updatedSegments = [...segments];
      
      if (isMultiDrop && selectedSegments.length > 0) {
        const draggedIndex = segments.findIndex(seg => seg.id === segmentId);
        if (draggedIndex === -1) return;
        
        const draggedPos = segments[draggedIndex].position;
        const offsetX = x - draggedPos.x;
        const offsetY = y - draggedPos.y;
        
        updatedSegments = segments.map(seg => {
          if (selectedSegments.includes(seg.id)) {
            return {
              ...seg,
              position: {
                x: Math.max(0, Math.min(100, seg.position.x + offsetX)),
                y: Math.max(0, Math.min(100, seg.position.y + offsetY))
              }
            };
          }
          return seg;
        });
      } else {
        const draggedIndex = segments.findIndex(seg => seg.id === segmentId);
        if (draggedIndex === -1) return;
        
        updatedSegments[draggedIndex] = {
          ...segments[draggedIndex],
          position: { x, y }
        };
      }
      
      setSegments(updatedSegments);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true 
      });
      window.dispatchEvent(event);
      document.dispatchEvent(event);
      
      setDraggedSegment(null);
    } catch (error) {
      console.error("Error in drop handler:", error);
      toast.error("Error moving segment");
    }
  };

  const handleMouseDown = (e: React.MouseEvent, segment: Segment) => {
    if (e.button !== 0) return; // Only handle left mouse button
    e.stopPropagation();
    
    if (isRotating) {
      setIsRotating(false);
      return;
    }
    
    setSelectedSegment(segment);
  };

  const handleRotateStart = (e: React.MouseEvent, segment: Segment) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsRotating(true);
    setSelectedSegment(segment);
    setRotationStartAngle(segment.rotation);
    setStartMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleRotateMove = (e: React.MouseEvent) => {
    if (!isRotating || !selectedSegment || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    
    const startAngle = Math.atan2(
      startMousePosition.y - centerY,
      startMousePosition.x - centerX
    );
    
    const currentAngle = Math.atan2(
      e.clientY - centerY,
      e.clientX - centerX
    );
    
    const angleDiff = (currentAngle - startAngle) * (180 / Math.PI);
    let newRotation = (rotationStartAngle + angleDiff) % 360;
    if (newRotation < 0) newRotation += 360;
    
    const updatedSegment = {
      ...selectedSegment,
      rotation: newRotation
    };
    
    const updatedSegments = segments.map(seg => 
      seg.id === selectedSegment.id 
        ? updatedSegment
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment(updatedSegment);
    setRotationValue(Math.round(newRotation).toString());
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent, segment: Segment) => {
    if (!selectedSegment || selectedSegment.id !== segment.id) return;
    
    let updatedPosition = { ...segment.position };
    let updatedRotation = segment.rotation;
    
    const step = e.shiftKey ? 10 : 1;
    
    switch (e.key) {
      case 'ArrowUp':
        updatedPosition.y = Math.max(0, updatedPosition.y - step);
        break;
      case 'ArrowDown':
        updatedPosition.y = Math.min(100, updatedPosition.y + step);
        break;
      case 'ArrowLeft':
        updatedPosition.x = Math.max(0, updatedPosition.x - step);
        break;
      case 'ArrowRight':
        updatedPosition.x = Math.min(100, updatedPosition.x + step);
        break;
      case '[':
        updatedRotation = (updatedRotation - step) % 360;
        if (updatedRotation < 0) updatedRotation += 360;
        break;
      case ']':
        updatedRotation = (updatedRotation + step) % 360;
        break;
      default:
        return;
    }
    
    const updatedSegment = {
      ...segment,
      position: updatedPosition,
      rotation: updatedRotation
    };
    
    const updatedSegments = segments.map(seg => 
      seg.id === segment.id 
        ? updatedSegment
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment(updatedSegment);
    setRotationValue(Math.round(updatedRotation).toString());
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
    document.dispatchEvent(event);
    
    e.preventDefault();
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    if (isMultiSelectMode) {
      setSelectedSegments([]);
    } else if (selectedSegment) {
      setSelectedSegments([selectedSegment.id]);
    }
  };

  const renderTriangle = (segment: Segment) => {
    const isSelected = selectedSegment?.id === segment.id;
    const isMultiSelected = selectedSegments.includes(segment.id);
    
    const strokeColor = isMultiSelected 
      ? "rgba(128, 0, 255, 0.8)" 
      : isSelected 
        ? "rgba(0, 122, 255, 0.8)" 
        : "rgba(255, 255, 255, 0.7)";
    
    const strokeWidth = isSelected || isMultiSelected ? 2 : 1.5;
    
    const breathingAnimation = isSelected || isMultiSelected
      ? "animate-pulse" 
      : "";
    
    return (
      <div
        key={segment.id}
        className={cn(
          "absolute cursor-move transform-gpu",
          breathingAnimation
        )}
        style={{
          left: `${segment.position.x}%`,
          top: `${segment.position.y}%`,
          width: `${TRIANGLE_SIZE}px`,
          height: `${TRIANGLE_SIZE}px`,
          marginLeft: `-${TRIANGLE_SIZE / 2}px`,
          marginTop: `-${TRIANGLE_SIZE / 2}px`,
          transform: `rotate(${segment.rotation}deg)`,
          zIndex: isSelected ? 10 : 1,
          transition: "transform 0.2s, stroke 0.3s"
        }}
        draggable={true}
        onDragStart={(e) => handleDragStart(e, segment)}
        onMouseDown={(e) => handleMouseDown(e, segment)}
        onClick={(e) => handleSegmentClick(segment, e)}
        onKeyDown={(e) => handleKeyDown(e, segment)}
        tabIndex={0}
      >
        <svg width="100%" height="100%" viewBox="0 0 24 24">
          <polygon 
            points="12,2 22,22 2,22" 
            fill={`rgb(${segment.color.r},${segment.color.g},${segment.color.b})`}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className={cn(
              segment.on === false ? "opacity-30" : "opacity-100"
            )}
          />
          
          {isSelected && (
            <>
              <circle 
                cx="12" cy="2" r="0.8" 
                fill="white" 
                className="cursor-pointer" 
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => handleRotateStart(e, segment)} 
              />
              <line 
                x1="12" y1="2" x2="12" y2="4" 
                stroke="white" 
                strokeWidth="0.5" 
              />
            </>
          )}
        </svg>
        
        {isSelected && (
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1">
            <Button
              size="icon"
              variant="outline"
              className="h-6 w-6 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleTogglePower(segment.id);
              }}
            >
              <Power className={segment.on === false ? "text-muted-foreground" : "text-green-500"} size={14} />
            </Button>
            
            <Button
              size="icon"
              variant="outline" 
              className="h-6 w-6 bg-background/80 backdrop-blur-sm"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleRemoveSegment(segment.id, e);
              }}
            >
              <Trash className="text-red-500" size={14} />
            </Button>
          </div>
        )}
        
        {(isSelected || isMultiSelected) && (
          <div className="absolute top-1 left-1/2 transform -translate-x-1/2 text-xs bg-background/80 backdrop-blur-sm px-1 rounded text-white">
            {segment.id}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("relative w-full h-full flex flex-col", className)}>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAddSegment}
            className="flex items-center gap-1"
          >
            <Plus size={16} />
            Add Triangle
          </Button>
          
          <Button
            size="sm"
            variant={isMultiSelectMode ? "default" : "outline"}
            onClick={toggleMultiSelectMode}
            className="flex items-center gap-1"
          >
            <Triangle size={16} />
            {isMultiSelectMode ? "Multi Select: ON" : "Multi Select"}
          </Button>
        </div>
        
        {selectedSegment && editMode === 'segment' && (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground">Start</div>
              <Input
                type="number"
                value={ledStart}
                min={0}
                max={deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300}
                onChange={(e) => handleLEDInputChange('start', e.target.value)}
                className="h-8 w-16"
              />
            </div>
            
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground">End</div>
              <Input
                type="number"
                value={ledEnd}
                min={parseInt(ledStart)}
                max={deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300}
                onChange={(e) => handleLEDInputChange('end', e.target.value)}
                className="h-8 w-16"
              />
            </div>
            
            <div className="flex flex-col">
              <div className="text-xs text-muted-foreground">Rotation</div>
              <Input
                type="number"
                value={rotationValue}
                min={0}
                max={359}
                onChange={(e) => handleRotationInputChange(e.target.value)}
                className="h-8 w-16"
              />
            </div>
          </div>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className={cn(
          "relative flex-1 border border-border rounded-lg overflow-hidden bg-gradient-to-br from-background to-muted/50",
          "cursor-default touch-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleContainerClick}
        onMouseMove={handleRotateMove}
        onMouseUp={handleRotateEnd}
      >
        {segments.map(segment => renderTriangle(segment))}
      </div>
      
      {editMode === 'color' && selectedSegment && (
        <div className="mt-4">
          <Tabs value={colorTabActive} onValueChange={setColorTabActive}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="color1">Color 1</TabsTrigger>
              <TabsTrigger value="color2">Color 2</TabsTrigger>
              <TabsTrigger value="color3">Color 3</TabsTrigger>
            </TabsList>
            
            <TabsContent value="color1" className="mt-2">
              <ColorPicker 
                color={selectedSegment.color} 
                onChange={handleColorChange}
              />
            </TabsContent>
            
            <TabsContent value="color2" className="mt-2">
              <ColorPicker 
                color={selectedSegment.color2 || { r: 0, g: 255, b: 0 }} 
                onChange={handleColorChange}
              />
            </TabsContent>
            
            <TabsContent value="color3" className="mt-2">
              <ColorPicker 
                color={selectedSegment.color3 || { r: 0, g: 0, b: 255 }} 
                onChange={handleColorChange}
              />
            </TabsContent>
          </Tabs>
        </div>
      )}
      
      {editMode === 'effect' && selectedSegment && (
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="brightness">Brightness</Label>
            <BrightnessSlider
              value={segmentBrightness}
              onChange={handleSegmentBrightnessChange}
            />
          </div>
          
          <div>
            <Label htmlFor="speed">Effect Speed</Label>
            <Slider
              id="speed"
              value={[effectSpeed]}
              min={0}
              max={255}
              step={1}
              onValueChange={(value) => handleEffectSpeedChange(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Slow</span>
              <span>{effectSpeed}</span>
              <span>Fast</span>
            </div>
          </div>
          
          <div>
            <Label htmlFor="intensity">Effect Intensity</Label>
            <Slider
              id="intensity"
              value={[effectIntensity]}
              min={0}
              max={255}
              step={1}
              onValueChange={(value) => handleEffectIntensityChange(value[0])}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Low</span>
              <span>{effectIntensity}</span>
              <span>High</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;


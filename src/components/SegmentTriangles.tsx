
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
  // Add properties to match WLED API
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
    
    // Also update the actual WLED segments
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
    
    // Add the segment to the actual WLED device
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
  };

  const handleRemoveSegment = (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    const segmentIndex = segments.findIndex(s => s.id === id);
    if (segmentIndex === -1) return;
    
    const updatedSegments = segments.filter(segment => segment.id !== id);
    
    // Reassign IDs sequentially
    const reindexedSegments = updatedSegments.map((seg, index) => ({
      ...seg,
      id: index
    }));
    
    setSegments(reindexedSegments);
    
    if (selectedSegment?.id === id) {
      setSelectedSegment(null);
    }
    
    setSelectedSegments(prevSelected => prevSelected.filter(segId => segId !== id));
    
    // Update localStorage
    localStorage.setItem('wledSegments', JSON.stringify(reindexedSegments));
    
    // Dispatch event
    const event = new CustomEvent('segmentsUpdated', { 
      detail: reindexedSegments,
      bubbles: true 
    });
    document.dispatchEvent(event);
    window.dispatchEvent(event);
    
    // Update WLED device
    try {
      // For now, just recalculate the LED ranges to make sure everything is in order
      setTimeout(() => {
        recalculateLedRanges();
      }, 50);
    } catch (error) {
      console.error("Error removing segment:", error);
    }
    
    toast.success("Segment removed");
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
        
        // Update color for WLED
        setColor(color.r, color.g, color.b);
        
        // Update each selected segment in WLED
        selectedSegments.forEach(segId => {
          const segmentIndex = segments.findIndex(seg => seg.id === segId);
          if (segmentIndex !== -1) {
            const colorIndex = colorTabActive === 'color1' ? 0 : colorTabActive === 'color2' ? 1 : 2;
            const colArray: [number, number, number][] = [];
            
            // Create the color array with the proper structure
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
      
      // Set selected color
      setColor(color.r, color.g, color.b);
      
      // Update WLED segment
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
        
        // Update effect for the device
        setEffect(effectId);
        
        // Update each selected segment
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
      
      // Update effect for the device
      setEffect(effectId);
      
      // Update WLED segment
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
      
      // Update WLED segment
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
      
      // Update WLED segment
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
      
      // Update WLED segment
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
      
      // Update WLED segment
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
      
      // Update WLED segment
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
      
      // Update WLED segment
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
      
      // Update WLED segment if we're changing LED settings
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
                x: Math.round(Math.min(Math.max(0, seg.position.x + offsetX), 100)),
                y: Math.round(Math.min(Math.max(0, seg.position.y + offsetY), 100))
              }
            };
          }
          return seg;
        });
      } else {
        updatedSegments = segments.map(seg => 
          seg.id === segmentId 
            ? { ...seg, position: { x, y }, rotation } 
            : seg
        );
        
        if (selectedSegment?.id === segmentId) {
          setSelectedSegment({ ...selectedSegment, position: { x, y }, rotation });
        }
      }
      
      setSegments(updatedSegments);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
      
      setDraggedSegment(null);
    } catch (error) {
      console.error("Error handling drop:", error);
      toast.error("Error dropping segment");
    }
  };

  const handleRotateStart = (segment: Segment, e: React.MouseEvent) => {
    try {
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
    } catch (error) {
      console.error("Error starting rotation:", error);
      toast.error("Error starting rotation");
    }
  };

  const handleRotateMove = (e: MouseEvent) => {
    try {
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
      setRotationStartAngle(currentAngle);
      
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true 
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    } catch (error) {
      console.error("Error during rotation:", error);
      handleRotateEnd();
    }
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
    document.removeEventListener('mousemove', handleRotateMove);
    document.removeEventListener('mouseup', handleRotateEnd);
  };

  useEffect(() => {
    if (!selectedSegment && selectedSegments.length === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      e.preventDefault();
      
      const step = e.shiftKey ? 1 : 0.5;
      
      if (isMultiSelectMode && selectedSegments.length > 0) {
        const updatedSegments = segments.map(seg => {
          if (selectedSegments.includes(seg.id)) {
            const { x, y } = seg.position;
            let newX = x;
            let newY = y;
            
            switch (e.key) {
              case 'ArrowLeft': newX = Math.max(0, x - step); break;
              case 'ArrowRight': newX = Math.min(100, x + step); break;
              case 'ArrowUp': newY = Math.max(0, y - step); break;
              case 'ArrowDown': newY = Math.min(100, y + step); break;
            }
            
            return { ...seg, position: { x: newX, y: newY } };
          }
          return seg;
        });
        
        setSegments(updatedSegments);
        localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
        
        const event = new CustomEvent('segmentsUpdated', { 
          detail: updatedSegments,
          bubbles: true 
        });
        document.dispatchEvent(event);
        window.dispatchEvent(event);
        
        return;
      }
      
      if (!selectedSegment) return;
      
      const { x, y } = selectedSegment.position;
      let newX = x;
      let newY = y;
      
      switch (e.key) {
        case 'ArrowLeft': newX = Math.max(0, x - step); break;
        case 'ArrowRight': newX = Math.min(100, x + step); break;
        case 'ArrowUp': newY = Math.max(0, y - step); break;
        case 'ArrowDown': newY = Math.min(100, y + step); break;
      }
      
      if (newX !== x || newY !== y) {
        const updatedSegment = {
          ...selectedSegment,
          position: { x: newX, y: newY }
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
        document.dispatchEvent(event);
        window.dispatchEvent(event);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSegment, segments, selectedSegments, isMultiSelectMode, setSelectedSegment, setSegments]);

  const renderTriangle = (segment: Segment) => {
    try {
      const isSelected = selectedSegment?.id === segment.id;
      const isMultiSelected = isMultiSelectMode && selectedSegments.includes(segment.id);
      
      return (
        <Popover key={segment.id}>
          <PopoverTrigger asChild>
            <div
              data-segment-id={segment.id}
              draggable={showControls}
              onDragStart={showControls ? (e) => handleDragStart(e, segment) : undefined}
              onClick={(e) => handleSegmentClick(segment, e)}
              className={cn(
                "absolute cursor-move transition-all duration-200 hover:z-10",
                isSelected && "z-20",
                isMultiSelected ? "ring-2 ring-purple-400 z-20" : "",
                segment.on === false && "opacity-40"
              )}
              style={{
                left: `${segment.position.x}%`,
                top: `${segment.position.y}%`,
                transform: `translate(-50%, -50%) rotate(${segment.rotation}deg)`,
                transformOrigin: "center center",
                width: `${TRIANGLE_SIZE}px`,
                height: `${TRIANGLE_SIZE}px`
              }}
            >
              <div className="relative w-full h-full">
                <Triangle 
                  size={TRIANGLE_SIZE} 
                  fill={`rgb(${segment.color.r}, ${segment.color.g}, ${segment.color.b})`} 
                  color={isSelected ? "#33C3F0" : "rgba(0, 0, 0, 0.5)"}
                  strokeWidth={isSelected ? 3 : 1}
                  className={cn(
                    "drop-shadow-lg transition-all",
                    isSelected && "animate-pulse",
                    segment.effect === 1 && "animate-pulse",
                    segment.effect === 2 && "animate-fade-in",
                    segment.effect === 3 && "animate-spin",
                    segment.effect === 4 && "animate-bounce",
                    segment.on === false && "opacity-40"
                  )}
                />
                {isSelected && (
                  <div className="absolute inset-0 pointer-events-none">
                    <svg width={TRIANGLE_SIZE} height={TRIANGLE_SIZE} viewBox="0 0 24 24">
                      <polygon 
                        points="12,2 22,22 2,22" 
                        fill="none" 
                        stroke="#33C3F0" 
                        strokeWidth="1.5"
                        strokeDasharray="3,2" 
                        className="animate-pulse" 
                      />
                    </svg>
                  </div>
                )}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-white">
                  {segments.indexOf(segment) + 1}
                </div>
                
                {showControls && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleRemoveSegment(segment.id, e)}
                    className="absolute -top-3 -left-3 h-5 w-5 bg-red-500/20 rounded-full opacity-100 hover:bg-red-500/40 z-30 transition-all"
                  >
                    <Trash size={10} className="text-white" />
                  </Button>
                )}
              </div>
            </div>
          </PopoverTrigger>
          {showControls && (
            <PopoverContent className="w-64 glass border-0 backdrop-blur-lg p-3">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={cn(
                        "h-6 w-6 rounded-full",
                        segment.on === false ? "bg-black/30 text-white/40" : "bg-cyan-500/20 text-white"
                      )}
                      onClick={() => handleTogglePower(segment.id)}
                    >
                      <Power size={14} />
                    </Button>
                    <h4 className="font-medium text-sm">Segment #{segments.indexOf(segment) + 1}</h4>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex flex-col space-y-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-white/10"
                        onClick={() => {
                          const newY = Math.max(0, segment.position.y - 1);
                          const updatedSegment = {
                            ...segment,
                            position: { ...segment.position, y: newY }
                          };
                          
                          const updatedSegments = segments.map(seg => 
                            seg.id === segment.id 
                              ? updatedSegment
                              : seg
                          );
                          
                          setSegments(updatedSegments);
                          
                          if (selectedSegment?.id === segment.id) {
                            setSelectedSegment(updatedSegment);
                          }
                          
                          localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                          
                          const event = new CustomEvent('segmentsUpdated', { 
                            detail: updatedSegments,
                            bubbles: true
                          });
                          document.dispatchEvent(event);
                          window.dispatchEvent(event);
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
                          const updatedSegment = {
                            ...segment,
                            position: { ...segment.position, y: newY }
                          };
                          
                          const updatedSegments = segments.map(seg => 
                            seg.id === segment.id 
                              ? updatedSegment
                              : seg
                          );
                          
                          setSegments(updatedSegments);
                          
                          if (selectedSegment?.id === segment.id) {
                            setSelectedSegment(updatedSegment);
                          }
                          
                          localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                          
                          const event = new CustomEvent('segmentsUpdated', { 
                            detail: updatedSegments,
                            bubbles: true
                          });
                          document.dispatchEvent(event);
                          window.dispatchEvent(event);
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
                          const updatedSegment = {
                            ...segment,
                            position: { ...segment.position, x: newX }
                          };
                          
                          const updatedSegments = segments.map(seg => 
                            seg.id === segment.id 
                              ? updatedSegment
                              : seg
                          );
                          
                          setSegments(updatedSegments);
                          
                          if (selectedSegment?.id === segment.id) {
                            setSelectedSegment(updatedSegment);
                          }
                          
                          localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                          
                          const event = new CustomEvent('segmentsUpdated', { 
                            detail: updatedSegments,
                            bubbles: true
                          });
                          document.dispatchEvent(event);
                          window.dispatchEvent(event);
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
                          const updatedSegment = {
                            ...segment,
                            position: { ...segment.position, x: newX }
                          };
                          
                          const updatedSegments = segments.map(seg => 
                            seg.id === segment.id 
                              ? updatedSegment
                              : seg
                          );
                          
                          setSegments(updatedSegments);
                          
                          if (selectedSegment?.id === segment.id) {
                            setSelectedSegment(updatedSegment);
                          }
                          
                          localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                          
                          const event = new CustomEvent('segmentsUpdated', { 
                            detail: updatedSegments,
                            bubbles: true
                          });
                          document.dispatchEvent(event);
                          window.dispatchEvent(event);
                        }}
                      >
                        <ArrowRight size={14} className="text-cyan-300" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveSegment(segment.id, e);
                      }}
                      className="h-6 w-6 rounded-full hover:bg-white/10"
                    >
                      <Trash size={14} className="text-red-400" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-xs text-white/70">Brightness</h5>
                  <BrightnessSlider
                    value={segment.brightness ?? segmentBrightness}
                    onChange={handleSegmentBrightnessChange}
                    showLabel={false}
                    className="mb-4"
                  />
                </div>
                
                <div className="space-y-2">
                  <h5 className="text-xs text-white/70">Color</h5>
                  <Tabs defaultValue="color1" onValueChange={setColorTabActive}>
                    <TabsList className="w-full glass">
                      <TabsTrigger value="color1" className="flex-1 data-[state=active]:bg-white/10">
                        <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: `rgb(${segment.color.r},${segment.color.g},${segment.color.b})`}}></div>
                        1
                      </TabsTrigger>
                      <TabsTrigger value="color2" className="flex-1 data-[state=active]:bg-white/10">
                        <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: `rgb(${segment.color2?.r || 0},${segment.color2?.g || 255},${segment.color2?.b || 0})`}}></div>
                        2
                      </TabsTrigger>
                      <TabsTrigger value="color3" className="flex-1 data-[state=active]:bg-white/10">
                        <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: `rgb(${segment.color3?.r || 0},${segment.color3?.g || 0},${segment.color3?.b || 255})`}}></div>
                        3
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="color1">
                      <ColorPicker 
                        color={segment.color}
                        onChange={handleColorChange}
                        className="w-full"
                        size={180}
                      />
                    </TabsContent>
                    <TabsContent value="color2">
                      <ColorPicker 
                        color={segment.color2 || {r: 0, g: 255, b: 0}}
                        onChange={handleColorChange}
                        className="w-full"
                        size={180}
                      />
                    </TabsContent>
                    <TabsContent value="color3">
                      <ColorPicker 
                        color={segment.color3 || {r: 0, g: 0, b: 255}}
                        onChange={handleColorChange}
                        className="w-full"
                        size={180}
                      />
                    </TabsContent>
                  </Tabs>
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
                    
                    <div className="pt-2 space-y-3">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label className="text-xs text-white/70">Speed</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <SlidersHorizontal size={14} className="text-cyan-300" />
                          <Slider
                            value={[segment.effectSpeed ?? effectSpeed]}
                            min={0}
                            max={255}
                            step={1}
                            onValueChange={(values) => {
                              if (values.length > 0) {
                                handleEffectSpeedChange(values[0]);
                              }
                            }}
                            className="flex-1"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <Label className="text-xs text-white/70">Intensity</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <SlidersHorizontal size={14} className="text-cyan-300" />
                          <Slider
                            value={[segment.effectIntensity ?? effectIntensity]}
                            min={0}
                            max={255}
                            step={1}
                            onValueChange={(values) => {
                              if (values.length > 0) {
                                handleEffectIntensityChange(values[0]);
                              }
                            }}
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {deviceInfo?.palettes && (
                  <div className="space-y-2">
                    <h5 className="text-xs text-white/70">Palette</h5>
                    <div className="flex items-center space-x-2">
                      <Palette size={14} className="text-cyan-300" />
                      <select
                        value={segment.palette ?? 0}
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
                  </div>
                )}
                
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
                          const updatedSegment = {
                            ...segment,
                            rotation: newRotation
                          };
                          
                          const updatedSegments = segments.map(seg => 
                            seg.id === segment.id 
                              ? updatedSegment
                              : seg
                          );
                          
                          setSegments(updatedSegments);
                          
                          if (selectedSegment?.id === segment.id) {
                            setSelectedSegment(updatedSegment);
                            setRotationValue(Math.round(newRotation).toString());
                          }
                          
                          localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                          
                          const event = new CustomEvent('segmentsUpdated', { 
                            detail: updatedSegments,
                            bubbles: true
                          });
                          document.dispatchEvent(event);
                          window.dispatchEvent(event);
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
      );
    } catch (error) {
      console.error("Error rendering triangle:", error);
      return null;
    }
  };

  const showControls = editMode === 'segment';

  return (
    <div className={cn("glass-card p-4", className)}>
      {showControls && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-md font-medium text-white/80">LED Segments</h3>
            <Button
              variant={isMultiSelectMode ? "default" : "outline"}
              size="sm"
              onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
              className={cn(
                "text-xs",
                isMultiSelectMode && "bg-cyan-500 hover:bg-cyan-600"
              )}
            >
              {isMultiSelectMode ? "Multi-Select: ON" : "Multi-Select: OFF"}
            </Button>
            {isMultiSelectMode && selectedSegments.length > 0 && (
              <span className="text-xs text-white/70">
                {selectedSegments.length} selected
              </span>
            )}
          </div>
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
          <React.Fragment key={segment.id}>
            {renderTriangle(segment)}
          </React.Fragment>
        ))}

        {segments.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-white/40">
            <Triangle size={TRIANGLE_SIZE} className="mb-2 text-cyan-300/30" />
            <p>Click the + button to add segments</p>
            <p className="text-xs mt-2">Drag triangles to position them</p>
          </div>
        )}
      </div>
      
      {segments.length > 0 && showControls && (
        <div className="mt-4 text-xs text-white/50 italic">
          <p>Tip: Click triangles to edit, drag to reposition</p>
          <p className="mt-1">Use arrow keys to move selected triangle precisely</p>
          {isMultiSelectMode && (
            <p className="mt-1 text-purple-300">Multi-select mode: Click multiple triangles, then edit or move them together</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;

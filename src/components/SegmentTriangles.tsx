import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Power, X, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { useIsMobile } from '@/hooks/use-mobile';

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
  const { deviceInfo, deviceState, setSegmentColor, setSegmentEffect, setSegmentBrightness, setSegmentPower, setSegmentLedRange, setSegmentPalette, addSegment, deleteSegment } = useWLED();
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
  
  const LEDS_PER_SEGMENT = 30;
  const MAX_SEGMENTS = 16;
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeColorSlot, setActiveColorSlot] = useState(0);
  const [multiSelectedSegments, setMultiSelectedSegments] = useState<number[]>([]);

  const [touchDragging, setTouchDragging] = useState(false);
  const [touchDraggedSegment, setTouchDraggedSegment] = useState<Segment | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0 });
  const isMobile = useIsMobile();

  const calculateNextLedRange = (): { start: number; end: number } => {
    if (segments.length === 0) {
      return { start: 0, end: LEDS_PER_SEGMENT - 1 };
    }
    
    const sortedSegments = [...segments].sort((a, b) => 
      (a.leds?.end || 0) - (b.leds?.end || 0)
    );
    
    const highestEnd = sortedSegments[sortedSegments.length - 1]?.leds?.end || 0;
    
    const start = highestEnd + 1;
    const end = start + LEDS_PER_SEGMENT - 1;
    
    const maxLed = deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300;
    return { 
      start: Math.min(start, maxLed), 
      end: Math.min(end, maxLed) 
    };
  };

  useEffect(() => {
    if (deviceState?.segments && deviceState.segments.length > 0) {
      const activeWledSegments = deviceState.segments.filter(seg => seg.stop !== 0);
      
      const wledSegments = activeWledSegments.map(seg => {
        return {
          id: seg.id || 0,
          color: { 
            r: seg.col?.[0]?.[0] || 255, 
            g: seg.col?.[0]?.[1] || 0, 
            b: seg.col?.[0]?.[2] || 0 
          },
          color2: seg.col?.[1] ? {
            r: seg.col[1][0] || 0,
            g: seg.col[1][1] || 0,
            b: seg.col[1][2] || 0
          } : undefined,
          color3: seg.col?.[2] ? {
            r: seg.col[2][0] || 0,
            g: seg.col[2][1] || 0,
            b: seg.col[2][2] || 0
          } : undefined,
          effect: seg.fx || 0,
          position: {
            x: Math.random() * 70 + 10,
            y: Math.random() * 70 + 10
          },
          rotation: 0,
          leds: {
            start: seg.start || 0,
            end: (seg.stop || LEDS_PER_SEGMENT) - 1
          },
          brightness: seg.bri || 255,
          on: seg.on !== undefined ? seg.on : true,
          speed: seg.sx || 128,
          intensity: seg.ix || 128,
          palette: seg.pal || 0
        };
      });

      const updatedSegments = wledSegments.map(newSeg => {
        const existingSeg = segments.find(s => s.id === newSeg.id);
        if (existingSeg) {
          return {
            ...newSeg,
            position: existingSeg.position || newSeg.position,
            rotation: existingSeg.rotation || 0
          };
        }
        return newSeg;
      });

      const currentIds = segments.map(s => s.id).sort().join(',');
      const newIds = updatedSegments.map(s => s.id).sort().join(',');
      
      if (currentIds !== newIds || updatedSegments.length !== segments.length) {
        setSegments(updatedSegments);
        
        if (selectedSegment && !updatedSegments.find(s => s.id === selectedSegment.id)) {
          setSelectedSegment(null);
        }
      }
    }
  }, [deviceState?.segments]);

  const handleAddSegment = async () => {
    if (segments.length >= MAX_SEGMENTS) {
      toast.error(`Maximum of ${MAX_SEGMENTS} segments allowed`);
      return;
    }
    
    const ledRange = calculateNextLedRange();
    
    try {
      await addSegment(ledRange.start, ledRange.end);
      toast.success('Added new segment');
    } catch (error) {
      console.error("Error creating new segment:", error);
      toast.error("Failed to create segment");
    }
  };

  const handleRemoveSegment = async (id: number) => {
    try {
      await deleteSegment(id);
      
      if (selectedSegment?.id === id) {
        setSelectedSegment(null);
      }
      
      toast.success(`Removed segment ${id}`);
    } catch (error) {
      console.error("Error deleting segment:", error);
      toast.error("Failed to delete segment");
    }
  };

  const handleSegmentClick = (segment: Segment, e: React.MouseEvent) => {
    if (e.shiftKey) {
      if (multiSelectedSegments.includes(segment.id)) {
        setMultiSelectedSegments(multiSelectedSegments.filter(id => id !== segment.id));
      } else {
        setMultiSelectedSegments([...multiSelectedSegments, segment.id]);
      }
    } else {
      setMultiSelectedSegments([]);
      setSelectedSegment(segment);
    }
  };

  const handleConfigButtonClick = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSegment(segment);
    setIsEditModalOpen(true);
    
    setActiveColorSlot(0);
    
    if (segment) {
      setLedStart((segment.leds?.start || 0).toString());
      setLedEnd((segment.leds?.end || 30).toString());
      setRotationValue(Math.round(segment.rotation || 0).toString());
      setSpeedValue((segment.speed || 128).toString());
      setIntensityValue((segment.intensity || 128).toString());
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedSegment(null);
      setMultiSelectedSegments([]);
    }
  };

  const handleColorChange = (color: { r: number; g: number; b: number }, slot: number = 0) => {
    if (!selectedSegment) return;
    
    setSegments(segments.map(seg => {
      if (seg.id === selectedSegment.id) {
        if (slot === 0) {
          return { ...seg, color };
        } else if (slot === 1) {
          return { ...seg, color2: color };
        } else if (slot === 2) {
          return { ...seg, color3: color };
        }
        return seg;
      }
      return seg;
    }));
    
    if (slot === 0) {
      setSelectedSegment({ ...selectedSegment, color });
      
      try {
        if (deviceState) {
          setSegmentColor(selectedSegment.id, color.r, color.g, color.b, 0);
        }
      } catch (error) {
        console.log('Error handling color change:', error);
      }
    } else if (slot === 1) {
      setSelectedSegment({ ...selectedSegment, color2: color });
      setSegmentColor(selectedSegment.id, color.r, color.g, color.b, 1);
    } else if (slot === 2) {
      setSelectedSegment({ ...selectedSegment, color3: color });
      setSegmentColor(selectedSegment.id, color.r, color.g, color.b, 2);
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
        setSegmentEffect(selectedSegment.id, effectId, selectedSegment.speed || 128, selectedSegment.intensity || 128);
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
    
    try {
      setSegmentPalette(selectedSegment.id, paletteId);
    } catch (error) {
      console.error("Error setting palette:", error);
      toast.error("Failed to set palette");
    }
  };

  const handleLEDRangeChange = (values: number[]) => {
    if (!selectedSegment || values.length !== 2) return;
    
    const start = values[0];
    const end = values[1];
    const leds = { start, end };
    
    setSegments(segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds } 
        : seg
    ));
    
    setSelectedSegment({ ...selectedSegment, leds });
    setLedStart(start.toString());
    setLedEnd(end.toString());
    
    setSegmentLedRange(selectedSegment.id, start, end);
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
    let rotation = selectedSegment.rotation || 0;
    let speed = selectedSegment.speed || 128;
    let intensity = selectedSegment.intensity || 128;
    
    if (field === 'ledStart') {
      const start = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(start)) {
        const validStart = Math.min(Math.max(0, start), maxLed);
        leds.start = validStart;
        
        if (validStart > (leds.end || 0)) {
          leds.end = validStart;
          setLedEnd(validStart.toString());
        }
        
        setSegmentLedRange(selectedSegment.id, validStart, leds.end);
      }
    } else if (field === 'ledEnd') {
      const end = value === '' ? 0 : parseInt(value, 10);
      if (!isNaN(end)) {
        const validEnd = Math.min(Math.max(leds.start || 0, end), maxLed);
        leds.end = validEnd;
        
        setSegmentLedRange(selectedSegment.id, leds.start, validEnd);
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
        
        setSegmentEffect(selectedSegment.id, selectedSegment.effect || 0, speed, selectedSegment.intensity);
      }
    } else if (field === 'intensity') {
      const newIntensity = value === '' ? 128 : parseInt(value, 10);
      if (!isNaN(newIntensity)) {
        intensity = Math.min(Math.max(0, newIntensity), 255);
        
        setSegmentEffect(selectedSegment.id, selectedSegment.effect || 0, selectedSegment.speed, intensity);
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
        setSegmentBrightness(selectedSegment.id, value);
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
    
    setSegmentPower(selectedSegment.id, on);
  };

  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.stopPropagation();
    setSelectedSegment(segment);
    
    if (e.dataTransfer) {
      try {
        e.dataTransfer.setData("segmentId", segment.id.toString());
        e.dataTransfer.setData("segmentRotation", (segment.rotation || 0).toString());
        
        const ghostElement = document.createElement('div');
        ghostElement.style.position = 'absolute';
        ghostElement.style.top = '-1000px';
        ghostElement.style.left = '-1000px';
        ghostElement.innerHTML = `<svg width="80" height="80" viewBox="0 0 24 24">
          <polygon points="12,2 22,22 2,22" fill="rgb(${segment.color?.r || 0},${segment.color?.g || 0},${segment.color?.b || 0})" stroke="rgba(0,0,0,0.5)" stroke-width="1" transform="rotate(${segment.rotation || 0}, 12, 12)" />
        </svg>`;
        document.body.appendChild(ghostElement);
        
        e.dataTransfer.setDragImage(ghostElement, 40, 40);
        
        setTimeout(() => {
          document.body.removeChild(ghostElement);
        }, 100);
      } catch (error) {
        console.error('Error in drag start:', error);
      }
    }
    
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
    
    if (!e.dataTransfer) return;
    
    try {
      const segmentIdStr = e.dataTransfer.getData("segmentId");
      if (!segmentIdStr) return;
      
      const segmentId = parseInt(segmentIdStr);
      const rotationStr = e.dataTransfer.getData("segmentRotation");
      const rotation = rotationStr ? parseFloat(rotationStr) : 0;
      
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
    } catch (error) {
      console.error('Error handling drop:', error);
    }
  };

  const handleTouchStart = (e: React.TouchEvent, segment: Segment) => {
    e.stopPropagation();
    
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
      setTouchDraggedSegment(segment);
      setSelectedSegment(segment);
      
      setTimeout(() => {
        if (touchDraggedSegment === segment) {
          setTouchDragging(true);
        }
      }, 200);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (touchDragging && touchDraggedSegment && containerRef.current) {
      const touch = e.touches[0];
      const container = containerRef.current.getBoundingClientRect();
      
      const x = ((touch.clientX - container.left) / container.width) * 100;
      const y = ((touch.clientY - container.top) / container.height) * 100;
      
      const boundedX = Math.max(0, Math.min(100, x));
      const boundedY = Math.max(0, Math.min(100, y));
      
      setSegments(segments.map(seg => 
        seg.id === touchDraggedSegment.id 
          ? { ...seg, position: { x: boundedX, y: boundedY } } 
          : seg
      ));
      
      if (selectedSegment?.id === touchDraggedSegment.id) {
        setSelectedSegment({
          ...selectedSegment,
          position: { x: boundedX, y: boundedY }
        });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchDragging(false);
    setTouchDraggedSegment(null);
  };

  const handleTouchRotateStart = (segment: Segment, e: React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setSelectedSegment(segment);
    setIsRotating(true);
    
    try {
      const triangleElements = document.querySelectorAll(`[data-segment-id="${segment.id}"]`);
      if (triangleElements.length && e.touches.length > 0) {
        const triangleElement = triangleElements[0] as HTMLElement;
        const rect = triangleElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const touch = e.touches[0];
        const initialAngle = Math.atan2(
          touch.clientY - centerY,
          touch.clientX - centerX
        );
        
        setRotationStartAngle(initialAngle);
        setStartMousePosition({ x: touch.clientX, y: touch.clientY });
      }
    } catch (error) {
      console.error('Error starting touch rotation:', error);
    }
    
    document.addEventListener('touchmove', handleTouchRotateMove, { passive: false });
    document.addEventListener('touchend', handleTouchRotateEnd);
  };

  const handleTouchRotateMove = (e: TouchEvent) => {
    e.preventDefault();
    
    if (!isRotating || !selectedSegment || e.touches.length === 0) return;
    
    try {
      const triangleElements = document.querySelectorAll(`[data-segment-id="${selectedSegment.id}"]`);
      if (!triangleElements.length) return;
      
      const triangleElement = triangleElements[0] as HTMLElement;
      const rect = triangleElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const touch = e.touches[0];
      const currentAngle = Math.atan2(
        touch.clientY - centerY,
        touch.clientX - centerX
      );
      
      const angleDiff = (currentAngle - rotationStartAngle) * (180 / Math.PI);
      
      let newRotation = (selectedSegment.rotation || 0) + angleDiff;
      
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
    } catch (error) {
      console.error('Error during touch rotation:', error);
    }
  };

  const handleTouchRotateEnd = () => {
    setIsRotating(false);
    document.removeEventListener('touchmove', handleTouchRotateMove);
    document.removeEventListener('touchend', handleTouchRotateEnd);
  };

  const handleRotateStart = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSegment(segment);
    setIsRotating(true);
    
    try {
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
    } catch (error) {
      console.error('Error starting rotation:', error);
    }
    
    document.addEventListener('mousemove', handleRotateMove);
    document.addEventListener('mouseup', handleRotateEnd);
  };

  const handleRotateMove = (e: MouseEvent) => {
    e.preventDefault();
    
    if (!isRotating || !selectedSegment) return;
    
    try {
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
      
      let newRotation = (selectedSegment.rotation || 0) + angleDiff;
      
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
    } catch (error) {
      console.error('Error during rotation:', error);
    }
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
      const { x, y } = selectedSegment.position || { x: 50, y: 50 };
      
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

  const renderEditModal = () => {
    if (!isEditModalOpen || !selectedSegment) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2">
        <div className="bg-gray-900 border border-white/10 rounded-lg w-full max-w-md shadow-2xl">
          <div className="p-2 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePowerToggle(!selectedSegment.on)}
                className={`h-6 w-6 rounded-full flex items-center justify-center transition-all ${
                  selectedSegment.on 
                    ? "bg-white/10 text-white hover:bg-white/20" 
                    : "bg-white/5 text-white/40 hover:bg-white/10"
                }`}
              >
                <Power size={12} />
              </button>
              <h3 className="text-white/90 font-medium text-xs">Triangle {segments.findIndex(s => s.id === selectedSegment.id) + 1}</h3>
            </div>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="h-6 w-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
          
          <div className="p-3 overflow-y-auto max-h-[60vh] space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-white/70">Colors</h4>
              <div className="flex gap-1">
                <button 
                  className={`w-6 h-6 rounded-md cursor-pointer ${activeColorSlot === 0 ? 'ring-1 ring-cyan-400' : 'ring-1 ring-white/20'}`}
                  style={{backgroundColor: `rgb(${selectedSegment.color?.r || 0}, ${selectedSegment.color?.g || 0}, ${selectedSegment.color?.b || 0})`}}
                  onClick={() => setActiveColorSlot(0)}
                />
                <button 
                  className={`w-6 h-6 rounded-md cursor-pointer ${activeColorSlot === 1 ? 'ring-1 ring-cyan-400' : 'ring-1 ring-white/20'}`}
                  style={{backgroundColor: selectedSegment.color2 ? 
                    `rgb(${selectedSegment.color2.r || 0}, ${selectedSegment.color2.g || 0}, ${selectedSegment.color2.b || 0})` : 
                    'rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => {
                    if (!selectedSegment.color2) {
                      setSegments(segments.map(seg => 
                        seg.id === selectedSegment.id 
                          ? { ...seg, color2: {r: 0, g: 127, b: 255} } 
                          : seg
                      ));
                      setSelectedSegment({
                        ...selectedSegment,
                        color2: {r: 0, g: 127, b: 255}
                      });
                      
                      setSegmentColor(selectedSegment.id, 0, 127, 255, 1);
                    }
                    setActiveColorSlot(1);
                  }}
                />
                <button 
                  className={`w-6 h-6 rounded-md cursor-pointer ${activeColorSlot === 2 ? 'ring-1 ring-cyan-400' : 'ring-1 ring-white/20'}`}
                  style={{backgroundColor: selectedSegment.color3 ? 
                    `rgb(${selectedSegment.color3.r || 0}, ${selectedSegment.color3.g || 0}, ${selectedSegment.color3.b || 0})` : 
                    'rgba(255, 255, 255, 0.1)'
                  }}
                  onClick={() => {
                    if (!selectedSegment.color3) {
                      setSegments(segments.map(seg => 
                        seg.id === selectedSegment.id 
                          ? { ...seg, color3: {r: 255, g: 0, b: 127} } 
                          : seg
                      ));
                      setSelectedSegment({
                        ...selectedSegment,
                        color3: {r: 255, g: 0, b: 127}
                      });
                      
                      setSegmentColor(selectedSegment.id, 255, 0, 127, 2);
                    }
                    setActiveColorSlot(2);
                  }}
                />
              </div>
              
              <ColorPicker
                color={activeColorSlot === 0 ? (selectedSegment.color || {r: 255, g: 0, b: 0}) : 
                      activeColorSlot === 1 ? (selectedSegment.color2 || {r: 0, g: 255, b: 0}) : 
                      (selectedSegment.color3 || {r: 0, g: 0, b: 255})}
                onChange={(color) => handleColorChange(color, activeColorSlot)}
                className="w-full"
              />
            </div>
          
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-white/70">Brightness</h4>
                <span className="text-xs text-white/70">{selectedSegment.brightness || 255}</span>
              </div>
              <Slider
                value={[selectedSegment.brightness || 255]}
                min={1}
                max={255}
                step={1}
                onValueChange={(values) => {
                  if (values.length > 0) {
                    handleBrightnessChange(values[0]);
                  }
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-white/70">Speed</h4>
                  <span className="text-xs text-white/70">{selectedSegment.speed || 128}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Input
                    type="text"
                    value={speedValue || '0'}
                    onChange={(e) => handleSpeedInputChange(e.target.value)}
                    className="w-10 h-6 text-xs bg-black/20 border-white/10"
                  />
                  <Slider
                    value={[parseInt(speedValue) || 128]}
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
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-white/70">Intensity</h4>
                  <span className="text-xs text-white/70">{selectedSegment.intensity || 128}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Input
                    type="text"
                    value={intensityValue || '0'}
                    onChange={(e) => handleIntensityInputChange(e.target.value)}
                    className="w-10 h-6 text-xs bg-black/20 border-white/10"
                  />
                  <Slider
                    value={[parseInt(intensityValue) || 128]}
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
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-white/70">LED Range</h4>
              <div className="flex items-center space-x-1">
                <Input
                  type="text"
                  value={ledStart}
                  onChange={(e) => handleLEDInputChange('start', e.target.value)}
                  className="w-10 h-6 text-xs bg-black/20 border-white/10"
                />
                <span className="text-xs text-white/50">to</span>
                <Input
                  type="text"
                  value={ledEnd}
                  onChange={(e) => handleLEDInputChange('end', e.target.value)}
                  className="w-10 h-6 text-xs bg-black/20 border-white/10"
                />
              </div>
              <Slider
                value={[
                  parseInt(ledStart) || 0, 
                  parseInt(ledEnd) || 30
                ]}
                min={0}
                max={deviceInfo?.ledCount ? deviceInfo.ledCount - 1 : 300}
                step={1}
                onValueChange={handleLEDRangeChange}
              />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-white/70">Rotation</h4>
              <div className="flex items-center space-x-1">
                <Input
                  type="text"
                  value={rotationValue}
                  onChange={(e) => handleRotationInputChange(e.target.value)}
                  className="w-10 h-6 text-xs bg-black/20 border-white/10"
                />
                <span className="text-xs text-white/50">°</span>
                <Slider
                  value={[selectedSegment.rotation || 0]}
                  min={0}
                  max={359}
                  step={1}
                  onValueChange={(values) => {
                    if (values.length > 0) {
                      const newRotation = values[0];
                      setSegments(segments.map(seg => 
                        seg.id === selectedSegment.id 
                          ? { ...seg, rotation: newRotation } 
                          : seg
                      ));
                      setSelectedSegment({
                        ...selectedSegment,
                        rotation: newRotation
                      });
                      setRotationValue(Math.round(newRotation).toString());
                    }
                  }}
                  className="flex-1"
                />
              </div>
            </div>
          
            {showControls && (
              <div className="pt-2 mt-2 border-t border-white/10">
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleRemoveSegment(selectedSegment.id);
                    setIsEditModalOpen(false);
                  }}
                  className="w-full text-xs h-7"
                >
                  <Trash size={12} className="mr-1" />
                  Delete segment
                </Button>
              </div>
            )}
          </div>
          
          <div className="p-2 border-t border-white/10 flex justify-end">
            <Button
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1 bg-cyan-600 text-white text-xs rounded hover:bg-cyan-500 transition-colors h-7"
            >
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  };

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
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {segments.map((segment) => (
            <div
              key={segment.id}
              data-segment-id={segment.id}
              draggable={showControls && !isMobile}
              onDragStart={showControls && !isMobile ? (e) => handleDragStart(e, segment) : undefined}
              onTouchStart={showControls ? (e) => handleTouchStart(e, segment) : undefined}
              onClick={(e) => {
                e.stopPropagation();
                handleSegmentClick(segment, e);
              }}
              className={cn(
                "absolute transition-all duration-300 hover:scale-110 active:scale-95 hover:z-10 group triangle-wrapper",
                selectedSegment?.id === segment.id ? "z-20" : "z-10",
                !(segment.on ?? true) && "opacity-50",
                touchDragging && touchDraggedSegment?.id === segment.id ? "scale-110" : "",
                isMobile ? "cursor-pointer" : "cursor-move"
              )}
              style={{
                left: `${segment.position?.x || 50}%`,
                top: `${segment.position?.y || 50}%`,
                transform: `translate(-50%, -50%) rotate(${segment.rotation || 0}deg)`,
                transformOrigin: "center center"
              }}
            >
              <div className="relative">
                <Triangle 
                  size={70} 
                  fill={`rgb(${segment.color?.r || 0}, ${segment.color?.g || 0}, ${segment.color?.b || 0})`} 
                  color="rgba(0, 0, 0, 0.5)"
                  strokeWidth={1}
                  className={cn(
                    "drop-shadow-lg transition-all",
                    segment.effect === 1 && "animate-pulse",
                    segment.effect === 2 && "animate-fade-in",
                    segment.effect === 3 && "animate-spin",
                    segment.effect === 4 && "animate-bounce",
                    selectedSegment?.id === segment.id && "triangle-selected",
                    multiSelectedSegments.includes(segment.id) && "triangle-multi-selected"
                  )}
                />
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs font-bold text-white">
                  {segment.id}
                </div>
                
                <div 
                  className="triangle-config-button"
                  onClick={(e) => handleConfigButtonClick(segment, e)}
                >
                  <Settings size={12} className="text-white" />
                </div>
                
                {showControls && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isMobile) {
                        handleTouchRotateStart(segment, e as unknown as React.TouchEvent);
                      } else {
                        handleRotateStart(segment, e);
                      }
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      handleTouchRotateStart(segment, e);
                    }}
                    className="absolute -top-3 -right-3 h-6 w-6 bg-cyan-500/20 rounded-full opacity-0 group-hover:opacity-100 hover:bg-cyan-500/40 z-30 transition-all triangle-rotate-button"
                  >
                    <RotateCw size={12} className="text-white" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {segments.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-white/40">
              <Triangle size={70} className="mb-2 text-cyan-300/30" />
              <p>Click the + button to add segments</p>
              <p className="text-xs mt-2">
                {isMobile 
                  ? "Tap and drag triangles to position them"
                  : "Drag triangles to position them"
                }
              </p>
            </div>
          )}
        </div>
        
        {segments.length > 0 && showControls && (
          <div className="mt-4 text-xs text-white/50 italic">
            <p>
              {isMobile 
                ? "Tip: Tap triangles to select, tap and hold to drag. Tap triangle config button to edit"
                : "Tip: Click triangles to select, drag to reposition. Click the rotate button to change angle."
              }
            </p>
          </div>
        )}
      </div>
      {renderEditModal()}
    </>
  );
};

export default SegmentTriangles;

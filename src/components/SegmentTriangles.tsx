import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Plus, Trash, Triangle, Move, RotateCw, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from "sonner";

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

// Constants for consistent sizing and display
const TRIANGLE_SIZE = 90; // Fixed triangle size
const LEDS_PER_SEGMENT = 30;

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
  
  const [ledStart, setLedStart] = useState<string>('');
  const [ledEnd, setLedEnd] = useState<string>('');
  const [rotationValue, setRotationValue] = useState<string>('');
  
  // Multi-select functionality
  const [selectedSegments, setSelectedSegments] = useState<number[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  
  // Enhanced storage change event listener
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

  // Load segments from localStorage on initial mount
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

  // Save segments to localStorage and broadcast changes when segments change
  useEffect(() => {
    localStorage.setItem('wledSegments', JSON.stringify(segments));
    
    // Broadcast changes to other instances using a custom event
    const event = new CustomEvent('segmentsUpdated', { 
      detail: segments,
      bubbles: true 
    });
    window.dispatchEvent(event);
  }, [segments]);

  // Listen for segmentsUpdated events from other instances
  useEffect(() => {
    const handleSegmentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setSegments(customEvent.detail);
      }
    };

    window.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    return () => window.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
  }, [setSegments]);

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

  const recalculateLedRanges = () => {
    if (segments.length === 0) return;
    
    const sortedSegments = [...segments].sort((a, b) => a.leds.start - b.leds.start);
    
    const updatedSegments = sortedSegments.map((segment, index) => {
      const start = index === 0 ? 0 : sortedSegments[index - 1].leds.end + 1;
      const end = start + (segment.leds.end - segment.leds.start);
      
      return {
        ...segment,
        leds: { start, end }
      };
    });
    
    setSegments(updatedSegments);
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to other instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
  };

  const handleAddSegment = () => {
    if (segments.length >= 12) {
      toast.error("Maximum of 12 triangles reached");
      return;
    }
    
    const ledRange = calculateNextLedRange();
    
    const newSegment: Segment = {
      id: Date.now(),
      color: { r: 255, g: 0, b: 0 },
      effect: 0,
      position: { x: Math.random() * 70 + 10, y: Math.random() * 70 + 10 },
      rotation: 0,
      leds: ledRange
    };
    
    const updatedSegments = [...segments, newSegment];
    setSegments(updatedSegments);
    
    // Update localStorage and broadcast changes
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to all instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true
    });
    window.dispatchEvent(event);
    
    toast.success("New segment added");
  };

  const handleRemoveSegment = (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    // Create a new array without the deleted segment
    const updatedSegments = segments.filter(segment => segment.id !== id);
    
    // Update both local state and localStorage
    setSegments(updatedSegments);
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // If the deleted segment was selected, deselect it
    if (selectedSegment?.id === id) {
      setSelectedSegment(null);
    }
    
    // Update multi-selection if applicable
    setSelectedSegments(prevSelected => prevSelected.filter(segId => segId !== id));
    
    // Broadcast the deletion to all instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
    
    // Recalculate LED ranges after a short delay
    setTimeout(() => {
      recalculateLedRanges();
    }, 50);
    
    toast.success("Segment removed");
  };

  const handleSegmentClick = (segment: Segment, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isMultiSelectMode) {
      // If in multi-select mode, toggle the segment's selection
      if (selectedSegments.includes(segment.id)) {
        setSelectedSegments(prevSelected => prevSelected.filter(id => id !== segment.id));
      } else {
        setSelectedSegments(prevSelected => [...prevSelected, segment.id]);
      }
    } else {
      // Single selection mode
      setSelectedSegment(segment);
      
      // Set color and effect of the selected triangle
      if (segment.color) {
        setColor(segment.color.r, segment.color.g, segment.color.b);
      }
      
      if (segment.effect !== undefined) {
        setEffect(segment.effect);
      }
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedSegment(null);
      
      // Clear multi-selection if in multi-select mode
      if (isMultiSelectMode) {
        setSelectedSegments([]);
      }
    }
  };

  const handleColorChange = (color: { r: number; g: number; b: number }) => {
    // Handle color change for multi-selection
    if (isMultiSelectMode && selectedSegments.length > 0) {
      // Apply to all selected segments
      const updatedSegments = segments.map(seg => 
        selectedSegments.includes(seg.id) 
          ? { ...seg, color } 
          : seg
      );
      
      setSegments(updatedSegments);
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      // Broadcast the change to other instances
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true 
      });
      window.dispatchEvent(event);
      
      // Set color for WLED device
      setColor(color.r, color.g, color.b);
      
      // Apply to individual segments
      selectedSegments.forEach(segId => {
        const segmentIndex = segments.findIndex(seg => seg.id === segId);
        if (segmentIndex !== -1) {
          setSegmentColor(segmentIndex, color.r, color.g, color.b);
        }
      });
      
      return;
    }
    
    // Single segment selection
    if (!selectedSegment) return;
    
    const updatedSegments = segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, color } 
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment({ ...selectedSegment, color });
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to other instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true
    });
    window.dispatchEvent(event);
    
    setColor(color.r, color.g, color.b);
    
    const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
    if (segmentIndex !== -1) {
      setSegmentColor(segmentIndex, color.r, color.g, color.b);
    }
  };

  const handleEffectChange = (effectId: number) => {
    // Handle effect change for multi-selection
    if (isMultiSelectMode && selectedSegments.length > 0) {
      // Apply to all selected segments
      const updatedSegments = segments.map(seg => 
        selectedSegments.includes(seg.id) 
          ? { ...seg, effect: effectId } 
          : seg
      );
      
      setSegments(updatedSegments);
      localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
      
      // Broadcast the change to other instances
      const event = new CustomEvent('segmentsUpdated', { 
        detail: updatedSegments,
        bubbles: true 
      });
      window.dispatchEvent(event);
      
      // Set effect for WLED device
      setEffect(effectId);
      
      // Apply to individual segments
      selectedSegments.forEach(segId => {
        const segmentIndex = segments.findIndex(seg => seg.id === segId);
        if (segmentIndex !== -1) {
          setSegmentEffect(segmentIndex, effectId);
        }
      });
      
      return;
    }
    
    // Single segment selection
    if (!selectedSegment) return;
    
    const updatedSegments = segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, effect: effectId } 
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment({ ...selectedSegment, effect: effectId });
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to other instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
    
    setEffect(effectId);
    
    const segmentIndex = segments.findIndex(seg => seg.id === selectedSegment.id);
    if (segmentIndex !== -1) {
      setSegmentEffect(segmentIndex, effectId);
    }
  };

  useEffect(() => {
    if (selectedSegment) {
      setLedStart(selectedSegment.leds.start.toString());
      setLedEnd(selectedSegment.leds.end.toString());
      setRotationValue(Math.round(selectedSegment.rotation).toString());
    }
  }, [selectedSegment]);

  const handleLEDRangeChange = (values: number[]) => {
    if (!selectedSegment || values.length !== 2) return;
    
    const leds = { start: values[0], end: values[1] };
    
    const updatedSegments = segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds } 
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment({ ...selectedSegment, leds });
    setLedStart(leds.start.toString());
    setLedEnd(leds.end.toString());
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to other instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
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

  const updateSegmentSettings = (field: 'ledStart' | 'ledEnd' | 'rotation', value: string) => {
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
    
    const updatedSegments = segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, leds, rotation } 
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment({
      ...selectedSegment,
      leds,
      rotation
    });
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to other instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
  };

  const handleBrightnessChange = (value: number) => {
    setBrightness(value);
  };

  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.stopPropagation();
    
    if (isMultiSelectMode && selectedSegments.length > 0) {
      // If in multi-select mode and this segment is selected, drag all selected segments
      if (selectedSegments.includes(segment.id)) {
        e.dataTransfer.setData("multiSelect", "true");
        e.dataTransfer.setData("segmentId", segment.id.toString());
        setDraggedSegment(segment);
      } else {
        // If not selected, just drag this segment and select it
        setSelectedSegment(segment);
        e.dataTransfer.setData("segmentId", segment.id.toString());
        e.dataTransfer.setData("segmentRotation", segment.rotation.toString());
        setDraggedSegment(segment);
      }
    } else {
      // Normal single segment drag
      setSelectedSegment(segment);
      e.dataTransfer.setData("segmentId", segment.id.toString());
      e.dataTransfer.setData("segmentRotation", segment.rotation.toString());
      setDraggedSegment(segment);
    }
    
    // Create ghost drag image with consistent size for visual feedback
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
    
    const isMultiDrop = e.dataTransfer.getData("multiSelect") === "true";
    const segmentId = parseInt(e.dataTransfer.getData("segmentId"));
    const rotation = parseFloat(e.dataTransfer.getData("segmentRotation")) || 0;
    
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    
    // Calculate exact percentage position for consistent placement across views
    const x = ((e.clientX - container.left) / container.width) * 100;
    const y = ((e.clientY - container.top) / container.height) * 100;
    
    let updatedSegments = [...segments];
    
    if (isMultiDrop && selectedSegments.length > 0) {
      // Handle multi-selection drop
      // Calculate the offset for all selected triangles
      const draggedIndex = segments.findIndex(seg => seg.id === segmentId);
      if (draggedIndex === -1) return;
      
      const draggedPos = segments[draggedIndex].position;
      const offsetX = x - draggedPos.x;
      const offsetY = y - draggedPos.y;
      
      // Apply the offset to all selected triangles
      updatedSegments = segments.map(seg => {
        if (selectedSegments.includes(seg.id)) {
          return {
            ...seg,
            position: {
              x: Math.min(Math.max(0, seg.position.x + offsetX), 100),
              y: Math.min(Math.max(0, seg.position.y + offsetY), 100)
            }
          };
        }
        return seg;
      });
    } else {
      // Handle single triangle drop
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
    
    // Broadcast the change to all instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true
    });
    window.dispatchEvent(event);
    
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
    
    const updatedSegments = segments.map(seg => 
      seg.id === selectedSegment.id 
        ? { ...seg, rotation: newRotation } 
        : seg
    );
    
    setSegments(updatedSegments);
    setSelectedSegment({
      ...selectedSegment,
      rotation: newRotation
    });
    
    setRotationValue(Math.round(newRotation).toString());
    setRotationStartAngle(currentAngle);
    
    localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
    
    // Broadcast the change to other instances
    const event = new CustomEvent('segmentsUpdated', { 
      detail: updatedSegments,
      bubbles: true 
    });
    window.dispatchEvent(event);
  };

  const handleRotateEnd = () => {
    setIsRotating(false);
    document.removeEventListener('mousemove', handleRotateMove);
    document.removeEventListener('mouseup', handleRotateEnd);
  };

  // Handle keyboard navigation for selected triangles
  useEffect(() => {
    if (!selectedSegment && selectedSegments.length === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
      
      e.preventDefault();
      
      const step = e.shiftKey ? 1 : 0.5;
      
      if (isMultiSelectMode && selectedSegments.length > 0) {
        // Move all selected triangles
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
        
        // Broadcast the change to other instances
        const event = new CustomEvent('segmentsUpdated', { 
          detail: updatedSegments,
          bubbles: true 
        });
        window.dispatchEvent(event);
        
        return;
      }
      
      // Move single selected triangle
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
        const updatedSegments = segments.map(seg => 
          seg.id === selectedSegment.id 
            ? { ...seg, position: { x: newX, y: newY } } 
            : seg
        );
        
        setSegments(updatedSegments);
        setSelectedSegment({
          ...selectedSegment,
          position: { x: newX, y: newY }
        });
        
        localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
        
        // Broadcast the change to other instances
        const event = new CustomEvent('segmentsUpdated', { 
          detail: updatedSegments,
          bubbles: true 
        });
        window.dispatchEvent(event);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSegment, segments, selectedSegments, isMultiSelectMode, setSelectedSegment, setSegments]);

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
                  isMultiSelectMode && selectedSegments.includes(segment.id) ? "ring-2 ring-purple-400 z-20" : ""
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
                    size={TRIANGLE_SIZE} 
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
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-white">
                    {segments.indexOf(segment) + 1}
                  </div>
                  
                  {showControls && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleRemoveSegment(segment.id, e)}
                      className="absolute -bottom-3 -right-3 h-6 w-6 bg-red-500/20 rounded-full opacity-100 hover:bg-red-500/40 z-30 transition-all"
                    >
                      <Trash size={12} className="text-white" />
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
                            const updatedSegments = segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, y: newY } } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, y: newY }
                              });
                            }
                            localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                            
                            // Broadcast the change to other instances
                            const event = new CustomEvent('segmentsUpdated', { 
                              detail: updatedSegments,
                              bubbles: true
                            });
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
                            const updatedSegments = segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, y: newY } } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, y: newY }
                              });
                            }
                            localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                            
                            // Broadcast the change to other instances
                            const event = new CustomEvent('segmentsUpdated', { 
                              detail: updatedSegments,
                              bubbles: true
                            });
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
                            const updatedSegments = segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, x: newX } } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, x: newX }
                              });
                            }
                            localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                            
                            // Broadcast the change to other instances
                            const event = new CustomEvent('segmentsUpdated', { 
                              detail: updatedSegments,
                              bubbles: true
                            });
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
                            const updatedSegments = segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, position: { ...seg.position, x: newX } } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                position: { ...selectedSegment.position, x: newX }
                              });
                            }
                            localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                            
                            // Broadcast the change to other instances
                            const event = new CustomEvent('segmentsUpdated', { 
                              detail: updatedSegments,
                              bubbles: true
                            });
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
                            const updatedSegments = segments.map(seg => 
                              seg.id === segment.id 
                                ? { ...seg, rotation: newRotation } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            if (selectedSegment?.id === segment.id) {
                              setSelectedSegment({
                                ...selectedSegment,
                                rotation: newRotation
                              });
                              setRotationValue(Math.round(newRotation).toString());
                            }
                            localStorage.setItem('wledSegments', JSON.stringify(updatedSegments));
                            
                            // Broadcast the change to other instances
                            const event = new CustomEvent('segmentsUpdated', { 
                              detail: updatedSegments,
                              bubbles: true
                            });
                            window.dispatchEvent(event);
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
            <Triangle size={TRIANGLE_SIZE} className="mb-2 text-cyan-300/30" />
            <p>Click the + button to add segments</p>
            <p className="text-xs mt-2">Drag triangles to position them</p>
          </div>
        )}
      </div>
      
      {segments.length > 0 && showControls && (
        <div className="mt-4 text-xs text-white/50 italic">
          <p>Tip: Click triangles to edit, drag to reposition, use the <RotateCw size={10} className="inline" /> button to rotate</p>
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

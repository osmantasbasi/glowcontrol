
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
  connectionPoint?: 'top' | 'left' | 'right'; // Which edge of the triangle connects
  connectedToPoint?: 'top' | 'left' | 'right'; // Which edge of the target triangle
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

  // Calculate the three points of a triangle based on its position and rotation
  const calculateTrianglePoints = (segment: Segment, containerWidth: number, containerHeight: number): {
    top: { x: number, y: number },
    left: { x: number, y: number },
    right: { x: number, y: number },
    edges: {
      topEdge: { start: { x: number, y: number }, end: { x: number, y: number } },
      leftEdge: { start: { x: number, y: number }, end: { x: number, y: number } },
      rightEdge: { start: { x: number, y: number }, end: { x: number, y: number } }
    }
  } => {
    const centerX = (segment.position.x / 100) * containerWidth;
    const centerY = (segment.position.y / 100) * containerHeight;
    
    // Size of the triangle (approx)
    const size = 25; // Adjust based on your Triangle component size
    
    // Calculate points before rotation
    const topPoint = { x: centerX, y: centerY - size };
    const leftPoint = { x: centerX - size, y: centerY + size };
    const rightPoint = { x: centerX + size, y: centerY + size };
    
    // Apply rotation to each point
    const radians = (segment.rotation * Math.PI) / 180;
    const rotatePoint = (point: {x: number, y: number}) => {
      const dx = point.x - centerX;
      const dy = point.y - centerY;
      const rotatedX = dx * Math.cos(radians) - dy * Math.sin(radians) + centerX;
      const rotatedY = dx * Math.sin(radians) + dy * Math.cos(radians) + centerY;
      return { x: rotatedX, y: rotatedY };
    };
    
    const rotatedTop = rotatePoint(topPoint);
    const rotatedLeft = rotatePoint(leftPoint);
    const rotatedRight = rotatePoint(rightPoint);
    
    // Calculate edges (lines between points)
    const edges = {
      topEdge: { start: rotatedTop, end: rotatedRight },
      leftEdge: { start: rotatedTop, end: rotatedLeft }, 
      rightEdge: { start: rotatedLeft, end: rotatedRight }
    };
    
    return {
      top: rotatedTop,
      left: rotatedLeft,
      right: rotatedRight,
      edges: edges
    };
  };

  // Calculate the distance between a point and a line segment
  const pointToLineDistance = (
    point: { x: number, y: number },
    lineStart: { x: number, y: number },
    lineEnd: { x: number, y: number }
  ): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) // to avoid division by 0
      param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate midpoint of a line segment
  const getMidpoint = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    return {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2
    };
  };

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
        const { connectedTo, connectionPoint, connectedToPoint, ...restSegment } = seg;
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

  // Check if two triangles can connect along their edges
  const checkEdgeConnections = (currentSegment: Segment) => {
    if (!containerRef.current) return null;
    
    const container = containerRef.current.getBoundingClientRect();
    const currentTriangle = calculateTrianglePoints(currentSegment, container.width, container.height);
    
    let bestConnection = {
      targetSegment: null as Segment | null,
      sourceEdge: null as 'topEdge' | 'leftEdge' | 'rightEdge' | null,
      targetEdge: null as 'topEdge' | 'leftEdge' | 'rightEdge' | null,
      sourceSide: null as 'top' | 'left' | 'right' | null,
      targetSide: null as 'top' | 'left' | 'right' | null,
      distance: MAGNETIC_THRESHOLD
    };
    
    // Map edges to their corresponding triangle sides
    const edgeToSide = {
      topEdge: 'top' as const,
      leftEdge: 'left' as const,
      rightEdge: 'right' as const
    };
    
    segments.forEach(targetSegment => {
      if (targetSegment.id === currentSegment.id) return;
      
      const targetTriangle = calculateTrianglePoints(targetSegment, container.width, container.height);
      
      // Check all possible edge combinations
      const currentEdges = Object.entries(currentTriangle.edges) as [
        'topEdge' | 'leftEdge' | 'rightEdge', 
        { start: { x: number, y: number }, end: { x: number, y: number } }
      ][];
      
      const targetEdges = Object.entries(targetTriangle.edges) as [
        'topEdge' | 'leftEdge' | 'rightEdge', 
        { start: { x: number, y: number }, end: { x: number, y: number } }
      ][];
      
      currentEdges.forEach(([currentEdgeName, currentEdge]) => {
        targetEdges.forEach(([targetEdgeName, targetEdge]) => {
          // Calculate distance between edge midpoints
          const currentMidpoint = getMidpoint(currentEdge.start, currentEdge.end);
          const targetMidpoint = getMidpoint(targetEdge.start, targetEdge.end);
          
          const distance = Math.sqrt(
            Math.pow(currentMidpoint.x - targetMidpoint.x, 2) + 
            Math.pow(currentMidpoint.y - targetMidpoint.y, 2)
          );
          
          if (distance < bestConnection.distance) {
            bestConnection = {
              targetSegment,
              sourceEdge: currentEdgeName,
              targetEdge: targetEdgeName,
              sourceSide: edgeToSide[currentEdgeName],
              targetSide: edgeToSide[targetEdgeName],
              distance
            };
          }
        });
      });
    });
    
    return bestConnection.targetSegment ? {
      segment: bestConnection.targetSegment,
      sourceEdge: bestConnection.sourceEdge!,
      targetEdge: bestConnection.targetEdge!,
      sourceSide: bestConnection.sourceSide!,
      targetSide: bestConnection.targetSide!
    } : null;
  };

  const connectSegments = (
    sourceId: number, 
    targetId: number, 
    sourceSide: 'top' | 'left' | 'right',
    targetSide: 'top' | 'left' | 'right'
  ) => {
    setSegments(segments.map(seg => {
      if (seg.id === sourceId) {
        return { 
          ...seg, 
          connectedTo: targetId,
          connectionPoint: sourceSide,
          connectedToPoint: targetSide
        };
      }
      return seg;
    }));
  };

  const renderConnectionLines = () => {
    if (!containerRef.current) return null;
    
    const container = containerRef.current.getBoundingClientRect();
    const lines = [];
    
    segments.forEach(segment => {
      if (segment.connectedTo) {
        const targetSegment = segments.find(s => s.id === segment.connectedTo);
        if (!targetSegment) return;
        
        const sourceTriangle = calculateTrianglePoints(segment, container.width, container.height);
        const targetTriangle = calculateTrianglePoints(targetSegment, container.width, container.height);
        
        const sourceSide = segment.connectionPoint || 'top';
        const targetSide = segment.connectedToPoint || 'top';
        
        // Map sides to edges
        const sideToEdge = {
          top: 'topEdge',
          left: 'leftEdge',
          right: 'rightEdge'
        };
        
        const sourceEdge = sourceTriangle.edges[sideToEdge[sourceSide] as keyof typeof sourceTriangle.edges];
        const targetEdge = targetTriangle.edges[sideToEdge[targetSide] as keyof typeof targetTriangle.edges];
        
        // Draw a line between the midpoints of the edges
        const sourceMidpoint = getMidpoint(sourceEdge.start, sourceEdge.end);
        const targetMidpoint = getMidpoint(targetEdge.start, targetEdge.end);
        
        // Convert absolute coordinates to percentages
        const startX = (sourceMidpoint.x / container.width) * 100;
        const startY = (sourceMidpoint.y / container.height) * 100;
        const endX = (targetMidpoint.x / container.width) * 100;
        const endY = (targetMidpoint.y / container.height) * 100;
        
        // Draw the connection line
        lines.push(
          <svg 
            key={`connection-${segment.id}-${targetSegment.id}`}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 5 }}
          >
            <line
              x1={`${startX}%`}
              y1={`${startY}%`}
              x2={`${endX}%`}
              y2={`${endY}%`}
              stroke="cyan"
              strokeWidth="2"
              strokeDasharray="4 2"
              strokeOpacity="0.8"
            />
          </svg>
        );
        
        // Draw joining edges - for more visual indication of connection
        const sourcePoint1 = sourceEdge.start;
        const sourcePoint2 = sourceEdge.end;
        const targetPoint1 = targetEdge.start;
        const targetPoint2 = targetEdge.end;
        
        // Convert to percentages
        const sp1x = (sourcePoint1.x / container.width) * 100;
        const sp1y = (sourcePoint1.y / container.height) * 100;
        const sp2x = (sourcePoint2.x / container.width) * 100;
        const sp2y = (sourcePoint2.y / container.height) * 100;
        const tp1x = (targetPoint1.x / container.width) * 100;
        const tp1y = (targetPoint1.y / container.height) * 100;
        const tp2x = (targetPoint2.x / container.width) * 100;
        const tp2y = (targetPoint2.y / container.height) * 100;
        
        // Add joining polygon to visualize the connection as a solid shape
        lines.push(
          <svg 
            key={`connection-shape-${segment.id}-${targetSegment.id}`}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ zIndex: 4 }}
          >
            <polygon
              points={`${sp1x}%,${sp1y}% ${sp2x}%,${sp2y}% ${tp2x}%,${tp2y}% ${tp1x}%,${tp1y}%`}
              fill="rgba(0, 255, 255, 0.1)"
              stroke="cyan"
              strokeWidth="1"
              strokeOpacity="0.5"
            />
          </svg>
        );
      }
    });
    
    return lines;
  };

  const handleDragStart = (e: React.DragEvent, segment: Segment) => {
    e.dataTransfer.setData("segmentId", segment.id.toString());
    setDraggedSegment(segment);
    
    // If this segment is connected to another, break the connection
    if (segment.connectedTo) {
      setSegments(segments.map(seg => {
        if (seg.id === segment.id) {
          const { connectedTo, connectionPoint, connectedToPoint, ...rest } = seg;
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
    
    // Check for edge connections
    const droppedSegment = updatedSegments.find(seg => seg.id === segmentId);
    if (droppedSegment) {
      const connection = checkEdgeConnections(droppedSegment);
      
      if (connection) {
        // Connect them by their edges
        connectSegments(
          droppedSegment.id, 
          connection.segment.id,
          connection.sourceSide,
          connection.targetSide
        );
      }
    }
    
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
      >
        {renderConnectionLines()}
        
        {segments.map((segment) => {
          let position = { ...segment.position };
          let connectedSegment: Segment | undefined;
          
          if (segment.connectedTo) {
            connectedSegment = segments.find(seg => seg.id === segment.connectedTo);
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
                    segment.connectedTo ? "ring-1 ring-cyan-300" : "",
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
                        onMouseDown={(e) => handleRotateStart(segment, e)}
                        className="absolute -top-3 -right-3 h-6 w-6 bg-cyan-500/20 rounded-full opacity-0 group-hover:opacity-100 hover:bg-cyan-500/40 z-30 transition-all"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering parent onClick
                        }}
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
                            {segment.connectionPoint && segment.connectedToPoint && (
                              <span className="ml-1 text-cyan-300">
                                ({segment.connectionPoint} → {segment.connectedToPoint})
                              </span>
                            )}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              setSegments(segments.map(seg => {
                                if (seg.id === segment.id) {
                                  const { connectedTo, connectionPoint, connectedToPoint, ...rest } = seg;
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
          <p>Tip: Click triangles to edit, drag to reposition, use the <RotateCw size={10} className="inline" /> button to rotate</p>
          <p className="mt-1">Drag triangles near each other to connect their edges, disconnect from popover menu</p>
        </div>
      )}
    </div>
  );
};

export default SegmentTriangles;

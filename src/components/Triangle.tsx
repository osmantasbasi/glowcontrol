
import React from 'react';
import { Segment } from '@/types/segments';
import { cn } from '@/lib/utils';
import { TRIANGLE_SIZE } from '@/utils/segmentUtils';
import { Trash, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TriangleProps {
  segment: Segment;
  isSelected: boolean;
  isMultiSelected: boolean;
  onDragStart: (e: React.DragEvent, segment: Segment) => void;
  onMouseDown: (e: React.MouseEvent, segment: Segment) => void;
  onClick: (e: React.MouseEvent, segment: Segment) => void;
  onKeyDown: (e: React.KeyboardEvent, segment: Segment) => void;
  onRotateStart: (e: React.MouseEvent, segment: Segment) => void;
  onTogglePower: (segmentId: number) => void;
  onRemove: (segmentId: number, e?: React.MouseEvent) => void;
}

const Triangle: React.FC<TriangleProps> = ({
  segment,
  isSelected,
  isMultiSelected,
  onDragStart,
  onMouseDown,
  onClick,
  onKeyDown,
  onRotateStart,
  onTogglePower,
  onRemove
}) => {
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
      onDragStart={(e) => onDragStart(e, segment)}
      onMouseDown={(e) => onMouseDown(e, segment)}
      onClick={(e) => onClick(e, segment)}
      onKeyDown={(e) => onKeyDown(e, segment)}
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
              onMouseDown={(e) => onRotateStart(e, segment)} 
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
              onTogglePower(segment.id);
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
              onRemove(segment.id, e);
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

export default Triangle;

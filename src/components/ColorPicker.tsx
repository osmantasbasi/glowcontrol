
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  color: { r: number; g: number; b: number };
  onChange: (color: { r: number; g: number; b: number }) => void;
  className?: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, className }) => {
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Convert RGB to HSV
  const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const v = max;
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    
    let h = 0;
    
    if (max === min) {
      h = 0;
    } else {
      if (max === r) {
        h = (g - b) / d + (g < b ? 6 : 0);
      } else if (max === g) {
        h = (b - r) / d + 2;
      } else if (max === b) {
        h = (r - g) / d + 4;
      }
      h /= 6;
    }
    
    return { h: h * 360, s, v };
  };
  
  // Calculate the current HSV based on RGB color
  const { h, s, v } = rgbToHsv(color.r, color.g, color.b);
  
  // Draw the color wheel
  const drawColorWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) - 5;
    
    // Clear the canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw color wheel
    for (let angle = 0; angle < 360; angle++) {
      const radians = (angle * Math.PI) / 180;
      
      // Create gradient from center to edge
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );
      
      // Convert HSV to RGB for this angle (hue)
      const rgbForHue = hsvToRgb(angle, 1, 1);
      
      gradient.addColorStop(0, 'white');
      gradient.addColorStop(1, `rgb(${rgbForHue.r}, ${rgbForHue.g}, ${rgbForHue.b})`);
      
      // Draw a slice of the wheel
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(
        centerX,
        centerY,
        radius,
        radians,
        radians + Math.PI / 180,
        false
      );
      ctx.closePath();
      
      ctx.fillStyle = gradient;
      ctx.fill();
    }
    
    // Draw current color selection
    const hueRadians = (h * Math.PI) / 180;
    const distance = s * radius;
    const x = centerX + Math.cos(hueRadians) * distance;
    const y = centerY - Math.sin(hueRadians) * distance;
    
    // Outer circle (white or black depending on background)
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI, false);
    ctx.fillStyle = v > 0.5 ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
    ctx.fill();
    
    // Inner circle (current color)
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI, false);
    ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
    ctx.fill();
    
    // Border
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, 2 * Math.PI, false);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [color.r, color.g, color.b, h, s, v]);
  
  // Convert HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i) {
      case 0:
        r = v; g = t; b = p;
        break;
      case 1:
        r = q; g = v; b = p;
        break;
      case 2:
        r = p; g = v; b = t;
        break;
      case 3:
        r = p; g = q; b = v;
        break;
      case 4:
        r = t; g = p; b = v;
        break;
      case 5:
        r = v; g = p; b = q;
        break;
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };
  
  // Update picker position based on mouse/touch position
  const updateColorFromPosition = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;
    
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const dx = x - centerX;
    const dy = centerY - y;
    
    // Calculate hue and saturation from position
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    const centerToPointDistance = Math.sqrt(dx * dx + dy * dy);
    const radius = Math.min(centerX, centerY) - 5;
    let saturation = Math.min(1, centerToPointDistance / radius);
    
    // Convert HSV to RGB
    const newColor = hsvToRgb(angle, saturation, v);
    onChange(newColor);
  };
  
  // Handle mouse/touch events
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateColorFromPosition(e.clientX, e.clientY);
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      updateColorFromPosition(e.clientX, e.clientY);
    }
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    updateColorFromPosition(touch.clientX, touch.clientY);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      updateColorFromPosition(touch.clientX, touch.clientY);
    }
  };
  
  const handleTouchEnd = () => {
    setIsDragging(false);
  };
  
  // Set up canvas size on mount and resize
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      
      if (!canvas || !container) return;
      
      const size = Math.min(container.clientWidth, 300);
      canvas.width = size;
      canvas.height = size;
      
      drawColorWheel();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [drawColorWheel]);
  
  // Draw color wheel when color changes
  useEffect(() => {
    drawColorWheel();
  }, [color, drawColorWheel]);
  
  // Clean up event listeners
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
    
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, [isDragging]);
  
  return (
    <div 
      ref={containerRef}
      className={cn("relative select-none touch-none", className)}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <canvas 
        ref={canvasRef} 
        className="rounded-full shadow-lg cursor-pointer"
      />
      <div 
        className="w-20 h-20 absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-5 rounded-md glass animate-pulse-glow"
        style={{
          backgroundColor: `rgb(${color.r}, ${color.g}, ${color.b})`,
          boxShadow: `0 0 20px rgba(${color.r}, ${color.g}, ${color.b}, 0.5)`
        }}
      />
    </div>
  );
};

export default ColorPicker;


import React, { useEffect, useRef } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';

interface StripPreviewProps {
  className?: string;
}

const StripPreview: React.FC<StripPreviewProps> = ({ className }) => {
  const { deviceState, deviceInfo } = useWLED();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const getLedCount = () => {
    return deviceInfo?.ledCount || 30; // Default to 30 LEDs if no info available
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ledCount = getLedCount();
    const ledSize = Math.min(20, Math.floor(canvas.width / ledCount));
    const ledSpacing = 2;
    const totalWidth = ledCount * (ledSize + ledSpacing) - ledSpacing;
    const startX = (canvas.width - totalWidth) / 2;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Check if we have segments
    const segments = deviceState?.seg || [];
    const hasSegments = segments.length > 0;

    if (!deviceState?.on && !hasSegments) {
      // Device is off - draw gray LEDs
      for (let i = 0; i < ledCount; i++) {
        const x = startX + i * (ledSize + ledSpacing);
        
        // LED body (rounded rectangle)
        ctx.beginPath();
        ctx.roundRect(x, 10, ledSize, ledSize, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      }
      
      return;
    }

    // Get default color from device state
    const defaultColor = deviceState?.color || { r: 255, g: 255, b: 255 };
    
    // Create LED animation based on current effect and segments
    for (let i = 0; i < ledCount; i++) {
      const x = startX + i * (ledSize + ledSpacing);
      
      // Find the segment this LED belongs to
      let segmentOn = true;
      let ledColor = { r: defaultColor.r, g: defaultColor.g, b: defaultColor.b };
      let segmentEffect = deviceState?.effect || 0;
      
      if (hasSegments) {
        // Find which segment this LED belongs to (if any)
        const matchingSegment = segments.find(seg => {
          const start = seg.start || 0;
          const stop = seg.stop || ledCount;
          return i >= start && i < stop;
        });
        
        if (matchingSegment) {
          segmentOn = matchingSegment.on !== false;
          
          // Get the color from the segment
          if (matchingSegment.col && matchingSegment.col.length > 0) {
            const segColor = matchingSegment.col[0];
            if (segColor && segColor.length >= 3) {
              ledColor = { r: segColor[0], g: segColor[1], b: segColor[2] };
            }
          }
          
          // Get the effect from the segment
          if (typeof matchingSegment.fx === 'number') {
            segmentEffect = matchingSegment.fx;
          }
        }
      }
      
      // If segment is off, draw gray LED
      if (!segmentOn) {
        ctx.beginPath();
        ctx.roundRect(x, 10, ledSize, ledSize, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        continue;
      }
      
      // Modify colors based on current effect and position
      let { r: ledR, g: ledG, b: ledB } = ledColor;
      let brightness = 1;
      
      // Very simple effect simulation
      if (segmentEffect > 0) {
        // This is a very simplified effect simulation - in reality, each effect would have its own algorithm
        const time = Date.now() / 1000;
        const position = i / ledCount;
        
        switch (segmentEffect % 8) {
          case 1: // "Blink" effect
            brightness = Math.sin(time * 2) > 0 ? 1 : 0.1;
            break;
          case 2: // "Breath" effect  
            brightness = (Math.sin(time * 2) + 1) / 2;
            break;
          case 3: // "Color Wipe" effect
            brightness = position < (time % 3) / 3 ? 1 : 0.1;
            break;
          case 4: // "Rainbow" effect
            const hue = (position * 360 + time * 50) % 360;
            const { r: rr, g: gg, b: bb } = hsvToRgb(hue, 1, 1);
            ledR = rr; ledG = gg; ledB = bb;
            break;
          case 5: // "Theater Chase" effect
            brightness = (i + Math.floor(time * 5)) % 3 === 0 ? 1 : 0.1;
            break;
          case 6: // "Running Lights" effect
            brightness = (Math.sin(position * Math.PI * 2 + time * 5) + 1) / 2;
            break;
          case 7: // "Color Fade" effect
            const hueShift = (time * 30) % 360;
            const { r: rr2, g: gg2, b: bb2 } = hsvToRgb(hueShift, 1, 1);
            ledR = rr2; ledG = gg2; ledB = bb2;
            break;
        }
      }
      
      // Apply brightness from device state and effect
      const adjustedBrightness = (deviceState?.brightness || 255) / 255 * brightness;
      ledR = Math.round(ledR * adjustedBrightness);
      ledG = Math.round(ledG * adjustedBrightness);
      ledB = Math.round(ledB * adjustedBrightness);
      
      // LED body (rounded rectangle)
      ctx.beginPath();
      ctx.roundRect(x, 10, ledSize, ledSize, 4);
      ctx.fillStyle = `rgb(${ledR}, ${ledG}, ${ledB})`;
      ctx.fill();
      
      // LED glow
      if (adjustedBrightness > 0.3) {
        ctx.beginPath();
        ctx.roundRect(x, 10, ledSize, ledSize, 4);
        ctx.shadowColor = `rgba(${ledR}, ${ledG}, ${ledB}, ${adjustedBrightness})`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
  }, [deviceState, deviceInfo]);

  // Helper function to convert HSV to RGB
  const hsvToRgb = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    
    const i = Math.floor(h / 60) % 6;
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    
    switch (i) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
    }
    
    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255),
    };
  };

  return (
    <div className={cn("glass-card p-4 flex flex-col", className)}>
      <h3 className="text-sm font-medium text-white/70 mb-2">LED Preview</h3>
      <div className="relative flex-1 flex items-center justify-center">
        <canvas 
          ref={canvasRef}
          width={800}
          height={40}
          className="w-full"
        />
      </div>
    </div>
  );
};

export default StripPreview;

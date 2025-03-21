
import React, { useEffect, useRef } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';

interface StripPreviewProps {
  className?: string;
  selectedSegment?: {
    id: number;
    color: { r: number; g: number; b: number };
    leds?: { start: number; end: number };
    effect?: number;
    brightness?: number;
    on?: boolean;
  } | null;
}

const StripPreview: React.FC<StripPreviewProps> = ({ className, selectedSegment }) => {
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

    // Check if we should render based on selected segment or general device state
    const isDeviceOff = !deviceState?.on;
    const isSegmentSelected = !!selectedSegment;
    
    // If device is off and no segment is selected
    if (isDeviceOff && !isSegmentSelected) {
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

    // Get colors based on selected segment or device state
    let { r, g, b } = selectedSegment?.color || deviceState?.color || { r: 255, g: 255, b: 255 };
    let effectId = selectedSegment?.effect !== undefined ? selectedSegment.effect : (deviceState?.effect || 0);
    let brightness = selectedSegment?.brightness !== undefined ? selectedSegment.brightness : (deviceState?.brightness || 255);
    let isOn = selectedSegment?.on !== undefined ? selectedSegment.on : true;
    
    // If segment is off, render gray LEDs for that segment
    if (!isOn) {
      // Draw all LEDs as inactive except the segment LEDs
      for (let i = 0; i < ledCount; i++) {
        const x = startX + i * (ledSize + ledSpacing);
        
        ctx.beginPath();
        ctx.roundRect(x, 10, ledSize, ledSize, 4);
        
        // Check if this LED is part of the selected segment
        const isInSegment = selectedSegment?.leds && 
                           i >= (selectedSegment.leds.start || 0) && 
                           i <= (selectedSegment.leds.end || ledCount - 1);
        
        if (isInSegment) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        }
        
        ctx.fill();
      }
      
      return;
    }
    
    // Create LED animation based on effect
    for (let i = 0; i < ledCount; i++) {
      const x = startX + i * (ledSize + ledSpacing);
      
      // Check if this LED is part of the selected segment
      const isInSegment = selectedSegment?.leds && 
                         i >= (selectedSegment.leds.start || 0) && 
                         i <= (selectedSegment.leds.end || ledCount - 1);
      
      // If a segment is selected but this LED is not in it, make it dimmed
      if (selectedSegment && !isInSegment) {
        ctx.beginPath();
        ctx.roundRect(x, 10, ledSize, ledSize, 4);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fill();
        continue;
      }
      
      // Modify colors based on current effect and position
      let ledR = r, ledG = g, ledB = b;
      let ledBrightness = 1;
      
      // Very simple effect simulation
      if (effectId > 0) {
        // This is a very simplified effect simulation - in reality, each effect would have its own algorithm
        const time = Date.now() / 1000;
        const position = i / ledCount;
        
        switch (effectId % 8) {
          case 1: // "Blink" effect
            ledBrightness = Math.sin(time * 2) > 0 ? 1 : 0.1;
            break;
          case 2: // "Breath" effect  
            ledBrightness = (Math.sin(time * 2) + 1) / 2;
            break;
          case 3: // "Color Wipe" effect
            ledBrightness = position < (time % 3) / 3 ? 1 : 0.1;
            break;
          case 4: // "Rainbow" effect
            const hue = (position * 360 + time * 50) % 360;
            const { r: rr, g: gg, b: bb } = hsvToRgb(hue, 1, 1);
            ledR = rr; ledG = gg; ledB = bb;
            break;
          case 5: // "Theater Chase" effect
            ledBrightness = (i + Math.floor(time * 5)) % 3 === 0 ? 1 : 0.1;
            break;
          case 6: // "Running Lights" effect
            ledBrightness = (Math.sin(position * Math.PI * 2 + time * 5) + 1) / 2;
            break;
          case 7: // "Color Fade" effect
            const hueShift = (time * 30) % 360;
            const { r: rr2, g: gg2, b: bb2 } = hsvToRgb(hueShift, 1, 1);
            ledR = rr2; ledG = gg2; ledB = bb2;
            break;
        }
      }
      
      // Apply brightness
      const adjustedBrightness = (brightness / 255) * ledBrightness;
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
  }, [deviceState, deviceInfo, selectedSegment]);

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
    <div className="glass-card p-4 flex flex-col animate-fade-in">
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

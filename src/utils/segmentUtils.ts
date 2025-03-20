
import { Segment } from '@/types/segments';
import { toast } from "sonner";

export const TRIANGLE_SIZE = 90; // Fixed triangle size
export const LEDS_PER_SEGMENT = 30;

export const calculateNextLedRange = (segments: Segment[], deviceLedCount?: number): { start: number; end: number } => {
  if (segments.length === 0) {
    return { start: 0, end: LEDS_PER_SEGMENT - 1 };
  }
  
  const segmentIndex = segments.length;
  const start = segmentIndex * LEDS_PER_SEGMENT;
  const end = start + LEDS_PER_SEGMENT - 1;
  
  const maxLed = deviceLedCount ? deviceLedCount - 1 : 300;
  return { 
    start: Math.min(start, maxLed), 
    end: Math.min(end, maxLed) 
  };
};

export const recalculateLedRanges = (
  segments: Segment[], 
  setSegments: React.Dispatch<React.SetStateAction<Segment[]>>,
  updateSegment: (id: number, data: Partial<Segment>) => void
) => {
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

// Color conversion utilities
export const rgbToHsv = (r: number, g: number, b: number) => {
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

export const hsvToRgb = (h: number, s: number, v: number) => {
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

export const broadcastSegmentUpdate = (segments: Segment[]) => {
  localStorage.setItem('wledSegments', JSON.stringify(segments));
  
  const event = new CustomEvent('segmentsUpdated', { 
    detail: segments,
    bubbles: true 
  });
  window.dispatchEvent(event);
  document.dispatchEvent(event);
};

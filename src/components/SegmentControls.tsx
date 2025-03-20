
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Segment } from '@/types/segments';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ColorPicker from './ColorPicker';
import BrightnessSlider from './BrightnessSlider';

interface SegmentControlsProps {
  segment: Segment;
  editMode: 'segment' | 'color' | 'effect';
  ledStart: string;
  ledEnd: string;
  rotationValue: string;
  effectSpeed: number;
  effectIntensity: number;
  segmentBrightness: number;
  colorTabActive: string;
  onLEDInputChange: (type: 'start' | 'end', value: string) => void;
  onRotationInputChange: (value: string) => void;
  onEffectSpeedChange: (speed: number) => void;
  onEffectIntensityChange: (intensity: number) => void;
  onSegmentBrightnessChange: (brightness: number) => void;
  onColorChange: (color: { r: number; g: number; b: number }) => void;
  setColorTabActive: (tab: string) => void;
  deviceLedCount?: number;
}

const SegmentControls: React.FC<SegmentControlsProps> = ({
  segment,
  editMode,
  ledStart,
  ledEnd,
  rotationValue,
  effectSpeed,
  effectIntensity,
  segmentBrightness,
  colorTabActive,
  onLEDInputChange,
  onRotationInputChange,
  onEffectSpeedChange,
  onEffectIntensityChange,
  onSegmentBrightnessChange,
  onColorChange,
  setColorTabActive,
  deviceLedCount
}) => {
  if (editMode === 'segment') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <div className="text-xs text-muted-foreground">Start</div>
          <Input
            type="number"
            value={ledStart}
            min={0}
            max={deviceLedCount ? deviceLedCount - 1 : 300}
            onChange={(e) => onLEDInputChange('start', e.target.value)}
            className="h-8 w-16"
          />
        </div>
        
        <div className="flex flex-col">
          <div className="text-xs text-muted-foreground">End</div>
          <Input
            type="number"
            value={ledEnd}
            min={parseInt(ledStart)}
            max={deviceLedCount ? deviceLedCount - 1 : 300}
            onChange={(e) => onLEDInputChange('end', e.target.value)}
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
            onChange={(e) => onRotationInputChange(e.target.value)}
            className="h-8 w-16"
          />
        </div>
      </div>
    );
  }
  
  if (editMode === 'color') {
    return (
      <div className="mt-4">
        <Tabs value={colorTabActive} onValueChange={setColorTabActive}>
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="color1">Color 1</TabsTrigger>
            <TabsTrigger value="color2">Color 2</TabsTrigger>
            <TabsTrigger value="color3">Color 3</TabsTrigger>
          </TabsList>
          
          <TabsContent value="color1" className="mt-2">
            <ColorPicker 
              color={segment.color} 
              onChange={onColorChange}
            />
          </TabsContent>
          
          <TabsContent value="color2" className="mt-2">
            <ColorPicker 
              color={segment.color2 || { r: 0, g: 255, b: 0 }} 
              onChange={onColorChange}
            />
          </TabsContent>
          
          <TabsContent value="color3" className="mt-2">
            <ColorPicker 
              color={segment.color3 || { r: 0, g: 0, b: 255 }} 
              onChange={onColorChange}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  }
  
  if (editMode === 'effect') {
    return (
      <div className="mt-4 space-y-4">
        <div>
          <Label htmlFor="brightness">Brightness</Label>
          <BrightnessSlider
            value={segmentBrightness}
            onChange={onSegmentBrightnessChange}
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
            onValueChange={(value) => onEffectSpeedChange(value[0])}
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
            onValueChange={(value) => onEffectIntensityChange(value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Low</span>
            <span>{effectIntensity}</span>
            <span>High</span>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default SegmentControls;

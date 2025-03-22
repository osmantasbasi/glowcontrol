
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';
import { Palette, Zap, Sliders, Lightbulb, Power, Droplet, Gauge, Sparkles, Layers, Triangle } from 'lucide-react';
import ColorPicker from './ColorPicker';
import EffectSelector from './EffectSelector';
import PaletteSelector from './PaletteSelector';
import SegmentTriangles from './SegmentTriangles';
import ColorTabExtension from './ColorTabExtension';

interface ControlPanelProps {
  className?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ className }) => {
  const { deviceState, deviceInfo, setColor, setBrightness, togglePower, setEffect, setSegmentPalette } = useWLED();
  const [selectedTab, setSelectedTab] = useState('color');
  const [segments, setSegments] = useState<any[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<any>(null);
  const [triangleColors, setTriangleColors] = useState<{ r: number; g: number; b: number }[]>([
    { r: 255, g: 0, b: 0 },
    { r: 0, g: 255, b: 0 },
    { r: 0, g: 0, b: 255 },
    { r: 255, g: 255, b: 0 },
    { r: 0, g: 255, b: 255 },
    { r: 255, g: 0, b: 255 },
    { r: 255, g: 128, b: 0 },
    { r: 128, g: 0, b: 255 },
    { r: 0, g: 128, b: 255 },
    { r: 255, g: 0, b: 128 },
    { r: 128, g: 255, b: 0 },
    { r: 0, g: 255, b: 128 },
  ]);

  useEffect(() => {
    if (deviceState?.segments) {
      setSegments(deviceState.segments);
    }
  }, [deviceState?.segments]);

  const handleColorChange = (color: { r: number; g: number; b: number }) => {
    setColor(color.r, color.g, color.b);
  };

  const handleBrightnessChange = (values: number[]) => {
    if (values.length > 0) {
      setBrightness(values[0]);
    }
  };

  const handlePowerToggle = () => {
    togglePower();
  };

  const handleEffectChange = (effectId: number) => {
    setEffect(effectId);
  };

  const handlePaletteChange = (paletteId: number) => {
    if (deviceState?.segments && deviceState.segments.length > 0) {
      const segmentId = deviceState.segments[0].id || 0;
      setSegmentPalette(segmentId, paletteId);
    }
  };

  return (
    <div className={cn("glass-card p-4", className)}>
      <Tabs defaultValue="color" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="color" className="flex items-center gap-1">
            <Palette size={14} />
            <span className="hidden sm:inline">Color</span>
          </TabsTrigger>
          <TabsTrigger value="effect" className="flex items-center gap-1">
            <Sparkles size={14} />
            <span className="hidden sm:inline">Effect</span>
          </TabsTrigger>
          <TabsTrigger value="segments" className="flex items-center gap-1">
            <Layers size={14} />
            <span className="hidden sm:inline">Segments</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Sliders size={14} />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="color" className="focus:outline-none">
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <ColorPicker
                color={deviceState?.color || { r: 255, g: 255, b: 255 }}
                onChange={handleColorChange}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb size={16} className="text-cyan-300" />
                  <span className="text-sm font-medium text-white/80">Brightness</span>
                </div>
                <span className="text-sm text-white/60">{deviceState?.brightness || 0}</span>
              </div>
              <Slider
                value={[deviceState?.brightness || 0]}
                min={1}
                max={255}
                step={1}
                onValueChange={handleBrightnessChange}
              />
            </div>

            <div className="flex justify-center">
              <Button
                variant={deviceState?.on ? "default" : "outline"}
                className={cn(
                  "w-full py-6 text-lg",
                  deviceState?.on
                    ? "bg-cyan-600 hover:bg-cyan-500 text-white"
                    : "bg-black/20 border-white/10 text-white/60 hover:text-white hover:bg-black/30"
                )}
                onClick={handlePowerToggle}
              >
                <Power size={20} className="mr-2" />
                {deviceState?.on ? "Turn Off" : "Turn On"}
              </Button>
            </div>
            
            <ColorTabExtension />
          </div>
        </TabsContent>

        <TabsContent value="effect" className="focus:outline-none">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-cyan-300" />
                <span className="text-sm font-medium text-white/80">Effect</span>
              </div>
              <EffectSelector
                selectedEffect={deviceState?.effect || 0}
                onChange={handleEffectChange}
                speed={deviceState?.speed || 128}
                intensity={deviceState?.intensity || 128}
                onSpeedChange={(value) => setEffect(deviceState?.effect || 0, value)}
                onIntensityChange={(value) => setEffect(deviceState?.effect || 0, undefined, value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Palette size={16} className="text-cyan-300" />
                <span className="text-sm font-medium text-white/80">Palette</span>
              </div>
              <PaletteSelector
                palettes={deviceInfo?.palettes || []}
                selectedPalette={deviceState?.segments?.[0]?.pal || 0}
                onChange={handlePaletteChange}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="focus:outline-none">
          <SegmentTriangles
            segments={segments}
            setSegments={setSegments}
            selectedSegment={selectedSegment}
            setSelectedSegment={setSelectedSegment}
            triangleColors={triangleColors}
          />
        </TabsContent>

        <TabsContent value="settings" className="focus:outline-none">
          <div className="space-y-4">
            <div className="p-4 border border-white/10 rounded-md bg-black/20">
              <h3 className="text-md font-medium text-white/80 mb-2">Device Information</h3>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between">
                  <span className="text-white/60">Name:</span>
                  <span className="text-white/90">{deviceInfo?.name || 'Unknown'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/60">Version:</span>
                  <span className="text-white/90">{deviceInfo?.version || 'Unknown'}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/60">LED Count:</span>
                  <span className="text-white/90">{deviceInfo?.ledCount || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/60">Effects:</span>
                  <span className="text-white/90">{deviceInfo?.effects?.length || 0}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-white/60">Palettes:</span>
                  <span className="text-white/90">{deviceInfo?.palettes?.length || 0}</span>
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ControlPanel;

import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import ColorPicker from './ColorPicker';
import BrightnessSlider from './BrightnessSlider';
import EffectSelector from './EffectSelector';
import DeviceManager from './DeviceManager';
import StripPreview from './StripPreview';
import SegmentTriangles from './SegmentTriangles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Power, Layers, Settings, Triangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  effect: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
  connectedTo?: number;
  connectionPoint?: 'top' | 'left' | 'right';
  connectedToPoint?: 'top' | 'left' | 'right';
}

const ControlPanel: React.FC = () => {
  const { deviceState, deviceInfo, togglePower, setColor, setBrightness } = useWLED();
  const [activeTab, setActiveTab] = useState<string>('segments');
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 255, b: 255});
  
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  
  useEffect(() => {
    if (deviceState) {
      setCurrentColor(deviceState.color);
    }
  }, [deviceState]);

  const handleColorChange = (color: {r: number, g: number, b: number}) => {
    setCurrentColor(color);
    const timeoutId = setTimeout(() => {
      setColor(color.r, color.g, color.b);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  };

  return (
    <div className="relative w-full max-w-5xl mx-auto p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-medium gradient-text">GlowControl</h1>
        
        {deviceState && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => togglePower()}
            className={cn(
              "rounded-full transition-all duration-300",
              deviceState.on 
                ? "bg-white/10 text-white hover:bg-white/20" 
                : "bg-white/5 text-white/40 hover:bg-white/10"
            )}
          >
            <Power size={18} />
            <span className="sr-only">Power</span>
          </Button>
        )}
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-3">
          <DeviceManager className="animate-fade-in" />
        </div>
        
        <div className="md:col-span-9">
          <div className="space-y-4">
            {deviceInfo && deviceState && (
              <StripPreview className="animate-fade-in" />
            )}
            
            <div className="glass-card overflow-hidden animate-fade-in">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between p-4">
                  <TabsList className="glass">
                    <TabsTrigger value="segments" className="data-[state=active]:bg-white/10">
                      <Triangle size={14} className="mr-1" />
                      Segments
                    </TabsTrigger>
                    <TabsTrigger value="color" className="data-[state=active]:bg-white/10">
                      Color
                    </TabsTrigger>
                    <TabsTrigger value="effects" className="data-[state=active]:bg-white/10">
                      <Layers size={14} className="mr-1" />
                      Effects
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:bg-white/10">
                      <Settings size={14} className="mr-1" />
                      Settings
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="text-sm text-white/50">
                    {deviceInfo?.name || 'No device connected'}
                  </div>
                </div>
                
                <TabsContent 
                  value="segments" 
                  className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
                >
                  <SegmentTriangles 
                    className="mb-4" 
                    segments={segments}
                    setSegments={setSegments}
                    selectedSegment={selectedSegment}
                    setSelectedSegment={setSelectedSegment}
                  />
                </TabsContent>
                
                <TabsContent 
                  value="color" 
                  className="p-4 pt-0 animate-fade-in space-y-6 focus-visible:outline-none focus-visible:ring-0"
                >
                  <div className="flex flex-col items-center">
                    <ColorPicker 
                      color={currentColor}
                      onChange={handleColorChange} 
                      className="w-full max-w-[300px] mb-12"
                    />
                    
                    <div className="w-full max-w-md mt-4">
                      <BrightnessSlider 
                        value={deviceState?.brightness || 255}
                        onChange={(value) => setBrightness(value)}
                      />
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent 
                  value="effects" 
                  className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
                >
                  <EffectSelector />
                </TabsContent>
                
                <TabsContent 
                  value="settings" 
                  className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
                >
                  <div className="glass p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-white/70">Device Information</h3>
                    
                    {deviceInfo ? (
                      <div className="mt-2 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/50">Device Name:</span>
                          <span>{deviceInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Firmware Version:</span>
                          <span>{deviceInfo.version}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">LED Count:</span>
                          <span>{deviceInfo.ledCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Effects:</span>
                          <span>{deviceInfo.effects.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/50">Palettes:</span>
                          <span>{deviceInfo.palettes.length}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-white/50">
                        No device connected
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

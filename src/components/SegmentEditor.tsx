
import React, { useState, useEffect } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Layers, Triangle, Palette, Power, SlidersHorizontal, 
  Cog, ZapOff
} from 'lucide-react';
import SegmentTriangles from '@/components/SegmentTriangles';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import ColorPicker from '@/components/ColorPicker';
import EffectSelector from '@/components/EffectSelector';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Wifi } from 'lucide-react';

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  color2?: { r: number; g: number; b: number };
  color3?: { r: number; g: number; b: number };
  effect: number;
  effectSpeed?: number;
  effectIntensity?: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
  brightness?: number;
  on?: boolean;
  palette?: number;
}

const SegmentEditor: React.FC = () => {
  const { deviceState, deviceInfo, connectionError, setColor, setEffect, setBrightness, togglePower, toggleAllSegments } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 0, b: 255});
  const [activeTab, setActiveTab] = useState<string>('segments');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);
  const [allSegmentsOn, setAllSegmentsOn] = useState<boolean>(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    console.log('SegmentEditor mounted');
    const savedSegments = localStorage.getItem('wledSegments');
    if (savedSegments) {
      try {
        const parsedSegments = JSON.parse(savedSegments);
        console.log('Loaded segments from localStorage:', parsedSegments);
        setSegments(parsedSegments);
      } catch (e) {
        console.error('Error loading segments:', e);
      }
    }
    
    const handleSegmentsUpdated = (e: Event) => {
      console.log('segmentsUpdated event received');
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        console.log('Setting segments from event:', customEvent.detail);
        setSegments(customEvent.detail);
      }
    };
    
    document.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    window.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    
    return () => {
      document.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
      window.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    };
  }, []);

  useEffect(() => {
    console.log('Saving segments to localStorage:', segments);
    localStorage.setItem('wledSegments', JSON.stringify(segments));
    
    const event = new CustomEvent('segmentsUpdated', { 
      detail: segments,
      bubbles: true 
    });
    document.dispatchEvent(event);
    window.dispatchEvent(event);
  }, [segments]);

  useEffect(() => {
    if (segments.length > 0) {
      const allOn = segments.every(seg => seg.on !== false);
      console.log('Setting allSegmentsOn to:', allOn);
      setAllSegmentsOn(allOn);
    }
  }, [segments]);

  const handleToggleAllSegments = () => {
    console.log('handleToggleAllSegments called, current state:', allSegmentsOn);
    const newState = !allSegmentsOn;
    const updatedSegments = segments.map(seg => ({
      ...seg,
      on: newState
    }));
    
    setSegments(updatedSegments);
    setAllSegmentsOn(newState);
    toggleAllSegments(newState);
    console.log('All segments toggled to:', newState);
  };

  const handleColorChange = (color: {r: number, g: number, b: number}) => {
    console.log('handleColorChange called with color:', color);
    setCurrentColor(color);
    
    if (selectedSegment) {
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, color: color } 
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment({...selectedSegment, color});
      setColor(color.r, color.g, color.b);
    }
  };

  const handleEffectChange = (effectId: number) => {
    console.log('handleEffectChange called with effectId:', effectId);
    if (selectedSegment) {
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, effect: effectId } 
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment({...selectedSegment, effect: effectId});
      setEffect(effectId, selectedSegment.effectSpeed, selectedSegment.effectIntensity);
    }
  };

  const handlePaletteChange = (paletteId: number) => {
    console.log('handlePaletteChange called with paletteId:', paletteId);
    if (selectedSegment) {
      const updatedSegments = segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, palette: paletteId } 
          : seg
      );
      
      setSegments(updatedSegments);
      setSelectedSegment({...selectedSegment, palette: paletteId});
    }
  };

  if (connectionError) {
    return (
      <div className="glass-card p-4 animate-fade-in mt-4 md:mt-8">
        <Alert variant="destructive" className="bg-red-950/50 border-red-600/50">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Connection Error</AlertTitle>
          <AlertDescription className="mt-2">
            {connectionError}
            <div className="mt-4 text-sm">
              <p>Troubleshooting steps:</p>
              <ol className="list-decimal ml-5 mt-2 space-y-1">
                <li>Make sure your WLED device is powered on and connected to your network</li>
                <li>Verify that both your device and the WLED controller are on the same network</li>
                <li>Check if you entered the correct IP address for your WLED device</li>
                <li>Try accessing the WLED web interface directly in your browser to verify it's working</li>
              </ol>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                className="bg-red-900/50 hover:bg-red-800/50 border-red-700"
                onClick={() => window.location.reload()}
              >
                <Wifi className="mr-2 h-4 w-4" />
                Refresh Connection
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden animate-fade-in mt-4 md:mt-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between p-2 md:p-4">
          <TabsList className="glass w-full overflow-x-auto scrollbar-none tabs-container">
            <TabsTrigger value="segments" className="data-[state=active]:bg-white/10 whitespace-nowrap">
              <Triangle size={14} className="mr-1" />
              <span className="whitespace-nowrap">Segments</span>
            </TabsTrigger>
            <TabsTrigger value="color" className="data-[state=active]:bg-white/10 whitespace-nowrap">
              <Palette size={14} className="mr-1" />
              <span className="whitespace-nowrap">Color</span>
            </TabsTrigger>
            <TabsTrigger value="effect" className="data-[state=active]:bg-white/10 whitespace-nowrap">
              <Layers size={14} className="mr-1" />
              <span className="whitespace-nowrap">Effect</span>
            </TabsTrigger>
            <TabsTrigger value="palette" className="data-[state=active]:bg-white/10 whitespace-nowrap">
              <Palette size={14} className="mr-1" />
              <span className="whitespace-nowrap">Palette</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="data-[state=active]:bg-white/10 whitespace-nowrap">
              <Cog size={14} className="mr-1" />
              <span className="whitespace-nowrap">Config</span>
            </TabsTrigger>
          </TabsList>
          
          <Button
            variant="ghost" 
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full ml-2 flex-shrink-0",
              allSegmentsOn 
                ? "bg-white/10 text-white hover:bg-white/20" 
                : "bg-black/30 text-white/40 hover:bg-black/40"
            )}
            onClick={handleToggleAllSegments}
          >
            {allSegmentsOn ? <Power size={16} /> : <ZapOff size={16} />}
          </Button>
          
          {selectedSegment && (
            <Button
              variant="ghost" 
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full ml-2 flex-shrink-0",
                selectedSegment.on === false ? "bg-black/30 text-white/40" : "bg-white/10 text-white"
              )}
              onClick={() => {
                const newState = !(selectedSegment.on ?? true);
                const updatedSegments = segments.map(seg => 
                  seg.id === selectedSegment.id 
                    ? { ...seg, on: newState } 
                    : seg
                );
                setSegments(updatedSegments);
                setSelectedSegment({...selectedSegment, on: newState});
                togglePower(newState);
              }}
            >
              <Power size={16} />
            </Button>
          )}
        </div>
        
        <TabsContent 
          value="segments" 
          className="p-2 pt-0 md:p-4 md:pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select, drag, or rotate segments to position them
          </div>
          <SegmentTriangles 
            segments={segments}
            setSegments={setSegments}
            selectedSegment={selectedSegment}
            setSelectedSegment={setSelectedSegment}
            className="triangle-canvas"
          />
        </TabsContent>
        
        <TabsContent 
          value="color" 
          className="p-2 pt-0 md:p-4 md:pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select segments above first, then pick a color to apply
          </div>
          <div className="flex flex-col items-center mobile-center">
            <ColorPicker 
              color={selectedSegment?.color || currentColor}
              onChange={handleColorChange} 
              className="w-full max-w-[300px]"
              size={isMobile ? 200 : 300}
            />
          </div>
          <div className="mt-4">
            <SegmentTriangles 
              segments={segments}
              setSegments={setSegments}
              selectedSegment={selectedSegment}
              setSelectedSegment={setSelectedSegment}
              editMode="color"
              className="triangle-canvas"
            />
          </div>
        </TabsContent>
        
        <TabsContent 
          value="effect" 
          className="p-2 pt-0 md:p-4 md:pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select segments above first, then choose an effect to apply
          </div>
          <EffectSelector onEffectSelect={handleEffectChange} />
          
          {selectedSegment && (
            <div className="mt-6 space-y-4">
              <div className="glass p-4 rounded-lg">
                <h3 className="text-sm font-medium text-white/70 mb-3">Effect Settings</h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-white/70">Speed</span>
                      <span className="text-xs text-white/50">{selectedSegment.effectSpeed ?? 128}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <SlidersHorizontal size={14} className="text-cyan-300" />
                      <Slider 
                        value={[selectedSegment.effectSpeed ?? 128]}
                        min={0}
                        max={255}
                        step={1}
                        onValueChange={(values) => {
                          if (values.length > 0) {
                            const newSpeed = values[0];
                            const updatedSegments = segments.map(seg => 
                              seg.id === selectedSegment.id 
                                ? { ...seg, effectSpeed: newSpeed } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            setSelectedSegment({...selectedSegment, effectSpeed: newSpeed});
                            setEffect(selectedSegment.effect, newSpeed, selectedSegment.effectIntensity);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-white/70">Intensity</span>
                      <span className="text-xs text-white/50">{selectedSegment.effectIntensity ?? 128}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <SlidersHorizontal size={14} className="text-cyan-300" />
                      <Slider 
                        value={[selectedSegment.effectIntensity ?? 128]}
                        min={0}
                        max={255}
                        step={1}
                        onValueChange={(values) => {
                          if (values.length > 0) {
                            const newIntensity = values[0];
                            const updatedSegments = segments.map(seg => 
                              seg.id === selectedSegment.id 
                                ? { ...seg, effectIntensity: newIntensity } 
                                : seg
                            );
                            setSegments(updatedSegments);
                            setSelectedSegment({...selectedSegment, effectIntensity: newIntensity});
                            setEffect(selectedSegment.effect, selectedSegment.effectSpeed, newIntensity);
                          }
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-xs text-white/70">Brightness</span>
                      <span className="text-xs text-white/50">{selectedSegment.brightness ?? 255}</span>
                    </div>
                    <Slider 
                      value={[selectedSegment.brightness ?? 255]}
                      min={0}
                      max={255}
                      step={1}
                      onValueChange={(values) => {
                        if (values.length > 0) {
                          const newBrightness = values[0];
                          const updatedSegments = segments.map(seg => 
                            seg.id === selectedSegment.id 
                              ? { ...seg, brightness: newBrightness } 
                              : seg
                          );
                          setSegments(updatedSegments);
                          setSelectedSegment({...selectedSegment, brightness: newBrightness});
                          setBrightness(newBrightness);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <SegmentTriangles 
                  segments={segments}
                  setSegments={setSegments}
                  selectedSegment={selectedSegment}
                  setSelectedSegment={setSelectedSegment}
                  editMode="effect"
                  className="triangle-canvas"
                />
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent 
          value="palette" 
          className="p-2 pt-0 md:p-4 md:pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select segments above first, then choose a palette to apply
          </div>
          
          {deviceInfo?.palettes && deviceInfo.palettes.length > 0 ? (
            <div className="glass p-4 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {deviceInfo.palettes.slice(0, isMobile ? 8 : 16).map((palette, index) => (
                  <button
                    key={index}
                    onClick={() => handlePaletteChange(index)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border text-center",
                      selectedSegment?.palette === index
                        ? "bg-white/20 border-cyan-400 text-white"
                        : "bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                    )}
                  >
                    <Palette size={20} className="mb-2 text-cyan-300" />
                    <span className="text-xs break-words">{palette}</span>
                  </button>
                ))}
              </div>
              
              {deviceInfo.palettes.length > (isMobile ? 8 : 16) && (
                <div className="mt-4">
                  <select
                    value={selectedSegment?.palette ?? 0}
                    onChange={(e) => handlePaletteChange(parseInt(e.target.value))}
                    className="w-full p-2 rounded bg-black/20 text-sm border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
                  >
                    {deviceInfo.palettes.map((palette, index) => (
                      <option key={index} value={index}>
                        {palette}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-sm text-white/50 p-4">
              No palettes available. Connect to a WLED device to see available palettes.
            </div>
          )}
          
          <div className="mt-4">
            <SegmentTriangles 
              segments={segments}
              setSegments={setSegments}
              selectedSegment={selectedSegment}
              setSelectedSegment={setSelectedSegment}
              editMode="effect"
            />
          </div>
        </TabsContent>
        
        <TabsContent 
          value="config" 
          className="p-2 pt-0 md:p-4 md:pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Configure advanced settings for your WLED setup
          </div>
          
          <div className="glass p-4 rounded-lg">
            <h3 className="text-sm font-medium text-white/70 mb-3">Device Information</h3>
            
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
                  <span>{deviceInfo.effects ? deviceInfo.effects.length : 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Palettes:</span>
                  <span>{deviceInfo.palettes ? deviceInfo.palettes.length : 0}</span>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-white/50">
                No device connected. Connect to a WLED device to see its information.
              </div>
            )}
          </div>
          
          <div className="glass p-4 rounded-lg mt-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">Display Settings</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Theme</span>
                <select 
                  className="bg-black/20 border border-white/10 rounded p-1 text-xs focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
                >
                  <option value="dark">Dark (Default)</option>
                  <option value="light">Light</option>
                  <option value="system">System Preference</option>
                </select>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Show Segment IDs</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 text-xs"
                >
                  Enabled
                </Button>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/70">Canvas Size</span>
                <select 
                  className="bg-black/20 border border-white/10 rounded p-1 text-xs focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium (Default)</option>
                  <option value="large">Large</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="glass p-4 rounded-lg mt-4">
            <h3 className="text-sm font-medium text-white/70 mb-3">Application Settings</h3>
            
            <div className="space-y-2 text-sm">
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm"
              >
                <SlidersHorizontal size={14} className="mr-2" />
                Reset All Settings
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start text-sm"
              >
                <Palette size={14} className="mr-2" />
                Clear Segment Data
              </Button>
              
              <div className="text-xs text-white/50 mt-2">
                GlowControl v1.0.0 • Powered by WLED
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SegmentEditor;

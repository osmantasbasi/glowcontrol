
import { WLEDProvider } from '@/context/WLEDContext';
import ControlPanel from '@/components/ControlPanel';
import { useState, useEffect } from 'react';
import ColorPicker from '@/components/ColorPicker';
import EffectSelector from '@/components/EffectSelector';
import { Button } from '@/components/ui/button';
import { useWLED } from '@/context/WLEDContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Triangle, Palette, Power, SlidersHorizontal } from 'lucide-react';
import SegmentTriangles from '@/components/SegmentTriangles';

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

const SegmentEditor = () => {
  const { deviceState, deviceInfo, setColor, setEffect, setBrightness, togglePower } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 0, b: 255});
  const [activeTab, setActiveTab] = useState<string>('segments');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  // Synchronize segments with localStorage when component mounts
  useEffect(() => {
    const savedSegments = localStorage.getItem('wledSegments');
    if (savedSegments) {
      try {
        setSegments(JSON.parse(savedSegments));
      } catch (e) {
        console.error('Error loading segments:', e);
      }
    }
    
    // Listen for segment updates from other components
    const handleSegmentsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && Array.isArray(customEvent.detail)) {
        setSegments(customEvent.detail);
      }
    };
    
    // Listen on both document and window to ensure cross-window sync
    document.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    window.addEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    
    return () => {
      document.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
      window.removeEventListener('segmentsUpdated', handleSegmentsUpdated as EventListener);
    };
  }, []);

  // Update localStorage when segments change
  useEffect(() => {
    localStorage.setItem('wledSegments', JSON.stringify(segments));
    
    // Trigger storage event for cross-tab/window communication
    const event = new CustomEvent('segmentsUpdated', { 
      detail: segments,
      bubbles: true 
    });
    document.dispatchEvent(event);
    window.dispatchEvent(event);
  }, [segments]);

  const handleColorChange = (color: {r: number, g: number, b: number}) => {
    setCurrentColor(color);
    
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, color } 
          : seg
      ));
    }
    
    const timeoutId = setTimeout(() => {
      setColor(color.r, color.g, color.b);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  };

  const handleEffectChange = (effectId: number) => {
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, effect: effectId } 
          : seg
      ));
      
      setEffect(effectId);
    }
  };

  const handlePaletteChange = (paletteId: number) => {
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, palette: paletteId } 
          : seg
      ));
    }
  };

  // Handle clicking outside triangles to deselect
  const handleBackgroundClick = () => {
    setSelectedSegment(null);
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in mt-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between p-4">
          <TabsList className="glass">
            <TabsTrigger value="segments" className="data-[state=active]:bg-white/10">
              <Triangle size={14} className="mr-1" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="color" className="data-[state=active]:bg-white/10">
              <Palette size={14} className="mr-1" />
              Color
            </TabsTrigger>
            <TabsTrigger value="effect" className="data-[state=active]:bg-white/10">
              <Layers size={14} className="mr-1" />
              Effect
            </TabsTrigger>
            <TabsTrigger value="palette" className="data-[state=active]:bg-white/10">
              <Palette size={14} className="mr-1" />
              Palette
            </TabsTrigger>
          </TabsList>
          
          {selectedSegment && (
            <Button
              variant="ghost" 
              size="icon"
              className={cn(
                "h-8 w-8 rounded-full",
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
          className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select, drag, or rotate segments to position them
          </div>
          <SegmentTriangles 
            segments={segments}
            setSegments={setSegments}
            selectedSegment={selectedSegment}
            setSelectedSegment={setSelectedSegment}
          />
        </TabsContent>
        
        <TabsContent 
          value="color" 
          className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select segments above first, then pick a color to apply
          </div>
          <div className="flex flex-col items-center">
            <ColorPicker 
              color={selectedSegment?.color || currentColor}
              onChange={handleColorChange} 
              className="w-full max-w-[300px]"
            />
          </div>
          <div className="mt-4">
            <SegmentTriangles 
              segments={segments}
              setSegments={setSegments}
              selectedSegment={selectedSegment}
              setSelectedSegment={setSelectedSegment}
              editMode="color"
            />
          </div>
        </TabsContent>
        
        <TabsContent 
          value="effect" 
          className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
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
                />
              </div>
            </div>
          )}
        </TabsContent>
        
        <TabsContent 
          value="palette" 
          className="p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-sm text-white/70 mb-4">
            Select segments above first, then choose a palette to apply
          </div>
          
          {deviceInfo?.palettes ? (
            <div className="glass p-4 rounded-lg">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {deviceInfo.palettes.slice(0, 16).map((palette, index) => (
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
                    <span className="text-xs">{palette}</span>
                  </button>
                ))}
              </div>
              
              {deviceInfo.palettes.length > 16 && (
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
      </Tabs>
    </div>
  );
};

const Index = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-purple-800 to-blue-900">
      <div className="absolute top-[-10%] right-0 w-[80%] h-[500px] rounded-3xl opacity-50 bg-indigo-600/30 blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-0 w-[80%] h-[500px] rounded-3xl opacity-30 bg-cyan-500/30 blur-[100px] -z-10" />
      
      <WLEDProvider>
        <ControlPanel />
        <div className="w-full max-w-5xl mx-auto px-4 pb-8">
          <SegmentEditor />
        </div>
      </WLEDProvider>
    </div>
  );
};

export default Index;

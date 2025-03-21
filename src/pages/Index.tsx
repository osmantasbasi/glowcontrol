import { WLEDProvider } from '@/context/WLEDContext';
import ControlPanel from '@/components/ControlPanel';
import { useState, useEffect, useMemo } from 'react';
import ColorPicker from '@/components/ColorPicker';
import EffectSelector from '@/components/EffectSelector';
import { Button } from '@/components/ui/button';
import { useWLED } from '@/context/WLEDContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Triangle, Palette, Settings, Power, X } from 'lucide-react';
import SegmentTriangles from '@/components/SegmentTriangles';
import StripPreview from '@/components/StripPreview';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  color2?: { r: number; g: number; b: number };
  color3?: { r: number; g: number; b: number };
  effect: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
  brightness: number;
  on: boolean;
  speed: number;
  intensity: number;
  palette: number;
}

const SegmentEditor = () => {
  const { deviceState, deviceInfo, setColor, setEffect, setSegmentPalette } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 0, b: 255});
  const [activeTab, setActiveTab] = useState<string>('segments');
  const isMobile = useIsMobile();
  
  const [segments, setSegments] = useState<Segment[]>(() => {
    try {
      const savedSegments = localStorage.getItem('wledSegments');
      return savedSegments ? JSON.parse(savedSegments) : [];
    } catch (error) {
      console.error('Error loading segments from localStorage:', error);
      return [];
    }
  });
  
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('wledSegments', JSON.stringify(segments));
    } catch (error) {
      console.error('Error saving segments to localStorage:', error);
    }
  }, [segments]);

  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const isTriangleClick = (e.target as Element)?.closest('.triangle-wrapper');
      const isControlClick = (e.target as Element)?.closest('button, input, select, .tabs-list, .glass-card');
      
      if (!isTriangleClick && !isControlClick) {
        setSelectedSegment(null);
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const handleColorChange = (color: {r: number, g: number, b: number}) => {
    setCurrentColor(color);
    
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, color } 
          : seg
      ));
    }
    
    try {
      if (deviceState) {
        const timeoutId = setTimeout(() => {
          setColor(color.r, color.g, color.b);
        }, 50);
        
        return () => clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error setting color:', error);
    }
  };

  const handleEffectChange = (effectId: number) => {
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, effect: effectId } 
          : seg
      ));
      
      try {
        if (deviceState) {
          setEffect(effectId);
        }
      } catch (error) {
        console.error('Error setting effect:', error);
      }
    }
  };

  const handlePaletteChange = (paletteId: number) => {
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, palette: paletteId } 
          : seg
      ));
      
      try {
        if (deviceState) {
          setSegmentPalette(selectedSegment.id, paletteId);
        }
      } catch (error) {
        console.error('Error setting palette:', error);
      }
    }
  };

  const handleBackgroundClick = () => {
    setSelectedSegment(null);
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in mt-4 sm:mt-8">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between p-2 sm:p-4 overflow-x-auto">
          <TabsList className="glass">
            <TabsTrigger value="segments" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
              <Triangle size={isMobile ? 12 : 14} className="mr-1" />
              <span className="hidden sm:inline">Segments</span>
            </TabsTrigger>
            <TabsTrigger value="color" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
              <Palette size={isMobile ? 12 : 14} className="mr-1" />
              <span className="hidden sm:inline">Color</span>
            </TabsTrigger>
            <TabsTrigger value="effect" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
              <Layers size={isMobile ? 12 : 14} className="mr-1" />
              <span className="hidden sm:inline">Effect</span>
            </TabsTrigger>
            <TabsTrigger value="palette" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
              <Palette size={isMobile ? 12 : 14} className="mr-1" />
              <span className="hidden sm:inline">Palette</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 text-xs sm:text-sm">
              <Settings size={isMobile ? 12 : 14} className="mr-1" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>
        </div>
        
        <div className="px-2 sm:px-4 mb-2">
          <StripPreview selectedSegment={selectedSegment} />
        </div>
        
        <TabsContent 
          value="segments" 
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
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
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
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
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
            Select segments above first, then choose an effect to apply
          </div>
          <EffectSelector onEffectSelect={handleEffectChange} />
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
          value="palette" 
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
            Select segments above first, then choose a palette to apply
          </div>
          {deviceInfo?.palettes ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {deviceInfo.palettes.slice(0, 20).map((palette, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (selectedSegment) {
                      handlePaletteChange(index);
                    }
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border transition-all text-xs sm:text-sm",
                    selectedSegment?.palette === index
                      ? "bg-white/20 border-cyan-400 text-white"
                      : "bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <Palette size={isMobile ? 18 : 24} className="mb-1 sm:mb-2 text-cyan-300" />
                  <span className="text-xs text-center truncate w-full">{palette}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-white/50">
              Loading palettes...
            </div>
          )}
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
          value="settings" 
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="glass p-2 sm:p-4 rounded-lg">
            <h3 className="text-xs sm:text-sm font-medium text-white/70 mb-2 sm:mb-4">LED Configuration</h3>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="text-xs sm:text-sm space-y-1 sm:space-y-2">
                <p className="text-white/70">Device Information</p>
                {deviceInfo ? (
                  <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                    <span className="text-white/50">Device Name:</span>
                    <span>{deviceInfo.name}</span>
                    <span className="text-white/50">LED Count:</span>
                    <span>{deviceInfo.ledCount}</span>
                    <span className="text-white/50">Firmware:</span>
                    <span>{deviceInfo.version}</span>
                  </div>
                ) : (
                  <p className="text-white/50">No device connected</p>
                )}
              </div>
              
              <div className="text-xs sm:text-sm space-y-1 sm:space-y-2">
                <p className="text-white/70">Segment Information</p>
                <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                  <span className="text-white/50">Total Segments:</span>
                  <span>{segments.length}</span>
                  <span className="text-white/50">Selected Segment:</span>
                  <span>{selectedSegment ? segments.findIndex(s => s.id === selectedSegment.id) + 1 : 'None'}</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const cn = (...classes: (string | boolean | undefined)[]) => {
  return classes.filter(Boolean).join(' ');
};

const Index = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-purple-800 to-blue-900">
      <div className="absolute top-[-10%] right-0 w-[80%] h-[500px] rounded-3xl opacity-50 bg-indigo-600/30 blur-[100px] -z-10" />
      <div className="absolute bottom-[-10%] left-0 w-[80%] h-[500px] rounded-3xl opacity-30 bg-cyan-500/30 blur-[100px] -z-10" />
      
      <WLEDProvider>
        <ControlPanel />
        <div className="w-full max-w-5xl mx-auto px-2 sm:px-4 pb-6 sm:pb-8">
          <SegmentEditor />
        </div>
      </WLEDProvider>
    </div>
  );
};

export default Index;


import { WLEDProvider } from '@/context/WLEDContext';
import ControlPanel from '@/components/ControlPanel';
import { useState } from 'react';
import ColorPicker from '@/components/ColorPicker';
import EffectSelector from '@/components/EffectSelector';
import { Button } from '@/components/ui/button';
import { useWLED } from '@/context/WLEDContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Triangle, Palette } from 'lucide-react';
import SegmentTriangles from '@/components/SegmentTriangles';

interface Segment {
  id: number;
  color: { r: number; g: number; b: number };
  effect: number;
  position: { x: number; y: number };
  rotation: number;
  leds: { start: number; end: number };
}

const SegmentEditor = () => {
  const { deviceState, deviceInfo, setColor, setEffect } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 0, b: 255});
  const [activeTab, setActiveTab] = useState<string>('segments');
  const [segments, setSegments] = useState<Segment[]>([]);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

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
          </TabsList>
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

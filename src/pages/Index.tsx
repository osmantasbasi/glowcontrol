import { WLEDProvider } from '@/context/WLEDContext';
import ControlPanel from '@/components/ControlPanel';
import { useState, useEffect, useMemo } from 'react';
import ColorPicker from '@/components/ColorPicker';
import EffectSelector from '@/components/EffectSelector';
import { Button } from '@/components/ui/button';
import { useWLED } from '@/context/WLEDContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Triangle, Palette, Settings, Power, X, Search, Star } from 'lucide-react';
import SegmentTriangles from '@/components/SegmentTriangles';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import { Input } from '@/components/ui/input';
import ColorSlotSelector from '@/components/ColorSlotSelector';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const TRIANGLE_COLORS = [
  { r: 155, g: 135, b: 245 },  // Primary Purple: #9b87f5
  { r: 217, g: 70, b: 239 },   // Magenta Pink: #D946EF
  { r: 249, g: 115, b: 22 },   // Bright Orange: #F97316
  { r: 14, g: 165, b: 233 },   // Ocean Blue: #0EA5E9
  { r: 139, g: 92, b: 246 },   // Vivid Purple: #8B5CF6
  { r: 126, g: 105, b: 171 },  // Secondary Purple: #7E69AB
  { r: 110, g: 89, b: 165 },   // Tertiary Purple: #6E59A5
  { r: 229, g: 222, b: 255 },  // Soft Purple: #E5DEFF
  { r: 255, g: 222, b: 226 },  // Soft Pink: #FFDEE2
  { r: 253, g: 225, b: 211 },  // Soft Peach: #FDE1D3
  { r: 211, g: 228, b: 253 },  // Soft Blue: #D3E4FD
  { r: 242, g: 252, b: 226 }   // Soft Green: #F2FCE2
];

const SegmentEditor = () => {
  const { deviceState, deviceInfo, setColor, setEffect, setSegmentPalette, setSegmentColor, setSegmentEffect } = useWLED();
  const [currentColor, setCurrentColor] = useState<{r: number, g: number, b: number}>({r: 255, g: 0, b: 255});
  const [activeTab, setActiveTab] = useState<string>('segments');
  const isMobile = useIsMobile();
  const [paletteSearchTerm, setPaletteSearchTerm] = useState('');
  const [selectedColorSlot, setSelectedColorSlot] = useState<number>(0);
  const [favoritePalettes, setFavoritePalettes] = useState<number[]>(() => {
    try {
      const savedFavorites = localStorage.getItem('wledFavoritePalettes');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch (error) {
      console.error('Error loading favorite palettes from localStorage:', error);
      return [];
    }
  });
  
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
    try {
      localStorage.setItem('wledFavoritePalettes', JSON.stringify(favoritePalettes));
    } catch (error) {
      console.error('Error saving favorite palettes to localStorage:', error);
    }
  }, [favoritePalettes]);

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

  useEffect(() => {
    if (segments.length > 0) {
      const updatedSegments = segments.map((segment, index) => {
        const colorIndex = index % TRIANGLE_COLORS.length;
        return {
          ...segment,
          displayColor: TRIANGLE_COLORS[colorIndex]
        };
      });
      
      if (JSON.stringify(segments) !== JSON.stringify(updatedSegments)) {
        setSegments(updatedSegments);
      }
    }
  }, [segments.length]);

  const handleColorChange = (color: {r: number, g: number, b: number}) => {
    setCurrentColor(color);
    
    if (selectedSegment) {
      const segmentColors = [...Array(3)].map((_, i) => {
        if (i === selectedColorSlot) {
          return color;
        } else {
          const existingSegment = segments.find(s => s.id === selectedSegment.id);
          return i === 0 ? existingSegment?.color : 
                 i === 1 ? existingSegment?.color2 : 
                 i === 2 ? existingSegment?.color3 : 
                 { r: 0, g: 0, b: 0 };
        }
      });
      
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { 
              ...seg, 
              color: segmentColors[0],
              color2: segmentColors[1], 
              color3: segmentColors[2]
            } 
          : seg
      ));
      
      try {
        if (deviceState) {
          const timeoutId = setTimeout(() => {
            setSegmentColor(
              selectedSegment.id, 
              color.r, 
              color.g, 
              color.b, 
              selectedColorSlot
            );
          }, 50);
          
          return () => clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Error setting color:', error);
      }
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
          setSegmentEffect(selectedSegment.id, effectId, selectedSegment.speed || 128, selectedSegment.intensity || 128);
        }
      } catch (error) {
        console.error('Error setting effect:', error);
      }
    } else {
      toast.info("Please select a triangle first", {
        description: "Click on a triangle before choosing an effect",
        duration: 3000
      });
    }
  };

  const handleSpeedChange = (value: number) => {
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, speed: value } 
          : seg
      ));
      
      setSelectedSegment({
        ...selectedSegment,
        speed: value
      });
      
      try {
        if (deviceState) {
          setSegmentEffect(selectedSegment.id, selectedSegment.effect || 0, value, selectedSegment.intensity || 128);
        }
      } catch (error) {
        console.error('Error setting speed:', error);
      }
    }
  };

  const handleIntensityChange = (value: number) => {
    if (selectedSegment) {
      setSegments(segments.map(seg => 
        seg.id === selectedSegment.id 
          ? { ...seg, intensity: value } 
          : seg
      ));
      
      setSelectedSegment({
        ...selectedSegment,
        intensity: value
      });
      
      try {
        if (deviceState) {
          setSegmentEffect(selectedSegment.id, selectedSegment.effect || 0, selectedSegment.speed || 128, value);
        }
      } catch (error) {
        console.error('Error setting intensity:', error);
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
    } else {
      toast.info("Please select a triangle first", {
        description: "Click on a triangle before choosing a palette",
        duration: 3000
      });
    }
  };

  const handleBackgroundClick = () => {
    setSelectedSegment(null);
  };

  const toggleFavoritePalette = (paletteId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setFavoritePalettes(prev => {
      if (prev.includes(paletteId)) {
        return prev.filter(id => id !== paletteId);
      } else {
        return [...prev, paletteId];
      }
    });
  };

  const filteredAndSortedPalettes = useMemo(() => {
    if (!deviceInfo?.palettes || deviceInfo.palettes.length === 0) return [];
    
    const filtered = paletteSearchTerm 
      ? deviceInfo.palettes
          .map((palette, index) => ({ name: palette, id: index }))
          .filter(palette => palette.name.toLowerCase().includes(paletteSearchTerm.toLowerCase()))
      : deviceInfo.palettes.map((palette, index) => ({ name: palette, id: index }));
    
    return filtered.sort((a, b) => {
      const aIsFavorite = favoritePalettes.includes(a.id);
      const bIsFavorite = favoritePalettes.includes(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [deviceInfo?.palettes, paletteSearchTerm, favoritePalettes]);

  const getSelectedSegmentColors = () => {
    if (!selectedSegment) return [
      { r: 255, g: 255, b: 255 },
      { r: 0, g: 0, b: 0 },
      { r: 0, g: 0, b: 0 }
    ];
    
    const segment = segments.find(s => s.id === selectedSegment.id);
    return [
      segment?.color || { r: 255, g: 255, b: 255 },
      segment?.color2 || { r: 0, g: 0, b: 0 },
      segment?.color3 || { r: 0, g: 0, b: 0 }
    ];
  };

  const getCurrentSlotColor = () => {
    if (!selectedSegment) return currentColor;
    
    const segment = segments.find(s => s.id === selectedSegment.id);
    if (!segment) return currentColor;
    
    return selectedColorSlot === 0 ? segment.color :
           selectedColorSlot === 1 ? segment.color2 || { r: 0, g: 0, b: 0 } :
           segment.color3 || { r: 0, g: 0, b: 0 };
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
            triangleColors={TRIANGLE_COLORS}
          />
        </TabsContent>
        
        <TabsContent 
          value="color" 
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
            {selectedSegment 
              ? "Select a color slot and color to apply to the selected triangle" 
              : "Select a triangle first, then pick a color slot and color"
            }
          </div>
          
          {selectedSegment && (
            <div className="mb-4">
              <ColorSlotSelector
                selectedSlot={selectedColorSlot}
                onSelectSlot={setSelectedColorSlot}
                slotColors={getSelectedSegmentColors()}
              />
            </div>
          )}
          
          <div className="flex flex-col items-center pointer-events-auto">
            <ColorPicker 
              color={getCurrentSlotColor()}
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
              triangleColors={TRIANGLE_COLORS}
            />
          </div>
        </TabsContent>
        
        <TabsContent 
          value="effect" 
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
            {selectedSegment 
              ? `Select an effect for triangle ${segments.findIndex(s => s.id === selectedSegment.id) + 1}` 
              : "Select a triangle first, then choose an effect to apply"}
          </div>
          
          <EffectSelector 
            onEffectSelect={handleEffectChange} 
            selectedSegmentId={selectedSegment?.id || null}
            speed={selectedSegment?.speed || 128}
            intensity={selectedSegment?.intensity || 128}
            onSpeedChange={handleSpeedChange}
            onIntensityChange={handleIntensityChange}
          />
          
          <div className="mt-4 pointer-events-auto">
            <SegmentTriangles 
              segments={segments}
              setSegments={setSegments}
              selectedSegment={selectedSegment}
              setSelectedSegment={setSelectedSegment}
              editMode="effect"
              triangleColors={TRIANGLE_COLORS}
            />
          </div>
        </TabsContent>
        
        <TabsContent 
          value="palette" 
          className="p-2 sm:p-4 pt-0 animate-fade-in focus-visible:outline-none focus-visible:ring-0"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center text-xs sm:text-sm text-white/70 mb-2 sm:mb-4">
            {selectedSegment 
              ? `Select a palette for triangle ${segments.findIndex(s => s.id === selectedSegment.id) + 1}` 
              : "Select a triangle first, then choose a palette to apply"}
          </div>
          
          {deviceInfo?.palettes ? (
            <div className="space-y-4 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Input
                  placeholder="Search palettes..."
                  value={paletteSearchTerm}
                  onChange={(e) => setPaletteSearchTerm(e.target.value)}
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/50 pl-8"
                  onClick={(e) => e.stopPropagation()}
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/50" size={16} />
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredAndSortedPalettes.slice(0, 20).map(({ name, id }) => (
                  <button
                    key={id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedSegment) {
                        handlePaletteChange(id);
                      } else {
                        toast.info("Please select a triangle first");
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border transition-all text-xs sm:text-sm relative hover:scale-105",
                      selectedSegment?.palette === id
                        ? "bg-white/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                        : "bg-black/30 border-white/10 text-white/80 hover:bg-black/40 hover:border-white/30"
                    )}
                  >
                    <Palette size={isMobile ? 18 : 24} className="mb-1 sm:mb-2 text-cyan-300" />
                    <span className="text-xs text-center truncate w-full">{name}</span>
                    <button 
                      onClick={(e) => toggleFavoritePalette(id, e)}
                      className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/10"
                    >
                      <Star 
                        size={14} 
                        className={cn(
                          "transition-colors",
                          favoritePalettes.includes(id) 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "text-white/40"
                        )} 
                      />
                    </button>
                  </button>
                ))}
              </div>
              
              {filteredAndSortedPalettes.length > 20 && (
                <div onClick={(e) => e.stopPropagation()} className="relative">
                  <Select 
                    value={selectedSegment?.palette?.toString() || "0"}
                    onValueChange={(value) => handlePaletteChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-full bg-black/30 border-white/20 text-white hover:bg-black/40 focus:ring-cyan-400/20">
                      <SelectValue placeholder="Select a palette" />
                    </SelectTrigger>
                    <SelectContent className="bg-black/90 border-white/10 text-white max-h-80">
                      <SelectGroup>
                        <SelectLabel className="text-cyan-300">Palettes</SelectLabel>
                        {filteredAndSortedPalettes.map(({ name, id }) => (
                          <SelectItem 
                            key={id} 
                            value={id.toString()}
                            className="hover:bg-white/10 focus:bg-white/10 data-[state=checked]:bg-cyan-900/30 data-[state=checked]:text-cyan-100"
                          >
                            {favoritePalettes.includes(id) ? "★ " : ""}{name}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-sm text-white/50">
              Loading palettes...
            </div>
          )}
          
          <div className="mt-4 pointer-events-auto">
            <SegmentTriangles 
              segments={segments}
              setSegments={setSegments}
              selectedSegment={selectedSegment}
              setSelectedSegment={setSelectedSegment}
              editMode="color"
              triangleColors={TRIANGLE_COLORS}
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

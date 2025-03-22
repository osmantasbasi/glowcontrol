
import React, { useState, useEffect, useMemo } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';
import { Sparkles, Search, Star, Sliders } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EffectSelectorProps {
  className?: string;
  onEffectSelect?: (effectId: number) => void;
  selectedSegmentId?: number | null;
  speed?: number;
  intensity?: number;
  onSpeedChange?: (value: number) => void;
  onIntensityChange?: (value: number) => void;
}

const EffectSelector: React.FC<EffectSelectorProps> = ({ 
  className, 
  onEffectSelect, 
  selectedSegmentId,
  speed = 128,
  intensity = 128,
  onSpeedChange,
  onIntensityChange
}) => {
  const { deviceState, deviceInfo, setEffect, setSegmentEffect } = useWLED();
  const [searchTerm, setSearchTerm] = useState('');
  const [showControls, setShowControls] = useState(true);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const savedFavorites = localStorage.getItem('wledFavoriteEffects');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wledFavoriteEffects', JSON.stringify(favorites));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, [favorites]);

  const handleEffectClick = (effectId: number) => {
    if (onEffectSelect) {
      onEffectSelect(effectId);
    } else if (selectedSegmentId !== undefined && selectedSegmentId !== null) {
      setSegmentEffect(selectedSegmentId, effectId, speed, intensity);
    } else {
      setEffect(effectId);
    }
  };

  const toggleFavorite = (effectId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    setFavorites(prev => {
      if (prev.includes(effectId)) {
        return prev.filter(id => id !== effectId);
      } else {
        return [...prev, effectId];
      }
    });
  };

  const filteredAndSortedEffects = useMemo(() => {
    if (!deviceInfo?.effects || deviceInfo.effects.length === 0) return [];
    
    const filtered = searchTerm 
      ? deviceInfo.effects
          .map((effect, index) => ({ name: effect, id: index }))
          .filter(effect => effect.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : deviceInfo.effects.map((effect, index) => ({ name: effect, id: index }));
    
    return filtered.sort((a, b) => {
      const aIsFavorite = favorites.includes(a.id);
      const bIsFavorite = favorites.includes(b.id);
      
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [deviceInfo?.effects, searchTerm, favorites]);

  if (!deviceInfo?.effects || deviceInfo.effects.length === 0) {
    return (
      <div className={cn("p-4 text-center text-sm text-white/50", className)}>
        Loading effects or no effects available. Please connect to a WLED device.
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 pointer-events-auto", className)} onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <Input
          placeholder="Search effects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-black/20 border-white/10 text-white placeholder:text-white/50 pl-8"
          onClick={(e) => e.stopPropagation()}
        />
        <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/50" size={16} />
      </div>
      
      <ScrollArea className="h-[400px] rounded-md border border-white/10">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
          {filteredAndSortedEffects.map(({ name, id }) => (
            <button
              key={id}
              onClick={(e) => {
                e.stopPropagation();
                handleEffectClick(id);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border transition-all relative hover:scale-105",
                (selectedSegmentId !== null && deviceState?.segments?.find(s => s.id === selectedSegmentId)?.fx === id) || 
                  (selectedSegmentId === null && deviceState?.effect === id)
                  ? "bg-white/20 border-cyan-400 text-white shadow-lg shadow-cyan-500/20"
                  : "bg-black/30 border-white/10 text-white/80 hover:bg-black/40 hover:border-white/30"
              )}
            >
              <Sparkles size={24} className="mb-2 text-cyan-300" />
              <span className="text-xs text-center truncate w-full">{name}</span>
              <div 
                onClick={(e) => toggleFavorite(id, e)}
                className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/10"
                data-favorite-toggle="true"
              >
                <Star 
                  size={16} 
                  className={cn(
                    "transition-colors",
                    favorites.includes(id) 
                      ? "fill-yellow-400 text-yellow-400" 
                      : "text-white/40"
                  )} 
                />
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
      
      {onSpeedChange && onIntensityChange && (
        <div className="bg-black/30 rounded-lg p-3 border border-white/10 mt-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowControls(!showControls)}
            className="w-full mb-2 flex items-center justify-between text-white/70 hover:text-white hover:bg-white/10"
          >
            <span>Effect Controls</span>
            <Sliders size={16} />
          </Button>
          
          {showControls && (
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white/70">Speed</label>
                  <span className="text-xs text-white/70">{speed}</span>
                </div>
                <Slider
                  value={[speed]}
                  min={0}
                  max={255}
                  step={1}
                  onValueChange={(values) => {
                    if (values.length > 0) {
                      onSpeedChange(values[0]);
                    }
                  }}
                  className="mt-1"
                />
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-white/70">Intensity</label>
                  <span className="text-xs text-white/70">{intensity}</span>
                </div>
                <Slider
                  value={[intensity]}
                  min={0}
                  max={255}
                  step={1}
                  onValueChange={(values) => {
                    if (values.length > 0) {
                      onIntensityChange(values[0]);
                    }
                  }}
                  className="mt-1"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EffectSelector;

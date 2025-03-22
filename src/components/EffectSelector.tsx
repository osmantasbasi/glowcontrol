
import React, { useState, useEffect, useMemo } from 'react';
import { useWLED } from '@/context/WLEDContext';
import { cn } from '@/lib/utils';
import { Sparkles, Search, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EffectSelectorProps {
  className?: string;
  onEffectSelect?: (effectId: number) => void;
}

const EffectSelector: React.FC<EffectSelectorProps> = ({ className, onEffectSelect }) => {
  const { deviceState, deviceInfo, setEffect } = useWLED();
  const [searchTerm, setSearchTerm] = useState('');
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
    setEffect(effectId);
    
    if (onEffectSelect) {
      onEffectSelect(effectId);
    }
  };

  const toggleFavorite = (effectId: number, event: React.MouseEvent) => {
    event.stopPropagation();
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
    
    // First, filter based on search term
    const filtered = searchTerm 
      ? deviceInfo.effects
          .map((effect, index) => ({ name: effect, id: index }))
          .filter(effect => effect.name.toLowerCase().includes(searchTerm.toLowerCase()))
      : deviceInfo.effects.map((effect, index) => ({ name: effect, id: index }));
    
    // Then sort - favorites first, then alphabetically
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
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filteredAndSortedEffects.slice(0, 20).map(({ name, id }) => (
          <button
            key={id}
            onClick={(e) => {
              e.stopPropagation();
              handleEffectClick(id);
            }}
            className={cn(
              "flex flex-col items-center justify-center p-3 rounded-lg border transition-all relative",
              deviceState?.effect === id
                ? "bg-white/20 border-cyan-400 text-white"
                : "bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
            )}
          >
            <Sparkles size={24} className="mb-2 text-cyan-300" />
            <span className="text-xs text-center truncate w-full">{name}</span>
            <button 
              onClick={(e) => toggleFavorite(id, e)}
              className="absolute top-1 right-1 p-1 rounded-full hover:bg-white/10"
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
            </button>
          </button>
        ))}
      </div>
      
      {filteredAndSortedEffects.length > 20 && (
        <div onClick={(e) => e.stopPropagation()}>
          <select
            value={deviceState?.effect || 0}
            onChange={(e) => handleEffectClick(parseInt(e.target.value))}
            className="w-full p-2 rounded bg-black/20 text-sm border border-white/10 focus:ring-1 focus:ring-cyan-300 focus:border-cyan-300"
          >
            {filteredAndSortedEffects.map(({ name, id }) => (
              <option key={id} value={id}>
                {favorites.includes(id) ? "★ " : ""}{name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default EffectSelector;

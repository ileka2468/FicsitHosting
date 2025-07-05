import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface ResourceSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
  color: string;
  tooltip: string;
}

export const ResourceSlider: React.FC<ResourceSliderProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  color,
  tooltip
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Calculate visual percentage with better scaling for small values
  const getVisualPercentage = () => {
    const rawPercentage = ((value - min) / (max - min)) * 100;
    
    // Apply logarithmic scaling for better visual representation of small values
    if (max >= 20) { // Only apply to sliders with large ranges (like players: 1-32)
      // Use square root scaling to make small values more visible
      const normalizedValue = (value - min) / (max - min);
      const scaledValue = Math.sqrt(normalizedValue);
      return scaledValue * 100;
    }
    
    return rawPercentage;
  };

  const percentage = getVisualPercentage();

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      updateValue(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickPercentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    let newValue: number;
    
    // Reverse the scaling for mouse interaction
    if (max >= 20) {
      // Use inverse square root scaling
      const scaledValue = (clickPercentage / 100) ** 2;
      newValue = Math.round((scaledValue * (max - min) + min) / step) * step;
    } else {
      // Linear scaling for smaller ranges
      newValue = Math.round(((clickPercentage / 100) * (max - min) + min) / step) * step;
    }
    
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <label className="text-white font-semibold text-lg">{label}</label>
          <div className="relative">
            <HelpCircle
              className="w-4 h-4 text-white/60 cursor-help hover:text-white/80 transition-colors"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            />
            {showTooltip && (
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-xl bg-black/80 text-white text-xs rounded-xl shadow-2xl z-[80] w-48 border border-white/20">
                {tooltip}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/80"></div>
              </div>
            )}
          </div>
        </div>
        <span className="text-white/90 font-bold text-xl backdrop-blur-xl bg-white/10 px-4 py-2 rounded-full border border-white/20">
          {value} {unit}
        </span>
      </div>

      <div className="relative">
        <div
          ref={sliderRef}
          className="h-8 backdrop-blur-xl bg-white/10 rounded-full cursor-pointer relative overflow-hidden border border-white/20 shadow-lg"
          onMouseDown={handleMouseDown}
        >
          <div
            className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-300 shadow-lg ${
              isDragging ? 'scale-y-110 shadow-xl' : ''
            }`}
            style={{ width: `${percentage}%` }}
          />
          <div
            className={`absolute top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-xl transition-all duration-300 border-2 border-white/50 ${
              isDragging ? 'scale-125 shadow-2xl' : 'hover:scale-110'
            }`}
            style={{ left: `calc(${percentage}% - 12px)` }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-white/60 mt-2 relative">
          <span>{min}</span>
          {max >= 20 && (
            <span style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }} className="opacity-60">
              {Math.round(min + (max - min) * 0.25)}
            </span>
          )}
          <span>{max}</span>
        </div>
      </div>
    </div>
  );
};
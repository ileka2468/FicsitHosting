import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownSelectProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  tooltip: string;
}

export const DropdownSelect: React.FC<DropdownSelectProps> = ({
  label,
  value,
  options,
  onChange,
  tooltip
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <label className="text-white font-semibold text-lg">{label}</label>
        <div className="relative">
          <HelpCircle
            className="w-4 h-4 text-white/60 cursor-help hover:text-white/80 transition-colors"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-3 backdrop-blur-3xl bg-slate-900/98 text-white text-xs rounded-xl shadow-2xl z-[80] w-48 border border-white/40 ring-1 ring-white/10">
              {tooltip}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full backdrop-blur-xl bg-white/15 text-white rounded-2xl p-4 flex items-center justify-between hover:bg-white/25 transition-all duration-300 border border-white/30 shadow-lg"
        >
          <span className="font-medium">{selectedOption?.label}</span>
          <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <>
            {/* Dropdown */}
            <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 rounded-2xl shadow-2xl z-[70] border border-white/40 overflow-hidden ring-1 ring-white/10">
              {options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/15 transition-colors text-white font-medium first:rounded-t-2xl last:rounded-b-2xl"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
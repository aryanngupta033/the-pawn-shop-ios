import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2, X, Check } from 'lucide-react';
import { fetchLocationSuggestions, type LocationSuggestion } from '../services/locationService';

interface LocationAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export const LocationAutocompleteInput: React.FC<LocationAutocompleteInputProps> = ({
  id = 'location-autocomplete-input',
  value,
  onChange,
  placeholder = 'e.g. Sector 18, Noida / Indirapuram, Ghaziabad',
  required = false,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear suggestions and close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (newVal.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const results = await fetchLocationSuggestions(newVal, controller.signal);
        setSuggestions(results);
        setIsOpen(results.length > 0);
        setHighlightedIndex(-1);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setSuggestions([]);
          setIsOpen(false);
        }
      } finally {
        setLoading(false);
      }
    }, 280);
  };

  const handleSelect = (selectedFormatted: string) => {
    onChange(selectedFormatted);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex].formatted);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <MapPin className="w-3.5 h-3.5 text-stone-400 absolute left-3 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="off"
          className={`w-full pl-8 pr-8 py-2.5 text-xs border border-stone-300 rounded-lg focus:outline-hidden focus:border-amber-700 bg-stone-50/50 transition-colors ${className}`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {loading && (
            <Loader2 className="w-3.5 h-3.5 text-amber-700 animate-spin flex-shrink-0" />
          )}
          {!loading && value.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              title="Clear location"
              className="p-1 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-200/50 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-[#e7e2d9] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          <div className="px-3 py-1.5 bg-[#faf8f5] border-b border-stone-100 flex items-center justify-between text-[10px] text-stone-400 font-medium">
            <span>Location Suggestions</span>
            <span>Click to select</span>
          </div>

          <ul role="listbox" className="divide-y divide-stone-100 py-0.5">
            {suggestions.map((item, index) => {
              const isSelected = value === item.formatted;
              const isHighlighted = highlightedIndex === index;

              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelect(item.formatted)}
                  className={`px-3 py-2 text-xs flex items-start gap-2.5 cursor-pointer transition-colors ${
                    isHighlighted || isSelected
                      ? 'bg-amber-50/80 text-stone-900'
                      : 'hover:bg-stone-50 text-stone-700'
                  }`}
                >
                  <MapPin
                    className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${
                      isHighlighted || isSelected ? 'text-amber-700' : 'text-stone-400'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-stone-900 truncate">
                      {item.name}
                    </div>
                    <div className="text-[11px] text-stone-500 truncate">
                      {item.formatted}
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-amber-700 mt-0.5 flex-shrink-0" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

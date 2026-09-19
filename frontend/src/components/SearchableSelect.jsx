import React, { useState, useEffect, useRef } from 'react';

const SearchableSelect = ({ options, value, onChange, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    // Sync search input with the selected value
    setSearch(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        // Reset search to current value
        setSearch(value || '');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [value]);

  const safeOptions = Array.isArray(options) ? options : [];
  const filteredOptions = safeOptions.filter(option =>
    String(option || '').toLowerCase().includes(String(search || '').toLowerCase())
  );

  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder || 'Search code...'}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none disabled:bg-gray-100 font-bold text-sm bg-white notranslate"
        translate="no"
      />
      
      {isOpen && !disabled && (
        <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={index}
                onClick={() => handleSelect(option)}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 transition-colors notranslate ${
                  option === value ? 'bg-primary-100 text-primary-900 font-bold' : 'text-gray-700'
                }`}
                translate="no"
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-xs text-gray-400 text-center">No options found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;

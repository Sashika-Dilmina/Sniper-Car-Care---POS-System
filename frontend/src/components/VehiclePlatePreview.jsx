import React from 'react';

const VehiclePlatePreview = ({ emirate, plateCode, plateNumber }) => {
  const displayEmirate = emirate || 'Dubai';
  const displayCode = plateCode || '';
  const displayNumber = plateNumber || '';

  // Arabic equivalents for the Emirates
  const getArabicEmirate = (name) => {
    const safeName = String(name || '').toLowerCase();
    switch (safeName) {
      case 'dubai': return 'دبي';
      case 'abu dhabi': return 'أبو ظبي';
      case 'sharjah': return 'الشارقة';
      case 'ajman': return 'عجمان';
      case 'umm al quwain': return 'أم القيوين';
      case 'ras al khaimah': return 'رأس الخيمة';
      case 'fujairah': return 'الفجيرة';
      default: return 'دبي';
    }
  };

  const arabicEmirate = getArabicEmirate(displayEmirate);

  return (
    <div className="flex flex-col items-center my-4">
      <span className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">License Plate Live Preview</span>
      
      {/* UAE License Plate Outer Case */}
      <div 
        className="relative flex items-center justify-between bg-white border-[3px] border-black rounded-lg shadow-md overflow-hidden select-none font-mono"
        style={{
          width: '320px',
          height: '80px',
          fontFamily: "'Outfit', 'Inter', monospace",
        }}
      >
        {/* Left Segment: Plate Code */}
        <div className={`flex items-center justify-center w-[75px] h-full border-r-2 border-gray-300 ${
          displayEmirate.toLowerCase() === 'abu dhabi' ? 'bg-red-600' : 'bg-white'
        }`}>
          <span className={`text-3xl font-extrabold tracking-tighter ${
            displayEmirate.toLowerCase() === 'abu dhabi' ? 'text-white' : 'text-blue-900'
          }`}>
            {displayCode || '—'}
          </span>
        </div>

        {/* Middle Segment: Emirate name (English & Arabic) */}
        <div className="flex flex-col items-center justify-center flex-1 h-full px-2 bg-gray-50 border-r-2 border-gray-300 w-[105px]">
          <span 
            className="text-[10px] font-black text-gray-800 uppercase tracking-tight leading-none mb-0.5"
            style={{ fontSize: displayEmirate.length > 10 ? '8px' : '10px' }}
          >
            {displayEmirate}
          </span>
          <div className="w-8 h-[2px] bg-blue-600 my-0.5 rounded-full"></div>
          <span className="text-[12px] font-bold text-gray-700 leading-none">
            {arabicEmirate}
          </span>
        </div>

        {/* Right Segment: Plate Number */}
        <div className="flex items-center justify-center w-[140px] h-full bg-white px-4">
          <span className="text-3xl font-black text-gray-900 tracking-normal font-mono">
            {displayNumber || '•••••'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default VehiclePlatePreview;

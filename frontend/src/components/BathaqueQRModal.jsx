import { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { downloadBathaqueCardImage } from '../utils/bathaqueQrExport';

const BathaqueQRModal = ({ customer, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);
  const printRef = useRef(null);

  const bathaqueId = customer?.bathaque_id || '';
  const washStamps = Number(customer?.wash_stamps) || 0;
  const isFreeReady = washStamps >= 5;

  useEffect(() => {
    if (bathaqueId) {
      QRCode.toDataURL(bathaqueId, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'H'
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [bathaqueId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await downloadBathaqueCardImage(customer);
    } catch (e) {
      console.error('Download card error:', e);
    } finally {
      setDownloading(false);
    }
  };

  if (!customer) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[110] p-4 overflow-y-auto print-overlay">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header - Hidden in Print */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black p-5 text-white flex justify-between items-center no-print">
          <div>
            <span className="text-xs uppercase tracking-widest text-red-400 font-bold">Sniper Loyalty Club</span>
            <h2 className="text-xl font-black">Bathaque Loyalty Pass</h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900 text-white rounded-xl font-bold transition flex items-center gap-1.5 text-sm shadow"
              title="Download pass as PNG image"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>{downloading ? 'Saving...' : 'Download Image'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 text-sm shadow"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Pass</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Loyalty Card */}
        <div className="p-6 bg-slate-50 flex justify-center print-wrapper">
          <div
            id="printable-bathaque-card"
            ref={printRef}
            className="bg-white border-4 border-black rounded-3xl p-6 max-w-md w-full text-center space-y-5 shadow-lg relative overflow-hidden"
            style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}
          >
            {/* Print Stylesheet */}
            <style dangerouslySetInnerHTML={{__html: `
              @media print {
                .no-print, aside, nav, header, button {
                  display: none !important;
                }
                body {
                  background: white !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .print-overlay {
                  position: static !important;
                  background: none !important;
                  padding: 0 !important;
                  display: block !important;
                  overflow: visible !important;
                }
                .print-wrapper {
                  background: none !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  display: block !important;
                }
                #printable-bathaque-card {
                  box-shadow: none !important;
                  border: 3px solid #000 !important;
                  margin: 20px auto !important;
                  max-width: 420px !important;
                  page-break-inside: avoid !important;
                }
              }
            `}} />

            {/* Top Brand Banner */}
            <div className="border-b-2 border-gray-100 pb-3">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-2xl font-black italic tracking-tighter text-black">SNIPER</span>
                  <span className="block text-[9px] font-black text-red-600 tracking-[0.3em] uppercase">CAR CARE</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-1 rounded-full">
                    LOYALTY PASS
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="text-left bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Customer</p>
                  <p className="text-base font-black text-gray-900">{customer.name || 'Valued Customer'}</p>
                  <p className="text-xs font-mono font-bold text-gray-600 mt-0.5">{customer.phone || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Primary Vehicle</p>
                  <span className="inline-block bg-white border border-gray-300 font-mono font-bold text-xs px-2 py-0.5 rounded shadow-sm">
                    {customer.vehicle_plate || 'N/A'}
                  </span>
                </div>
              </div>

              {customer.linked_vehicles && customer.linked_vehicles.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1 items-center">
                  <span className="text-[10px] text-gray-500 font-semibold">Other Linked Vehicles:</span>
                  {customer.linked_vehicles.map((v) => (
                    <span key={v.id} className="text-[10px] bg-white border border-gray-300 px-1.5 py-0.2 rounded font-mono font-semibold">
                      {v.vehicle_plate}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-3 bg-white border-2 border-gray-900 rounded-2xl shadow-inner inline-block">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Bathaque QR Code" className="w-48 h-48 mx-auto" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-100 rounded-xl">
                    Generating QR...
                  </div>
                )}
              </div>
              <div className="mt-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">BATHAQUE ID</span>
                <span className="text-lg font-black font-mono tracking-widest text-red-600 bg-red-50 border border-red-200 px-3 py-0.5 rounded-lg inline-block mt-0.5">
                  {bathaqueId || 'UNASSIGNED'}
                </span>
              </div>
            </div>

            {/* Loyalty Stamp Punch Card */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-gray-700 uppercase tracking-wider">Wash Punch Card (5+1)</span>
                <span className={isFreeReady ? "text-green-600 font-extrabold" : "text-red-600 font-extrabold"}>
                  {washStamps >= 5 ? '6th Wash is FREE!' : `${washStamps} / 5 Washes`}
                </span>
              </div>

              {/* 5 Stamps Row */}
              <div className="grid grid-cols-5 gap-2 pt-1">
                {[1, 2, 3, 4, 5].map(step => {
                  const isFilled = step <= Math.min(washStamps, 5);
                  return (
                    <div
                      key={step}
                      className={`h-12 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                        isFilled
                          ? 'bg-red-600 border-red-700 text-white shadow-sm'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      <span className="text-sm">{isFilled ? '★' : '☆'}</span>
                      <span className="text-[9px] font-black uppercase">{step}</span>
                    </div>
                  );
                })}
              </div>

              {/* 6th Wash Banner */}
              <div className={`p-2 rounded-xl text-xs font-bold border ${
                isFreeReady
                  ? 'bg-green-100 border-green-300 text-green-800 animate-pulse'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}>
                {isFreeReady
                  ? '🎉 CONGRATULATIONS! 6TH WASH IS FREE TODAY!'
                  : `Complete 5 washes to receive your 6th wash 100% FREE.`}
              </div>
            </div>

            {/* Card Footer */}
            <div className="pt-2 border-t border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
              Scan this QR upon arrival at Sniper Car Care
            </div>
          </div>
        </div>

        {/* Modal Bottom Close */}
        <div className="p-4 bg-gray-100 border-t border-gray-200 text-right no-print">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-700 hover:bg-gray-800 text-white rounded-xl text-sm font-bold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BathaqueQRModal;

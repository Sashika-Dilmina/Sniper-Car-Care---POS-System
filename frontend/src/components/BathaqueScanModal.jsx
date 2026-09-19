import { useState, useEffect, useRef } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const BathaqueScanModal = ({ isOpen, onClose, onApply, title = 'Scan or Enter Bathaque Loyalty QR' }) => {
  const [bathaqueInput, setBathaqueInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [bathaqueResult, setBathaqueResult] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setBathaqueInput('');
      setBathaqueResult(null);
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleLookup = async (idToLookup) => {
    const targetId = (idToLookup || bathaqueInput || '').replace(/^BATHAQUE:/i, '').trim();
    if (!targetId) {
      toast.error('Please enter or scan a Bathaque ID');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/bathaque/check/${encodeURIComponent(targetId)}`);
      setBathaqueResult(response.data);
      if (response.data.is_free_eligible) {
        toast.success(`🎉 Bathaque ID ${targetId} is ELIGIBLE for 6th FREE WASH!`, { duration: 4000 });
      } else {
        toast(`Bathaque ID found: ${response.data.wash_stamps}/5 stamps completed`, { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bathaque ID not found or error checking loyalty');
      setBathaqueResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  const handleApply = () => {
    if (!bathaqueResult) return;
    if (onApply) {
      onApply(bathaqueResult);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[120] p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-black p-5 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-xl font-bold">
              📷
            </div>
            <div>
              <h2 className="text-lg font-black">{title}</h2>
              <p className="text-xs text-gray-400">Scan barcode/QR gun or type 8-10 digit ID</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-xl transition">
            ✕
          </button>
        </div>

        {/* Search / Scan Input */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
              Bathaque ID / QR Code Input
            </label>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Scan QR with gun or type (e.g. BQ10293847)..."
                value={bathaqueInput}
                onChange={(e) => setBathaqueInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 p-3 border-2 border-gray-300 rounded-xl font-mono font-bold text-base uppercase focus:border-red-600 focus:ring-0 outline-none"
              />
              <button
                type="button"
                onClick={() => handleLookup()}
                disabled={loading}
                className="px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition disabled:opacity-50 text-sm shadow"
              >
                {loading ? 'Checking...' : 'Check ID'}
              </button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Tip: Handheld 2D laser barcode guns scan directly into this box and press Enter automatically.
            </p>
          </div>

          {/* Lookup Result Box */}
          {bathaqueResult && (
            <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start border-b border-gray-200 pb-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400">Verified Bathaque ID</span>
                  <p className="font-mono font-black text-xl text-red-600">{bathaqueResult.bathaque_id}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                    bathaqueResult.is_free_eligible
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}>
                    {bathaqueResult.is_free_eligible ? '🎉 Free Wash Ready!' : `${bathaqueResult.wash_stamps}/5 Washes`}
                  </span>
                </div>
              </div>

              {/* Punch Card Visual */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-gray-600">
                  <span>Punch Card Status:</span>
                  <span>{bathaqueResult.wash_stamps} of 5 Completed</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(st => {
                    const isDone = st <= bathaqueResult.wash_stamps;
                    return (
                      <div
                        key={st}
                        className={`h-10 rounded-xl border flex flex-col items-center justify-center font-bold text-xs ${
                          isDone
                            ? 'bg-red-600 border-red-700 text-white shadow-sm'
                            : 'bg-white border-gray-300 text-gray-400'
                        }`}
                      >
                        <span>{isDone ? '★' : '☆'}</span>
                        <span className="text-[8px]">{st}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linked Vehicles / Customers */}
              {bathaqueResult.customers && bathaqueResult.customers.length > 0 && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Registered Vehicles Under this ID:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bathaqueResult.customers.map(c => (
                      <span key={c.id} className="text-xs bg-white border border-gray-300 px-2 py-0.5 rounded-lg font-mono font-bold">
                        {c.vehicle_plate} ({c.name})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Free wash eligibility banner */}
              {bathaqueResult.is_free_eligible ? (
                <div className="p-3 bg-green-500 text-white rounded-xl text-center font-black text-sm shadow">
                  ✨ 6TH WASH IS 100% FREE! Click "Apply" to unlock the Free payment option.
                </div>
              ) : (
                <div className="p-2 bg-gray-100 text-gray-600 rounded-xl text-center text-xs font-semibold">
                  Needs {5 - bathaqueResult.wash_stamps} more wash{5 - bathaqueResult.wash_stamps === 1 ? '' : 'es'} to unlock the 6th Free Wash.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-sm transition"
          >
            Cancel
          </button>
          {bathaqueResult && (
            <button
              type="button"
              onClick={handleApply}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-sm transition shadow flex items-center gap-2"
            >
              ✓ Apply Bathaque ID
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BathaqueScanModal;

import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';

const MobileScanner = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (rear) or 'user' (front)
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Result state
  const [scannedData, setScannedData] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  const scannerRef = useRef(null);
  const audioContextRef = useRef(null);

  // Play pleasant chime on successful scan
  const playBeep = (isSuccess = true) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isSuccess ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 250, ctx.currentTime);
      if (isSuccess) {
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      }
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio not permitted or supported
    }

    // Trigger haptic vibration if supported
    if (navigator.vibrate) {
      navigator.vibrate(isSuccess ? [50, 50, 50] : [150]);
    }
  };

  // Start QR Camera Scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
        } catch (e) {
          // ignore
        }
      }

      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      const config = {
        fps: 12,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode },
        config,
        (decodedText) => {
          handleCodeDetected(decodedText);
        },
        () => {
          // Frame scan error (normal when no QR is visible)
        }
      );

      setIsScanning(true);

      // Check if torch/flashlight is supported
      try {
        const track = html5QrCode.getRunningTrackCameraCapabilities();
        if (track && track.torchFeature && track.torchFeature().isSupported()) {
          setHasTorch(true);
        }
      } catch (e) {
        setHasTorch(false);
      }
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError(err.message || 'Unable to access smartphone camera. Please allow camera permissions.');
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.error('Stop error:', e);
      }
      setIsScanning(false);
    }
  };

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const newTorchState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorchState }]
      });
      setTorchOn(newTorchState);
    } catch (err) {
      toast.error('Torch not supported on this camera');
    }
  };

  // Flip Camera between rear and front
  const flipCamera = async () => {
    await stopScanner();
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);
  };

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [facingMode]);

  // Extract ID and query backend
  const handleCodeDetected = async (rawCode) => {
    if (!rawCode || loading) return;

    // Extract Bathaque ID from plain text, BATHAQUE:XXX, or URL query param ?id=XXX
    let cleanId = rawCode.trim();
    if (cleanId.includes('?id=')) {
      const urlObj = new URL(cleanId, window.location.origin);
      cleanId = urlObj.searchParams.get('id') || cleanId;
    }
    cleanId = cleanId.replace(/^BATHAQUE:/i, '').trim();

    // Pause scanner
    await stopScanner();
    playBeep(true);
    lookupBathaqueId(cleanId);
  };

  // Lookup Bathaque ID from server
  const lookupBathaqueId = async (idToLookup) => {
    if (!idToLookup) return;
    setLoading(true);
    try {
      const response = await axios.get(`/api/bathaque/check/${encodeURIComponent(idToLookup)}`);
      if (response.data.success) {
        setScannedData(response.data);
        // Add to recent scans list
        setRecentScans(prev => {
          const filtered = prev.filter(s => s.bathaque_id !== response.data.bathaque_id);
          return [response.data, ...filtered].slice(0, 5);
        });
        toast.success(`Found customer: ${response.data.customers?.[0]?.name || response.data.bathaque_id}`);
      } else {
        toast.error('Bathaque record not found');
        setScannedData(null);
        startScanner();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bathaque ID lookup failed');
      startScanner();
    } finally {
      setLoading(false);
    }
  };

  // Manual search submit
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    lookupBathaqueId(manualInput.trim().toUpperCase());
    setManualInput('');
  };

  // Action 1: Award +1 Wash Stamp
  const handleAwardStamp = async () => {
    if (!scannedData?.bathaque_id || actionLoading) return;
    setActionLoading(true);
    try {
      const response = await axios.post('/api/bathaque/award-stamp', {
        bathaque_id: scannedData.bathaque_id
      });
      if (response.data.success) {
        playBeep(true);
        toast.success(response.data.message, { duration: 5000, icon: '🎉' });
        // Update scannedData state with fresh loyalty info
        setScannedData(prev => ({
          ...prev,
          wash_stamps: response.data.loyalty.wash_stamps,
          total_washes: response.data.loyalty.total_washes,
          is_free_eligible: response.data.loyalty.is_free_eligible,
          stamps_needed: Math.max(0, 5 - response.data.loyalty.wash_stamps)
        }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to award stamp');
    } finally {
      setActionLoading(false);
    }
  };

  // Action 2: Send Customer to Cashier POS Screen
  const handleSendToCashier = async () => {
    if (!scannedData?.bathaque_id || actionLoading) return;
    setActionLoading(true);
    try {
      const customerId = scannedData.customers?.[0]?.id || null;
      const response = await axios.post('/api/bathaque/queue', {
        bathaque_id: scannedData.bathaque_id,
        customer_id: customerId
      });
      if (response.data.success) {
        toast.success('🚀 Pushed to Cashier Register Screen!', { duration: 4000, icon: '🖥️' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send to cashier');
    } finally {
      setActionLoading(false);
    }
  };

  // Action 3: Reset and Scan Next
  const handleScanNext = () => {
    setScannedData(null);
    startScanner();
  };

  const primaryCustomer = scannedData?.customers?.[0] || null;
  const washStamps = Number(scannedData?.wash_stamps) || 0;
  const isFreeEligible = washStamps >= 5;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans">
      {/* Top Mobile App Bar */}
      <header className="bg-gray-900/90 backdrop-blur border-b border-gray-800 px-4 py-3 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center font-black text-sm text-white shadow-lg shadow-red-950">
            S
          </span>
          <div>
            <h1 className="text-sm font-black tracking-wide leading-none">Sniper Scanner</h1>
            <p className="text-[10px] text-gray-400 mt-0.5">Staff Mobile Portal</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-gray-300 bg-gray-800 px-2.5 py-1 rounded-full border border-gray-700">
            👤 {user?.name?.split(' ')[0] || 'Staff'}
          </span>
          <Link
            to="/sales"
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-2.5 py-1 rounded-lg border border-gray-700"
            title="Go to POS"
          >
            POS
          </Link>
          <button
            onClick={logout}
            className="text-xs text-red-400 hover:text-red-300 px-1"
            title="Logout"
          >
            🚪
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 max-w-md mx-auto w-full space-y-4">
        {/* If NO customer scanned yet: Show Live Camera Viewport */}
        {!scannedData ? (
          <div className="space-y-4">
            {/* Viewfinder Card */}
            <div className="relative bg-black rounded-3xl overflow-hidden border-2 border-gray-800 shadow-2xl aspect-square flex flex-col items-center justify-center">
              {/* HTML5 QR Camera Element */}
              <div id="qr-reader" className="w-full h-full object-cover"></div>

              {/* Scanning Reticle & Overlay (shows when camera is active) */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                  {/* Corner Reticles */}
                  <div className="w-56 h-56 border-2 border-red-500/80 rounded-2xl relative shadow-2xl">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-red-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-red-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-red-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-red-500 -mb-1 -mr-1 rounded-br-lg"></div>
                    {/* Animated Laser Scanning Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-bounce mt-24"></div>
                  </div>
                  <p className="text-[11px] font-bold text-gray-300 mt-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full border border-gray-700">
                    Align QR Pass within frame
                  </p>
                </div>
              )}

              {/* Camera Error Message */}
              {cameraError && (
                <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <span className="text-4xl">📷</span>
                  <p className="text-xs text-red-400 font-semibold">{cameraError}</p>
                  <button
                    onClick={startScanner}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow hover:bg-red-700"
                  >
                    Retry Camera
                  </button>
                </div>
              )}

              {/* In-Camera Floating Controls */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-auto">
                <button
                  type="button"
                  onClick={flipCamera}
                  className="px-3 py-1.5 bg-gray-900/80 hover:bg-gray-800 text-white rounded-xl text-xs font-bold backdrop-blur border border-gray-700 flex items-center gap-1.5 shadow"
                  title="Switch Front/Rear Camera"
                >
                  <span>🔄</span> Flip
                </button>

                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur border flex items-center gap-1.5 shadow transition ${
                      torchOn
                        ? 'bg-amber-500 text-gray-950 border-amber-400 font-black'
                        : 'bg-gray-900/80 text-white border-gray-700 hover:bg-gray-800'
                    }`}
                    title="Toggle Flashlight"
                  >
                    <span>{torchOn ? '🔦 On' : '💡 Flash'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={isScanning ? stopScanner : startScanner}
                  className="px-3 py-1.5 bg-gray-900/80 hover:bg-gray-800 text-white rounded-xl text-xs font-bold backdrop-blur border border-gray-700 flex items-center gap-1.5 shadow"
                >
                  <span>{isScanning ? '⏸️ Pause' : '▶️ Resume'}</span>
                </button>
              </div>
            </div>

            {/* Manual Text Search Input */}
            <form onSubmit={handleManualSearch} className="space-y-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Or type Bathaque ID (e.g. BQ10293847)..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-white font-mono font-bold placeholder-gray-500 outline-none focus:border-red-500 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !manualInput.trim()}
                  className="px-5 bg-red-600 hover:bg-red-700 disabled:bg-gray-800 text-white font-bold rounded-2xl text-xs transition shadow"
                >
                  {loading ? '...' : 'Search'}
                </button>
              </div>
            </form>

            {/* Recent Scans History on Mobile */}
            {recentScans.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Recent Scans Today
                </h3>
                <div className="space-y-1.5">
                  {recentScans.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setScannedData(item)}
                      className="p-3 bg-gray-900/70 hover:bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between cursor-pointer transition active:scale-[0.98]"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-200">
                          {item.customers?.[0]?.name || item.bathaque_id}
                        </p>
                        <p className="text-xs text-gray-500 font-mono">
                          {item.customers?.[0]?.vehicle_plate || 'No plate'} · {item.bathaque_id}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-extrabold bg-red-950 text-red-400 border border-red-800/60">
                        {item.wash_stamps || 0}/5 Stamps
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Scanned Customer Details & Action Card */
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
            {/* Customer Info Card */}
            <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-black border-2 border-red-500/50 rounded-3xl p-5 shadow-2xl space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-red-600 text-white">
                    Verified Customer Pass
                  </span>
                  <h2 className="text-xl font-black text-white mt-1.5">
                    {primaryCustomer?.name || 'Customer'}
                  </h2>
                  {primaryCustomer?.phone && (
                    <a
                      href={`tel:${primaryCustomer.phone}`}
                      className="text-xs text-red-400 font-bold hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <span>📞</span> {primaryCustomer.phone}
                    </a>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Bathaque ID</span>
                  <span className="font-mono text-lg font-black text-red-400 bg-red-950/80 px-2.5 py-1 rounded-xl border border-red-800 inline-block mt-0.5">
                    {scannedData.bathaque_id}
                  </span>
                </div>
              </div>

              {/* Vehicle plates */}
              <div className="bg-gray-950/80 p-3 rounded-2xl border border-gray-800 space-y-1">
                <span className="text-[10px] uppercase font-bold text-gray-400">Registered Vehicle(s):</span>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {scannedData.customers?.map(c => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs font-mono font-bold text-gray-200"
                    >
                      🚗 {c.vehicle_plate} ({c.vehicle_type})
                    </span>
                  ))}
                </div>
              </div>

              {/* 5-Slot Punch Card Visual */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-gray-300">Wash Punch Card:</span>
                  <span className="text-red-400 font-mono text-sm">{washStamps} / 5 Stamps</span>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {[1, 2, 3, 4, 5].map(st => {
                    const done = washStamps >= st;
                    return (
                      <div
                        key={st}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${
                          done
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950'
                            : 'bg-gray-800/40 border-dashed border-gray-700 text-gray-500'
                        }`}
                      >
                        <span className="text-lg font-black">{done ? '✓' : st}</span>
                        <span className="text-[9px] uppercase font-bold tracking-tight">
                          {done ? 'Wash' : `#${st}`}
                        </span>
                      </div>
                    );
                  })}

                  {/* 6th Slot - FREE WASH */}
                  <div
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 text-center p-0.5 transition-all ${
                      isFreeEligible
                        ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-300 text-white shadow-lg animate-pulse'
                        : 'bg-gray-800/40 border-dashed border-amber-600/30 text-gray-500'
                    }`}
                  >
                    <span className="text-xl">🎁</span>
                    <span className="text-[9px] font-black uppercase tracking-tight">
                      {isFreeEligible ? 'FREE!' : 'FREE'}
                    </span>
                  </div>
                </div>

                {/* Eligibility Status Banner */}
                {isFreeEligible ? (
                  <div className="p-3 bg-amber-500/20 border border-amber-400 rounded-xl text-center">
                    <p className="text-xs font-black text-amber-300">
                      🎉 5 Washes Completed! 6th Wash is 100% FREE!
                    </p>
                    <p className="text-[10px] text-amber-200 mt-0.5">
                      Customer is eligible for zero-charge Free Wash checkout.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center">
                    {5 - washStamps} more wash(es) needed to earn 100% Free Wash.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                {/* 1. Award +1 Stamp Button */}
                <button
                  type="button"
                  onClick={handleAwardStamp}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 active:scale-[0.98] transition text-sm"
                >
                  <span className="text-lg">🎟️</span>
                  <span>{actionLoading ? 'Updating...' : 'Award +1 Wash Stamp'}</span>
                </button>

                {/* 2. Send to Cashier POS Screen */}
                <button
                  type="button"
                  onClick={handleSendToCashier}
                  disabled={actionLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-extrabold rounded-2xl shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 active:scale-[0.98] transition text-sm"
                >
                  <span className="text-lg">🖥️</span>
                  <span>{actionLoading ? 'Sending...' : 'Send to Cashier POS'}</span>
                </button>

                {/* 3. Scan Next Customer */}
                <button
                  type="button"
                  onClick={handleScanNext}
                  className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-2xl text-xs transition text-center"
                >
                  ← Scan Next Pass
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MobileScanner;

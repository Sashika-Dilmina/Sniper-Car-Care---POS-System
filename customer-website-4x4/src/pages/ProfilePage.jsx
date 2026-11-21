import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../config/axios';
import BottomNav from '../components/BottomNav';
import QRCode from 'qrcode';
import toast from 'react-hot-toast';
import { downloadBathaqueCardImage } from '../utils/bathaqueQrExport';

const ProfilePage = () => {
  const [searchParams] = useSearchParams();
  const plate = searchParams.get('plate');
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!plate) {
        setError('No vehicle plate provided');
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`/api/public/customer/by-plate?plate=${encodeURIComponent(plate)}`);
        setCustomerData(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [plate]);

  useEffect(() => {
    if (customerData?.customer?.bathaque_id) {
      QRCode.toDataURL(customerData.customer.bathaque_id, {
        width: 320,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
        errorCorrectionLevel: 'H'
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Error generating QR:', err));
    }
  }, [customerData?.customer?.bathaque_id]);

  const handleDownloadPass = async () => {
    if (!customerData?.customer?.bathaque_id) return;
    try {
      setDownloading(true);
      await downloadBathaqueCardImage(customerData.customer);
      toast.success('Loyalty pass image downloaded!');
    } catch (err) {
      console.error('Download error:', err);
      toast.error('Failed to download image');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-black text-white p-4 sticky top-0 z-40">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-widest text-red-600">MY PROFILE</h1>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto mt-4">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <p>{error}</p>
          </div>
        ) : customerData && customerData.customer ? (
          <div className="space-y-6">
            
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
              <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
                {customerData.customer.name ? customerData.customer.name.charAt(0).toUpperCase() : 'C'}
              </div>
              <h2 className="text-2xl font-bold text-gray-900">{customerData.customer.name || 'Customer'}</h2>
              <p className="text-gray-500 mt-1">{customerData.customer.phone || 'No phone added'}</p>
              
              <div className="mt-6 flex justify-center gap-2">
                <span className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-semibold text-gray-700 tracking-wider">
                  {customerData.customer.vehicle_plate}
                </span>
                <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-semibold notranslate" translate="no">
                  {customerData.customer.vehicle_type || 'Vehicle'}
                </span>
              </div>
            </div>

            {/* Bathaque Loyalty QR Pass (Rendered ONLY if customer has a bathaque_id) */}
            {customerData.customer?.bathaque_id ? (
              <div className="bg-gradient-to-br from-gray-950 via-slate-900 to-black rounded-3xl shadow-xl border-2 border-red-500/50 p-6 text-white text-center space-y-5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/15 rounded-full blur-2xl -mr-10 -mt-10"></div>
                
                <div>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-red-400">
                      Sniper Loyalty Club
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white">Your Loyalty QR Pass</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Present this QR code at checkout to earn stamps</p>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-4 rounded-2xl inline-block shadow-xl border-4 border-black mx-auto">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Bathaque Loyalty QR Pass"
                      className="w-52 h-52 object-contain mx-auto"
                    />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center text-gray-400 text-xs">
                      Loading QR...
                    </div>
                  )}
                </div>

                {/* Bathaque ID Pill */}
                <div>
                  <span className="font-mono text-lg font-black tracking-widest text-red-400 bg-red-950/70 border border-red-800/80 px-4 py-1.5 rounded-xl inline-block">
                    {customerData.customer.bathaque_id}
                  </span>
                </div>

                {/* 5-Slot Stamp Visual */}
                <div className="bg-gray-900/80 border border-gray-800 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-300 uppercase tracking-wider">Punch Card</span>
                    <span className="font-black text-red-400">
                      {customerData.customer.wash_stamps || 0} / 5 Stamps
                    </span>
                  </div>

                  <div className="grid grid-cols-6 gap-2">
                    {[1, 2, 3, 4, 5].map((st) => {
                      const earned = (customerData.customer.wash_stamps || 0) >= st;
                      return (
                        <div
                          key={st}
                          className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold border transition ${
                            earned
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow'
                              : 'bg-gray-800/50 border-gray-700 text-gray-500'
                          }`}
                        >
                          {earned ? '✓' : st}
                        </div>
                      );
                    })}
                    <div
                      className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold border transition ${
                        (customerData.customer.wash_stamps || 0) >= 5
                          ? 'bg-amber-500 border-amber-400 text-white shadow-lg animate-pulse'
                          : 'bg-gray-800/50 border-gray-700 text-gray-500'
                      }`}
                      title="6th Wash is 100% Free"
                    >
                      🎁
                    </div>
                  </div>

                  {(customerData.customer.wash_stamps || 0) >= 5 ? (
                    <div className="p-2.5 bg-amber-500/20 border border-amber-400/60 rounded-xl text-center">
                      <p className="text-xs font-black text-amber-300">
                        🎉 You've earned a 100% FREE Wash!
                      </p>
                      <p className="text-[10px] text-amber-200 mt-0.5">
                        Show this QR code at checkout to claim your free service.
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 text-center">
                      {5 - (customerData.customer.wash_stamps || 0)} more wash(es) until your FREE 6th wash!
                    </p>
                  )}
                </div>

                {/* Download Pass Image Action Button */}
                <button
                  type="button"
                  onClick={handleDownloadPass}
                  disabled={downloading}
                  className="w-full py-3.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-gray-800 disabled:to-gray-800 text-white font-extrabold rounded-2xl shadow-xl shadow-red-950/60 flex items-center justify-center gap-2 transition active:scale-[0.98] text-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>{downloading ? 'Preparing Image...' : 'Download Loyalty Pass (Image)'}</span>
                </button>
              </div>
            ) : null}
            
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;

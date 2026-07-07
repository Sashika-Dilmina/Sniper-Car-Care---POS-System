import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../config/axios';
import BottomNav from '../components/BottomNav';
import stamp1 from '../assets/loyalty/stamp-1.png';
import stamp2 from '../assets/loyalty/stamp-2.png';
import stamp3 from '../assets/loyalty/stamp-3.png';
import stamp4 from '../assets/loyalty/stamp-4.png';
import stamp5 from '../assets/loyalty/stamp-5.png';
import freeStamp from '../assets/loyalty/free-stamp.png';

const stamps = [stamp1, stamp2, stamp3, stamp4, stamp5];

const ProfilePage = () => {
  const [searchParams] = useSearchParams();
  const plate = searchParams.get('plate');
  const [customerData, setCustomerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                <span className="px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">
                  {customerData.customer.vehicle_type || 'Vehicle'}
                </span>
              </div>
            </div>

            {/* Loyalty Stamps */}
            {customerData.loyalty && (
              <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl shadow-lg p-6 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
                <h3 className="text-lg font-bold mb-1">Sniper Loyalty</h3>
                <p className="text-sm text-gray-400 mb-6">Earn a free wash every 5 visits</p>
                
                <div className="flex justify-between items-center px-2">
                  {[...Array(5)].map((_, i) => {
                    const isEarned = i < (customerData.loyalty.wash_stamps % 5);
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 relative z-10">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                          isEarned 
                            ? 'shadow-lg shadow-red-600/50 scale-110 ring-2 ring-red-500' 
                            : 'border border-gray-700'
                        }`}>
                          <img src={stamps[i]} alt={`Stamp ${i+1}`} className="w-full h-full object-contain p-0.5 rounded-full" />
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-400 mt-1">{i + 1}</span>
                      </div>
                    );
                  })}
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all ${
                      customerData.loyalty.free_wash_ready 
                        ? 'shadow-lg shadow-red-600/50 scale-110 ring-2 ring-red-500 animate-pulse' 
                        : 'border border-gray-700'
                    }`}>
                      <img src={freeStamp} alt="Free Wash" className="w-full h-full object-contain p-1 rounded-full" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-bold text-red-500 mt-1 uppercase tracking-wide">Free</span>
                  </div>
                </div>
                
                <div className="mt-6 text-center">
                  <p className="text-sm">
                    Total Stamps: <span className="font-bold text-red-500">{customerData.loyalty.wash_stamps}</span>
                  </p>
                  {customerData.loyalty.free_wash_ready && (
                    <div className="mt-3 bg-red-600 text-white text-xs font-bold py-2 px-4 rounded-full inline-block animate-pulse">
                      🎉 You have a FREE wash available!
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;

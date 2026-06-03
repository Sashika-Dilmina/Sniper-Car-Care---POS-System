import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../config/axios';
import BottomNav from '../components/BottomNav';

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
                        <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all ${
                          isEarned 
                            ? 'bg-red-600 text-white shadow-lg shadow-red-600/50 scale-110' 
                            : 'bg-gray-800 text-gray-600 border border-gray-700'
                        }`}>
                          {isEarned ? (
                            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                          ) : (
                            <span className="text-sm sm:text-base font-bold">{i + 1}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

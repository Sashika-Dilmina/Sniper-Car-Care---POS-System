import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const ANPR = () => {
  const [detections, setDetections] = useState([]);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerWebsiteUrl, setCustomerWebsiteUrl] = useState('');
  const navigate = useNavigate();

  // Poll for latest detections every 5 seconds
  useEffect(() => {
    fetchDetections();
    const interval = setInterval(fetchDetections, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDetections = async () => {
    try {
      const response = await axios.get('/api/anpr/latest');
      setDetections(response.data.detections);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch detections');
    }
  };

  useEffect(() => {
    if (selectedDetection?.customer_id) {
      const is4x4 = selectedDetection.vehicle_type && selectedDetection.vehicle_type.toLowerCase().includes('4x4');
      const basePort = is4x4 ? 4000 : 5174;
      const url = `${window.location.protocol}//${window.location.hostname}:${basePort}/?plate=${selectedDetection.plate_number}`;
      setCustomerWebsiteUrl(url);
    } else {
      setCustomerWebsiteUrl('');
    }
  }, [selectedDetection]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(customerWebsiteUrl);
    toast.success('Link copied to clipboard!');
  };

  const sendWelcomeMessage = async () => {
    if (!selectedDetection?.customer_id) return;

    try {
      await axios.post('/api/anpr/send-welcome', {
        customer_id: selectedDetection.customer_id,
        plate_number: selectedDetection.plate_number,
        vehicle_type: selectedDetection.vehicle_type,
      });

      toast.success('Welcome SMS sent successfully!', {
        duration: 4000,
        icon: '📱'
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send welcome message');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">ANPR Live Monitor</h1>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          <span className="text-sm font-medium text-gray-500">Auto-refreshing Live Feed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Detection List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-100">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h2 className="font-bold text-gray-700 flex items-center gap-2">
                <span>🕒</span> Recent Detections
              </h2>
            </div>
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {detections.length > 0 ? (
                detections.map((det) => (
                  <div
                    key={det.id}
                    onClick={() => setSelectedDetection(det)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-blue-50 ${selectedDetection?.id === det.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-lg font-bold font-mono tracking-wider">{det.plate_number}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(det.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {det.customer_id ? (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                          ✅ Existing: {det.customer_name}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          ⚠️ New Vehicle
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <p>Monitoring for incoming vehicles...</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected Detection Detail */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDetection ? (
            <>
              <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Plate Number</p>
                    <h2 className="text-4xl font-black font-mono text-gray-900 tracking-tighter">
                      {selectedDetection.plate_number}
                    </h2>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Detection Date</p>
                    <p className="text-lg font-medium text-gray-800">
                      {new Date(selectedDetection.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 py-6 border-y border-gray-50">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Confidence</p>
                    <p className="text-lg font-semibold text-green-600">
                      {(parseFloat(selectedDetection.confidence) * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Camera ID</p>
                    <p className="text-lg font-semibold text-gray-700">{selectedDetection.camera_id}</p>
                  </div>
                  {selectedDetection.customer_id && (
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Vehicle Category</p>
                      <p className="text-lg font-semibold text-blue-600">{selectedDetection.vehicle_type}</p>
                    </div>
                  )}
                </div>

                {!selectedDetection.customer_id && (
                  <div className="mt-8 p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
                    <div className="flex gap-4">
                      <span className="text-3xl">🚫</span>
                      <div>
                        <h3 className="text-lg font-bold text-amber-800">Unregistered Vehicle</h3>
                        <p className="text-amber-700 mt-1">
                          This vehicle is not in our database. Please go to the <strong>Customers</strong> section to add this customer.
                        </p>
                        <button
                          onClick={() => navigate('/customers')}
                          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-bold text-sm"
                        >
                          Go to Customers Page
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedDetection.customer_id && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-2xl text-white">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 bg-white/20 rounded-full flex items-center justify-center text-3xl">
                        👤
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold">{selectedDetection.customer_name}</h3>
                        <p className="text-blue-100">{selectedDetection.customer_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
                      <span className="text-2xl">📱</span>
                      <span className="font-bold">Portal Live</span>
                    </div>
                  </div>

                  {customerWebsiteUrl && (
                    <div className="bg-white/10 rounded-xl p-6 backdrop-blur-lg border border-white/20 mb-8">
                      <p className="text-sm text-blue-100 mb-3">Customer Service Link:</p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={customerWebsiteUrl}
                          readOnly
                          className="flex-1 bg-black/20 border-white/20 rounded-lg px-4 py-3 font-mono text-sm focus:outline-none"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="bg-white text-blue-700 px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={sendWelcomeMessage}
                      className="flex-1 bg-white text-blue-700 py-4 rounded-xl font-black text-lg hover:bg-blue-50 transition shadow-xl flex items-center justify-center gap-3"
                    >
                      <span>📱</span> SEND WELCOME SMS
                    </button>
                    <button
                      onClick={() => navigate(`/customers/${selectedDetection.customer_id}`)}
                      className="px-6 py-4 bg-black/20 text-white border border-white/30 rounded-xl font-bold hover:bg-black/30 transition flex items-center justify-center"
                    >
                      VIEW PROFILE
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 p-12">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-2xl font-bold text-gray-500">No Vehicle Selected</h2>
              <p className="text-center mt-2 max-w-sm">
                Select a vehicle from the list on the left to view customer details and send the magic service link.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ANPR;


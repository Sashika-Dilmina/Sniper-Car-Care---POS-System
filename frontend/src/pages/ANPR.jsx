import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const ANPR = () => {
  const [detections, setDetections] = useState([]);
  const [selectedDetection, setSelectedDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerWebsiteUrl, setCustomerWebsiteUrl] = useState('');
  const navigate = useNavigate();

  // Manual Customer Assignment Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [assigning, setAssigning] = useState(false);

  // Poll for latest detections every 1 second (instant live feed)
  useEffect(() => {
    fetchDetections();
    const interval = setInterval(fetchDetections, 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchDetections = async () => {
    try {
      const response = await axios.get('/api/anpr/latest');
      const detList = response.data.detections || [];
      setDetections(detList);
      
      // Update currently selected detection if it exists in list
      if (selectedDetection) {
        const updated = detList.find(d => d.id === selectedDetection.id);
        if (updated) {
          setSelectedDetection(updated);
        }
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch detections');
    }
  };

  const fetchAllCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      const activeCustomers = (response.data.customers || []).filter(c => c.is_deleted !== 1);
      setAllCustomers(activeCustomers);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    }
  };

  useEffect(() => {
    if (showAssignModal) {
      fetchAllCustomers();
    }
  }, [showAssignModal]);

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

  const handleAssignCustomer = async (customer) => {
    if (!selectedDetection) return;
    setAssigning(true);
    try {
      await axios.post('/api/anpr/assign-customer', {
        log_id: selectedDetection.id,
        customer_id: customer.id
      });
      toast.success(`Assigned customer "${customer.name}" to plate ${selectedDetection.plate_number}`);
      setShowAssignModal(false);
      setAssignSearch('');
      
      // Update selected detection directly with customer info
      setSelectedDetection(prev => ({
        ...prev,
        customer_id: customer.id,
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_vehicle_plate: customer.vehicle_plate,
        vehicle_type: customer.vehicle_type,
        customer_province: customer.province,
        loyalty_points: customer.loyalty_points || 0,
        wash_stamps: customer.wash_stamps || 0,
        total_orders: customer.total_orders || 0,
        total_spent: customer.total_spent || 0
      }));

      fetchDetections();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign customer');
    } finally {
      setAssigning(false);
    }
  };

  const filteredAssignCustomers = allCustomers.filter(c => {
    if (!assignSearch || !assignSearch.trim()) return true;

    const rawSearch = assignSearch.trim().toLowerCase();
    const cleanSearch = rawSearch.replace(/[\s\-_]+/g, '');

    const name = (c.name || '').toLowerCase();
    const phone = (c.phone || '').toLowerCase();
    const phoneClean = phone.replace(/[^0-9]/g, '');
    const plate = (c.vehicle_plate || '').toLowerCase();
    const plateClean = plate.replace(/[\s\-_]+/g, '');
    const province = (c.province || '').toLowerCase();

    return (
      name.includes(rawSearch) ||
      phone.includes(rawSearch) ||
      (phoneClean && phoneClean.includes(cleanSearch)) ||
      plate.includes(rawSearch) ||
      (plateClean && plateClean.includes(cleanSearch)) ||
      province.includes(rawSearch)
    );
  });

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
                    <div className="mt-1 flex flex-wrap gap-1 items-center">
                      {det.is_manual ? (
                        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                          ✍️ Manual Check-in
                        </span>
                      ) : det.customer_id ? (
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

                {selectedDetection.notes && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-1">Check-in Note / Comment</p>
                    <p className="text-gray-700 italic">"{selectedDetection.notes}"</p>
                  </div>
                )}

                {/* Manual Assign or Change Customer Button */}
                <div className="mt-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase">Matched Customer</p>
                    <p className="text-sm font-bold text-gray-800">
                      {selectedDetection.customer_id ? `${selectedDetection.customer_name} (${selectedDetection.customer_phone || 'No phone'})` : 'No customer matched (Unregistered)'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAssignModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold text-xs flex items-center gap-2 shadow"
                  >
                    <span>👤</span> {selectedDetection.customer_id ? 'Re-assign / Change Customer' : 'Select Customer Manually'}
                  </button>
                </div>

                {!selectedDetection.customer_id && (
                  <div className="mt-6 p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
                    <div className="flex gap-4">
                      <span className="text-3xl">🚫</span>
                      <div>
                        <h3 className="text-lg font-bold text-amber-800">Unregistered Vehicle</h3>
                        <p className="text-amber-700 mt-1">
                          This vehicle is not registered in our database. You can manually select an existing customer above or add a new customer in the Customers tab.
                        </p>
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={() => setShowAssignModal(true)}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-bold text-sm"
                          >
                            Select Customer Manually
                          </button>
                          <button
                            onClick={() => navigate('/customers')}
                            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-bold text-sm"
                          >
                            Go to Customers Page
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedDetection.customer_id && (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-2xl shadow-2xl text-white space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                        👤
                      </div>
                      <div>
                        <h3 className="text-2xl font-black tracking-tight">{selectedDetection.customer_name}</h3>
                        <p className="text-blue-100 font-semibold">{selectedDetection.customer_phone || 'No phone number'}</p>
                        {selectedDetection.customer_province && (
                          <span className="inline-block mt-1 px-2.5 py-0.5 bg-white/20 text-xs rounded-md font-medium">
                            📍 {selectedDetection.customer_province}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-md">
                      <span className="text-xl">📱</span>
                      <span className="font-bold text-sm">Portal Live</span>
                    </div>
                  </div>

                  {/* Customer Full Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/10 text-center">
                    <div>
                      <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Registered Plate</p>
                      <p className="text-sm font-black font-mono mt-0.5">{selectedDetection.customer_vehicle_plate || selectedDetection.plate_number}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Vehicle Type</p>
                      <p className="text-sm font-bold mt-0.5">{selectedDetection.vehicle_type || 'Saloon'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Loyalty / Stamps</p>
                      <p className="text-sm font-bold mt-0.5">{selectedDetection.loyalty_points || 0} pts | {selectedDetection.wash_stamps || 0}/5 Stamps</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-blue-200 uppercase tracking-wider">Orders / Spent</p>
                      <p className="text-sm font-bold mt-0.5">{selectedDetection.total_orders || 0} orders (AED {parseFloat(selectedDetection.total_spent || 0).toFixed(2)})</p>
                    </div>
                  </div>

                  {customerWebsiteUrl && (
                    <div className="bg-white/10 rounded-xl p-4 backdrop-blur-lg border border-white/20">
                      <p className="text-xs text-blue-100 mb-2 font-bold">Customer Service Link:</p>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={customerWebsiteUrl}
                          readOnly
                          className="flex-1 bg-black/20 border-white/20 rounded-lg px-4 py-2.5 font-mono text-xs focus:outline-none"
                        />
                        <button
                          onClick={copyToClipboard}
                          className="bg-white text-blue-700 px-5 py-2.5 rounded-lg font-bold hover:bg-gray-100 transition shadow-lg text-sm"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <button
                      onClick={sendWelcomeMessage}
                      className="flex-1 bg-white text-blue-700 py-3.5 rounded-xl font-black text-base hover:bg-blue-50 transition shadow-xl flex items-center justify-center gap-3"
                    >
                      <span>📱</span> SEND WELCOME SMS
                    </button>
                    <button
                      onClick={() => navigate(`/customers/${selectedDetection.customer_id}`)}
                      className="px-6 py-3.5 bg-black/20 text-white border border-white/30 rounded-xl font-bold hover:bg-black/30 transition flex items-center justify-center text-sm"
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

      {/* Manual Customer Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-5 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">Select Customer for Detection</h2>
                <p className="text-indigo-100 text-xs mt-0.5">
                  Plate Scanned: <span className="font-mono font-bold text-white">{selectedDetection?.plate_number}</span>
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-white hover:bg-indigo-700 p-1 rounded-lg text-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <input
                type="text"
                placeholder="Search by name, phone, plate, or Emirate..."
                value={assignSearch}
                onChange={(e) => setAssignSearch(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                autoFocus
              />

              <div className="max-h-64 overflow-y-auto divide-y border rounded-xl">
                {filteredAssignCustomers.length > 0 ? (
                  filteredAssignCustomers.map(cust => (
                    <div
                      key={cust.id}
                      onClick={() => !assigning && handleAssignCustomer(cust)}
                      className="p-3 hover:bg-indigo-50 cursor-pointer flex justify-between items-center transition"
                    >
                      <div>
                        <p className="font-bold text-sm text-gray-900">{cust.name}</p>
                        <p className="text-xs text-gray-500">{cust.phone || 'No phone'} • {cust.province || 'UAE'}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-xs font-bold bg-gray-100 px-2.5 py-1 rounded text-gray-700">
                          {cust.vehicle_plate}
                        </span>
                        <span className="block text-[10px] text-indigo-600 font-bold mt-1">Select →</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-gray-400 text-sm">
                    No customers found matching "{assignSearch}"
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ANPR;

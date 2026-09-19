import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import BathaqueQRModal from '../components/BathaqueQRModal';
import { downloadBathaqueCardImage } from '../utils/bathaqueQrExport';

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showBathaqueQrModal, setShowBathaqueQrModal] = useState(false);
  const [checkinForm, setCheckinForm] = useState({
    customer_id: '',
    name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_type: 'Saloon',
    province: 'Dubai',
    notes: 'Camera offline - manual scan'
  });

  useEffect(() => {
    fetchCustomer();

    const interval = setInterval(() => {
      fetchCustomer(true);
    }, 7000);

    return () => clearInterval(interval);
  }, [id]);

  const fetchCustomer = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`/api/customers/${id}`);
      setCustomer(response.data.customer);
      setOrders(response.data.orders || []);
    } catch (error) {
      if (!silent) toast.error('Failed to load customer details');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleOpenCheckin = () => {
    if (!customer) return;
    setCheckinForm({
      customer_id: customer.id,
      name: customer.name || '',
      phone: customer.phone || '',
      vehicle_plate: customer.vehicle_plate || '',
      vehicle_type: customer.vehicle_type || 'Saloon',
      province: customer.province || 'Dubai',
      notes: 'Camera offline - manual scan'
    });
    setShowCheckinModal(true);
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/anpr/manual-checkin', checkinForm);
      toast.success(response.data.message || 'Manual check-in completed!');
      setShowCheckinModal(false);
      fetchCustomer(); // Refresh customer details
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to perform check-in');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!customer) {
    return <div>Customer not found</div>;
  }

  const loyaltyPoints = customer.loyalty_points || 0;
  const servicesCompleted = Math.floor(loyaltyPoints / 25);
  const pointsToFreeService = 100 - loyaltyPoints;
  const isEligibleForFree = loyaltyPoints >= 100;
  const progressPercentage = Math.min((loyaltyPoints / 100) * 100, 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Customer Details</h1>
        <div className="flex items-center gap-3">
          {customer.bathaque_id && (
            <>
              <button
                onClick={async () => {
                  try {
                    toast.loading('Generating QR Image...', { id: 'download-qr' });
                    await downloadBathaqueCardImage(customer);
                    toast.success('Loyalty Pass Image downloaded!', { id: 'download-qr' });
                  } catch (e) {
                    toast.error('Failed to download QR image', { id: 'download-qr' });
                  }
                }}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-lg hover:from-emerald-700 hover:to-green-800 transition flex items-center gap-2 shadow font-bold text-sm"
                title="Download Loyalty Pass as PNG Image"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download QR Image
              </button>
              <button
                onClick={() => setShowBathaqueQrModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition flex items-center gap-2 shadow font-bold text-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Print QR Pass
              </button>
            </>
          )}
          <button
            onClick={handleOpenCheckin}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 shadow text-sm font-semibold"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Manual Check-in
          </button>
          <Link to={`/customers/${customer.id}/edit`} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition text-sm font-semibold">
            Edit
          </Link>
          <Link to="/customers" className="text-primary-600 hover:underline text-sm font-semibold">
            ← Back
          </Link>
        </div>
      </div>

      {/* Bathaque Multi-Vehicle Loyalty Card */}
      {customer.bathaque_id ? (
        <div className="bg-gradient-to-br from-gray-900 via-slate-900 to-neutral-900 border-2 border-red-500/40 p-6 rounded-2xl shadow-xl text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-700/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/90 text-white">
                  Multi-Vehicle Loyalty
                </span>
                <span className="text-xs text-gray-400">Buy 5 Washes, 6th Wash FREE</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-gray-400 uppercase font-semibold">Bathaque ID:</span>
                <span className="font-mono text-2xl font-black tracking-widest text-red-400 bg-red-950/60 border border-red-800/80 px-3.5 py-1 rounded-xl">
                  {customer.bathaque_id}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  {customer.bathaque_loyalty?.wash_stamps || 0} <span className="text-sm font-normal text-gray-400">/ 5 Stamps</span>
                </div>
                <div className="text-xs text-gray-400">
                  Total: {customer.bathaque_loyalty?.total_washes || 0} washes · {customer.bathaque_loyalty?.free_washes_redeemed || 0} redeemed
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    toast.loading('Generating QR Image...', { id: 'download-qr' });
                    await downloadBathaqueCardImage(customer);
                    toast.success('Loyalty Pass Image downloaded!', { id: 'download-qr' });
                  } catch (e) {
                    toast.error('Failed to download QR image', { id: 'download-qr' });
                  }
                }}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition"
                title="Download Loyalty Card PNG"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Image
              </button>
              <button
                onClick={() => setShowBathaqueQrModal(true)}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Pass
              </button>
            </div>
          </div>

          {/* Punch Card Circles */}
          <div className="pt-6">
            <div className="grid grid-cols-6 gap-3 max-w-2xl mx-auto">
              {[1, 2, 3, 4, 5].map((stampNum) => {
                const isStamped = (customer.bathaque_loyalty?.wash_stamps || 0) >= stampNum;
                return (
                  <div
                    key={stampNum}
                    className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                      isStamped
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-lg shadow-emerald-950/50'
                        : 'bg-gray-800/40 border-dashed border-gray-700 text-gray-500'
                    }`}
                  >
                    <span className="text-xl font-black">
                      {isStamped ? '✓' : stampNum}
                    </span>
                    <span className="text-[10px] uppercase font-bold tracking-wider mt-0.5">
                      {isStamped ? 'Wash' : `Wash ${stampNum}`}
                    </span>
                  </div>
                );
              })}

              {/* 6th Wash is FREE */}
              <div
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border-2 text-center p-1 relative overflow-hidden transition-all ${
                  (customer.bathaque_loyalty?.wash_stamps || 0) >= 5
                    ? 'bg-gradient-to-br from-amber-500 to-yellow-600 border-amber-300 text-white shadow-xl shadow-amber-900/60 animate-pulse'
                    : 'bg-gray-800/40 border-dashed border-amber-600/40 text-gray-500'
                }`}
              >
                <span className="text-2xl">🎁</span>
                <span className="text-[10px] uppercase font-black tracking-wider leading-tight">
                  {(customer.bathaque_loyalty?.wash_stamps || 0) >= 5 ? 'FREE NOW!' : 'FREE (6th)'}
                </span>
              </div>
            </div>

            {/* Status message */}
            <div className="mt-4 text-center">
              {(customer.bathaque_loyalty?.wash_stamps || 0) >= 5 ? (
                <span className="inline-block px-4 py-1.5 bg-amber-500/20 border border-amber-500 text-amber-300 rounded-full text-xs font-bold">
                  🎉 Eligible for 100% FREE WASH on this visit!
                </span>
              ) : (
                <span className="text-xs text-gray-400">
                  {5 - (customer.bathaque_loyalty?.wash_stamps || 0)} more wash(es) needed to unlock FREE 6th wash.
                </span>
              )}
            </div>

            {/* Linked Vehicles sharing this Bathaque ID */}
            {customer.linked_bathaque_vehicles && customer.linked_bathaque_vehicles.length > 1 && (
              <div className="mt-5 pt-4 border-t border-gray-800">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Linked Vehicles Sharing This Loyalty Pool ({customer.linked_bathaque_vehicles.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {customer.linked_bathaque_vehicles.map((veh) => (
                    <Link
                      key={veh.id}
                      to={`/customers/${veh.id}`}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition ${
                        veh.id === customer.id
                          ? 'bg-red-950/80 border border-red-600 text-red-300'
                          : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-500'
                      }`}
                    >
                      <span>🚗</span>
                      <span>{veh.vehicle_plate}</span>
                      <span className="text-[10px] font-sans font-normal opacity-70">({veh.vehicle_type})</span>
                      {veh.id === customer.id && <span className="text-[10px] bg-red-600 text-white px-1 rounded">Current</span>}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">No Bathaque ID Assigned</h4>
              <p className="text-xs text-amber-700">
                Assign a Bathaque ID to this customer to enable 5-wash loyalty punch cards and link multiple vehicles together.
              </p>
            </div>
          </div>
          <Link
            to={`/customers/${customer.id}/edit`}
            className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-xl hover:bg-amber-700 transition shrink-0"
          >
            Assign Bathaque ID
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Customer Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold">{customer.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-lg">{customer.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vehicle Plate</p>
              <p className="text-lg font-mono">{customer.vehicle_plate}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Vehicle Type</p>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full notranslate" translate="no">
                {customer.vehicle_type}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-600">Province</p>
              <p className="text-lg">{customer.province || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Member Since</p>
              <p className="text-lg">{new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Order History</h2>
          {orders.length === 0 ? (
            <p className="text-gray-500">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <Link
                  key={order.id}
                  to={`/orders/${order.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">AED {parseFloat(order.total).toLocaleString()}</p>
                      {order.status === 'cancelled' || order.payment_status === 'cancelled' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-semibold border border-red-200">
                          cancelled
                        </span>
                      ) : order.payment_status === 'credit' ? (
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 font-semibold border border-purple-200">
                          Credit
                        </span>
                      ) : order.credit_status ? (
                        order.credit_status === 'unpaid' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 font-semibold border border-purple-200">
                            Credit
                          </span>
                        ) : order.credit_status === 'partially_paid' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-semibold">
                            Credit / Partial
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800 font-semibold">
                            Paid
                          </span>
                        )
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {order.payment_status}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Manual Check-in Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary-600 p-6 text-white text-center">
              <h2 className="text-2xl font-bold">Manual Vehicle Check-In</h2>
              <p className="text-primary-100 text-sm mt-1">
                For customer {checkinForm.name} ({checkinForm.vehicle_plate})
              </p>
            </div>
            <form onSubmit={handleCheckinSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={checkinForm.name}
                    onChange={(e) => setCheckinForm({ ...checkinForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number (971...)</label>
                  <input
                    type="tel"
                    required
                    value={checkinForm.phone}
                    onChange={(e) => setCheckinForm({ ...checkinForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="+971XXXXXXXXX"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Plate</label>
                    <input
                      type="text"
                      required
                      value={checkinForm.vehicle_plate}
                      onChange={(e) => setCheckinForm({ ...checkinForm, vehicle_plate: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                      placeholder="DXB123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Type</label>
                    <select
                      value={checkinForm.vehicle_type}
                      onChange={(e) => setCheckinForm({ ...checkinForm, vehicle_type: e.target.value })}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none notranslate"
                      translate="no"
                    >
                      <option value="Saloon">Saloon</option>
                      <option value="4x4">4x4</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={checkinForm.province}
                    onChange={(e) => setCheckinForm({ ...checkinForm, province: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Dubai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Check-in Note / Comment *</label>
                  <textarea
                    required
                    value={checkinForm.notes}
                    onChange={(e) => setCheckinForm({ ...checkinForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none h-20 resize-none"
                    placeholder="e.g., Gate camera failed, manually scanned at entrance."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold transition shadow-lg shadow-primary-200"
                >
                  Check-in & SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bathaque Loyalty QR Pass Modal */}
      {showBathaqueQrModal && customer && (
        <BathaqueQRModal
          customer={customer}
          onClose={() => setShowBathaqueQrModal(false)}
        />
      )}
    </div>
  );
};

export default CustomerDetail;


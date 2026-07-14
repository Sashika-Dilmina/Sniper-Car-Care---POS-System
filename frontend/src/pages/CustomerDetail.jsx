import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
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
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenCheckin}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 shadow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Manual Check-in
          </button>
          <Link to="/customers" className="text-primary-600 hover:underline">
            ← Back to Customers
          </Link>
        </div>
      </div>

      {/* Loyalty Status Card */}
      <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 rounded-lg shadow-lg text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              💛 Loyalty Rewards
            </h2>
            <p className="text-lg opacity-90">
              {servicesCompleted} services completed
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{loyaltyPoints}</div>
            <div className="text-sm opacity-90">Loyalty Points</div>
          </div>
        </div>
      </div>

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
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
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
                      {order.credit_status ? (
                        order.credit_status === 'unpaid' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-semibold">
                            Credit / Unpaid
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
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
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
    </div>
  );
};

export default CustomerDetail;


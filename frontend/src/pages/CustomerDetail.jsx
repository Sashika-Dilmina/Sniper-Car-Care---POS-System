import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const CustomerDetail = () => {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      const response = await axios.get(`/api/customers/${id}`);
      setCustomer(response.data.customer);
      setOrders(response.data.orders || []);
    } catch (error) {
      toast.error('Failed to load customer details');
    } finally {
      setLoading(false);
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
        <Link to="/customers" className="text-primary-600 hover:underline">
          ← Back to Customers
        </Link>
      </div>

      {/* Loyalty Status Card */}
      <div className={`bg-gradient-to-r ${isEligibleForFree ? 'from-green-500 to-green-600' : 'from-yellow-400 to-yellow-500'} p-6 rounded-lg shadow-lg text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              {isEligibleForFree ? '🎉 FREE Service Available!' : '💛 Loyalty Rewards'}
            </h2>
            <p className="text-lg opacity-90">
              {isEligibleForFree
                ? 'Customer has earned a free service!'
                : `${servicesCompleted} of 4 services completed`}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{loyaltyPoints}</div>
            <div className="text-sm opacity-90">Loyalty Points</div>
          </div>
        </div>

        {!isEligibleForFree && (
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress to FREE service</span>
              <span>{pointsToFreeService} points needed</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            <p className="text-xs mt-2 opacity-90">
              Each service = 25 points • 4 services = 100 points = 1 FREE service
            </p>
          </div>
        )}

        {isEligibleForFree && (
          <div className="mt-4 flex gap-3">
            <button
              className="px-6 py-2 bg-white text-green-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              onClick={() => {
                toast.info('Redeem free service feature - Coming soon!');
              }}
            >
              Redeem Free Service
            </button>
            <div className="flex items-center text-sm opacity-90">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              Points will reset to 0 after redemption
            </div>
          </div>
        )}
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
                      <span className={`px-2 py-1 text-xs rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {order.payment_status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerDetail;


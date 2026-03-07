import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', payment_status: '', date: '', service_time: '' });

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.payment_status) params.append('payment_status', filter.payment_status);
      if (filter.date) params.append('date', filter.date);
      if (filter.service_time) params.append('service_time', filter.service_time);

      const response = await axios.get(`/api/orders?${params.toString()}`);
      setOrders(response.data.orders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const calculateServiceTime = (order) => {
    if (!order.service_time_minutes) return null;
    return order.service_time_minutes;
  };

  const getServiceTimeColor = (serviceTimeMinutes) => {
    if (serviceTimeMinutes === null || serviceTimeMinutes === undefined) return '';
    return serviceTimeMinutes < 30 ? 'green' : 'red';
  };

  const formatServiceTime = (serviceTimeMinutes) => {
    if (serviceTimeMinutes === null || serviceTimeMinutes === undefined) return 'N/A';
    if (serviceTimeMinutes < 60) {
      return `${serviceTimeMinutes} min`;
    }
    const hours = Math.floor(serviceTimeMinutes / 60);
    const minutes = serviceTimeMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
      </div>

      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap gap-4">
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Status</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filter.payment_status}
          onChange={(e) => setFilter({ ...filter, payment_status: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Payment Status</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={filter.service_time}
          onChange={(e) => setFilter({ ...filter, service_time: e.target.value })}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Service Times</option>
          <option value="fast">Less than 30 min</option>
          <option value="slow">30 min or more</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filter.date}
            onChange={(e) => setFilter({ ...filter, date: e.target.value })}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {filter.date && (
            <button
              onClick={() => setFilter({ ...filter, date: '' })}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Clear date filter"
            >
              ✕
            </button>
          )}
        </div>
        {(filter.status || filter.payment_status || filter.service_time || filter.date) && (
          <button
            onClick={() => setFilter({ status: '', payment_status: '', date: '', service_time: '' })}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Plate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {orders.length > 0 ? (
              orders.map((order) => {
                const serviceTime = calculateServiceTime(order);
                const serviceTimeColor = getServiceTimeColor(serviceTime);
                const isCompleted = order.status === 'completed';

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 ${isCompleted && serviceTimeColor === 'green' ? 'bg-green-50' :
                        isCompleted && serviceTimeColor === 'red' ? 'bg-red-50' :
                          ''
                      }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        #{order.id}
                        {order.source === 'customer_website' && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full" title="Customer Website Order">
                            🌐
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{order.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">{order.vehicle_plate || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      AED {parseFloat(order.total).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.status === 'completed' ? (
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${serviceTimeColor === 'green'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                          }`}>
                          {formatServiceTime(serviceTime)}
                        </span>
                      ) : (
                        <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          {order.status === 'processing' ? 'In Progress' : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' :
                          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="mt-2 text-gray-600">No orders found matching your filters</p>
                  <button
                    onClick={() => setFilter({ status: '', payment_status: '', date: '', service_time: '' })}
                    className="mt-4 text-primary-600 hover:underline text-sm"
                  >
                    Clear all filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Orders;


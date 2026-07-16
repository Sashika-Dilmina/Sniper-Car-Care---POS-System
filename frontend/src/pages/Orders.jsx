import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getInitialFilter = () => {
    const saved = sessionStorage.getItem('orders_filter');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return { status: '', payment_status: '', date: getTodayDateString(), service_time: '' };
  };

  const getInitialActiveTab = () => {
    const saved = sessionStorage.getItem('orders_active_tab');
    return saved || 'all';
  };

  const [filter, setFilter] = useState(getInitialFilter());
  const [activeTab, setActiveTab] = useState(getInitialActiveTab());

  useEffect(() => {
    sessionStorage.setItem('orders_filter', JSON.stringify(filter));
    fetchOrders(false);

    const interval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    sessionStorage.setItem('orders_active_tab', activeTab);
  }, [activeTab]);

  const fetchOrders = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.payment_status) params.append('payment_status', filter.payment_status);
      if (filter.date) params.append('date', filter.date);
      if (filter.service_time) params.append('service_time', filter.service_time);

      const response = await axios.get(`/api/orders?${params.toString()}`);
      setOrders(response.data.orders);
    } catch (error) {
      if (!silent) toast.error('Failed to load orders');
    } finally {
      if (!silent) setLoading(false);
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

  const filteredOrders = orders.filter((order) => {
    const hasProducts = order.items && order.items.some(item => item.category === 'Accessories' || item.category === 'Spare Parts' || item.category === 'Car Freshner' || item.category === 'Acce');
    if (activeTab === 'products') return hasProducts;
    if (activeTab === 'all') return true;
    
    const vt = (order.vehicle_type || '').toLowerCase();
    const src = (order.source || '').toLowerCase();
    const isOrder4x4 = vt === '4x4' || src.includes('4x4') || (order.notes && order.notes.toLowerCase().includes('4x4'));
    if (activeTab === '4x4') return isOrder4x4;
    return !isOrder4x4;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Orders</h1>
      </div>

      {/* Tabs for Saloon, 4x4, and Products */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'all'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('saloon')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'saloon'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span className="notranslate" translate="no">Saloon</span> Orders ({orders.filter(o => {
            const vt = (o.vehicle_type || '').toLowerCase();
            const src = (o.source || '').toLowerCase();
            return !(vt === '4x4' || src.includes('4x4') || (o.notes && o.notes.toLowerCase().includes('4x4')));
          }).length})
        </button>
        <button
          onClick={() => setActiveTab('4x4')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
            activeTab === '4x4'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          4x4 Orders ({orders.filter(o => {
            const vt = (o.vehicle_type || '').toLowerCase();
            const src = (o.source || '').toLowerCase();
            return vt === '4x4' || src.includes('4x4') || (o.notes && o.notes.toLowerCase().includes('4x4'));
          }).length})
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'products'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Product Orders ({orders.filter(o => o.items && o.items.some(i => i.category === 'Accessories' || i.category === 'Spare Parts' || i.category === 'Car Freshner' || i.category === 'Acce')).length})
        </button>
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
          {filter.date !== getTodayDateString() && (
            <button
              onClick={() => setFilter({ ...filter, date: getTodayDateString() })}
              className="px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Reset to today"
            >
              ✕
            </button>
          )}
        </div>
        {(filter.status || filter.payment_status || filter.service_time || filter.date !== getTodayDateString()) && (
          <button
            onClick={() => setFilter({ status: '', payment_status: '', date: getTodayDateString(), service_time: '' })}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            Clear All Filters
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-auto max-h-[calc(100vh-260px)]">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Plate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items / Products</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service Time</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const serviceTime = calculateServiceTime(order);
                const serviceTimeColor = getServiceTimeColor(serviceTime);
                const isCompleted = order.status === 'completed';
                const isVipOrder = order.vip_booking_id !== null && order.vip_booking_id !== undefined;
                const isProductOnly = order.items && order.items.length > 0 && order.items.every(item => item.category !== 'Services');

                const hasDiscount = order.discount && parseFloat(order.discount) > 0;

                return (
                  <tr
                    key={order.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      hasDiscount ? 'bg-red-50/70 hover:bg-red-100/70 border-l-4 border-red-500' :
                      isVipOrder ? 'bg-purple-50/60 hover:bg-purple-100/60 border-l-4 border-purple-500' :
                      isCompleted && !isProductOnly && serviceTimeColor === 'green' ? 'bg-green-50/60' :
                      isCompleted && !isProductOnly && serviceTimeColor === 'red' ? 'bg-red-50/60' :
                      ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        #{order.id}
                        {isVipOrder && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200" title="VIP Order">
                            VIP ⭐
                          </span>
                        )}
                        {order.source === 'customer_website' && !isVipOrder && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full" title="Customer Website Order">
                            🌐
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{order.customer_name || 'Walk-in'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">{order.vehicle_plate || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.items && order.items.length > 0 ? (
                        <div className="flex flex-col gap-1 max-w-xs truncate">
                          {order.items.map((item, idx) => (
                            <span key={idx} className="text-xs text-gray-700 block bg-gray-100 px-2 py-0.5 rounded w-max">
                              {item.product_name} x{item.quantity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Service Booking</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={hasDiscount ? "font-bold text-red-600" : "font-semibold text-gray-900"}>
                          AED {parseFloat(order.total).toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded w-max mt-0.5 notranslate" translate="no">
                            Discount: AED {parseFloat(order.discount).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isProductOnly ? (
                        <span className="text-gray-400 text-xs">N/A (Product Only)</span>
                      ) : order.status === 'completed' ? (
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
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isProductOnly ? 'bg-green-100 text-green-800' :
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {isProductOnly ? 'Order Placed' : order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                        <span className={`px-2 py-1 text-xs rounded-full ${
                            order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                            order.payment_status === 'free' ? 'bg-green-100 text-green-800 font-semibold uppercase' :
                            order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                          }`}>
                          {order.payment_status}
                        </span>
                      )}
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
                  <p className="mt-2 text-gray-600 font-medium">No orders found for this selection</p>
                  <button
                    onClick={() => {
                      setFilter({ status: '', payment_status: '', date: getTodayDateString(), service_time: '' });
                      setActiveTab('all');
                    }}
                    className="mt-4 text-primary-600 hover:underline text-sm font-bold"
                  >
                    Reset all filters & tabs
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


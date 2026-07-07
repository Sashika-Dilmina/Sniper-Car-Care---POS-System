import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../config/axios';
import BottomNav from '../components/BottomNav';
import { getServiceImage } from '../config/siteImages';
import toast from 'react-hot-toast';

const HistoryPage = () => {
  const [searchParams] = useSearchParams();
  const plate = searchParams.get('plate');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Real-time order status notifications & screen sync
  useEffect(() => {
    if (!plate) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkOrderStatusNotifications = async () => {
      try {
        const response = await axios.get(`/api/public/customer/orders?plate=${encodeURIComponent(plate)}`);
        const ordersList = response.data.orders || [];

        // Sync order status on screen in real-time
        setOrders(prevOrders => {
          let stateChanged = false;
          const updatedList = prevOrders.map(ord => {
            const match = ordersList.find(o => o.id === ord.id);
            if (match && match.status !== ord.status) {
              stateChanged = true;
              return { ...ord, status: match.status };
            }
            return ord;
          });
          return stateChanged ? updatedList : prevOrders;
        });

        // Load previously seen statuses
        const storageKey = `seen_orders_${plate}`;
        const seenOrders = JSON.parse(localStorage.getItem(storageKey) || '{}');
        let updated = false;

        ordersList.forEach(order => {
          const prevStatus = seenOrders[order.id];
          
          if (prevStatus !== undefined && prevStatus !== order.status) {
            // Status changed!
            let title = '';
            let body = '';

            if (order.status === 'processing') {
              title = 'Order Confirmed 🚗';
              body = `Your service (Order #${order.id}) has been confirmed by our staff and is now in progress!`;
            } else if (order.status === 'completed') {
              title = 'Service Completed! ✨';
              body = `Your vehicle is ready. You can view payment details and complete checkout on the site.`;
            } else if (order.status === 'cancelled') {
              title = 'Order Cancelled ❌';
              body = `Your order #${order.id} has been cancelled.`;
            }

            if (title) {
              // Show in-app toast
              toast.success(
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gray-900">{title}</span>
                  <span className="text-xs text-gray-600 mt-0.5">{body}</span>
                </div>,
                { duration: 8000 }
              );

              // Show browser native notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
              }
            }
            updated = true;
          }
          
          // Update status in storage
          seenOrders[order.id] = order.status;
        });

        // Save current statuses if it's the first run (initialize)
        ordersList.forEach(order => {
          if (seenOrders[order.id] === undefined) {
            seenOrders[order.id] = order.status;
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(storageKey, JSON.stringify(seenOrders));
        }
      } catch (err) {
        console.error('Error fetching orders for notifications:', err);
      }
    };

    // Run initially and then every 10 seconds
    const interval = setInterval(checkOrderStatusNotifications, 10000);

    return () => clearInterval(interval);
  }, [plate]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!plate) {
        setError('No vehicle plate provided');
        setLoading(false);
        return;
      }
      try {
        const response = await axios.get(`/api/public/customer/orders?plate=${encodeURIComponent(plate)}`);
        setOrders(response.data.orders);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [plate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-black text-white p-4 sticky top-0 z-40">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-widest text-red-600">SERVICE HISTORY</h1>
          {plate && <p className="text-xs text-gray-400 mt-1">{plate}</p>}
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
            <p>{error}</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
            <p>No service history found for this vehicle.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 p-3 flex justify-between items-center">
                  <span className="text-xs font-medium text-gray-500">{formatDate(order.created_at)}</span>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                    order.status === 'completed' ? 'bg-green-100 text-green-700' : 
                    order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {order.status}
                  </span>
                </div>
                <div className="p-4">
                  {order.items && order.items.length > 0 ? (
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <img src={getServiceImage(item.product_name)} alt={item.product_name} className="w-10 h-10 object-cover rounded-md bg-gray-100" />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{item.product_name}</p>
                              <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-gray-900">AED {item.price}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600 italic">Service Booking Only</div>
                  )}
                  
                  <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Total Paid</span>
                    <span className="text-lg font-black text-red-600">AED {order.total}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default HistoryPage;

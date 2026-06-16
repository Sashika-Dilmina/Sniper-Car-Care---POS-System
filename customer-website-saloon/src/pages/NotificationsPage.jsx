import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import BottomNav from '../components/BottomNav';
import toast from 'react-hot-toast';

const NotificationsPage = () => {
  const [searchParams] = useSearchParams();
  const plate = searchParams.get('plate');
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async (showLoading = false) => {
    if (!plate) {
      setError('No vehicle plate provided');
      setLoading(false);
      return;
    }
    if (showLoading) setLoading(true);
    try {
      const response = await axios.get(`/api/public/customer/notifications?plate=${encodeURIComponent(plate)}`);
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    if (!plate) return;
    try {
      await axios.post('/api/public/customer/notifications/mark-read', { plate });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };

  useEffect(() => {
    fetchNotifications(true);
    // Automatically mark notifications as read when entering the page
    markAllAsRead();

    // Poll every 10 seconds for new notifications
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [plate]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-black text-white p-4 sticky top-0 z-40 flex items-center justify-between">
        <button 
          onClick={() => navigate(`/?plate=${encodeURIComponent(plate || '')}`)} 
          className="p-1 hover:text-red-500 transition outline-none"
          aria-label="Go Back"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center flex-1 pr-6">
          <h1 className="text-xl font-bold tracking-widest text-red-600">NOTIFICATIONS</h1>
          {plate && <p className="text-xs text-gray-400 mt-1 font-mono">{plate}</p>}
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
            </svg>
            <p className="font-semibold text-gray-700">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-500 space-y-4">
            <div className="relative w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-3xl">
              📭
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-800 text-lg">All caught up!</p>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                No notifications at the moment. We will notify you here once your service requests are confirmed.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                History ({notifications.length})
              </span>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="text-xs font-bold text-red-600 hover:text-red-700 transition"
                >
                  Mark all as read
                </button>
              )}
            </div>

            <div className="space-y-3">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 ${
                    n.is_read 
                      ? 'bg-white border-gray-200 text-gray-600' 
                      : 'bg-red-50/40 border-red-100 text-gray-900 font-medium ring-1 ring-red-50'
                  }`}
                >
                  {!n.is_read && (
                    <span className="absolute top-4 left-3 flex h-2 w-2 rounded-full bg-red-600" />
                  )}
                  <div className={`flex justify-between items-start gap-4 ${!n.is_read ? 'pl-4' : ''}`}>
                    <div className="space-y-1 flex-1">
                      <h3 className="text-sm font-bold text-gray-900 leading-tight">
                        {n.title}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {n.message}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                      {formatDate(n.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default NotificationsPage;

import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Layout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const maxOrderIdRef = useRef(0);

  // Setup real-time order poller for admin/staff dashboard
  useEffect(() => {
    if (!user) return;

    // Request browser notification permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const playNotificationChime = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Note 1 (D5)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime);
        gain1.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.3);

        // Note 2 (A5)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15);
        gain2.gain.setValueAtTime(0.1, audioCtx.currentTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
        osc2.start(audioCtx.currentTime + 0.15);
        osc2.stop(audioCtx.currentTime + 0.55);
      } catch (error) {
        console.warn('Notification sound playback failed:', error.message);
      }
    };

    const pollNewOrders = async () => {
      try {
        const response = await axios.get('/api/orders');
        const orders = response.data.orders || [];
        
        if (orders.length === 0) return;

        // If it's the first poll, initialize maxOrderIdRef
        if (maxOrderIdRef.current === 0) {
          const maxId = Math.max(...orders.map(o => o.id));
          maxOrderIdRef.current = maxId;
          return;
        }

        // Check for new orders
        const newOrders = orders.filter(o => o.id > maxOrderIdRef.current);
        if (newOrders.length > 0) {
          // Update max ID
          const maxId = Math.max(...newOrders.map(o => o.id));
          maxOrderIdRef.current = maxId;

          // Notify for each new order
          newOrders.forEach(order => {
            // Visual Toast Notification
            toast.success(
              <div className="flex flex-col text-left">
                <span className="font-bold text-gray-900">New Booking Placed! 🚗</span>
                <span className="text-xs text-gray-600 mt-1">
                  Order #{order.id} - {order.customer_name || 'Walk-in'} ({order.vehicle_plate || 'N/A'})
                </span>
                <span className="text-xs text-primary-600 font-bold mt-0.5">
                  Total: AED {parseFloat(order.total).toLocaleString()}
                </span>
              </div>,
              { duration: 8000 }
            );

            // Native Browser Push Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`New Sniper Booking! 🚗`, {
                body: `Order #${order.id} - ${order.customer_name || 'Walk-in'} (${order.vehicle_plate || 'N/A'})\nTotal: AED ${parseFloat(order.total).toLocaleString()}`,
              });
            }

            // Audio notification sound
            playNotificationChime();
          });
        }
      } catch (err) {
        console.error('Failed to poll new orders:', err.message);
      }
    };

    // Run initially and then every 7 seconds
    pollNewOrders();
    const interval = setInterval(pollNewOrders, 7000);

    return () => clearInterval(interval);
  }, [user]);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const navIcons = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    sales: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
    ),
    customers: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    products: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    orders: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    services: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      </svg>
    ),
    employees: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    anpr: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    reports: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    vip: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    sells: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    purchases: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    suppliers: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    expenses: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    credits: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  };

  // Define nav items based on user role to ensure custom layout ordering for admin and staff
  let navItems = [];
  if (user?.role === 'admin') {
    navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/orders', label: 'Orders', icon: 'orders' },
      { path: '/sales', label: 'Sells', icon: 'sells' },
      { path: '/purchases', label: 'Purchases', icon: 'purchases' },
      { path: '/suppliers', label: 'Suppliers', icon: 'suppliers' },
      { path: '/customers', label: 'Customers', icon: 'customers' },
      { path: '/credits', label: 'Credits', icon: 'credits' },
      { path: '/products', label: 'Products', icon: 'products' },
      { path: '/services', label: 'Services', icon: 'services' },
      { path: '/employees', label: 'Employees', icon: 'employees' },
      { path: '/vip', label: 'VIP', icon: 'vip' },
      { path: '/expenses', label: 'Expenses', icon: 'expenses' },
      { path: '/anpr', label: 'ANPR', icon: 'anpr' },
      { path: '/reports', label: 'Reports', icon: 'reports' },
    ];
  } else {
    // Staff role: keeps their old layout structure with Orders second
    navItems = [
      { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { path: '/orders', label: 'Orders', icon: 'orders' },
      { path: '/sales', label: 'Sells', icon: 'sells' },
      { path: '/customers', label: 'Customers', icon: 'customers' },
      { path: '/credits', label: 'Credits', icon: 'credits' },
      { path: '/products', label: 'Products', icon: 'products' },
      { path: '/services', label: 'Services', icon: 'services' },
      { path: '/vip', label: 'VIP', icon: 'vip' },
      { path: '/anpr', label: 'ANPR', icon: 'anpr' },
    ];
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen bg-white shadow-lg z-50 transition-all duration-300 flex flex-col ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 border-b flex items-center justify-between flex-shrink-0">
          <div className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <h1 className="text-2xl font-bold text-primary-600 whitespace-nowrap">Sniper Car Care</h1>
          </div>
          {isCollapsed && (
            <div className="text-2xl font-bold text-primary-600">SC</div>
          )}
        </div>
        
        {/* Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-white border-2 border-gray-200 rounded-full p-1 hover:bg-gray-100 transition-colors shadow-md z-10"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          <svg className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <nav className="mt-6 flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center ${isCollapsed ? 'px-4 justify-center' : 'px-6'} py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                isActive(item.path) ? 'bg-primary-50 text-primary-600 border-r-4 border-primary-600' : ''
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <span className={isCollapsed ? '' : 'mr-3'}>{navIcons[item.icon]}</span>
              <span className={`transition-opacity duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t flex-shrink-0 bg-white">
          {!isCollapsed ? (
            <>
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={logout}
              className="w-full px-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition flex items-center justify-center"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'ml-20' : 'ml-64'} print:ml-0 print:p-0 print:w-full`}>
        <main className="p-8 print:p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;


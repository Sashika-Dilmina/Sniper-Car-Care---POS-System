import { useEffect, useState, useRef } from 'react';
import axios from '../config/axios';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [vipAppointments, setVipAppointments] = useState([]);
  const getTodayDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [todayDate, setTodayDate] = useState(getTodayDateString());
  const [startDate, setStartDate] = useState(getTodayDateString());
  const [endDate, setEndDate] = useState(getTodayDateString());
  const [vipLoading, setVipLoading] = useState(true);
  const [showAllVip, setShowAllVip] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completedServices, setCompletedServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  // Cash Register State
  const [activeRegister, setActiveRegister] = useState(null);
  const [registerLoading, setRegisterLoading] = useState(true);
  const [registerReport, setRegisterReport] = useState(null);
  const [showOpenRegisterModal, setShowOpenRegisterModal] = useState(false);
  const [showCloseRegisterModal, setShowCloseRegisterModal] = useState(false);
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [closedAmountInput, setClosedAmountInput] = useState('');
  const [registerNotes, setRegisterNotes] = useState('');

  const fetchRegisterStatus = async () => {
    try {
      const response = await axios.get('/api/registers/active');
      if (response.data.success && response.data.active) {
        setActiveRegister(response.data.register);
        // If register is open, fetch its report data
        const reportResp = await axios.get('/api/registers/report');
        if (reportResp.data.success) {
          setRegisterReport(reportResp.data.report);
        }
      } else {
        setActiveRegister(null);
        setRegisterReport(null);
      }
    } catch (err) {
      console.error('Error fetching register status:', err);
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleOpenRegister = async (e) => {
    e.preventDefault();
    if (!openingBalanceInput || isNaN(openingBalanceInput) || parseFloat(openingBalanceInput) < 0) {
      toast.error('Please enter a valid starting cash amount.');
      return;
    }
    try {
      const resp = await axios.post('/api/registers/open', {
        opening_balance: parseFloat(openingBalanceInput)
      });
      if (resp.data.success) {
        toast.success('Register opened successfully');
        setOpeningBalanceInput('');
        setShowOpenRegisterModal(false);
        fetchRegisterStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to open register');
    }
  };

  const handleCloseRegister = async (e) => {
    e.preventDefault();
    if (!closedAmountInput || isNaN(closedAmountInput) || parseFloat(closedAmountInput) < 0) {
      toast.error('Please enter a valid cash drawer count.');
      return;
    }

    // Rely on backend register check which correctly filters pending orders by the active register open date

    try {
      const resp = await axios.post('/api/registers/close', {
        closed_amount: parseFloat(closedAmountInput),
        notes: registerNotes
      });
      if (resp.data.success) {
        toast.success('Register closed successfully.');
        setClosedAmountInput('');
        setRegisterNotes('');
        setShowCloseRegisterModal(false);
        fetchRegisterStatus();
        navigate(`/reports?tab=registers&print_register_id=${resp.data.register_id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to close register');
    }
  };

  const calculateDuration = (service) => {
    if (!service.started_at || !service.completed_at) return null;
    const start = new Date(service.started_at);
    const end = new Date(service.completed_at);
    const diffMs = end - start;
    const diffMins = Math.round(diffMs / 60000);
    return diffMins;
  };

  const formatDuration = (mins) => {
    if (mins === null || mins === undefined) return 'N/A';
    if (mins < 0) return '0 min';
    if (mins < 60) {
      return `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const calculateElapsedTime = (startedAt, completedAt) => {
    if (!startedAt) return '0 min';
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end - start;
    if (diffMs < 0) return '0 min';
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) {
      return `${diffMins} min`;
    }
    const hours = Math.floor(diffMins / 60);
    const minutes = diffMins % 60;
    return `${hours}h ${minutes}m`;
  };

  useEffect(() => {
    fetchAnalytics(false, startDate, endDate);
    fetchVIPAppointments();
    fetchRegisterStatus();
    if (isAdmin) {
      fetchCompletedServices();
    }

    const interval = setInterval(() => {
      const freshToday = getTodayDateString();
      setTodayDate((prevToday) => {
        if (freshToday !== prevToday) {
          setStartDate((prevStart) => (prevStart === prevToday ? freshToday : prevStart));
          setEndDate((prevEnd) => (prevEnd === prevToday ? freshToday : prevEnd));
          return freshToday;
        }
        return prevToday;
      });

      fetchAnalytics(true, startDate, endDate);
      fetchVIPAppointments(true);
      fetchRegisterStatus();
      if (isAdmin) {
        fetchCompletedServices(true);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [isAdmin, startDate, endDate, todayDate]);

  const fetchCompletedServices = async (silent = false) => {
    if (!silent) setServicesLoading(true);
    try {
      const response = await axios.get('/api/services?status=completed');
      setCompletedServices(response.data.services || []);
    } catch (error) {
      console.error('Error fetching completed services:', error);
    } finally {
      if (!silent) setServicesLoading(false);
    }
  };

  const fetchVIPAppointments = async (silent = false) => {
    if (!silent) setVipLoading(true);
    try {
      const response = await axios.get('/api/vip/bookings/today', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      setVipAppointments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching VIP appointments:', error);
    } finally {
      if (!silent) setVipLoading(false);
    }
  };

  const handleCompleteVIPBooking = async (bookingId) => {
    try {
      const resp = await axios.patch(`/api/vip/bookings/${bookingId}`, {
        status: 'completed'
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (resp.data.success) {
        toast.success('VIP Booking marked as completed');
        fetchVIPAppointments();
      }
    } catch (err) {
      console.error('Error completing VIP booking:', err);
      toast.error('Failed to complete VIP booking');
    }
  };

  const currentFetchIdRef = useRef(0);

  const fetchAnalytics = async (silent = false, start = startDate, end = endDate) => {
    const requestId = ++currentFetchIdRef.current;
    if (!silent) setLoading(true);
    try {
      const response = await axios.get(`/api/analytics/dashboard?start_date=${start}&end_date=${end}`);
      if (requestId !== currentFetchIdRef.current) return;
      if (response.data) {
        setAnalytics(response.data);
      } else {
        if (!silent) toast.error('No analytics data received');
      }
    } catch (error) {
      if (requestId !== currentFetchIdRef.current) return;
      console.error('Analytics error:', error);
      if (!silent) {
        if (error.response?.status === 401) {
          toast.error('Authentication failed. Please login again.');
        } else if (error.response?.status === 500) {
          toast.error('Server error. Check backend logs.');
        } else {
          toast.error(error.response?.data?.message || 'Failed to load analytics');
        }
      }
      setAnalytics({
        summary: { total_card_payments: 0, total_cash_payments: 0, total_profit: 0, four_wheel_orders: 0, saloon_orders: 0, completed_services: 0, total_customers: 0, pending_amount: 0, pending_count: 0 },
        top_customers: [],
        top_services: [],
        sales_by_day: [],
        category_revenue: [],
        new_customers: [],
        recent_feedback: []
      });
    } finally {
      if (requestId === currentFetchIdRef.current) {
        if (!silent) setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No analytics data available</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Ensure we have default values for all fields
  const summary = analytics.summary || { total_card_payments: 0, total_cash_payments: 0, total_profit: 0, four_wheel_orders: 0, saloon_orders: 0, completed_services: 0, total_customers: 0, pending_amount: 0, pending_count: 0 };
  const topCustomers = analytics.top_customers || [];
  const topServices = analytics.top_services || [];
  const salesByDay = analytics.sales_by_day || [];
  const categoryRevenue = analytics.category_revenue || [];
  const newCustomers = analytics.new_customers || [];
  const recentFeedback = analytics.recent_feedback || [];

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          .print-register-report, .print-register-report * {
            visibility: visible !important;
          }
          .print-register-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            display: block !important;
          }
        }
      `}} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3 bg-white p-2 border rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase">To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 border rounded-lg text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Cash Register Session Widget */}
      {!registerLoading && (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 no-print">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{activeRegister ? '🔓' : '🔒'}</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Cash Register: {activeRegister ? 'OPEN' : 'CLOSED'}
                </h2>
                <p className="text-xs text-gray-500">
                  {activeRegister 
                    ? `Session opened at ${new Date(activeRegister.opened_at).toLocaleString()} by ${activeRegister.opened_by_name || 'Staff'}`
                    : 'Sales operations are currently restricted. Open register to begin.'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {activeRegister ? (
                <button
                  onClick={() => setShowCloseRegisterModal(true)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  🔒 Close Register
                </button>
              ) : (
                <button
                  onClick={() => setShowOpenRegisterModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  🔓 Open Register
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 ${isAdmin ? 'xl:grid-cols-4' : ''} gap-6`}>
        {isAdmin && (
          <>
            <div className="bg-white p-6 rounded-lg shadow">
              <div>
                <p className="text-gray-600 text-sm">Total Card Payments</p>
                <p className="text-2xl font-bold text-blue-600">
                  AED {(summary.total_card_payments || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div>
                <p className="text-gray-600 text-sm">Total Cash Payments</p>
                <p className="text-2xl font-bold text-green-600">
                  AED {(summary.total_cash_payments || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div>
                <p className="text-gray-600 text-sm">Total Profit</p>
                <p className="text-2xl font-bold text-gray-800">
                  AED {(summary.total_profit || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <div>
                <p className="text-gray-600 text-sm">Pending Payments</p>
                <p className="text-2xl font-bold text-orange-600">
                  AED {(summary.pending_amount || 0).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {summary.pending_count || 0} orders
                </p>
              </div>
            </div>
          </>
        )}

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Total 4-Wheel Vehicle Orders</p>
            <p className="text-2xl font-bold text-gray-800">
              {summary.four_wheel_orders || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm notranslate" translate="no">Total Saloon Vehicle Orders</p>
            <p className="text-2xl font-bold text-gray-800">
              {summary.saloon_orders || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Services Completed</p>
            <p className="text-2xl font-bold text-gray-800">
              {summary.completed_services || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm notranslate" translate="no">Pending Saloon Vehicles</p>
            <p className="text-2xl font-bold text-orange-600">
              {summary.pending_saloon_count || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Pending 4x4 Vehicles</p>
            <p className="text-2xl font-bold text-orange-600">
              {summary.pending_4x4_count || 0}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Total VIP Pending Vehicles</p>
            <p className="text-2xl font-bold text-purple-600">
              {summary.pending_vip_count || 0}
            </p>
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white p-6 rounded-lg shadow">
            <div>
              <p className="text-gray-600 text-sm">Total Customers</p>
              <p className="text-2xl font-bold text-gray-800">
                {summary.total_customers || 0}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* VIP Today's Appointments */}
      {!vipLoading && vipAppointments.length > 0 && (() => {
        const sortedAppointments = [...vipAppointments].sort((a, b) => {
          const statusPriority = {
            'in_progress': 1,
            'confirmed': 2,
            'pending': 3,
            'completed': 4,
            'cancelled': 5
          };
          return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
        });
        const visibleAppts = showAllVip ? sortedAppointments : sortedAppointments.slice(0, 2);

        return (
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👑</span>
                <h2 className="text-xl font-bold text-gray-900">VIP Appointments Today</h2>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                {vipAppointments.length} appointment{vipAppointments.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleAppts.map((appt) => (
                <div key={appt.id} className="border border-red-200 rounded-lg p-4 bg-red-50/30 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{appt.name}</p>
                      <p className="text-sm text-gray-600">{appt.phone}</p>
                    </div>
                    <span className="text-xs font-bold text-red-600 bg-white px-2 py-1 rounded-full border border-red-200">
                      VIP
                    </span>
                  </div>
                  <div className="border-t border-red-100 pt-2 mt-2">
                    <p className="text-sm"><span className="font-semibold">Vehicle:</span> {appt.vehicle_model}</p>
                    <p className="text-sm"><span className="font-semibold">Type:</span> {appt.vehicle_type}</p>
                    <p className="text-sm"><span className="font-semibold">Service:</span> {appt.service_type}</p>
                    <p className="text-sm"><span className="font-semibold">Time:</span> {appt.appointment_time}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t pt-2">
                    <div className="flex flex-col">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium w-max ${
                        appt.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        appt.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        appt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {appt.status === 'in_progress' ? 'In Progress' : 
                         appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                      </span>
                      {appt.status === 'in_progress' && (
                        <span className="text-xs font-bold text-purple-700 mt-1 flex items-center gap-0.5">
                          ⏱️ {calculateElapsedTime(appt.service_started_at, appt.service_completed_at)}
                        </span>
                      )}
                    </div>
                    {appt.status === 'in_progress' && (
                      <button
                        onClick={() => handleCompleteVIPBooking(appt.id)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition shadow-sm"
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {sortedAppointments.length > 2 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllVip(!showAllVip)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition"
                >
                  {showAllVip ? 'See Less' : 'See More'}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Charts - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Sales Trend (Last 7 Days)</h2>
            {salesByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sales" stroke="#0284c7" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No sales data available
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Top Services</h2>
            {topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServices}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="service_name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total_revenue" fill="#0284c7" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No service data available
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Customers (Admin Only) or Recent Orders (Staff Only) */}
      {isAdmin ? (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Top Customers</h2>
            <Link to="/customers" className="text-primary-600 hover:underline">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Vehicle Plate</th>
                  <th className="text-right p-2">Orders</th>
                  <th className="text-right p-2">Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.length > 0 ? (
                  topCustomers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                      <td className="p-2">{customer.name}</td>
                      <td className="p-2 notranslate" translate="no">{customer.vehicle_plate}</td>
                      <td className="p-2 text-right">{customer.order_count}</td>
                      <td className="p-2 text-right">
                        AED {parseFloat(customer.total_spent).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-gray-500">
                      No customer data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Top Orders (Real-time)</h2>
            <Link to="/orders" className="text-primary-600 hover:underline font-bold">
              View All Orders
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Order ID</th>
                  <th className="text-left p-2">Number Plate</th>
                  <th className="text-left p-2">Items</th>
                  <th className="text-right p-2">Total</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Payment</th>
                  <th className="text-right p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recent_orders && analytics.recent_orders.length > 0 ? (
                  analytics.recent_orders.map((order) => {
                    const isVipOrder = order.vip_booking_id !== null && order.vip_booking_id !== undefined;
                    return (
                      <tr key={order.id} className={`border-b hover:bg-gray-50 transition-colors ${
                        isVipOrder ? 'bg-purple-50 hover:bg-purple-100 border-l-4 border-purple-500 font-semibold' : ''
                      }`}>
                        <td className="p-2 font-bold flex items-center gap-2">
                          #{order.id}
                          {isVipOrder && (
                            <span className="px-2 py-0.5 bg-purple-100 text-purple-750 text-[10px] font-bold rounded-full border border-purple-250" title="VIP Order">
                              VIP ⭐
                            </span>
                          )}
                        </td>
                        <td className="p-2 font-bold font-mono notranslate text-gray-900" translate="no">{order.vehicle_plate || 'N/A'}</td>
                        <td className="p-2">
                          {order.items && order.items.length > 0 ? (
                            <div className="flex flex-col gap-1 max-w-xs truncate">
                              {order.items.map((item, idx) => (
                                <span key={idx} className="text-xs text-gray-750 block bg-gray-100 px-2 py-0.5 rounded w-max">
                                  {item.product_name} x{item.quantity}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Service Booking</span>
                          )}
                        </td>
                        <td className="p-2 text-right">AED {parseFloat(order.total).toLocaleString()}</td>
                        <td className="p-2">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="p-2">
                          {order.credit_status ? (
                            order.credit_status === 'unpaid' ? (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-800 font-semibold">
                                Credit / Unpaid
                              </span>
                            ) : order.credit_status === 'partially_paid' ? (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 text-yellow-800 font-semibold">
                                Credit / Partial
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800 font-semibold">
                                Paid
                              </span>
                            )
                          ) : (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {order.payment_status}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          <Link to={`/orders/${order.id}`} className="text-primary-600 hover:underline font-bold">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="8" className="p-4 text-center text-gray-500">
                      No recent orders available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Customers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">New Customers</h2>
          <Link to="/customers" className="text-primary-600 hover:underline">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Phone</th>
                <th className="text-left p-2">Vehicle</th>
                <th className="text-left p-2">Vehicle Plate</th>
                <th className="text-right p-2">Joined Date</th>
              </tr>
            </thead>
            <tbody>
              {newCustomers.length > 0 ? (
                newCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">{customer.name}</td>
                    <td className="p-2">{customer.phone}</td>
                    <td className="p-2">{customer.vehicle_type || 'N/A'}</td>
                    <td className="p-2 notranslate" translate="no">{customer.vehicle_plate || 'N/A'}</td>
                    <td className="p-2 text-right">{customer.joined_date}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500">
                    No new customers in this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Feedback Section - Admin Only */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Customer Feedback</h2>
          </div>
          <div className="overflow-x-auto">
            {recentFeedback.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentFeedback.map((feedback) => (
                  <div
                    key={feedback.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`w-4 h-4 ${i < feedback.rating ? 'fill-current' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="text-xs text-gray-500">({feedback.rating}/5)</span>
                      </div>
                    </div>
                    {feedback.customer_name && (
                      <p className="text-sm font-semibold text-gray-800 mb-1">
                        {feedback.customer_name}
                      </p>
                    )}
                    {feedback.comment && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        "{feedback.comment}"
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {feedback.vehicle_plate ? (
                          <>Plate: <span className="notranslate" translate="no">{feedback.vehicle_plate}</span></>
                        ) :
                          feedback.customer_phone ? `Phone: ${feedback.customer_phone}` :
                            'Anonymous'}
                      </span>
                      <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p>No feedback available yet</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service Completion Durations - Admin Only */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Service Completion Performance</h2>
            <Link to="/services" className="text-primary-600 hover:underline">
              View All Services
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Customer</th>
                  <th className="text-left p-2">Vehicle Plate</th>
                  <th className="text-left p-2">Service</th>
                  <th className="text-left p-2 text-center">Started</th>
                  <th className="text-left p-2 text-center">Completed</th>
                  <th className="text-right p-2">Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {completedServices.length > 0 ? (
                  completedServices.slice(0, 10).map((service) => {
                    const duration = calculateDuration(service);
                    return (
                      <tr key={service.id} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-semibold text-gray-800">
                          {service.customer_name || <span className="text-gray-400 italic font-normal">Walk-in</span>}
                        </td>
                        <td className="p-2 font-mono text-sm notranslate" translate="no">{service.vehicle_plate || 'N/A'}</td>
                        <td className="p-2">{service.service_name}</td>
                        <td className="p-2 text-center text-xs text-gray-500">
                          {service.started_at ? new Date(service.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </td>
                        <td className="p-2 text-center text-xs text-gray-500">
                          {service.completed_at ? new Date(service.completed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                        </td>
                        <td className="p-2 text-right">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                            duration !== null && duration < 30 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {formatDuration(duration)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-gray-500">
                      No completed services found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Open Register Modal */}
      {showOpenRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 no-print">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-black">Open Cash Register</h3>
            <form onSubmit={handleOpenRegister}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
                    Starting Cash (AED) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="e.g. 500.00"
                    value={openingBalanceInput}
                    onChange={(e) => setOpeningBalanceInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none text-left"
                  />
                  <p className="text-xs text-gray-550 mt-1 text-left">
                    Enter the amount of starting cash in the drawer (Hand to Cash).
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowOpenRegisterModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-black"
                >
                  Open Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close Register Modal */}
      {showCloseRegisterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 no-print">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-gray-900 mb-4 font-black text-left">Close Cash Register</h3>
            
            {registerReport && (
              <div className="bg-gray-50 p-4 rounded-lg border text-sm space-y-2 mb-4 text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Starting Cash:</span>
                  <span className="font-semibold">AED {registerReport.opening_balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Cash Sales:</span>
                  <span className="font-semibold">AED {registerReport.cash_payments.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cash Expenses:</span>
                  <span className="font-semibold text-red-600">- AED {registerReport.cash_expense.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Free Washes Value:</span>
                  <span className="font-semibold text-green-600">AED {parseFloat(registerReport.free_wash_amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-xs text-gray-500">
                  <span>Card, Bank, TAP Sales:</span>
                  <span>AED {(registerReport.card_payments.total + registerReport.bank_transfer + registerReport.other_payments).toFixed(2)}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleCloseRegister}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
                    Actual Cash Counted (AED) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Count the cash in drawer and enter here"
                    value={closedAmountInput}
                    onChange={(e) => setClosedAmountInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none text-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-left">
                    Notes / Discrepancy Explanation (Optional)
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Explain any differences between expected and actual cash..."
                    value={registerNotes}
                    onChange={(e) => setRegisterNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-blue-500 outline-none text-left"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloseRegisterModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-black"
                >
                  Close & Save Statement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;


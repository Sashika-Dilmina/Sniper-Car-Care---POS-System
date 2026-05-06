import { useEffect, useState } from 'react';
import axios from '../config/axios';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get('/api/analytics/dashboard?period=today');
      console.log('Analytics response:', response.data);
      if (response.data) {
        setAnalytics(response.data);
      } else {
        toast.error('No analytics data received');
      }
    } catch (error) {
      console.error('Analytics error:', error);
      if (error.response?.status === 401) {
        toast.error('Authentication failed. Please login again.');
      } else if (error.response?.status === 500) {
        toast.error('Server error. Check backend logs.');
      } else {
        toast.error(error.response?.data?.message || 'Failed to load analytics');
      }
      // Set default empty data structure so page still renders
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
      setLoading(false);
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
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <select
          onChange={(e) => {
            setLoading(true);
            axios.get(`/api/analytics/dashboard?period=${e.target.value}`)
              .then(res => {
                setAnalytics(res.data);
                setLoading(false);
              })
              .catch(err => {
                console.error('Analytics error:', err);
                toast.error('Failed to load analytics');
                setLoading(false);
              });
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Total Card Payments</p>
            <p className="text-2xl font-bold text-blue-600">
              AED {(summary.total_card_payments || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Total Cash Payments</p>
            <p className="text-2xl font-bold text-green-600">
              AED {(summary.total_cash_payments || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div>
            <p className="text-gray-600 text-sm">Total Profit</p>
            <p className="text-2xl font-bold text-gray-800">
              AED {(summary.total_profit || 0).toLocaleString()}
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
            <p className="text-gray-600 text-sm">Total Saloon Vehicle Orders</p>
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
            <p className="text-gray-600 text-sm">Total Customers</p>
            <p className="text-2xl font-bold text-gray-800">
              {summary.total_customers || 0}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
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

      {/* Top Customers */}
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
                    <td className="p-2">{customer.vehicle_plate}</td>
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
                    <td className="p-2">{customer.vehicle_model || 'N/A'}</td>
                    <td className="p-2">{customer.vehicle_plate || 'N/A'}</td>
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
                      <span className={`px-2 py-1 text-xs rounded-full ${feedback.status === 'approved' ? 'bg-green-100 text-green-800' :
                          feedback.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                        }`}>
                        {feedback.status}
                      </span>
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
                        {feedback.vehicle_plate ? `Plate: ${feedback.vehicle_plate}` :
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
    </div>
  );
};

export default Dashboard;


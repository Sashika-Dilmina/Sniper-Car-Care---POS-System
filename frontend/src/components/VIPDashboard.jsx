import React, { useEffect, useState } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const VIPDashboard = () => {
  const [vipBookings, setVipBookings] = useState([]);
  const [vipCustomers, setVipCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState('bookings'); // 'bookings' or 'customers'
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);
  const [bookingUpdate, setBookingUpdate] = useState({
    status: '',
    notes: ''
  });

  // Fetch VIP bookings
  useEffect(() => {
    fetchVIPBookings();
  }, []);

  const fetchVIPBookings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/vip/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setVipBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching VIP bookings:', error);
      toast.error('Failed to fetch VIP bookings');
    } finally {
      setLoading(false);
    }
  };

  const fetchVIPCustomers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/vip/customers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setVipCustomers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching VIP customers:', error);
      toast.error('Failed to fetch VIP customers');
    } finally {
      setLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId) => {
    if (!bookingUpdate.status && !bookingUpdate.notes) {
      toast.error('Please update at least one field');
      return;
    }

    setUpdatingBookingId(bookingId);
    try {
      await axios.patch(`/api/vip/bookings/${bookingId}`, bookingUpdate, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Booking updated successfully');
      setShowBookingModal(false);
      setBookingUpdate({ status: '', notes: '' });
      fetchVIPBookings();
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const deleteBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return;

    try {
      await axios.delete(`/api/vip/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Booking deleted successfully');
      fetchVIPBookings();
    } catch (error) {
      console.error('Error deleting booking:', error);
      toast.error('Failed to delete booking');
    }
  };

  const openBookingModal = (booking) => {
    setSelectedBooking(booking);
    setBookingUpdate({
      status: booking.status,
      notes: booking.notes || ''
    });
    setShowBookingModal(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const filteredBookings = filterStatus === 'all' 
    ? vipBookings 
    : vipBookings.filter(b => b.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">VIP Service Management</h1>
          
          {/* View Selector */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setSelectedView('bookings');
                fetchVIPBookings();
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                selectedView === 'bookings'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              VIP Bookings ({vipBookings.length})
            </button>
            <button
              onClick={() => {
                setSelectedView('customers');
                fetchVIPCustomers();
              }}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                selectedView === 'customers'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              VIP Customers ({vipCustomers.length})
            </button>
          </div>
        </div>

        {/* VIP Bookings View */}
        {selectedView === 'bookings' && (
          <div className="bg-white rounded-lg shadow">
            {/* Filter */}
            <div className="p-6 border-b border-gray-200 flex gap-4">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Bookings Table */}
            {loading ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Loading bookings...</p>
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No VIP bookings found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Service</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-gray-900">{booking.name}</p>
                            <p className="text-sm text-gray-500">{booking.phone}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-gray-900">{booking.vehicle_model}</p>
                            <p className="text-sm text-gray-500">{booking.vehicle_type}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">{booking.service_type}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm text-gray-900">
                            {new Date(booking.appointment_date).toLocaleDateString()} {booking.appointment_time}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => openBookingModal(booking)}
                              className="text-blue-600 hover:text-blue-900 font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteBooking(booking.id)}
                              className="text-red-600 hover:text-red-900 font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIP Customers View */}
        {selectedView === 'customers' && (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">Loading customers...</p>
              </div>
            ) : vipCustomers.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No VIP customers found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {vipCustomers.map((customer) => (
                  <div key={customer.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition">
                    <div className="mb-3">
                      <h3 className="font-bold text-gray-900">{customer.name}</h3>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                      {customer.email && <p className="text-sm text-gray-500">{customer.email}</p>}
                    </div>
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <p className="text-sm"><span className="font-semibold">Vehicle:</span> {customer.vehicle_model}</p>
                      <p className="text-sm"><span className="font-semibold">Type:</span> {customer.vehicle_type}</p>
                    </div>
                    <div className="text-sm">
                      <p><span className="font-semibold">Total Bookings:</span> {customer.total_bookings}</p>
                      <p><span className="font-semibold">Last Booking:</span> {customer.last_booking_date ? new Date(customer.last_booking_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Booking Modal */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">Update Booking</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-1">Customer: {selectedBooking.name}</p>
              <p className="text-sm text-gray-600">Service: {selectedBooking.service_type}</p>
              <p className="text-sm text-gray-600">Date: {new Date(selectedBooking.appointment_date).toLocaleDateString()} {selectedBooking.appointment_time}</p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateBookingStatus(selectedBooking.id);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={bookingUpdate.status}
                  onChange={(e) => setBookingUpdate({ ...bookingUpdate, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={bookingUpdate.notes}
                  onChange={(e) => setBookingUpdate({ ...bookingUpdate, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 resize-none"
                  rows="3"
                  placeholder="Add notes about this booking..."
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  disabled={updatingBookingId === selectedBooking.id}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50"
                >
                  {updatingBookingId === selectedBooking.id ? 'Updating...' : 'Update Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VIPDashboard;

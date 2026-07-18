import React, { useEffect, useState } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const VIPDashboard = () => {
  const [vipBookings, setVipBookings] = useState([]);
  const [vipCustomers, setVipCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState('bookings'); // 'bookings' or 'customers'
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [updatingBookingId, setUpdatingBookingId] = useState(null);

  const [selectedHistoryCustomer, setSelectedHistoryCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [bookingUpdate, setBookingUpdate] = useState({
    status: '',
    notes: '',
    staff_notes: '',
    assigned_staff_id: ''
  });

  const [scheduleData, setScheduleData] = useState({
    appointment_date: '',
    appointment_time: ''
  });

  const [isRescheduling, setIsRescheduling] = useState(false);
  const [manualPaymentLoading, setManualPaymentLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');

  // Fetch VIP bookings
  useEffect(() => {
    fetchVIPBookings();
    fetchEmployees();

    const interval = setInterval(() => {
      fetchVIPBookings(true);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const fetchVIPBookings = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await axios.get('/api/vip/bookings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setVipBookings(response.data.data || []);
    } catch (error) {
      console.error('Error fetching VIP bookings:', error);
      if (!silent) {
        if (error.response?.status === 401) {
          toast.error('Login expired. Please log out and log in again.');
        } else if (!error.response) {
          toast.error('Cannot reach API server. Is backend running on port 5000?');
        } else {
          toast.error(error.response?.data?.message || 'Failed to fetch VIP bookings');
        }
      }
    } finally {
      if (!silent) setLoading(false);
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

  const handleViewCustomerHistory = async (customer) => {
    setSelectedHistoryCustomer(customer);
    setShowHistoryModal(true);
    setLoadingHistory(true);
    try {
      const response = await axios.get(`/api/vip/customers/${customer.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setCustomerHistory(response.data.data.bookings || []);
    } catch (error) {
      console.error('Error fetching customer history:', error);
      toast.error('Failed to load customer service history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchSingleBookingDetails = async (bookingId) => {
    try {
      const response = await axios.get(`/api/vip/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.data.success && response.data.data) {
        const freshBooking = response.data.data;
        setSelectedBooking(freshBooking);
        setBookingUpdate({
          status: freshBooking.status,
          notes: freshBooking.notes || '',
          staff_notes: freshBooking.staff_notes || '',
          assigned_staff_id: freshBooking.assigned_staff_id || ''
        });
        setScheduleData({
          appointment_date: freshBooking.appointment_date ? freshBooking.appointment_date.split('T')[0] : '',
          appointment_time: freshBooking.appointment_time || ''
        });
      }
    } catch (error) {
      console.error('Error fetching fresh booking details:', error);
    }
  };

  const updateBookingDetails = async (bookingId) => {
    setUpdatingBookingId(bookingId);
    try {
      await axios.patch(`/api/vip/bookings/${bookingId}`, {
        staff_notes: bookingUpdate.staff_notes,
        assigned_staff_id: bookingUpdate.assigned_staff_id || null
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Notes & assignment updated');
      fetchVIPBookings();
      fetchSingleBookingDetails(bookingId);
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleConfirmAndSchedule = async (bookingId) => {
    if (!scheduleData.appointment_date || !scheduleData.appointment_time) {
      toast.error('Please select both Date and Time');
      return;
    }

    setUpdatingBookingId(bookingId);
    try {
      await axios.patch(`/api/vip/bookings/${bookingId}`, {
        status: 'confirmed',
        appointment_date: scheduleData.appointment_date,
        appointment_time: scheduleData.appointment_time,
        staff_notes: bookingUpdate.staff_notes,
        assigned_staff_id: bookingUpdate.assigned_staff_id || null
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Booking confirmed & customer scheduled!');
      setIsRescheduling(false);
      fetchVIPBookings();
      fetchSingleBookingDetails(bookingId);
    } catch (error) {
      console.error('Error scheduling booking:', error);
      toast.error('Failed to schedule and confirm booking');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleStatusChange = async (bookingId, newStatus, paymentMethod) => {
    setUpdatingBookingId(bookingId);
    try {
      await axios.patch(`/api/vip/bookings/${bookingId}`, {
        status: newStatus,
        payment_method: paymentMethod
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success(`Booking status changed to ${newStatus}`);
      fetchVIPBookings();
      fetchSingleBookingDetails(bookingId);
    } catch (error) {
      console.error('Error changing booking status:', error);
      toast.error('Failed to change booking status');
    } finally {
      setUpdatingBookingId(null);
    }
  };

  const handleRecordManualPayment = async (orderId, amount, method = 'cash') => {
    if (!orderId) return;
    setManualPaymentLoading(true);
    try {
      await axios.post('/api/payments/manual', {
        order_id: orderId,
        amount: amount,
        method: method
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Payment recorded successfully');
      if (selectedBooking) {
        fetchSingleBookingDetails(selectedBooking.id);
      }
      fetchVIPBookings();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setManualPaymentLoading(false);
    }
  };

  const deleteBooking = async (bookingId) => {
    const reason = window.prompt('Please enter the reason for deleting this booking:');
    if (reason === null) return; // Cancelled
    if (reason.trim() === '') {
      toast.error('Deletion cancelled. A reason is required.');
      return;
    }
 
    try {
      await axios.delete(`/api/vip/bookings/${bookingId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        data: { reason }
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
      notes: booking.notes || '',
      staff_notes: booking.staff_notes || '',
      assigned_staff_id: booking.assigned_staff_id || ''
    });
    setScheduleData({
      appointment_date: booking.appointment_date ? booking.appointment_date.split('T')[0] : '',
      appointment_time: booking.appointment_time || ''
    });
    setIsRescheduling(false);
    setShowBookingModal(true);
    // Fetch fresh details to get synced order information
    fetchSingleBookingDetails(booking.id);
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

  const isAppointmentToday = (dateStr) => {
    if (!dateStr) return false;
    const apptDate = new Date(dateStr).toDateString();
    const todayDate = new Date().toDateString();
    return apptDate === todayDate;
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
                      <tr key={booking.id} className={`hover:bg-gray-50 transition ${booking.is_deleted === 1 ? 'opacity-60 bg-red-50/20' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {booking.name}
                              {booking.is_deleted === 1 && (
                                <span className="block text-xs text-red-500 font-medium italic mt-0.5">
                                  Deleted (Reason: {booking.delete_reason})
                                </span>
                              )}
                            </p>
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
                            {booking.appointment_date ? (
                              `${new Date(booking.appointment_date).toLocaleDateString('en-GB')} ${booking.appointment_time || ''}`
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                Not Scheduled
                              </span>
                            )}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                              {booking.status}
                            </span>
                            {booking.status === 'in_progress' && (
                              <span className="text-[11px] font-bold text-purple-700 flex items-center gap-0.5">
                                ⏱️ {calculateElapsedTime(booking.service_started_at, booking.service_completed_at)}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-4 items-center">
                            <button
                              onClick={() => openBookingModal(booking)}
                              className="text-indigo-600 hover:text-indigo-900 font-bold"
                            >
                              Action View
                            </button>
                            {booking.status === 'in_progress' && booking.is_deleted !== 1 && (
                              <button
                                onClick={() => handleStatusChange(booking.id, 'completed')}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-bold transition shadow-sm"
                              >
                                Done
                              </button>
                            )}
                            {booking.is_deleted !== 1 && (
                              <button
                                onClick={() => deleteBooking(booking.id)}
                                className="text-red-600 hover:text-red-900 font-semibold"
                              >
                                Delete
                              </button>
                            )}
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
                  <div
                    key={customer.id}
                    onClick={() => handleViewCustomerHistory(customer)}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition cursor-pointer hover:border-red-500 bg-white"
                  >
                    <div className="mb-3">
                      <h3 className="font-bold text-gray-900 flex justify-between items-center">
                        <span>{customer.name}</span>
                        <span className="text-[11px] text-red-650 font-bold bg-red-50 px-2 py-0.5 rounded-full border border-red-100 hover:bg-red-100 transition duration-200">
                          History 🗓️
                        </span>
                      </h3>
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

      {/* Detailed Action Modal */}
      {showBookingModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col my-8">
            <button
              onClick={() => setShowBookingModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="shrink-0 border-b pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Action View & Manage</h3>
                  <p className="text-sm text-gray-500 font-medium">VIP Booking #{selectedBooking.id}</p>
                </div>
                <span className={`px-3 py-1.5 text-xs font-black uppercase rounded-full ${getStatusColor(selectedBooking.status)}`}>
                  {selectedBooking.status}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-sm">
              {/* Customer and Booking Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Customer</p>
                  <p className="font-semibold text-gray-800">{selectedBooking.name}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Vehicle</p>
                  <p className="font-semibold text-gray-800 font-mono">{selectedBooking.vehicle_model}</p>
                  <p className="text-xs text-gray-500">{selectedBooking.vehicle_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-bold uppercase">Requested VIP Service</p>
                  <p className="font-semibold text-red-600 font-medium">{selectedBooking.service_type}</p>
                  {selectedBooking.order_total && (
                    <p className="text-xs font-semibold text-gray-600">Price: AED {parseFloat(selectedBooking.order_total).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Order Synced & Payment Details */}
              {selectedBooking.order_id && (
                <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase">Synced POS Order</p>
                      <p className="font-semibold text-gray-800">Order #{selectedBooking.order_id}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase text-right">Payment Status</p>
                      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${
                        selectedBooking.order_payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedBooking.order_payment_status || 'pending'}
                      </span>
                    </div>
                  </div>
                  {selectedBooking.order_payment_status === 'paid' && (
                    <div className="text-[10px] font-bold text-gray-500 uppercase text-right mt-1">
                      Paid via: {selectedBooking.payment_method || 'manual'}
                    </div>
                  )}
                  {selectedBooking.order_payment_status !== 'paid' && (
                    <div className="border-t pt-2 mt-1 space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600 uppercase">Select Payment Method</label>
                        <select
                          value={selectedPaymentMethod}
                          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white focus:ring-red-500 focus:border-red-500 outline-none"
                        >
                          <option value="cash">💵 Cash</option>
                          <option value="card">💳 Card</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleRecordManualPayment(selectedBooking.order_id, selectedBooking.order_total, selectedPaymentMethod)}
                        disabled={manualPaymentLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm disabled:opacity-50"
                      >
                        ⚡ Record Payment (AED {parseFloat(selectedBooking.order_total || 0).toLocaleString()})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Appointment Scheduling section */}
              {selectedBooking.status === 'pending' || isRescheduling ? (
                <div className="border border-yellow-200 bg-yellow-50/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-bold text-yellow-900 text-xs uppercase tracking-wider">
                    {isRescheduling ? 'Reschedule Appointment' : 'Schedule & Confirm Appointment'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Appointment Date *</label>
                      <input
                        type="date"
                        required
                        value={scheduleData.appointment_date}
                        onChange={(e) => setScheduleData({ ...scheduleData, appointment_date: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Appointment Time *</label>
                      <select
                        required
                        value={scheduleData.appointment_time}
                        onChange={(e) => setScheduleData({ ...scheduleData, appointment_time: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                      >
                        <option value="">Select time...</option>
                        {['09:00', '10:00', '11:00', '12:00', '13:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleConfirmAndSchedule(selectedBooking.id)}
                      disabled={updatingBookingId === selectedBooking.id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 rounded-lg transition"
                    >
                      {updatingBookingId === selectedBooking.id ? 'Scheduling...' : 'Save & Confirm'}
                    </button>
                    {isRescheduling && (
                      <button
                        onClick={() => setIsRescheduling(false)}
                        className="px-4 py-2.5 border rounded-lg text-xs hover:bg-gray-100 transition"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4 bg-white flex justify-between items-center shadow-sm">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Scheduled Appointment</p>
                    <p className="font-bold text-gray-800 mt-1">
                      {selectedBooking.appointment_date
                        ? `${new Date(selectedBooking.appointment_date).toLocaleDateString('en-GB')} at ${selectedBooking.appointment_time}`
                        : 'Not Scheduled'}
                    </p>
                  </div>
                  {['confirmed', 'in_progress'].includes(selectedBooking.status) && (
                    <button
                      onClick={() => setIsRescheduling(true)}
                      className="text-indigo-600 hover:underline font-bold text-xs"
                    >
                      Reschedule
                    </button>
                  )}
                </div>
              )}

              {/* Status Actions Flow */}
              <div className="space-y-2">
                <p className="text-xs text-gray-400 font-bold uppercase">Status Actions</p>
                {selectedBooking.status === 'in_progress' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex justify-between items-center text-purple-900 font-bold text-xs">
                    <span>⏱️ Time Elapsed:</span>
                    <span>{calculateElapsedTime(selectedBooking.service_started_at, selectedBooking.service_completed_at)}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {!isAppointmentToday(selectedBooking.appointment_date) && ['confirmed', 'in_progress'].includes(selectedBooking.status) ? (
                    <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs font-bold text-center">
                      ⚠️ VIP service can only be started/completed on the scheduled day. Please reschedule this booking to today to proceed.
                    </div>
                  ) : (
                    <>
                      {selectedBooking.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(selectedBooking.id, 'in_progress')}
                          disabled={updatingBookingId === selectedBooking.id}
                          className="flex-1 min-w-[150px] bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                        >
                          ⚡ Start Service
                        </button>
                      )}
                      {selectedBooking.status === 'in_progress' && (
                        <button
                          onClick={() => handleStatusChange(selectedBooking.id, 'completed', selectedPaymentMethod)}
                          disabled={updatingBookingId === selectedBooking.id}
                          className="flex-1 min-w-[150px] bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                        >
                          ✓ Done (Complete Service)
                        </button>
                      )}
                    </>
                  )}
                  {['pending', 'confirmed', 'in_progress'].includes(selectedBooking.status) && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this booking?')) {
                          handleStatusChange(selectedBooking.id, 'cancelled');
                        }
                      }}
                      disabled={updatingBookingId === selectedBooking.id}
                      className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>

              {/* Notes & Assignment form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateBookingDetails(selectedBooking.id);
                }}
                className="space-y-4 pt-3 border-t"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Assign Staff Member
                  </label>
                  <select
                    value={bookingUpdate.assigned_staff_id}
                    onChange={(e) => setBookingUpdate({ ...bookingUpdate, assigned_staff_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                {/* Customer Notes (Read-Only) */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Customer Notes
                  </label>
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-700 italic">
                    {selectedBooking.notes || 'No notes left by customer'}
                  </div>
                </div>

                {/* Staff Notes */}
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Staff Notes
                  </label>
                  <textarea
                    value={bookingUpdate.staff_notes}
                    onChange={(e) => setBookingUpdate({ ...bookingUpdate, staff_notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none text-xs resize-none"
                    rows="3"
                    placeholder="Add notes from staff members..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingBookingId === selectedBooking.id}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg transition"
                >
                  Save Notes & Assignment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIP Customer Service History Modal */}
      {showHistoryModal && selectedHistoryCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col my-8">
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedHistoryCustomer(null);
                setCustomerHistory([]);
              }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="shrink-0 border-b pb-4 mb-4 text-left">
              <h3 className="text-2xl font-bold text-gray-900">VIP Service History</h3>
              <p className="text-sm text-gray-550 font-medium mt-1">
                {selectedHistoryCustomer.name} • {selectedHistoryCustomer.phone}
              </p>
            </div>

            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
              {loadingHistory ? (
                <div className="py-12 text-center text-gray-500">Loading history...</div>
              ) : customerHistory.length === 0 ? (
                <div className="py-12 text-center text-gray-500">No VIP services found for this customer.</div>
              ) : (
                <div className="space-y-4">
                  {customerHistory.map((historyItem) => (
                    <div key={historyItem.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm space-y-2 text-sm text-left">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-bold text-gray-800 text-base">{historyItem.service_type}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Booking ID: #{historyItem.id}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-full ${getStatusColor(historyItem.status)}`}>
                          {historyItem.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600 border-t pt-2 mt-2">
                        <div>
                          <span className="font-semibold">Scheduled Date:</span>{' '}
                          {historyItem.appointment_date 
                            ? `${new Date(historyItem.appointment_date).toLocaleDateString('en-GB')} at ${historyItem.appointment_time || 'N/A'}`
                            : 'Not Scheduled'}
                        </div>
                        <div>
                          <span className="font-semibold">Vehicle:</span>{' '}
                          <span className="font-mono">{historyItem.vehicle_model || selectedHistoryCustomer.vehicle_model}</span>
                        </div>
                        <div>
                          <span className="font-semibold">Staff Assigned:</span>{' '}
                          {historyItem.staff_name || 'Unassigned'}
                        </div>
                        <div>
                          <span className="font-semibold">Total Price:</span>{' '}
                          {historyItem.order_total ? `AED ${parseFloat(historyItem.order_total).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : 'N/A'}
                        </div>
                        {historyItem.order_id && (
                          <div className="col-span-2 flex justify-between items-center bg-white border border-gray-150 p-2 rounded mt-1">
                            <span>
                              <span className="font-semibold">Synced Order:</span> #{historyItem.order_id} (
                              <span className={`font-semibold ${historyItem.order_payment_status === 'paid' ? 'text-green-600' : 'text-red-650'}`}>
                                {historyItem.order_payment_status || 'pending'}
                              </span>
                              )
                            </span>
                            {historyItem.service_started_at && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-bold">
                                ⏱️ {calculateElapsedTime(historyItem.service_started_at, historyItem.service_completed_at)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {historyItem.staff_notes && (
                        <div className="text-xs bg-white border border-gray-100 p-2.5 rounded-lg text-gray-700 mt-2">
                          <span className="font-bold block text-gray-500 uppercase tracking-wider text-[10px] mb-1">Staff Notes</span>
                          {historyItem.staff_notes}
                        </div>
                      )}
                      
                      {historyItem.notes && (
                        <div className="text-xs bg-white border border-gray-100 p-2.5 rounded-lg text-gray-700 mt-1 italic">
                          <span className="font-bold block text-gray-500 uppercase tracking-wider text-[10px] mb-1 not-italic">Customer Request Notes</span>
                          "{historyItem.notes}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t pt-4 mt-4 text-right">
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedHistoryCustomer(null);
                  setCustomerHistory([]);
                }}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg font-bold transition text-sm shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VIPDashboard;

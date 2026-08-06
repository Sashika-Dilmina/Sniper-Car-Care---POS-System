import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [loadingTap, setLoadingTap] = useState(false);
  const [registerStatus, setRegisterStatus] = useState('closed');
  const [sharing, setSharing] = useState(false);

  const [vipBooking, setVipBooking] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [showVipModal, setShowVipModal] = useState(false);
  const [updatingVip, setUpdatingVip] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [scheduleData, setScheduleData] = useState({ appointment_date: '', appointment_time: '' });
  const [bookingUpdate, setBookingUpdate] = useState({ status: '', notes: '', staff_notes: '', assigned_staff_id: '' });
  const [paymentDiscount, setPaymentDiscount] = useState(0);
  const [selectedOrderMethod, setSelectedOrderMethod] = useState('cash');
  const [orderSplitPayments, setOrderSplitPayments] = useState({ card: 0, cash: 0, bank_transfer: 0 });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isAppointmentToday = (dateStr) => {
    if (!dateStr) return false;
    const apptDate = new Date(dateStr).toDateString();
    const todayDate = new Date().toDateString();
    return apptDate === todayDate;
  };

  const calculateElapsedTime = (startedAt, completedAt) => {
    if (!startedAt) return 'Not started';
    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  const fetchVipBooking = async (bookingId) => {
    try {
      const response = await axios.get(`/api/vip/bookings/${bookingId}`);
      if (response.data.success && response.data.data) {
        const freshBooking = response.data.data;
        setVipBooking(freshBooking);
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
      console.error('Error fetching VIP booking details:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data.employees || []);
    } catch (error) {
      console.error('Failed to load employees:', error);
    }
  };

  const handleVipStatusChange = async (newStatus, paymentMethod) => {
    if (!order.vip_booking_id) return;
    setUpdatingVip(true);
    try {
      await axios.patch(`/api/vip/bookings/${order.vip_booking_id}`, {
        status: newStatus,
        payment_method: paymentMethod
      });
      toast.success(`Booking status changed to ${newStatus}`);
      fetchVipBooking(order.vip_booking_id);
      fetchOrder();
    } catch (error) {
      console.error('Error changing VIP booking status:', error);
      toast.error('Failed to change booking status');
    } finally {
      setUpdatingVip(false);
    }
  };

  const handleVipConfirmAndSchedule = async () => {
    if (!scheduleData.appointment_date || !scheduleData.appointment_time) {
      toast.error('Please select both Date and Time');
      return;
    }
    setUpdatingVip(true);
    try {
      await axios.patch(`/api/vip/bookings/${order.vip_booking_id}`, {
        status: 'confirmed',
        appointment_date: scheduleData.appointment_date,
        appointment_time: scheduleData.appointment_time,
        staff_notes: bookingUpdate.staff_notes,
        assigned_staff_id: bookingUpdate.assigned_staff_id || null
      });
      toast.success('Booking confirmed & customer scheduled!');
      setIsRescheduling(false);
      fetchVipBooking(order.vip_booking_id);
      fetchOrder();
    } catch (error) {
      console.error('Error scheduling VIP booking:', error);
      toast.error('Failed to schedule booking');
    } finally {
      setUpdatingVip(false);
    }
  };

  const updateVipBookingDetails = async (e) => {
    e.preventDefault();
    setUpdatingVip(true);
    try {
      await axios.patch(`/api/vip/bookings/${order.vip_booking_id}`, {
        staff_notes: bookingUpdate.staff_notes,
        assigned_staff_id: bookingUpdate.assigned_staff_id || null
      });
      toast.success('Notes & assignment updated');
      fetchVipBooking(order.vip_booking_id);
    } catch (error) {
      console.error('Error updating VIP booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setUpdatingVip(false);
    }
  };



  useEffect(() => {
    if (order && order.vip_booking_id) {
      fetchVipBooking(order.vip_booking_id);
      fetchEmployees();
    }
  }, [order?.vip_booking_id]);


  useEffect(() => {
    fetchOrder();
    fetchRegisterStatus();

    // Check url query parameters for payment status notifications
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const err = params.get('error');
    if (status === 'success') {
      toast.success('Payment completed successfully via Tap Payments!');
      // Clean query params so toast doesn't show again on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'failed') {
      toast.error(`Payment failed: ${decodeURIComponent(err || 'Unknown error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [id]);

  const fetchRegisterStatus = async () => {
    try {
      const response = await axios.get('/api/registers/active');
      if (response.data.success && response.data.active) {
        setRegisterStatus('open');
      } else {
        setRegisterStatus('closed');
      }
    } catch (e) {
      console.error('Failed to fetch register status:', e);
      setRegisterStatus('closed');
    }
  };

  const fetchOrder = async () => {
    try {
      const response = await axios.get(`/api/orders/${id}`);
      setOrder(response.data.order);
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!order) return;
    setSharing(true);
    try {
      const response = await axios.get(`/api/orders/${id}/pdf`);
      if (response.data.success && response.data.pdfUrl) {
        const backendBaseUrl = axios.defaults.baseURL || window.location.origin;
        const fullPdfUrl = `${backendBaseUrl}${response.data.pdfUrl}`;
        
        try {
          // Fetch the PDF blob to create a File object
          const fileResponse = await fetch(fullPdfUrl);
          const blob = await fileResponse.blob();
          const file = new File([blob], `invoice-${order.id}-${Date.now()}.pdf`, { type: 'application/pdf' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: `Sniper Car Care Invoice #${order.id}`,
              text: `Please find the invoice for Order #${order.id} attached.`
            });
            toast.success('Invoice PDF shared successfully!');
            return;
          }
        } catch (shareErr) {
          console.warn('Native sharing failed, falling back to link:', shareErr);
        }
        
        // Fallback to text link if navigator.share fails or is not supported
        const message = `Check out your Sniper Car Care Invoice #${order.id}: ${fullPdfUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('Opened PDF invoice link in browser.');
      } else {
        toast.error('Failed to generate invoice PDF');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      toast.error('Failed to generate and share invoice PDF');
    } finally {
      setSharing(false);
    }
  };

  const handleStatusUpdate = async (status) => {
    try {
      await axios.put(`/api/orders/${id}/status`, { status });
      toast.success('Order status updated');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleTapCheckout = async () => {
    setLoadingTap(true);
    try {
      const response = await axios.post('/api/payments/tap/create', {
        order_id: order.id,
        amount: remainingAmount,
        redirect_url: window.location.href
      });
      if (response.data?.transaction_url) {
        window.location.href = response.data.transaction_url;
      } else {
        toast.error('Failed to get payment URL');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setLoadingTap(false);
    }
  };


  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  const remainingAmount = parseFloat(order.total) - (order.payments?.reduce((sum, p) => sum + (p.status === 'completed' ? parseFloat(p.amount) : 0), 0) || 0);
  const isCashOrder = !order.payments || order.payments.length === 0 || order.payments.every(p => p.method === 'cash');
  const isVipOrder = order.vip_booking_id !== null && order.vip_booking_id !== undefined;
  const isProductOnly = order.items && order.items.length > 0 && order.items.every(item => item.category !== 'Services');

  return (
    <div className="space-y-6">
      <div className="space-y-6 no-print">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Order #{order.id}</h1>
          <div className="flex items-center gap-2 no-print">
            <button
              onClick={handleWhatsAppShare}
              disabled={sharing}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              {sharing ? '⏳ Generating PDF...' : '💬 Share via WhatsApp'}
            </button>
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              🖨️ Print Bill/Receipt
            </button>
            <Link to="/orders" className="text-primary-600 hover:underline">
              ← Back to Orders
            </Link>
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Order Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Customer</p>
              <p className="text-lg font-semibold">{order.customer_name || 'Walk-in Customer'}</p>
            </div>
            {order.vehicle_plate && (
              <div>
                <p className="text-sm text-gray-600">Vehicle Plate</p>
                <p className="text-lg font-mono">{order.vehicle_plate}</p>
              </div>
            )}
            {order.notes && order.notes.replace(/One-Tap Booking via Website - [^\n]*/g, '').trim() && (
              <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-bold text-red-800 uppercase tracking-wider mb-0.5">📝 Customer Note</p>
                <p className="text-sm text-red-900 font-semibold">{order.notes.replace(/One-Tap Booking via Website - [^\n]*/g, '').trim()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <div className="mt-2 flex items-center flex-wrap gap-3">
                <span className={`px-3 py-1.5 text-xs font-black rounded-full uppercase tracking-wider ${
                  isProductOnly ? 'bg-green-100 text-green-800' :
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {isProductOnly ? 'Order Placed' : (order.status === 'processing' ? 'In Progress' : order.status)}
                </span>

                {isVipOrder ? (
                  <button
                    onClick={() => setShowVipModal(true)}
                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-black rounded-lg transition shadow-md active:scale-[0.98]"
                  >
                    👑 Manage VIP Booking
                  </button>
                ) : (
                  (order.status === 'processing' || order.status === 'pending') && (
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-black rounded-lg transition shadow-md hover:shadow-primary-500/20 active:scale-[0.98]"
                    >
                      ✓ Done / Completed
                    </button>
                  )
                )}

                {!isVipOrder && (order.status === 'pending' || order.status === 'processing') && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to cancel this order?')) {
                        handleStatusUpdate('cancelled');
                      }
                    }}
                    className="px-3 py-2 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    Cancel Order
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-2xl font-bold text-primary-600">
                AED {parseFloat(order.total).toLocaleString()}
              </p>
            </div>
            {order.discount > 0 && (
              <div>
                <p className="text-sm text-gray-600">Discount</p>
                <p className="text-lg">AED {parseFloat(order.discount).toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-600">Payment Status</p>
              {order.status === 'cancelled' || order.payment_status === 'cancelled' ? (
                <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800 font-semibold border border-red-200">
                  cancelled
                </span>
              ) : order.credit_status ? (
                order.credit_status === 'unpaid' ? (
                  <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800 font-semibold">
                    Credit / Unpaid
                  </span>
                ) : order.credit_status === 'partially_paid' ? (
                  <span className="px-3 py-1 text-sm rounded-full bg-yellow-100 text-yellow-800 font-semibold">
                    Credit / Partial
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-800 font-semibold">
                    Paid
                  </span>
                )
              ) : (
                <span className={`px-3 py-1 text-sm rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                  order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  {order.payment_status}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <span className={`px-3 py-1 text-sm rounded-full font-semibold capitalize ${
                (order.payment_methods || order.payments?.[0]?.method) === 'cash' ? 'bg-green-100 text-green-800' :
                (order.payment_methods || order.payments?.[0]?.method) === 'card' ? 'bg-purple-100 text-purple-800' :
                (order.payment_methods || order.payments?.[0]?.method) === 'credit' ? 'bg-orange-100 text-orange-800' :
                (order.payment_methods || order.payments?.[0]?.method) ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {order.payment_methods || order.payments?.[0]?.method || 'N/A'}
              </span>
            </div>
            {order.source && (
              <div>
                <p className="text-sm text-gray-600">Order Source</p>
                <span className={`px-3 py-1 text-sm rounded-full ${order.source === 'customer_website' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                  {order.source === 'customer_website' ? '🌐 Customer Website' : '🖥️ POS System'}
                </span>
              </div>
            )}
            {order.notes && (
              <div>
                <p className="text-sm text-gray-600">Customer Notes</p>
                <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-gray-700">{order.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Order Items</h2>
          <div className="space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between border-b pb-3">
                <div>
                  <p className="font-semibold">{item.product_name || 'Product'}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                </div>
                <p className="font-semibold">
                  AED {parseFloat(item.price * item.quantity).toLocaleString()}
                </p>
              </div>
            ))}
            <div className="pt-3 border-t space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>AED {(parseFloat(order.total) + (parseFloat(order.discount) || 0)).toLocaleString()}</span>
              </div>
              {parseFloat(order.discount) > 0 && (
                <div className="flex justify-between text-sm text-red-600 font-semibold">
                  <span>Discount:</span>
                  <span>- AED {parseFloat(order.discount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg text-primary-600 border-t pt-2 mt-1">
                <span>Net Total:</span>
                <span>AED {parseFloat(order.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {order.payment_status !== 'paid' && order.status !== 'cancelled' && remainingAmount > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-2 border-primary-500">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">💳</span> Customer Payment Required
          </h2>
          <p className="text-gray-700 mb-6">
            The remaining balance is <span className="font-bold text-lg text-primary-600">AED {remainingAmount.toLocaleString()}</span>.
            {order.status === 'completed' ? (
              <span className="block mt-2 font-medium text-green-600">
                ✅ A payment link has been sent to the customer via SMS.
              </span>
            ) : (
              <span className="block mt-2 text-amber-600">
                ℹ️ Once you mark the order as <b>Completed</b>, a payment link will be sent to the customer automatically.
              </span>
            )}
          </p>

          <div className="flex gap-4">
            {showPayment ? (
              <div className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h3 className="font-semibold mb-3">Record Manual Payment</h3>
                <div className="w-full space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Method</label>
                      <select 
                        value={selectedOrderMethod}
                        onChange={(e) => setSelectedOrderMethod(e.target.value)}
                        className="w-full p-2 border rounded-lg bg-white font-bold"
                      >
                        <option value="cash">💵 Cash</option>
                        <option value="card">💳 Card</option>
                        <option value="bank_transfer">🏦 Bank Transfer</option>
                        <option value="multiple">🔀 Multiple Payments (Split)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Add Discount (AED)</label>
                      <input
                        type="number"
                        min="0"
                        max={remainingAmount}
                        value={paymentDiscount}
                        onChange={(e) => setPaymentDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary-500 text-sm font-bold"
                      />
                    </div>
                  </div>

                  {selectedOrderMethod === 'multiple' && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 text-left">
                      <p className="text-[11px] font-bold uppercase text-gray-500">Split Payment Amounts</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[11px] font-bold text-gray-700">Card (AED)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={orderSplitPayments.card || ''}
                            onChange={(e) => setOrderSplitPayments({ ...orderSplitPayments, card: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2 border rounded-lg bg-gray-50 font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-gray-700">Cash (AED)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={orderSplitPayments.cash || ''}
                            onChange={(e) => setOrderSplitPayments({ ...orderSplitPayments, cash: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2 border rounded-lg bg-gray-50 font-bold text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-gray-700">Bank Transfer (AED)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={orderSplitPayments.bank_transfer || ''}
                            onChange={(e) => setOrderSplitPayments({ ...orderSplitPayments, bank_transfer: parseFloat(e.target.value) || 0 })}
                            className="w-full p-2 border rounded-lg bg-gray-50 font-bold text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 items-center pt-2 border-t">
                    <button
                      onClick={async () => {
                        const finalAmount = Math.max(0, remainingAmount - paymentDiscount);
                        try {
                          const payload = {
                            order_id: order.id,
                            amount: finalAmount,
                            method: selectedOrderMethod,
                            discount: paymentDiscount
                          };

                          if (selectedOrderMethod === 'multiple') {
                            payload.splits = [
                              { method: 'card', amount: parseFloat(orderSplitPayments.card || 0) },
                              { method: 'cash', amount: parseFloat(orderSplitPayments.cash || 0) },
                              { method: 'bank_transfer', amount: parseFloat(orderSplitPayments.bank_transfer || 0) }
                            ].filter(s => s.amount > 0);
                          }

                          await axios.post('/api/payments/manual', payload);
                          toast.success('Payment recorded successfully');
                          setShowPayment(false);
                          setPaymentDiscount(0);
                          fetchOrder();
                        } catch (err) {
                          toast.error('Failed to record payment');
                        }
                      }}
                      className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition text-sm shadow-md"
                    >
                      Confirm Amount: AED {Math.max(0, remainingAmount - paymentDiscount).toLocaleString()}
                    </button>
                    <button onClick={() => setShowPayment(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm">Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-6 py-3 border-2 border-primary-600 text-primary-600 font-bold rounded-full hover:bg-primary-50 transition flex items-center gap-2"
                >
                  <span>💵</span> Record Manual Payment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {order.payments && order.payments.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Payment History</h2>
          <div className="space-y-3">
            {order.payments.map((payment) => (
              <div key={payment.id} className="flex justify-between border-b pb-3">
                <div>
                  <p className="font-semibold capitalize">{payment.method}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(payment.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">AED {parseFloat(payment.amount).toLocaleString()}</p>
                  <span className={`px-2 py-1 text-xs rounded-full ${payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                    }`}>
                    {payment.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      </div>

      {/* Printable Invoice Sheet (Only visible when printing) */}
      <div className="hidden print:block print-card font-sans text-sm text-black space-y-6 p-4">
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            @page {
              size: auto;
              margin: 10mm !important;
            }
            aside, nav, header, button, input, select, .no-print, .text-primary-600 {
              display: none !important;
            }
            body, html {
              background: white !important;
              color: black !important;
              margin: 0 !important;
              padding: 0 !important;
              font-size: 11px !important;
            }
            main {
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-card {
              margin: 0 !important;
              padding: 0 !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
            }
            .grid {
              display: block !important;
            }
            .bg-white {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin-bottom: 20px !important;
            }
            .shadow {
              box-shadow: none !important;
            }
            .border-2 {
              border: none !important;
            }
          }
        `}} />

        <div className="text-center border-b pb-4">
          <h1 className="text-3xl font-black tracking-wide">SNIPER CAR CARE</h1>
          <p className="text-xs text-gray-550">Auto Detailing & Ceramic Coatings</p>
          <p className="text-xs text-gray-500 mt-1">Tel: +971 50 114 6245 | Abu Dhabi, UAE</p>
        </div>

        <div className="flex justify-between text-xs">
          <div>
            <h3 className="font-bold text-xs uppercase mb-1">Bill To:</h3>
            <p className="font-semibold text-gray-800">{order.customer_name || 'Walk-in Customer'}</p>
            {order.customer_phone && <p>Tel: {order.customer_phone}</p>}
            {order.vehicle_plate && <p className="font-mono mt-1 bg-gray-150 px-2 py-0.5 rounded inline-block">Plate: {order.vehicle_plate}</p>}
          </div>
          <div className="text-right">
            <h3 className="font-bold text-xs uppercase mb-1">Invoice Info:</h3>
            <p><span className="font-bold">Invoice #:</span> CC-{order.id}</p>
            <p><span className="font-bold">Date:</span> {new Date(order.created_at).toLocaleDateString()}</p>
            <p><span className="font-bold">Status:</span> {order.status === 'completed' ? 'Completed' : 'In Progress'}</p>
            {order.credit_status ? (
              <>
                <p><span className="font-bold">Payment:</span> CREDIT</p>
                <p><span className="font-bold">Credit Status:</span> {order.credit_status.replace('_', ' ').toUpperCase()}</p>
              </>
            ) : (
              <p><span className="font-bold">Payment:</span> {order.payment_status.toUpperCase()}</p>
            )}
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs mt-4">
          <thead>
            <tr className="border-b-2 border-gray-300 font-bold bg-gray-100">
              <th className="p-2">Item Description</th>
              <th className="p-2 text-center">Qty</th>
              <th className="p-2 text-right">Unit Price</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.items?.map((item) => (
              <tr key={item.id}>
                <td className="p-2 font-semibold">{item.product_name}</td>
                <td className="p-2 text-center">{item.quantity}</td>
                <td className="p-2 text-right">AED {parseFloat(item.price).toFixed(2)}</td>
                <td className="p-2 text-right">AED {parseFloat(item.price * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-4 border-t">
          <div className="w-64 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>AED {(parseFloat(order.total) + (parseFloat(order.discount) || 0)).toFixed(2)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-red-650">
                <span>Discount:</span>
                <span>-AED {parseFloat(order.discount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-sm border-t pt-1">
              <span>Net Amount:</span>
              <span>AED {parseFloat(order.total).toFixed(2)}</span>
            </div>
            {order.credit_status ? (
              <div className="flex justify-between font-bold border-b pb-1 text-red-600">
                <span>Credit Balance (To Pay):</span>
                <span>AED {parseFloat(order.credit_remaining || 0).toFixed(2)}</span>
              </div>
            ) : (
              <div className="flex justify-between font-bold border-b pb-1 text-gray-600">
                <span>Remaining Balance:</span>
                <span>AED {remainingAmount.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {order.payments && order.payments.length > 0 && (
          <div className="pt-4 mt-4 border-t">
            <h4 className="font-bold text-xs uppercase mb-2">Payment Logs</h4>
            <div className="space-y-1 text-[10px]">
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex justify-between py-1 border-b border-dashed">
                  <span>{new Date(payment.created_at).toLocaleString()} - Method: <span className="capitalize font-semibold">{payment.method}</span> ({payment.status})</span>
                  <span className="font-semibold">AED {parseFloat(payment.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center pt-8 text-[10px] text-gray-400">
          <p>Thank you for choosing Sniper Car Care!</p>
          <p>This is a computer generated invoice. No signature required.</p>
        </div>
      </div>

      {/* VIP Booking Action Modal */}
      {showVipModal && vipBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto no-print">
          <div className="relative w-full max-w-lg rounded-xl bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col my-8">
            <button
              onClick={() => setShowVipModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="shrink-0 border-b pb-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Manage VIP Booking</h3>
                  <p className="text-sm text-gray-550 font-medium">Booking ID #{vipBooking.id}</p>
                </div>
                <span className={`px-3 py-1.5 text-xs font-black uppercase rounded-full ${getStatusColor(vipBooking.status)}`}>
                  {vipBooking.status}
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-5 text-sm">
              {/* Customer and Booking Info */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Customer</p>
                  <p className="font-semibold text-gray-800">{vipBooking.name}</p>
                  <p className="text-xs text-gray-500">{vipBooking.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Vehicle</p>
                  <p className="font-semibold text-gray-800 font-mono">{vipBooking.vehicle_model}</p>
                  <p className="text-xs text-gray-500">{vipBooking.vehicle_type}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 font-bold uppercase">Requested VIP Service</p>
                  <p className="font-semibold text-red-600 font-medium">{vipBooking.service_type}</p>
                  {vipBooking.order_total && (
                    <p className="text-xs font-semibold text-gray-600">Price: AED {parseFloat(vipBooking.order_total).toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Order Synced & Payment Details */}
              <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase">Synced POS Order</p>
                    <p className="font-semibold text-gray-800">Order #{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase text-right">Payment Status</p>
                    <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${
                      order.status === 'cancelled' || vipBooking?.status === 'cancelled' || order.payment_status === 'cancelled'
                        ? 'bg-red-100 text-red-800 border border-red-200'
                        : order.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {(order.status === 'cancelled' || vipBooking?.status === 'cancelled') ? 'cancelled' : (order.payment_status || 'pending')}
                    </span>
                  </div>
                </div>
                {order.payment_status === 'paid' && (
                  <div className="text-[10px] font-bold text-gray-500 uppercase text-right mt-1">
                    Paid via: {order.payments?.[0]?.method || 'manual'}
                  </div>
                )}
              </div>

              {/* Appointment Scheduling section */}
              {vipBooking.status === 'pending' || isRescheduling ? (
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
                      onClick={handleVipConfirmAndSchedule}
                      disabled={updatingVip}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 rounded-lg transition"
                    >
                      {updatingVip ? 'Scheduling...' : 'Save & Confirm'}
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
                      {vipBooking.appointment_date
                        ? `${new Date(vipBooking.appointment_date).toLocaleDateString('en-GB')} at ${vipBooking.appointment_time}`
                        : 'Not Scheduled'}
                    </p>
                  </div>
                  {['confirmed', 'in_progress'].includes(vipBooking.status) && (
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
                {vipBooking.status === 'in_progress' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex justify-between items-center text-purple-900 font-bold text-xs">
                    <span>⏱️ Time Elapsed:</span>
                    <span>{calculateElapsedTime(vipBooking.service_started_at, vipBooking.service_completed_at)}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {!isAppointmentToday(vipBooking.appointment_date) && ['confirmed', 'in_progress'].includes(vipBooking.status) ? (
                    <div className="w-full bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-lg text-xs font-bold text-center">
                      ⚠️ VIP service can only be started/completed on the scheduled day. Please reschedule this booking to today to proceed.
                    </div>
                  ) : (
                    <>
                      {vipBooking.status === 'confirmed' && (
                        <button
                          onClick={() => handleVipStatusChange('in_progress')}
                          disabled={updatingVip}
                          className="flex-1 min-w-[150px] bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                        >
                          ⚡ Start Service
                        </button>
                      )}
                      {vipBooking.status === 'in_progress' && (
                        <button
                          onClick={() => handleVipStatusChange('completed')}
                          disabled={updatingVip}
                          className="flex-1 min-w-[150px] bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg shadow-sm transition flex items-center justify-center gap-1"
                        >
                          ✓ Done (Complete Service)
                        </button>
                      )}
                    </>
                  )}
                  {['pending', 'confirmed', 'in_progress'].includes(vipBooking.status) && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this booking?')) {
                          handleVipStatusChange('cancelled');
                        }
                      }}
                      disabled={updatingVip}
                      className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>

              {/* Notes & Assignment form */}
              <form onSubmit={updateVipBookingDetails} className="space-y-4 pt-3 border-t">
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
                    {vipBooking.notes || 'No notes left by customer'}
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
                  disabled={updatingVip}
                  className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 rounded-lg transition"
                >
                  Save Notes & Assignment
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetail;


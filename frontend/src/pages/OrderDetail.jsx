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
      const response = await axios.get('/api/registers/status');
      setRegisterStatus(response.data.status);
    } catch (e) {
      console.error('Failed to fetch register status:', e);
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

  const handleWhatsAppShare = () => {
    if (!order) return;
    const itemsList = order.items?.map(item => `- ${item.product_name} (Qty: ${item.quantity}) - AED ${parseFloat(item.price).toFixed(2)}`).join('\n') || '';
    const message = `*Sniper Car Care - Order Receipt*\n` +
      `*Order ID:* #${order.id}\n` +
      `*Customer:* ${order.customer_name || 'Walk-in'}\n` +
      `*Plate:* ${order.vehicle_plate || 'N/A'}\n` +
      `*Items:* \n${itemsList}\n` +
      `*Total Amount:* AED ${parseFloat(order.total).toFixed(2)}\n\n` +
      `Thank you for choosing Sniper Car Care!`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
            >
              💬 Share via WhatsApp
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

                {(order.status === 'processing' || order.status === 'pending') && !isProductOnly && (
                  <button
                    onClick={() => handleStatusUpdate('completed')}
                    disabled={registerStatus !== 'open'}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-black rounded-lg transition shadow-md hover:shadow-primary-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    title={registerStatus !== 'open' ? "Please open the cash register first to complete orders" : ""}
                  >
                    ✓ Done / Completed
                  </button>
                )}

                {(order.status === 'pending' || order.status === 'processing') && (
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
              {order.credit_status ? (
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
            <div className="pt-3 border-t">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>AED {parseFloat(order.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {order.payment_status !== 'paid' && remainingAmount > 0 && isCashOrder && (
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
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Method</label>
                    <select id="manual_method" className="w-full p-2 border rounded-lg bg-white">
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      const method = document.getElementById('manual_method').value;
                      try {
                        await axios.post('/api/payments/manual', {
                          order_id: order.id,
                          amount: remainingAmount,
                          method: method
                        });
                        toast.success('Payment recorded successfully');
                        setShowPayment(false);
                        fetchOrder();
                      } catch (err) {
                        toast.error('Failed to record payment');
                      }
                    }}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition"
                  >
                    Confirm Amount: AED {remainingAmount.toLocaleString()}
                  </button>
                  <button onClick={() => setShowPayment(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => setShowPayment(true)}
                  className="px-6 py-3 border-2 border-primary-600 text-primary-600 font-bold rounded-full hover:bg-primary-50 transition flex items-center gap-2"
                >
                  Record Cash/Manual Payment
                </button>
                <button
                  onClick={handleTapCheckout}
                  disabled={loadingTap}
                  className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-50"
                >
                  💳 {loadingTap ? 'Redirecting...' : 'Pay Online via Tap'}
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
    </div>
  );
};

export default OrderDetail;


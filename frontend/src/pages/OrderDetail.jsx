import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from 'axios';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key');

const PaymentForm = ({ orderId, amount, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);

    try {
      if (paymentMethod === 'cash') {
        // Manual cash payment
        await axios.post('/api/payments/manual', {
          order_id: orderId,
          amount,
          method: 'cash'
        });
        toast.success('Cash payment recorded');
        onSuccess();
      } else {
        // Stripe payment
        const { data } = await axios.post('/api/payments/create-intent', {
          order_id: orderId,
          amount,
          payment_method: paymentMethod
        });

        const { error, paymentIntent } = await stripe.confirmCardPayment(
          data.client_secret,
          {
            payment_method: {
              card: elements.getElement(CardElement),
            }
          }
        );

        if (error) {
          toast.error(error.message);
        } else if (paymentIntent.status === 'succeeded') {
          await axios.post('/api/payments/confirm', {
            order_id: orderId,
            payment_intent_id: paymentIntent.id,
            amount,
            method: paymentMethod
          });
          toast.success('Payment successful!');
          onSuccess();
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Method
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="w-full px-4 py-2 border rounded-lg"
        >
          <option value="card">Card</option>
          <option value="cash">Cash</option>
          <option value="apple_pay">Apple Pay</option>
          <option value="samsung_pay">Samsung Pay</option>
        </select>
      </div>

      {paymentMethod === 'card' && (
        <div className="p-4 border rounded-lg">
          <CardElement />
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay AED {parseFloat(amount).toLocaleString()}`}
      </button>
    </form>
  );
};

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    fetchOrder();
  }, [id]);

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

  const handleStatusUpdate = async (status) => {
    try {
      await axios.put(`/api/orders/${id}/status`, { status });
      toast.success('Order status updated');
      fetchOrder();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  const remainingAmount = parseFloat(order.total) - (order.payments?.reduce((sum, p) => sum + (p.status === 'completed' ? parseFloat(p.amount) : 0), 0) || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Order #{order.id}</h1>
        <Link to="/orders" className="text-primary-600 hover:underline">
          ← Back to Orders
        </Link>
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
              <select
                value={order.status}
                onChange={(e) => handleStatusUpdate(e.target.value)}
                className="mt-1 px-4 py-2 border rounded-lg"
              >
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
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
              <span className={`px-3 py-1 text-sm rounded-full ${order.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                order.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                {order.payment_status}
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
            <div className="pt-3 border-t">
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>AED {parseFloat(order.total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {order.payment_status !== 'paid' && remainingAmount > 0 && (
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
              <button
                onClick={() => setShowPayment(true)}
                className="px-6 py-3 border-2 border-primary-600 text-primary-600 font-bold rounded-full hover:bg-primary-50 transition flex items-center gap-2"
              >
                Record Cash/Manual Payment
              </button>
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
  );
};

export default OrderDetail;


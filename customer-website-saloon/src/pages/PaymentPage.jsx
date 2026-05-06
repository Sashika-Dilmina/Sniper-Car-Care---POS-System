import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key');

const CheckoutForm = ({ order, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [paymentRequest, setPaymentRequest] = useState(null);

    useEffect(() => {
        if (stripe && order) {
            const pr = stripe.paymentRequest({
                country: 'AE',
                currency: 'aed',
                total: {
                    label: `Order #${order.id} - Sniper Car Care`,
                    amount: Math.round(parseFloat(order.total) * 100),
                },
                requestPayerName: true,
                requestPayerEmail: true,
            });

            pr.canMakePayment().then(result => {
                if (result) {
                    setPaymentRequest(pr);
                }
            });

            pr.on('paymentmethod', async (ev) => {
                try {
                    const { data } = await axios.post('/api/public/payments/create-intent', {
                        order_id: order.id,
                        amount: order.total,
                    });

                    const { error, paymentIntent } = await stripe.confirmCardPayment(
                        data.client_secret,
                        { payment_method: ev.paymentMethod.id },
                        { handleActions: false }
                    );

                    if (error) {
                        ev.complete('fail');
                        toast.error(error.message);
                    } else {
                        ev.complete('success');
                        if (paymentIntent.status === 'succeeded') {
                            await axios.post('/api/public/payments/confirm', {
                                order_id: order.id,
                                payment_intent_id: paymentIntent.id,
                                amount: order.total,
                                method: ev.paymentMethod.card ? 'card' : 'digital_wallet'
                            });
                            onSuccess();
                        }
                    }
                } catch (err) {
                    ev.complete('fail');
                    toast.error('Payment processing failed');
                }
            });
        }
    }, [stripe, order]);

    const handleCardSubmit = async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;

        setLoading(true);
        try {
            const { data } = await axios.post('/api/public/payments/create-intent', {
                order_id: order.id,
                amount: order.total,
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
                await axios.post('/api/public/payments/confirm', {
                    order_id: order.id,
                    payment_intent_id: paymentIntent.id,
                    amount: order.total,
                    method: 'card'
                });
                onSuccess();
            }
        } catch (err) {
            toast.error('Payment failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {paymentRequest && (
                <div>
                    <p className="text-sm text-gray-400 mb-3 text-center uppercase tracking-widest font-bold">Express Checkout</p>
                    <PaymentRequestButtonElement options={{ paymentRequest }} />
                    <div className="relative my-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-700"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-900 text-gray-400">Or pay with card</span>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleCardSubmit} className="space-y-6">
                <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 shadow-inner">
                    <CardElement options={{
                        style: {
                            base: {
                                fontSize: '18px',
                                color: '#fff',
                                '::placeholder': { color: '#6b7280' },
                            },
                        }
                    }} />
                </div>

                <button
                    type="submit"
                    disabled={loading || !stripe}
                    className="w-full h-14 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black text-lg rounded-xl shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            Processing...
                        </div>
                    ) : `Pay ${parseFloat(order.total).toLocaleString()} AED`}
                </button>
            </form>

            <div className="flex justify-center flex-wrap gap-4 opacity-50 grayscale hover:grayscale-0 transition-all">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/b0/Apple_Pay_logo.svg" alt="Apple Pay" className="h-5" />
            </div>
        </div>
    );
};

const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paid, setPaid] = useState(false);
    const navigate = useNavigate();

    const orderId = searchParams.get('order_id');
    const plate = searchParams.get('plate');

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        } else {
            setLoading(false);
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            const response = await axios.get(`/api/public/orders/${orderId}`);
            setOrder(response.data.order);
            if (response.data.order.payment_status === 'paid') {
                setPaid(true);
            }
        } catch (err) {
            toast.error('Order not found');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-400 font-medium">Securing connection...</p>
                </div>
            </div>
        );
    }

    if (paid) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-center">
                <div className="max-w-md w-full glassmorphism p-10 rounded-3xl border border-green-500/30">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="5 13l4 4L19 7"></path>
                        </svg>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-4">Payment Successful!</h1>
                    <p className="text-gray-400 mb-8 italic">Thank you for your business. We've sent you a separate feedback link via SMS. Your vehicle is ready for collection.</p>
                    <button
                        onClick={() => navigate(`/?plate=${plate}`)}
                        className="w-full py-4 bg-gray-800 text-white font-bold rounded-xl hover:bg-gray-700 transition"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6 text-center text-white">
                <div>
                    <h1 className="text-4xl font-black mb-4">Order Not Found</h1>
                    <p className="text-gray-400">Please check your link or contact support.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white selection:bg-yellow-500/30">
            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic">CHECKOUT</h1>
                    <div className="h-1 w-20 bg-yellow-500 mx-auto rounded-full"></div>
                </div>

                <div className="glassmorphism rounded-3xl overflow-hidden border border-gray-800 shadow-2xl mb-8">
                    <div className="p-8 bg-gradient-to-br from-gray-800/80 to-transparent">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <p className="text-sm text-yellow-500 font-black uppercase tracking-widest mb-1">Vehicle Plate</p>
                                <h2 className="text-3xl font-mono">{order.vehicle_plate}</h2>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mb-1">Order ID</p>
                                <h2 className="text-xl font-mono text-gray-500">#{order.id}</h2>
                            </div>
                        </div>

                        <div className="space-y-4 mb-8">
                            {order.items?.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-900/40 p-3 rounded-lg border border-gray-800/50">
                                    <span className="font-bold text-gray-300">{item.product_name}</span>
                                    <span className="font-mono text-white">{parseFloat(item.price).toLocaleString()} AED</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between items-end border-t border-gray-700 pt-6">
                            <span className="text-xl font-bold text-gray-400 capitalize">Total Balance</span>
                            <span className="text-5xl font-black text-white italic tracking-tighter">
                                {parseFloat(order.total).toLocaleString()} <span className="text-xl text-yellow-500 not-italic ml-1">AED</span>
                            </span>
                        </div>
                    </div>

                    <div className="p-8 bg-gray-900/50">
                        <Elements stripe={stripePromise}>
                            <CheckoutForm order={order} onSuccess={() => setPaid(true)} />
                        </Elements>
                    </div>
                </div>

                <p className="text-center text-gray-500 text-xs mt-12 px-8 leading-relaxed italic">
                    Payments are secure and encrypted. By paying, you agree to Sniper Car Care's Terms of Service. Sniper Car Care will never store your full card details.
                </p>
            </div>
        </div>
    );
};

export default PaymentPage;

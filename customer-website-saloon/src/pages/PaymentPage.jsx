import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key');

// Simulated Wallet Component for Apple Pay & Samsung Pay
const SimulatedWalletModal = ({ isOpen, onClose, method, amount, orderId, onSuccess }) => {
    const [step, setStep] = useState('confirm'); // 'confirm' -> 'processing' -> 'success'
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setStep('confirm');
            setProgress(0);
            return;
        }
    }, [isOpen]);

    const handlePay = () => {
        setStep('processing');
        setProgress(0);

        // Simulate progress bar and scanning
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(async () => {
                        try {
                            // Confirm order on backend
                            await axios.post('/api/public/orders/confirm', {
                                order_id: orderId,
                                payment_method: method
                            });
                            setStep('success');
                            setTimeout(() => {
                                onSuccess();
                            }, 1500);
                        } catch (err) {
                            toast.error('Payment confirmation failed');
                            setStep('confirm');
                        }
                    }, 500);
                    return 100;
                }
                return prev + 10;
            });
        }, 150);
    };

    if (!isOpen) return null;

    const isApple = method === 'apple_pay';
    const methodName = isApple ? 'Apple Pay' : 'Samsung Pay';
    const methodColorClass = isApple ? 'bg-black border-gray-800' : 'bg-blue-600 border-blue-500';

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className={`relative w-full max-w-sm rounded-3xl p-6 border text-white shadow-2xl transition-all duration-300 ${methodColorClass}`}>
                
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <span className="font-black tracking-widest text-sm flex items-center gap-1.5 uppercase">
                        {isApple ? '🍎' : '📱'} {methodName}
                    </span>
                    {step === 'confirm' && (
                        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition">
                            ✕
                        </button>
                    )}
                </div>

                {step === 'confirm' && (
                    <div className="space-y-6 text-center">
                        <div className="my-8">
                            <p className="text-gray-300 text-xs uppercase tracking-wider font-bold mb-1">Pay Sniper Car Care</p>
                            <h3 className="text-4xl font-black italic tracking-tighter">
                                {parseFloat(amount).toLocaleString()} <span className="text-lg font-bold not-italic">AED</span>
                            </h3>
                        </div>

                        {/* Card illustration */}
                        <div className="w-full h-40 bg-gradient-to-br from-gray-800 to-gray-900 border border-white/20 rounded-2xl p-4 text-left flex flex-col justify-between shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/10 rounded-full blur-2xl" />
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-mono font-black italic opacity-60">SNIPER PREMIUM CARD</span>
                                <span className="text-xl">💳</span>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-mono opacity-50">Card ending in</p>
                                <p className="text-lg font-mono font-bold">•••• •••• •••• 5698</p>
                            </div>
                        </div>

                        <p className="text-xs text-white/60 leading-relaxed italic">
                            Confirm authorization by double-clicking the pay button below.
                        </p>

                        <button
                            onClick={handlePay}
                            className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:bg-gray-100 transition active:scale-[0.98]"
                        >
                            Pay with Passcode
                        </button>
                    </div>
                )}

                {step === 'processing' && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6">
                        {/* FaceID Scan circle */}
                        <div className="relative w-24 h-24 flex items-center justify-center bg-white/5 border border-white/10 rounded-full shadow-inner animate-pulse">
                            <div className="absolute inset-0 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin" />
                            <span className="text-4xl">👤</span>
                        </div>
                        <div className="text-center space-y-2">
                            <h4 className="font-bold text-lg">Authorizing {methodName}...</h4>
                            <div className="w-48 bg-white/20 h-1 rounded-full overflow-hidden mx-auto">
                                <div className="bg-yellow-500 h-full transition-all duration-150" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                )}

                {step === 'success' && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-6 text-center animate-bounce">
                        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-2xl font-black">Success!</h4>
                            <p className="text-white/60 text-xs">Payment completed. Redirecting...</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

const StandardStripeCheckout = ({ order, onSuccess }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);

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
                ) : `Pay AED ${parseFloat(order.total).toLocaleString()}`}
            </button>
        </form>
    );
};

const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paid, setPaid] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('apple_pay'); // 'apple_pay', 'samsung_pay', 'card', 'cash'
    const [walletOpen, setWalletOpen] = useState(false);
    const [cashConfirming, setCashConfirming] = useState(false);
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

    const handleCashSubmit = async () => {
        setCashConfirming(true);
        try {
            await axios.post('/api/public/orders/confirm', {
                order_id: order.id,
                payment_method: 'cash'
            });
            toast.success('Booking confirmed with cash payment!');
            setPaid(true);
        } catch (err) {
            toast.error('Failed to confirm cash booking');
        } finally {
            setCashConfirming(false);
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
                    <h1 className="text-3xl font-black text-white mb-4">Booking Confirmed!</h1>
                    <p className="text-gray-400 mb-8 italic">
                        Thank you for booking! We have received your request and notified our team. Your vehicle will be completed shortly.
                    </p>
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
        <div className="min-h-screen bg-gray-900 text-white selection:bg-yellow-500/30 py-12">
            <div className="max-w-xl mx-auto px-6">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-black tracking-wider bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent italic">CHECKOUT</h1>
                    <div className="h-1 w-20 bg-yellow-500 mx-auto rounded-full mt-2"></div>
                </div>

                <div className="glassmorphism rounded-3xl overflow-hidden border border-gray-800 shadow-2xl p-6 sm:p-8 space-y-6">
                    <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                        <div>
                            <p className="text-[10px] text-yellow-500 font-black uppercase tracking-widest mb-1">Vehicle Plate</p>
                            <h2 className="text-2xl font-mono">{order.vehicle_plate || 'N/A'}</h2>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Order ID</p>
                            <h2 className="text-lg font-mono text-gray-500">#{order.id}</h2>
                        </div>
                    </div>

                    <div className="flex justify-between items-end bg-gray-950/40 p-4 rounded-xl border border-gray-800/50">
                        <span className="text-gray-400 font-bold">Total Amount</span>
                        <span className="text-3xl font-black text-white italic">
                            {parseFloat(order.total).toLocaleString()} <span className="text-sm text-yellow-500 not-italic ml-1">AED</span>
                        </span>
                    </div>

                    {/* Payment Method Selector */}
                    <div className="space-y-3">
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold">Select Payment Option</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setPaymentMethod('apple_pay')}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${paymentMethod === 'apple_pay' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-lg">🍎</span>
                                <span className="font-bold text-sm">Apple Pay</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('samsung_pay')}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${paymentMethod === 'samsung_pay' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-lg">📱</span>
                                <span className="font-bold text-sm">Samsung Pay</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${paymentMethod === 'card' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-lg">💳</span>
                                <span className="font-bold text-sm">Credit Card</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition ${paymentMethod === 'cash' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-lg">💵</span>
                                <span className="font-bold text-sm">Pay Cash</span>
                            </button>
                        </div>
                    </div>

                    {/* Contextual Checkout Render */}
                    <div className="pt-4 border-t border-gray-800">
                        {paymentMethod === 'apple_pay' && (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-400 leading-relaxed text-center">
                                    Express pay with Apple Pay. Simulated FaceID authorization will be opened.
                                </p>
                                <button
                                    onClick={() => setWalletOpen(true)}
                                    className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:bg-gray-100 transition flex items-center justify-center gap-2"
                                >
                                    <span></span> Pay with Apple Pay
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'samsung_pay' && (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-400 leading-relaxed text-center">
                                    Express pay with Samsung Pay. Simulated passcode authorization will be opened.
                                </p>
                                <button
                                    onClick={() => setWalletOpen(true)}
                                    className="w-full py-4 bg-blue-600 text-white font-black text-lg rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2"
                                >
                                    <span>📱</span> Pay with Samsung Pay
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <Elements stripe={stripePromise}>
                                <StandardStripeCheckout order={order} onSuccess={() => setPaid(true)} />
                            </Elements>
                        )}

                        {paymentMethod === 'cash' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-500 text-sm text-center">
                                    ℹ️ You will pay <b>{parseFloat(order.total).toLocaleString()} AED</b> in cash at the shop after the service.
                                </div>
                                <button
                                    onClick={handleCashSubmit}
                                    disabled={cashConfirming}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black text-lg rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {cashConfirming ? 'Confirming...' : 'Confirm Booking & Pay Cash'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Wallet overlay modal */}
            <SimulatedWalletModal
                isOpen={walletOpen}
                onClose={() => setWalletOpen(false)}
                method={paymentMethod}
                amount={order.total}
                orderId={order.id}
                onSuccess={() => {
                    setWalletOpen(false);
                    setPaid(true);
                }}
            />
        </div>
    );
};

export default PaymentPage;

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paid, setPaid] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('tap'); // 'tap', 'card', 'cash'
    const [tapSubOption, setTapSubOption] = useState('apple_pay'); // 'apple_pay', 'samsung_pay'
    const [walletOpen, setWalletOpen] = useState(false);
    const [cashConfirming, setCashConfirming] = useState(false);
    const [loadingTap, setLoadingTap] = useState(false);
    const navigate = useNavigate();

    const orderId = searchParams.get('order_id');
    const plate = searchParams.get('plate');

    useEffect(() => {
        const status = searchParams.get('status');
        const err = searchParams.get('error');
        if (status === 'success') {
            toast.success('Payment completed successfully!');
            setPaid(true);
            // Clean up the URL
            const cleanUrl = window.location.pathname + `?order_id=${orderId}&plate=${plate || ''}`;
            window.history.replaceState({}, document.title, cleanUrl);
        } else if (status === 'failed') {
            toast.error(`Payment failed: ${decodeURIComponent(err || 'Unknown error')}`);
            const cleanUrl = window.location.pathname + `?order_id=${orderId}&plate=${plate || ''}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        if (orderId) {
            fetchOrder();
        } else {
            setLoading(false);
        }
    }, [orderId, searchParams]);

    const handleTapCheckout = async () => {
        setLoadingTap(true);
        try {
            const redirectUrl = `${window.location.origin}${window.location.pathname}?order_id=${order.id}&plate=${plate || ''}`;
            const response = await axios.post('/api/public/payments/tap/create', {
                order_id: order.id,
                amount: order.total,
                redirect_url: redirectUrl
            });
            if (response.data?.transaction_url) {
                window.location.href = response.data.transaction_url;
            } else {
                toast.error('Failed to initiate Tap Payments');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Payment initiation failed');
        } finally {
            setLoadingTap(false);
        }
    };


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
                        <p className="text-xs text-gray-400 uppercase tracking-widest font-bold text-left">Select Payment Option</p>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => setPaymentMethod('cash')}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border-2 transition ${paymentMethod === 'cash' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-2xl">💵</span>
                                <span className="font-bold text-xs">Cash</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('tap')}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border-2 transition ${paymentMethod === 'tap' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-2xl">📱</span>
                                <span className="font-bold text-xs">Tap</span>
                            </button>
                            <button
                                onClick={() => setPaymentMethod('card')}
                                className={`flex flex-col items-center justify-center gap-1.5 p-3.5 rounded-xl border-2 transition ${paymentMethod === 'card' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <span className="text-2xl">💳</span>
                                <span className="font-bold text-xs">Card</span>
                            </button>
                        </div>

                        {/* Tap Checkout Render */}
                        {paymentMethod === 'tap' && (
                            <div className="space-y-4 pt-2">
                                <p className="text-xs text-gray-400 leading-relaxed text-center">
                                    Express pay using Tap Payments. You will be redirected to Tap Payments' secure billing page.
                                </p>
                                <button
                                    onClick={handleTapCheckout}
                                    disabled={loadingTap}
                                    className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loadingTap ? 'Redirecting...' : <><span>📱</span> Pay with Tap Payments</>}
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <div className="space-y-4">
                                <p className="text-xs text-gray-400 leading-relaxed text-center">
                                    Pay securely using Credit/Debit card via Tap Payments.
                                </p>
                                <button
                                    onClick={handleTapCheckout}
                                    disabled={loadingTap}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black text-lg rounded-xl shadow-lg hover:shadow-yellow-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {loadingTap ? 'Redirecting...' : <><span>💳</span> Pay with Debit/Credit Card</>}
                                </button>
                            </div>
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
        </div>
    );
};

export default PaymentPage;

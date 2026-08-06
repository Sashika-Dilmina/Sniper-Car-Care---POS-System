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
            setTimeout(() => {
                navigate(`/feedback?order_id=${orderId}&plate=${encodeURIComponent(plate || '')}`);
            }, 1000);
            return;
        } else if (status === 'failed') {
            toast.error(`Payment failed: ${decodeURIComponent(err || 'Unknown error')}`);
            const cleanUrl = window.location.pathname + `?order_id=${orderId}&plate=${plate || ''}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }

        if (orderId) {
            fetchOrder();
        } else {
            // Check for deferred booking in sessionStorage
            const tempStr = sessionStorage.getItem('temp_booking');
            if (tempStr) {
                const tempBooking = JSON.parse(tempStr);
                setOrder({
                    id: 'new',
                    total: tempBooking.total,
                    customer_name: tempBooking.customer_name,
                    customer_phone: tempBooking.customer_phone,
                    vehicle_type: tempBooking.vehicle_type,
                    vehicle_plate: tempBooking.vehicle_plate,
                    notes: tempBooking.notes,
                    service_name: tempBooking.service_name
                });
            }
            setLoading(false);
        }
    }, [orderId, searchParams]);

    const createDeferredOrder = async () => {
        const tempStr = sessionStorage.getItem('temp_booking');
        if (!tempStr) throw new Error('Booking session expired. Please go back and try again.');
        const tempBooking = JSON.parse(tempStr);

        const orderData = {
            customer_id: tempBooking.customer_id,
            customer_name: tempBooking.customer_name,
            customer_phone: tempBooking.customer_phone,
            vehicle_plate: tempBooking.vehicle_plate,
            vehicle_type: tempBooking.vehicle_type,
            items: [],
            total: tempBooking.total,
            source: 'customer_website_saloon',
            status: 'pending',
            payment_status: 'pending',
            notes: tempBooking.notes
        };

        const response = await axios.post('/api/public/orders', orderData);
        const createdOrder = response.data.order;
        
        sessionStorage.setItem('current_order_id', createdOrder.id);
        sessionStorage.removeItem('temp_booking');
        return createdOrder;
    };

    const handleTapCheckout = async () => {
        setLoadingTap(true);
        try {
            let activeOrder = order;
            if (activeOrder.id === 'new') {
                activeOrder = await createDeferredOrder();
                setOrder(activeOrder);
            }
            const redirectUrl = `${window.location.origin}${window.location.pathname}?order_id=${activeOrder.id}&plate=${plate || ''}`;
            const response = await axios.post('/api/public/payments/tap/create', {
                order_id: activeOrder.id,
                amount: activeOrder.total,
                redirect_url: redirectUrl
            });
            if (response.data?.transaction_url) {
                window.location.href = response.data.transaction_url;
            } else {
                toast.error('Failed to initiate Tap Payments');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message || 'Payment initiation failed');
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

    const handleManualSubmit = async (method) => {
        setCashConfirming(true);
        try {
            let activeOrder = order;
            if (activeOrder.id === 'new') {
                activeOrder = await createDeferredOrder();
                setOrder(activeOrder);
            }
            await axios.post('/api/public/orders/confirm', {
                order_id: activeOrder.id,
                payment_method: method
            });
            toast.success(`Booking confirmed with ${method === 'card' ? 'card' : 'cash'} payment! Redirecting...`);
            setPaid(true);
            setTimeout(() => {
                navigate(`/feedback?order_id=${activeOrder.id}&plate=${encodeURIComponent(plate || activeOrder.vehicle_plate || '')}`);
            }, 1200);
        } catch (err) {
            toast.error(err.response?.data?.message || `Failed to confirm ${method} booking`);
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
                            <h2 className="text-lg font-mono text-gray-500">{order.id === 'new' ? 'New' : `#${order.id}`}</h2>
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
                                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 transition ${paymentMethod === 'tap' ? 'border-yellow-500 bg-yellow-500/10' : 'border-gray-800 bg-gray-950/40 hover:bg-gray-800'}`}
                            >
                                <div className="flex items-center justify-center gap-1 text-white font-sans">
                                    <svg className="h-6 w-auto fill-current" viewBox="0 0 170 170" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.34.13-9.14-1.9-14.4-6.08-3.48-2.83-7.42-7.55-11.83-14.16-7.83-11.63-13.7-24.96-17.62-40-3.92-15.04-5.88-29.35-5.88-42.92 0-16.75 4.17-30.8 12.5-42.17 8.33-11.37 19.12-17.15 32.37-17.35 4.89 0 10.33 1.25 16.32 3.75 6 2.5 10.16 3.75 12.5 3.75 2.13 0 6.36-1.29 12.7-3.87 6.34-2.58 11.66-3.83 15.96-3.75 9.78.37 18.04 3.74 24.78 10.12 6.74 6.38 11.37 14.38 13.88 24-11.08 6.67-16.5 15.75-16.25 27.25.25 9.08 3.79 16.71 10.62 22.88 6.83 6.17 14.88 9.75 24.13 10.75-2.25 7-5.29 13.87-9.13 20.62zM119.22 3.01c0 6.08-2.34 12.16-7.03 18.25-4.68 6.08-10.42 10.12-17.22 12.12-.55-2.75-.82-5.42-.82-8 0-6.17 2.45-12.33 7.35-18.5 4.9-6.17 10.7-10.25 17.4-12.25.2.8.32 2.92.32 6.38z"/>
                                    </svg>
                                    <span className="font-extrabold text-xl tracking-tight leading-none">Pay</span>
                                </div>
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
                                    Express pay using Apple Pay. You will be redirected to the secure billing page.
                                </p>
                                <button
                                    onClick={handleTapCheckout}
                                    disabled={loadingTap}
                                    className="w-full py-4 bg-white text-black font-black text-lg rounded-xl hover:bg-gray-100 transition flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {loadingTap ? 'Redirecting...' : (
                                        <>
                                            <svg className="h-6 w-auto fill-current" viewBox="0 0 100 42" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M14.618 14.86c-0.895 1.054-2.188 1.83-3.562 1.724-0.177-1.396 0.443-2.825 1.28-3.799 0.906-1.042 2.298-1.782 3.528-1.701 0.177 1.419-0.388 2.859-1.246 3.776zm1.189 2.001c-1.956-0.117-3.633 1.088-4.568 1.088-0.957 0-2.368-1.042-3.914-1.018-2.025 0.035-3.889 1.182-4.935 3.014-2.112 3.666-0.542 9.076 1.516 12.052 1.006 1.454 2.2 3.082 3.773 3.023 1.516-0.059 2.091-0.978 3.926-0.978 1.835 0 2.356 0.978 3.938 0.943 1.621-0.035 2.646-1.477 3.639-2.929 1.151-1.677 1.621-3.3 1.644-3.382-0.035-0.024-3.15-1.21-3.185-4.805-0.035-2.999 2.457-4.437 2.574-4.519-1.402-2.049-3.575-2.283-4.327-2.333l-0.082 0.023zM32.8 12.3h-4.3v18.4h3.1v-6.9h1.2c4.1 0 6.6-2.3 6.6-5.8 0-3.6-2.5-5.7-6.6-5.7zm-1.2 8.7h-1.9v-6h1.9c2.3 0 3.7 1.1 3.7 3 0 1.9-1.4 3-3.7 3zm17.9-3.2c-1.8 0-3.1 0.9-3.7 2.1l-0.1-1.8h-2.8v12.6h3.1v-4.8c0-2.2 1.1-3.4 2.7-3.4 1.4 0 2.2 0.8 2.2 2.3v5.9h3.1v-6.5c0-3.9-1.9-6.4-4.5-6.4zm-14.7 0c-4 0-6.8 2.9-6.8 6.6 0 3.6 2.7 6.5 6.7 6.5 1.8 0 3.3-0.6 4.3-1.6l-1.3-1.8c-0.8 0.8-1.8 1.1-2.9 1.1-2.2 0-3.8-1.5-3.8-3.7h8.4c0.1-0.4 0.1-0.9 0.1-1.2 0-3.6-2.1-5.9-4.7-5.9zm-3.6 5.2c0.2-1.6 1.4-2.7 3.2-2.7 1.7 0 2.8 1.1 2.9 2.7h-6.1z"/>
                                            </svg>
                                            <span>Pay with Apple Pay</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'card' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-500 text-sm text-center">
                                    ℹ️ You will pay <b>{parseFloat(order.total).toLocaleString()} AED</b> by Card on our terminal machine at the shop after the service.
                                </div>
                                <button
                                    onClick={() => handleManualSubmit('card')}
                                    disabled={cashConfirming}
                                    className="w-full py-4 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-black text-lg rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {cashConfirming ? 'Confirming...' : <><span>💳</span> Confirm Booking & Pay by Card</>}
                                </button>
                            </div>
                        )}

                        {paymentMethod === 'cash' && (
                            <div className="space-y-4">
                                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-yellow-500 text-sm text-center">
                                    ℹ️ You will pay <b>{parseFloat(order.total).toLocaleString()} AED</b> in cash at the shop after the service.
                                </div>
                                <button
                                    onClick={() => handleManualSubmit('cash')}
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

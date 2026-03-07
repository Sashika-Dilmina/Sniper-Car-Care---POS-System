import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const FeedbackPage = () => {
    const [searchParams] = useSearchParams();
    const [customerInfo, setCustomerInfo] = useState(null);
    const [orderInfo, setOrderInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [feedbackForm, setFeedbackForm] = useState({
        rating: 0,
        comment: ''
    });
    const [submitted, setSubmitted] = useState(false);

    const orderId = searchParams.get('order_id');
    const customerId = searchParams.get('customer_id');
    const plate = searchParams.get('plate');

    useEffect(() => {
        fetchInfo();
    }, [orderId, customerId, plate]);

    const fetchInfo = async () => {
        try {
            setLoading(true);

            if (customerId) {
                try {
                    const response = await axios.get(`/api/public/customer/by-id?id=${customerId}`);
                    if (response.data.customer) {
                        setCustomerInfo(response.data.customer);
                    }
                } catch (error) {
                    console.log('Customer not found');
                }
            } else if (plate) {
                try {
                    const response = await axios.get(`/api/public/customer/by-plate?plate=${plate}`);
                    if (response.data.customer) {
                        setCustomerInfo(response.data.customer);
                    }
                } catch (error) {
                    console.log('Customer not found');
                }
            }

            if (orderId) {
                try {
                    const response = await axios.get(`/api/public/order/${orderId}`);
                    if (response.data.order) {
                        setOrderInfo(response.data.order);
                    }
                } catch (error) {
                    console.log('Order not found');
                }
            }
        } catch (error) {
            console.error('Error fetching info:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!feedbackForm.rating || feedbackForm.rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        setSubmitting(true);
        try {
            const feedbackData = {
                customer_id: customerInfo?.id || customerId || null,
                customer_name: customerInfo?.name || orderInfo?.customer_name || null,
                customer_phone: customerInfo?.phone || orderInfo?.customer_phone || null,
                order_id: orderId || orderInfo?.id || null,
                service_id: null,
                rating: feedbackForm.rating,
                comment: feedbackForm.comment || null
            };

            await axios.post('/api/feedback', feedbackData);

            toast.success('Thank you for your feedback! We appreciate it.');
            setSubmitted(true);
        } catch (error) {
            console.error('Feedback error:', error);
            toast.error(error.response?.data?.message || 'Failed to submit feedback. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-400 mx-auto mb-4"></div>
                    <p className="text-slate-300">Loading...</p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-white/10 shadow-2xl">
                        <div className="mb-6">
                            <svg className="w-20 h-20 text-green-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">Thank You!</h2>
                        <p className="text-slate-300 mb-6">
                            Your feedback has been submitted successfully. We truly appreciate you taking the time to share your experience with us.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
                        >
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link to="/" className="inline-block mb-4">
                        <span className="text-2xl font-semibold tracking-tight text-white">
                            Sniper<span className="text-primary-400">CarCare</span>
                        </span>
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2">Share Your Feedback</h1>
                    <p className="text-slate-400">
                        {customerInfo?.name && `Hi ${customerInfo.name}! `}
                        We'd love to hear about your experience
                    </p>
                </div>

                {/* Feedback Form */}
                <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 border border-white/10 shadow-2xl">
                    {orderInfo && (
                        <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-white/10">
                            <p className="text-sm text-slate-400 mb-1">Order Information</p>
                            <p className="text-white font-semibold">Order #{orderInfo.id}</p>
                            {orderInfo.total && (
                                <p className="text-slate-300 text-sm">Total: {orderInfo.total.toLocaleString()} AED</p>
                            )}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-4">
                                How would you rate your experience? <span className="text-red-400">*</span>
                            </label>
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setFeedbackForm({ ...feedbackForm, rating: star })}
                                        className={`p-3 rounded-xl transition transform hover:scale-110 ${feedbackForm.rating >= star
                                                ? 'text-yellow-400 bg-yellow-400/20 scale-110'
                                                : 'text-slate-500 hover:text-yellow-400 hover:bg-yellow-400/10'
                                            }`}
                                    >
                                        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                            {feedbackForm.rating > 0 && (
                                <p className="text-center text-lg font-semibold text-white mt-4">
                                    {feedbackForm.rating === 5 && '⭐⭐⭐⭐⭐ Excellent!'}
                                    {feedbackForm.rating === 4 && '⭐⭐⭐⭐ Great!'}
                                    {feedbackForm.rating === 3 && '⭐⭐⭐ Good'}
                                    {feedbackForm.rating === 2 && '⭐⭐ Fair'}
                                    {feedbackForm.rating === 1 && '⭐ Poor'}
                                </p>
                            )}
                        </div>

                        {/* Comment */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Tell us more about your experience (Optional)
                            </label>
                            <textarea
                                value={feedbackForm.comment}
                                onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                                rows={6}
                                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                                placeholder="We'd love to hear your thoughts on our service, staff, facilities, or any suggestions for improvement..."
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={submitting || feedbackForm.rating === 0}
                                className="w-full px-6 py-4 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                            >
                                {submitting ? 'Submitting...' : 'Submit Feedback'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer Note */}
                <p className="text-center text-slate-500 text-sm mt-6">
                    Your feedback helps us improve our services. Thank you for your time!
                </p>
            </div>
        </div>
    );
};

export default FeedbackPage;

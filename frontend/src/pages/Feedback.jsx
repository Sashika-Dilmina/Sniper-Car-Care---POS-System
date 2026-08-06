import { useEffect, useState } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Feedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchFeedback();
  }, [filterRating, filterStatus]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterRating) params.append('rating', filterRating);
      if (filterStatus) params.append('status', filterStatus);
      params.append('limit', '100');

      const response = await axios.get(`/api/feedback?${params.toString()}`);
      setFeedbackList(response.data.feedback || []);
    } catch (error) {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await axios.put(`/api/feedback/${id}/status`, { status: newStatus });
      toast.success(`Feedback status updated to ${newStatus}`);
      fetchFeedback();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback?')) return;
    try {
      await axios.delete(`/api/feedback/${id}`);
      toast.success('Feedback deleted');
      fetchFeedback();
    } catch (error) {
      toast.error('Failed to delete feedback');
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-amber-400 text-lg' : 'text-gray-300 text-lg'}>
          ★
        </span>
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Customer Feedbacks</h1>
          <p className="text-gray-500 text-sm mt-1">Review ratings and feedback submitted by customers after completed services.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-center">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Rating</label>
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars ⭐⭐⭐⭐⭐</option>
            <option value="4">4 Stars ⭐⭐⭐⭐</option>
            <option value="3">3 Stars ⭐⭐⭐</option>
            <option value="2">2 Stars ⭐⭐</option>
            <option value="1">1 Star ⭐</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {(filterRating || filterStatus) && (
          <button
            onClick={() => {
              setFilterRating('');
              setFilterStatus('');
            }}
            className="self-end px-3 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition"
          >
            Reset Filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : feedbackList.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Rating</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Comment</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {feedbackList.map((fb) => (
                  <tr key={fb.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-bold text-gray-900">{fb.customer_name || fb.name || 'Valued Customer'}</p>
                        <p className="text-xs font-mono text-gray-500">{fb.vehicle_plate || 'N/A'} {fb.vehicle_type ? `(${fb.vehicle_type})` : ''}</p>
                        {fb.customer_phone && <p className="text-xs text-gray-400">{fb.customer_phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStars(fb.rating)}
                      <span className="text-xs text-gray-500 font-bold mt-0.5 block">{fb.rating} / 5</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-800 max-w-md break-words italic">
                        "{fb.comment || 'No written comment.'}"
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                      {new Date(fb.created_at).toLocaleDateString()} {new Date(fb.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${
                        fb.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' :
                        fb.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {fb.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      {fb.status !== 'approved' && (
                        <button
                          onClick={() => handleStatusChange(fb.id, 'approved')}
                          className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 text-xs font-bold rounded transition"
                        >
                          Approve
                        </button>
                      )}
                      {fb.status !== 'rejected' && (
                        <button
                          onClick={() => handleStatusChange(fb.id, 'rejected')}
                          className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 text-xs font-bold rounded transition"
                        >
                          Reject
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(fb.id)}
                        className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-bold rounded transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <span className="text-4xl">💬</span>
          <p className="mt-2 text-gray-600 font-medium">No customer feedback records found.</p>
        </div>
      )}
    </div>
  );
};

export default Feedback;

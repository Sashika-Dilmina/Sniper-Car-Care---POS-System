import { useState, useEffect } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Credits = () => {
  const [credits, setCredits] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('active'); // 'active' (unpaid/partial), 'fully_paid', 'All'

  // Modal State for Recovery
  const [isRecoverModalOpen, setIsRecoverModalOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState(null);
  const [recoveryForm, setRecoveryForm] = useState({
    amount_paid: '',
    payment_method: 'cash',
    notes: ''
  });

  // Modal State for Payment History
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/credits');
      if (response.data.success) {
        setCredits(response.data.credits || []);
      }
    } catch (error) {
      toast.error('Failed to load customer credits ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleOpenRecoverModal = (credit) => {
    setSelectedCredit(credit);
    setRecoveryForm({
      amount_paid: parseFloat(credit.remaining_amount).toFixed(2),
      payment_method: 'cash',
      notes: ''
    });
    setIsRecoverModalOpen(true);
  };

  const handleCloseRecoverModal = () => {
    setIsRecoverModalOpen(false);
    setSelectedCredit(null);
  };

  const handleRecoverSubmit = async (e) => {
    e.preventDefault();
    if (!recoveryForm.amount_paid || parseFloat(recoveryForm.amount_paid) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(recoveryForm.amount_paid) > parseFloat(selectedCredit.remaining_amount)) {
      toast.error(`Cannot recover more than outstanding amount (AED ${parseFloat(selectedCredit.remaining_amount).toFixed(2)})`);
      return;
    }

    try {
      const response = await axios.post(`/api/credits/${selectedCredit.id}/recover`, {
        amount_paid: parseFloat(recoveryForm.amount_paid),
        payment_method: recoveryForm.payment_method,
        notes: recoveryForm.notes
      });

      if (response.data.success) {
        toast.success(`Recovered AED ${parseFloat(recoveryForm.amount_paid).toFixed(2)} successfully!`);
        fetchCredits();
        setIsRecoverModalOpen(false);
      }
    } catch (error) {
      toast.error('Failed to record recovery payment');
    }
  };

  const handleViewHistory = async (credit) => {
    setSelectedCredit(credit);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const response = await axios.get(`/api/credits/${credit.id}/history`);
      if (response.data.success) {
        setPaymentHistory(response.data.payments || []);
      }
    } catch (error) {
      toast.error('Failed to load payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setPaymentHistory([]);
    setSelectedCredit(null);
  };

  // Filters
  const filteredCredits = credits.filter(c => {
    const matchesSearch = c.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.vehicle_plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.customer_phone && c.customer_phone.includes(searchQuery));
    
    let matchesStatus = true;
    if (selectedStatus === 'active') {
      matchesStatus = c.status !== 'fully_paid';
    } else if (selectedStatus === 'fully_paid') {
      matchesStatus = c.status === 'fully_paid';
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalOutstanding = credits.filter(c => c.status !== 'fully_paid').reduce((sum, c) => sum + parseFloat(c.remaining_amount), 0);
  const totalRecovered = credits.reduce((sum, c) => sum + (parseFloat(c.amount) - parseFloat(c.remaining_amount)), 0);
  const activeCreditCustomers = new Set(credits.filter(c => c.status !== 'fully_paid').map(c => c.customer_id)).size;

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Customer Credit Ledger</h1>
        <p className="text-sm text-gray-500 mt-1">Track outstanding customer balances, record cash/card recoveries, and view transaction history.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Outstanding Credit</span>
          <h3 className="text-3xl font-black text-red-600 mt-2">
            AED {totalOutstanding.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </h3>
          <span className="text-xs text-red-500 font-semibold mt-4">Total loans/credits currently active</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Recovered Cash/Card</span>
          <h3 className="text-3xl font-black text-green-600 mt-2">
            AED {totalRecovered.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </h3>
          <span className="text-xs text-green-500 font-semibold mt-4">Credit successfully recovered</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Credit Customers</span>
          <h3 className="text-3xl font-black text-gray-800 mt-2">
            {activeCreditCustomers} Customers
          </h3>
          <span className="text-xs text-gray-400 mt-4">Customers with unpaid balances</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
          {[
            { id: 'active', label: 'Active Balances' },
            { id: 'fully_paid', label: 'Cleared Credits' },
            { id: 'All', label: 'All Statements' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStatus(s.id)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedStatus === s.id 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search credit by customer name or vehicle plate..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full md:max-w-sm"
        />
      </div>

      {/* Credits Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Granted</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Plate / Model</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total Credit</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Remaining Credit</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">Loading credit ledger...</td>
                </tr>
              ) : filteredCredits.length > 0 ? (
                filteredCredits.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(c.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      <div>{c.customer_name}</div>
                      {c.customer_phone && <div className="text-xs text-gray-400 font-normal mt-0.5">{c.customer_phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-600">
                      {c.vehicle_plate} ({c.vehicle_type})
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      #{c.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      AED {parseFloat(c.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900 text-right">
                      AED {parseFloat(c.remaining_amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        c.status === 'fully_paid' ? 'bg-green-50 text-green-700' :
                        c.status === 'partially_paid' ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                      }`}>
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {c.status !== 'fully_paid' && (
                        <button
                          onClick={() => handleOpenRecoverModal(c)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold mr-2 shadow-sm transition"
                        >
                          💵 Recover Cash
                        </button>
                      )}
                      <button
                        onClick={() => handleViewHistory(c)}
                        className="text-primary-600 hover:text-primary-950 font-bold"
                      >
                        History Logs
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    No credit statements match the query filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recover Payment Modal */}
      {isRecoverModalOpen && selectedCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border">
            <div className="bg-black text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-lg">Recover Customer Cash</h3>
              <button onClick={handleCloseRecoverModal} className="text-gray-400 hover:text-white transition">✕</button>
            </div>
            
            <form onSubmit={handleRecoverSubmit} className="p-6 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg border text-sm text-gray-600 space-y-1">
                <p><b>Customer:</b> {selectedCredit.customer_name}</p>
                <p><b>Plate:</b> {selectedCredit.vehicle_plate}</p>
                <p><b>Outstanding Balance:</b> AED {parseFloat(selectedCredit.remaining_amount).toFixed(2)}</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Recovery Amount (AED) *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  max={selectedCredit.remaining_amount}
                  step="0.01"
                  placeholder="Enter recovery amount"
                  value={recoveryForm.amount_paid}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, amount_paid: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-extrabold text-gray-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Method *</label>
                <select
                  value={recoveryForm.payment_method}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold"
                >
                  <option value="cash">💵 Cash</option>
                  <option value="card">💳 Card</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Notes / Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in full, Receipt #1024"
                  value={recoveryForm.notes}
                  onChange={(e) => setRecoveryForm({ ...recoveryForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCloseRecoverModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {isHistoryModalOpen && selectedCredit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
            <div className="bg-black text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-lg">Recovery Payments History</h3>
              <button onClick={handleCloseHistoryModal} className="text-gray-400 hover:text-white transition">✕</button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="border-b pb-2 text-sm text-gray-600">
                <p><b>Statement Logs:</b> Order #{selectedCredit.order_id}</p>
                <p><b>Total Debt:</b> AED {parseFloat(selectedCredit.amount).toFixed(2)}</p>
                <p><b>Remaining Outstanding:</b> AED {parseFloat(selectedCredit.remaining_amount).toFixed(2)}</p>
              </div>

              {loadingHistory ? (
                <div className="text-center py-6 text-gray-500">Loading history logs...</div>
              ) : paymentHistory.length > 0 ? (
                <div className="space-y-3">
                  {paymentHistory.map((h) => (
                    <div key={h.id} className="p-3 bg-gray-50 border rounded-xl flex justify-between items-center">
                      <div>
                        <p className="text-sm font-extrabold text-gray-800">AED {parseFloat(h.amount_paid).toFixed(2)}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{h.payment_method} • {new Date(h.payment_date).toLocaleString()}</p>
                        {h.notes && <p className="text-xs text-gray-500 mt-1 italic">"{h.notes}"</p>}
                      </div>
                      <span className="text-xl">💰</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-400 text-sm">
                  No recovery payments have been registered for this credit yet.
                </div>
              )}

              <div className="flex justify-end pt-3 border-t">
                <button
                  onClick={handleCloseHistoryModal}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold"
                >
                  Close History
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Credits;

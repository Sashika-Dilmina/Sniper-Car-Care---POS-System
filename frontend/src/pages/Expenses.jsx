import { useState, useEffect } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentExpenseId, setCurrentExpenseId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Utilities',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    notes: ''
  });

  const categories = ['Rent', 'Salaries', 'Utilities', 'Marketing', 'Repairs', 'Other'];

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/expenses');
      if (response.data.success) {
        setExpenses(response.data.expenses || []);
      }
    } catch (error) {
      toast.error('Failed to load expenses list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormData({
      title: '',
      category: 'Utilities',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (exp) => {
    setIsEditMode(true);
    setCurrentExpenseId(exp.id);
    setFormData({
      title: exp.title,
      category: exp.category,
      amount: parseFloat(exp.amount),
      expense_date: new Date(exp.expense_date).toISOString().split('T')[0],
      payment_method: exp.payment_method || 'cash',
      notes: exp.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.expense_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (isEditMode) {
        const response = await axios.put(`/api/expenses/${currentExpenseId}`, formData);
        if (response.data.success) {
          toast.success('Expense record updated successfully');
          fetchExpenses();
          setIsModalOpen(false);
        }
      } else {
        const response = await axios.post('/api/expenses', formData);
        if (response.data.success) {
          toast.success('Expense logged successfully');
          fetchExpenses();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save expense details');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense record?')) return;
    try {
      const response = await axios.delete(`/api/expenses/${id}`);
      if (response.data.success) {
        toast.success('Expense record deleted successfully');
        fetchExpenses();
      }
    } catch (error) {
      toast.error('Failed to delete expense record');
    }
  };

  // Filtered list
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (exp.notes && exp.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || exp.category === selectedCategory;
    
    let matchesDate = true;
    if (startDate && endDate) {
      const eDate = new Date(exp.expense_date).toISOString().split('T')[0];
      matchesDate = eDate >= startDate && eDate <= endDate;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  // Calculate totals
  const totalExpensesCost = filteredExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const cashExpensesCost = filteredExpenses.filter(e => e.payment_method === 'cash').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const cardExpensesCost = filteredExpenses.filter(e => e.payment_method === 'card').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Expenses Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Log general business overheads like rent, utility bills, employee payroll, or marketing campaigns.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow transition"
        >
          ➕ Log Expense
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Expenses</span>
          <h3 className="text-3xl font-black text-gray-800 mt-2">
            AED {totalExpensesCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </h3>
          <span className="text-xs text-gray-400 mt-4">For the selected category and timeframe</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Paid via Cash</span>
          <h3 className="text-3xl font-black text-amber-600 mt-2">
            AED {cashExpensesCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </h3>
          <span className="text-xs text-gray-400 mt-4">Cash outflow records</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Paid via Card / Bank</span>
          <h3 className="text-3xl font-black text-blue-600 mt-2">
            AED {cardExpensesCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
          </h3>
          <span className="text-xs text-gray-400 mt-4">Digital card or bank transfer outflow</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Filter Expense Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 font-bold mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-xs font-semibold"
            >
              <option value="All">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-bold mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-bold mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-xs"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 font-bold mb-1">Search Keyword</label>
            <input
              type="text"
              placeholder="Search by title, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Expense Title</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">Loading expenses log...</td>
                </tr>
              ) : filteredExpenses.length > 0 ? (
                filteredExpenses.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(e.expense_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      <div>{e.title}</div>
                      {e.notes && <div className="text-xs text-gray-400 font-normal mt-0.5">{e.notes}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold capitalize text-gray-600">
                      {e.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900 text-right">
                      AED {parseFloat(e.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenEditModal(e)}
                        className="text-primary-600 hover:text-primary-950 font-bold mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    No expense records registered for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border">
            <div className="bg-black text-white p-5 flex justify-between items-center">
              <h3 className="font-bold text-lg">{isEditMode ? 'Edit Expense Record' : 'Log New Expense'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. June Electricity Bill, Shop Rent"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Method *</label>
                  <select
                    value={formData.payment_method}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  >
                    <option value="cash">💵 Cash</option>
                    <option value="card">💳 Card</option>
                    <option value="credit">🏦 Credit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Amount (AED) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 1500.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Additional Notes</label>
                <textarea
                  placeholder="Billing reference numbers, employee name for salary, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold"
                >
                  {isEditMode ? 'Save Changes' : 'Log Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Expenses;

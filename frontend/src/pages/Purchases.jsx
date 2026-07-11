import { useState, useEffect } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [dbProductsList, setDbProductsList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSupplierId, setSelectedSupplierId] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentPurchaseId, setCurrentPurchaseId] = useState(null);
  const [formData, setFormData] = useState({
    supplier_id: '',
    item_name: '',
    category: 'Product',
    quantity: 1,
    unit_price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    payment_status: 'paid',
    payment_method: 'cash',
    notes: '',
    selling_price: ''
  });

  const categories = ['Product', 'Service', 'Equipment', 'Chemicals', 'Other'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
        axios.get('/api/purchases'),
        axios.get('/api/suppliers'),
        axios.get('/api/products')
      ]);

      if (purchasesRes.data.success) {
        setPurchases(purchasesRes.data.purchases || []);
      }
      if (suppliersRes.data.success) {
        setSuppliers(suppliersRes.data.suppliers || []);
      }
      if (productsRes.data.products) {
        setDbProductsList(productsRes.data.products || []);
      }
    } catch (error) {
      toast.error('Failed to load purchases data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setSelectedProduct(null);
    setFormData({
      supplier_id: suppliers.length > 0 ? suppliers[0].id : '',
      item_name: '',
      category: 'Product',
      quantity: 1,
      unit_price: '',
      purchase_date: new Date().toISOString().split('T')[0],
      payment_status: 'paid',
      payment_method: 'cash',
      notes: '',
      selling_price: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setIsEditMode(true);
    setCurrentPurchaseId(p.id);
    const matched = dbProductsList.find(item => item.name.toLowerCase() === p.item_name.toLowerCase());
    setSelectedProduct(matched || null);
    setFormData({
      supplier_id: p.supplier_id || '',
      item_name: p.item_name,
      category: p.category,
      quantity: p.quantity,
      unit_price: parseFloat(p.unit_price),
      purchase_date: new Date(p.purchase_date).toISOString().split('T')[0],
      payment_status: p.payment_status || 'paid',
      payment_method: p.payment_method || 'cash',
      notes: p.notes || '',
      selling_price: matched ? matched.price : ''
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_name || !formData.unit_price || !formData.purchase_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      let isSuccess = false;
      if (isEditMode) {
        const response = await axios.put(`/api/purchases/${currentPurchaseId}`, formData);
        if (response.data.success) {
          isSuccess = true;
          toast.success('Purchase updated successfully');
        }
      } else {
        const response = await axios.post('/api/purchases', formData);
        if (response.data.success) {
          isSuccess = true;
          toast.success('Purchase logged successfully');
        }
      }

      if (isSuccess) {
        // If it's a product and we have a matched product in our database, update it!
        if (formData.category === 'Product' && selectedProduct) {
          try {
            await axios.put(`/api/products/${selectedProduct.id}`, {
              name: selectedProduct.name,
              description: selectedProduct.description,
              category: selectedProduct.category,
              price: parseFloat(formData.selling_price) || selectedProduct.price,
              purchase_price: parseFloat(formData.unit_price),
              stock: parseInt(selectedProduct.stock) + (isEditMode ? 0 : parseInt(formData.quantity)), // only increment stock on new purchase log, not edit
              image_url: selectedProduct.image_url,
              supplier_id: formData.supplier_id || selectedProduct.supplier_id,
              vehicle_type: selectedProduct.vehicle_type
            });
            toast.success('Product price & stock updated in database');
          } catch (err) {
            console.error('Failed to update product details:', err);
            toast.error('Failed to update product details in database');
          }
        }
        
        fetchData();
        setIsModalOpen(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save purchase details');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase record?')) return;
    try {
      const response = await axios.delete(`/api/purchases/${id}`);
      if (response.data.success) {
        toast.success('Purchase record deleted');
        fetchData();
      }
    } catch (error) {
      toast.error('Failed to delete purchase record');
    }
  };

  // Filtered purchases
  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = p.item_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.notes && p.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSupplier = selectedSupplierId === 'All' || String(p.supplier_id) === String(selectedSupplierId);
    
    let matchesDate = true;
    if (startDate && endDate) {
      const pDate = new Date(p.purchase_date).toISOString().split('T')[0];
      matchesDate = pDate >= startDate && pDate <= endDate;
    }

    return matchesSearch && matchesCategory && matchesSupplier && matchesDate;
  });

  // Calculate totals
  const totalPurchasesCost = filteredPurchases.reduce((sum, p) => sum + parseFloat(p.total_price), 0);
  const paidPurchasesCost = filteredPurchases.filter(p => p.payment_status === 'paid').reduce((sum, p) => sum + parseFloat(p.total_price), 0);
  const pendingPurchasesCost = filteredPurchases.filter(p => p.payment_status === 'pending').reduce((sum, p) => sum + parseFloat(p.total_price), 0);
  const partialPurchasesCost = filteredPurchases.filter(p => p.payment_status === 'partial').reduce((sum, p) => sum + parseFloat(p.total_price), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Purchases Log</h1>
          <p className="text-sm text-gray-500 mt-1">Log inventory purchases, spare parts, chemicals, equipment, or business services.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow transition"
        >
          ➕ Log Purchase
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Purchases</span>
          <h3 className="text-3xl font-black text-gray-800 mt-2">AED {totalPurchasesCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          <span className="text-xs text-gray-400 mt-4">For the selected category and supplier</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Paid Amount</span>
          <h3 className="text-3xl font-black text-green-600 mt-2">AED {paidPurchasesCost.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          <span className="text-xs text-green-500 font-semibold mt-4">Cleared transactions</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Outstanding Amount</span>
          <h3 className="text-3xl font-black text-red-500 mt-2">AED {(pendingPurchasesCost + partialPurchasesCost).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</h3>
          <span className="text-xs text-red-500 font-semibold mt-4">Pending invoice payments</span>
        </div>
      </div>

      {/* Advanced Filter Box */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Filter Purchase Registry</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <label className="block text-xs text-gray-500 font-bold mb-1">Supplier</label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-xs font-semibold"
            >
              <option value="All">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.business_name || 'Individual'})</option>)}
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
              placeholder="e.g. shampoo, wax..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-xs"
            />
          </div>
        </div>
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Item Details</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Qty</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Unit Price</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Total Price</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-500">Loading purchase log...</td>
                </tr>
              ) : filteredPurchases.length > 0 ? (
                filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(p.purchase_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      <div>{p.item_name}</div>
                      {p.notes && <div className="text-xs text-gray-400 font-normal mt-0.5">{p.notes}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                        {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      AED {parseFloat(p.unit_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-extrabold text-gray-900 text-right">
                      AED {parseFloat(p.total_price).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {p.supplier_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        p.payment_status === 'paid' ? 'bg-green-50 text-green-700' :
                        p.payment_status === 'pending' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                      }`}>
                        {p.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs capitalize text-gray-600 font-bold">{p.payment_method}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleOpenEditModal(p)}
                        className="text-primary-600 hover:text-primary-950 font-bold mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center text-gray-400">
                    No purchase records registered for this filter.
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
              <h3 className="font-bold text-lg">{isEditMode ? 'Edit Purchase Details' : 'Log New Purchase'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Item/Service Purchased *</label>
                <input
                  type="text"
                  required
                  list="db-items"
                  placeholder="e.g. Detailing Spray, Hydraulic Oil"
                  value={formData.item_name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData(prev => ({ ...prev, item_name: val }));
                    const matched = dbProductsList.find(p => p.name.toLowerCase() === val.toLowerCase());
                    if (matched) {
                      setSelectedProduct(matched);
                      
                      // Map category from DB if applicable
                      let formCategory = formData.category;
                      if (matched.category === 'Services') {
                        formCategory = 'Service';
                      } else if (matched.category === 'Accessories' || matched.category === 'Spare Parts' || matched.category === 'Acce') {
                        formCategory = 'Product';
                      }
                      
                      setFormData(prev => ({
                        ...prev,
                        item_name: matched.name,
                        category: formCategory,
                        unit_price: matched.purchase_price || '',
                        selling_price: matched.price || ''
                      }));
                    } else {
                      setSelectedProduct(null);
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-bold bg-white"
                />
                <datalist id="db-items">
                  {dbProductsList
                    .filter(p => {
                      if (formData.category === 'Product') {
                        return p.category === 'Accessories' || p.category === 'Spare Parts' || p.category === 'Acce';
                      }
                      if (formData.category === 'Service') {
                        return p.category === 'Services';
                      }
                      return true;
                    })
                    .map(p => (
                      <option key={p.id} value={p.name} />
                    ))}
                </datalist>
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
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Supplier *</label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  >
                    <option value="">No Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Cost / Unit Price (AED) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 50.00"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold"
                  />
                </div>
              </div>

              {formData.category === 'Product' && (
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Selling Price (AED) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="e.g. 75.00"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || '' })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-bold text-indigo-700 bg-indigo-50/30 border-indigo-200"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Method *</label>
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
                <div className="col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Payment Status *</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm font-semibold"
                  >
                    <option value="paid">✅ Paid (Completed)</option>
                    <option value="pending">❌ Pending (Unpaid)</option>
                    <option value="partial">⚠️ Partially Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Description / Notes</label>
                <textarea
                  placeholder="Additional order details, warranty info, etc."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm h-16 resize-none"
                />
              </div>

              {/* Total Calculation Display */}
              <div className="bg-gray-50 p-3 rounded-lg border text-right">
                <span className="text-xs text-gray-500 mr-2">Calculated Total:</span>
                <span className="text-base font-black text-gray-900">
                  AED {((formData.quantity || 1) * (formData.unit_price || 0)).toFixed(2)}
                </span>
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
                  {isEditMode ? 'Save Changes' : 'Record Purchase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchases;

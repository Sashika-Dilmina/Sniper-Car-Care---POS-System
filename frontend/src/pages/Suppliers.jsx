import { useState, useEffect } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentSupplierId, setCurrentSupplierId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    phone: '',
    category: 'Chemicals',
    email: '',
    address: '',
    status: 'active'
  });

  const categories = ['Chemicals', 'Tools', 'Products', 'Marketing', 'Utilities', 'Other'];

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/suppliers');
      if (response.data.success) {
        setSuppliers(response.data.suppliers || []);
      }
    } catch (error) {
      toast.error('Failed to load suppliers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setFormData({
      name: '',
      business_name: '',
      phone: '',
      category: 'Chemicals',
      email: '',
      address: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (supplier) => {
    setIsEditMode(true);
    setCurrentSupplierId(supplier.id);
    setFormData({
      name: supplier.name,
      business_name: supplier.business_name || '',
      phone: supplier.phone,
      category: supplier.category,
      email: supplier.email || '',
      address: supplier.address || '',
      status: supplier.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone number are required');
      return;
    }

    try {
      if (isEditMode) {
        const response = await axios.put(`/api/suppliers/${currentSupplierId}`, formData);
        if (response.data.success) {
          toast.success('Supplier updated successfully');
          fetchSuppliers();
          setIsModalOpen(false);
        }
      } else {
        const response = await axios.post('/api/suppliers', formData);
        if (response.data.success) {
          toast.success('Supplier created successfully');
          fetchSuppliers();
          setIsModalOpen(false);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save supplier details');
    }
  };

  const handleDelete = async (id, name) => {
    const reason = window.prompt(`Please enter the reason for deleting supplier "${name}":`);
    if (reason === null) return; // Cancelled
    if (reason.trim() === '') {
      toast.error('Deletion cancelled. A reason is required.');
      return;
    }

    try {
      await axios.delete(`/api/suppliers/${id}`, { data: { reason } });
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  };

  // Filtered list
  const filteredSuppliers = suppliers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.business_name && s.business_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          s.phone.includes(searchQuery);
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Suppliers Register</h1>
          <p className="text-sm text-gray-500 mt-1">Manage vendor contacts and categories for parts and detailing compounds.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow transition"
        >
          ➕ Add Supplier
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Suppliers</span>
          <h3 className="text-3xl font-black text-gray-800 mt-2">{suppliers.length}</h3>
          <span className="text-xs text-gray-400 mt-4">Active vendors registered in system</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Categories</span>
          <h3 className="text-3xl font-black text-primary-600 mt-2">
            {new Set(suppliers.map(s => s.category)).size}
          </h3>
          <span className="text-xs text-gray-400 mt-4">Distinct supply types tracked</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Active Status</span>
          <h3 className="text-3xl font-black text-green-600 mt-2">
            {suppliers.filter(s => s.status === 'active').length}
          </h3>
          <span className="text-xs text-green-500 font-semibold mt-4">Available for purchase logs</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
          {['All', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                selectedCategory === cat 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search suppliers by name, business or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full md:max-w-sm"
        />
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Business Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">Loading suppliers...</td>
                </tr>
              ) : filteredSuppliers.length > 0 ? (
                filteredSuppliers.map((s) => (
                  <tr key={s.id} className={`hover:bg-gray-50/50 transition ${s.is_deleted === 1 ? 'opacity-60 bg-red-50/20' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-500">#{s.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                      {s.name}
                      {s.is_deleted === 1 && (
                        <span className="block text-xs text-red-500 font-medium italic mt-0.5">
                          Deleted (Reason: {s.delete_reason})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.business_name || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-primary-50 text-primary-700 px-2.5 py-0.5 rounded-full">
                        {s.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">{s.phone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{s.email || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        s.status === 'active' ? 'bg-green-55 text-green-700 bg-green-50' : 'bg-red-50 text-red-700'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {s.is_deleted !== 1 && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="text-primary-600 hover:text-primary-950 font-bold mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="text-red-600 hover:text-red-800 font-bold"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400">
                    No suppliers registered for this query.
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
              <h3 className="font-bold text-lg">{isEditMode ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white transition">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Business Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Chemicals Ltd"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Telephone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +9715551234"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                  />
                </div>
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
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. sales@acme.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Address</label>
                <textarea
                  placeholder="e.g. Warehouse 14, Al Quoz, Dubai"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm h-16 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  {isEditMode ? 'Save Changes' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Suppliers;

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import VehiclePlatePreview from '../components/VehiclePlatePreview';
import SearchableSelect from '../components/SearchableSelect';
import { useAuth } from '../context/AuthContext';

const Customers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkinCustomer, setCheckinCustomer] = useState(null);
  const [checkinForm, setCheckinForm] = useState({
    customer_id: '',
    name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_type: 'Saloon',
    province: 'Dubai',
    notes: 'Camera offline - manual scan'
  });

  // Filter states
  const [filters, setFilters] = useState({
    vehicle_type: 'all',
    payment_type: 'all',
    sort_orders: 'all',
    sort_loyalty: 'all'
  });

  useEffect(() => {
    fetchCustomers();
    
    const interval = setInterval(() => {
      fetchCustomers(true);
    }, 7000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const fetchCustomers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams();

      if (filters.vehicle_type !== 'all') params.append('vehicle_type', filters.vehicle_type);
      if (filters.payment_type !== 'all') params.append('payment_type', filters.payment_type);
      if (filters.sort_orders !== 'all') params.append('sort_orders', filters.sort_orders);
      if (filters.sort_loyalty !== 'all') params.append('sort_loyalty', filters.sort_loyalty);

      const response = await axios.get(`/api/customers?${params.toString()}`);
      setCustomers(response.data.customers);
    } catch (error) {
      // Don't show toast error on silent background updates to avoid annoying the user
      if (!silent) toast.error('Failed to load customers');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      vehicle_type: 'all',
      payment_type: 'all',
      sort_orders: 'all',
      sort_loyalty: 'all'
    });
  };

  const handleDelete = async (customerId, customerName) => {
    if (window.confirm(`Are you sure you want to delete customer "${customerName}"? This action cannot be undone.`)) {
      try {
        await axios.delete(`/api/customers/${customerId}`);
        toast.success('Customer deleted successfully');
        fetchCustomers();
      } catch (error) {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      }
    }
  };

  const exportToExcel = () => {
    try {
      // Create CSV content
      const headers = ['ID', 'Name', 'Phone', 'Vehicle Plate', 'Vehicle Type', 'Orders', 'Loyalty Points', 'Payment Type'];
      const csvContent = [
        headers.join(','),
        ...filteredCustomers.map(customer => [
          customer.id,
          `"${customer.name}"`,
          customer.phone || 'N/A',
          customer.vehicle_plate,
          customer.vehicle_type,
          customer.total_orders || 0,
          customer.loyalty_points || 0,
          customer.last_payment_method || 'N/A'
        ].join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Customers exported to CSV successfully');
    } catch (error) {
      toast.error('Failed to export customers');
      console.error('Export error:', error);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.vehicle_plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [plateCodes, setPlateCodes] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    emirate: '',
    plate_code: '',
    plate_number: '',
    vehicle_type: 'Saloon'
  });

  // Fetch plate codes dynamically based on selected Emirate
  useEffect(() => {
    const fetchPlateCodes = async () => {
      try {
        const response = await axios.get(`/api/vehicle-registration/plate-codes/${newCustomer.emirate}`);
        const codes = response.data.codes || [];
        setPlateCodes(codes);
        
        // Reset code if invalid or change to empty
        if (newCustomer.emirate && !codes.includes(newCustomer.plate_code)) {
          setNewCustomer(prev => ({
            ...prev,
            plate_code: ''
          }));
        }
      } catch (error) {
        console.error('Failed to load plate codes:', error);
      }
    };
    
    if (showAddModal && newCustomer.emirate) {
      fetchPlateCodes();
    } else {
      setPlateCodes([]);
    }
  }, [newCustomer.emirate, showAddModal]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.emirate || !newCustomer.plate_number) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Phone validation: numbers only, 9-15 digits
    const cleanPhone = newCustomer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      toast.error('Phone number must contain between 9 and 15 digits');
      return;
    }

    try {
      await axios.post('/api/anpr/register', {
        ...newCustomer,
        phone: cleanPhone // send sanitized number
      });
      toast.success('Customer registered successfully!');
      setShowAddModal(false);
      setNewCustomer({
        name: '',
        phone: '',
        emirate: '',
        plate_code: '',
        plate_number: '',
        vehicle_type: 'Saloon'
      });
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add customer');
    }
  };

  const handleOpenCheckin = (customer) => {
    setCheckinCustomer(customer);
    setCheckinForm({
      customer_id: customer.id,
      name: customer.name || '',
      phone: customer.phone || '',
      vehicle_plate: customer.vehicle_plate || '',
      vehicle_type: customer.vehicle_type || 'Saloon',
      province: customer.province || 'Dubai',
      notes: 'Camera offline - manual scan'
    });
    setShowCheckinModal(true);
  };

  const handleCheckinSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/anpr/manual-checkin', checkinForm);
      toast.success(response.data.message || 'Manual check-in completed!');
      setShowCheckinModal(false);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to perform check-in');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Customers</h1>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition flex items-center gap-2 shadow-lg"
          >
            <span className="text-xl">+</span> Add New Customer
          </button>
        </div>
      </div>

      {/* Add Customer Modal */}
      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary-600 p-5 text-white text-center">
              <h2 className="text-2xl font-bold">Register New Customer</h2>
              <p className="text-primary-100 text-sm mt-1">UAE Vehicle & Owner Information</p>
            </div>
            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="space-y-4">
                {/* Customer Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Ahmed Al Mansoori"
                  />
                </div>

                {/* Telephone Number */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Telephone Number *</label>
                  <input
                    type="tel"
                    required
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="+971501234567"
                  />
                  <p className="text-xs text-gray-400 mt-1">Numbers only, minimum 9 digits</p>
                </div>

                {/* Vehicle Model / Type */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Model *</label>
                  <select
                    value={newCustomer.vehicle_type}
                    onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  >
                    <option value="Saloon">Saloon</option>
                    <option value="4x4">4x4</option>
                  </select>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-md font-bold text-gray-800 mb-3">Vehicle Registration</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Emirate Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Emirate *</label>
                      <select
                        value={newCustomer.emirate}
                        onChange={(e) => setNewCustomer({ ...newCustomer, emirate: e.target.value })}
                        className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                        required
                      >
                        <option value="">Select Emirate</option>
                        <option value="Dubai">Dubai</option>
                        <option value="Abu Dhabi">Abu Dhabi</option>
                        <option value="Sharjah">Sharjah</option>
                        <option value="Ajman">Ajman</option>
                        <option value="Umm Al Quwain">Umm Al Quwain</option>
                        <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                        <option value="Fujairah">Fujairah</option>
                      </select>
                    </div>

                    {/* Plate Code Dropdown */}
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Plate Code *</label>
                      <SearchableSelect
                        options={plateCodes}
                        value={newCustomer.plate_code}
                        onChange={(val) => setNewCustomer({ ...newCustomer, plate_code: val })}
                        disabled={plateCodes.length === 0}
                      />
                    </div>
                  </div>

                  {/* Plate Number Input */}
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Plate Number *</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.plate_number}
                      onChange={(e) => setNewCustomer({ ...newCustomer, plate_number: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                      placeholder="12345"
                    />
                  </div>
                </div>

                {/* Plate Preview */}
                <VehiclePlatePreview 
                  emirate={newCustomer.emirate} 
                  plateCode={newCustomer.plate_code} 
                  plateNumber={newCustomer.plate_number} 
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold transition shadow-lg shadow-primary-200 text-sm"
                >
                  Save Registration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Check-in Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-primary-600 p-6 text-white text-center">
              <h2 className="text-2xl font-bold">Manual Vehicle Check-In</h2>
              <p className="text-primary-100 text-sm mt-1">
                For customer {checkinForm.name} ({checkinForm.vehicle_plate})
              </p>
            </div>
            <form onSubmit={handleCheckinSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={checkinForm.name}
                    onChange={(e) => setCheckinForm({ ...checkinForm, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="Customer name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number (971...)</label>
                  <input
                    type="tel"
                    required
                    value={checkinForm.phone}
                    onChange={(e) => setCheckinForm({ ...checkinForm, phone: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="+971XXXXXXXXX"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Plate</label>
                    <input
                      type="text"
                      required
                      value={checkinForm.vehicle_plate}
                      onChange={(e) => setCheckinForm({ ...checkinForm, vehicle_plate: e.target.value.toUpperCase() })}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                      placeholder="DXB123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Vehicle Type</label>
                    <select
                      value={checkinForm.vehicle_type}
                      onChange={(e) => setCheckinForm({ ...checkinForm, vehicle_type: e.target.value })}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="Saloon">Saloon</option>
                      <option value="4x4">4x4</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Province</label>
                  <input
                    type="text"
                    value={checkinForm.province}
                    onChange={(e) => setCheckinForm({ ...checkinForm, province: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="e.g. Dubai"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Check-in Note / Comment *</label>
                  <textarea
                    required
                    value={checkinForm.notes}
                    onChange={(e) => setCheckinForm({ ...checkinForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none h-20 resize-none"
                    placeholder="e.g., Gate camera failed, manually scanned at entrance."
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCheckinModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold transition shadow-lg shadow-primary-200"
                >
                  Check-in & SMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name or vehicle plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${showFilters ? 'bg-primary-50 border-primary-500 text-primary-600' : 'hover:bg-gray-50'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Filter Customers</h3>
            <button
              onClick={resetFilters}
              className="text-sm text-primary-600 hover:underline"
            >
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Vehicle Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <select
                value={filters.vehicle_type}
                onChange={(e) => handleFilterChange('vehicle_type', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="4x4">4x4</option>
                <option value="Saloon">Saloon</option>
              </select>
            </div>

            {/* Payment Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Type Used
              </label>
              <select
                value={filters.payment_type}
                onChange={(e) => handleFilterChange('payment_type', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Payment Types</option>
                <option value="card">Card</option>
                <option value="cash">Cash</option>
                <option value="credit">Credit</option>
              </select>
            </div>

            {/* Sort by Orders */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by Orders
              </label>
              <select
                value={filters.sort_orders}
                onChange={(e) => handleFilterChange('sort_orders', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">No Sorting</option>
                <option value="asc">Least Orders First</option>
                <option value="desc">Most Orders First</option>
              </select>
            </div>

            {/* Sort by Loyalty Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort by Loyalty Points
              </label>
              <select
                value={filters.sort_loyalty}
                onChange={(e) => handleFilterChange('sort_loyalty', e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">No Sorting</option>
                <option value="asc">Lowest Points First</option>
                <option value="desc">Highest Points First</option>
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.vehicle_type !== 'all' || filters.payment_type !== 'all' ||
            filters.sort_orders !== 'all' || filters.sort_loyalty !== 'all') && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-sm text-gray-600">Active filters:</span>
                  {filters.vehicle_type !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full capitalize">
                      Vehicle: {filters.vehicle_type}
                      <button
                        onClick={() => handleFilterChange('vehicle_type', 'all')}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filters.payment_type !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full capitalize">
                      Payment: {filters.payment_type}
                      <button
                        onClick={() => handleFilterChange('payment_type', 'all')}
                        className="ml-1 hover:bg-green-200 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filters.sort_orders !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                      Sorted by Orders: {filters.sort_orders === 'asc' ? 'Ascending' : 'Descending'}
                      <button
                        onClick={() => handleFilterChange('sort_orders', 'all')}
                        className="ml-1 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  )}
                  {filters.sort_loyalty !== 'all' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                      Sorted by Points: {filters.sort_loyalty === 'asc' ? 'Ascending' : 'Descending'}
                      <button
                        onClick={() => handleFilterChange('sort_loyalty', 'all')}
                        className="ml-1 hover:bg-yellow-200 rounded-full p-0.5 transition-colors"
                        title="Remove filter"
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </span>
                  )}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filteredCustomers.length}</span> customer{filteredCustomers.length !== 1 ? 's' : ''}
          </p>
        </div>

        {filteredCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Plate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Loyalty & Stamps</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">{customer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{customer.phone || 'N/A'}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono">{customer.vehicle_plate}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 capitalize">
                        {customer.vehicle_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.last_payment_method ? (
                        <span className={`px-2 py-1 text-xs rounded-full capitalize ${customer.last_payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                            customer.last_payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                              customer.last_payment_method === 'credit' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                          }`}>
                          {customer.last_payment_method}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">No orders</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{customer.total_orders || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 w-max">
                          {customer.loyalty_points || 0} pts
                        </span>
                        <span className="px-2 py-1 text-xs rounded-full bg-indigo-100 text-indigo-800 w-max font-semibold">
                          {customer.wash_stamps || 0}/5 Stamps
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleOpenCheckin(customer)}
                          className="text-primary-600 hover:text-primary-800 transition-colors"
                          title="Manual Check-in / Scan"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </button>
                         <button
                          onClick={() => navigate(`/sales?customer_id=${customer.id}`)}
                          className="text-indigo-600 hover:text-indigo-800 transition-colors"
                          title="Book Service / POS Sale"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </button>
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                        <Link
                          to={`/customers/${customer.id}/edit`}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Edit Customer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete Customer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-2 text-gray-600">No customers found matching your filters</p>
            <button
              onClick={resetFilters}
              className="mt-4 text-primary-600 hover:underline text-sm"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Customers;


import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import VehiclePlatePreview from '../components/VehiclePlatePreview';
import SearchableSelect from '../components/SearchableSelect';

const CustomerEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plateCodes, setPlateCodes] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emirate: '',
    plate_code: '',
    plate_number: '',
    vehicle_type: 'Saloon'
  });

  useEffect(() => {
    fetchCustomer();
  }, [id]);

  // Fetch plate codes dynamically based on selected Emirate
  useEffect(() => {
    const fetchPlateCodes = async () => {
      try {
        const response = await axios.get(`/api/vehicle-registration/plate-codes/${formData.emirate}`);
        const codes = response.data.codes || [];
        setPlateCodes(codes);
        
        // Reset code if invalid or change to empty
        if (formData.emirate && !codes.includes(formData.plate_code)) {
          setFormData(prev => ({
            ...prev,
            plate_code: ''
          }));
        }
      } catch (error) {
        console.error('Failed to load plate codes:', error);
      }
    };
    
    if (formData.emirate) {
      fetchPlateCodes();
    } else {
      setPlateCodes([]);
    }
  }, [formData.emirate]);

  const fetchCustomer = async () => {
    try {
      const response = await axios.get(`/api/customers/${id}`);
      const customer = response.data.customer;
      
      const plateStr = customer.vehicle_plate || '';
      const parts = plateStr.trim().split(/\s+/);
      let plateCode = '';
      let emirate = '';
      let plateNumber = '';
      
      if (plateStr.startsWith('Garage - ') || plateStr.startsWith('Sniper car care - ')) {
        emirate = plateStr.startsWith('Garage - ') ? 'Garage' : 'Sniper car care';
        plateNumber = plateStr;
      } else if (parts.length >= 3) {
        plateCode = parts[0];
        plateNumber = parts[parts.length - 1];
        emirate = parts.slice(1, parts.length - 1).join(' ');
      } else if (plateStr) {
        plateNumber = plateStr;
      }

      setFormData({
        name: customer.name || '',
        phone: customer.phone || '+9715',
        emirate: emirate,
        plate_code: plateCode,
        plate_number: plateNumber,
        vehicle_type: customer.vehicle_type || 'Saloon'
      });
    } catch (error) {
      toast.error('Failed to load customer details');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const isNoVehicle = formData.emirate === 'Garage' || formData.emirate === 'Sniper car care';
    if (!formData.name || !formData.phone || (!isNoVehicle && !formData.plate_number) || !formData.vehicle_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Phone validation: numbers only, 9-15 digits
    const cleanPhone = formData.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      toast.error('Phone number must contain between 9 and 15 digits');
      return;
    }

    try {
      const payload = {
        ...formData,
        phone: cleanPhone
      };
      if (isNoVehicle) {
        payload.plate_code = '';
        payload.plate_number = `${formData.emirate} - ${cleanPhone}`;
      }

      await axios.put(`/api/customers/${id}`, payload);
      toast.success('Customer updated successfully');
      navigate('/customers');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update customer');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Edit Customer</h1>
        <button
          onClick={() => navigate('/customers')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          ← Back to Customers
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-gray-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Numbers only, minimum 9 digits</p>
            </div>

            {/* Vehicle Model */}
            <div>
              <label htmlFor="vehicle_type" className="block text-sm font-bold text-gray-700 mb-2">
                Vehicle Model <span className="text-red-500">*</span>
              </label>
              <select
                id="vehicle_type"
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                required
              >
                <option value="Saloon">Saloon</option>
                <option value="4x4">4x4</option>
              </select>
            </div>

            {/* Vehicle Registration Section */}
            <div className="md:col-span-2 border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Vehicle Registration</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Emirate */}
                <div>
                  <label htmlFor="emirate" className="block text-sm font-bold text-gray-700 mb-2">
                    Emirate <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="emirate"
                    name="emirate"
                    value={formData.emirate}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
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
                    <option value="Garage">Garage</option>
                    <option value="Sniper car care">Sniper car care</option>
                  </select>
                </div>

                {/* Plate Code */}
                {!(formData.emirate === 'Garage' || formData.emirate === 'Sniper car care') && (
                  <div>
                    <label htmlFor="plate_code" className="block text-sm font-bold text-gray-700 mb-2">
                      Plate Code <span className="text-red-500">*</span>
                    </label>
                    <SearchableSelect
                      options={plateCodes}
                      value={formData.plate_code}
                      onChange={(val) => setFormData(prev => ({ ...prev, plate_code: val }))}
                      disabled={plateCodes.length === 0}
                    />
                  </div>
                )}

                {/* Plate Number */}
                {!(formData.emirate === 'Garage' || formData.emirate === 'Sniper car care') && (
                  <div>
                    <label htmlFor="plate_number" className="block text-sm font-bold text-gray-700 mb-2">
                      Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="plate_number"
                      name="plate_number"
                      value={formData.plate_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, plate_number: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() }))}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                      required={!(formData.emirate === 'Garage' || formData.emirate === 'Sniper car care')}
                      placeholder="12345"
                    />
                  </div>
                )}
              </div>

              {/* Plate Live Preview */}
              {!(formData.emirate === 'Garage' || formData.emirate === 'Sniper car care') && (
                <VehiclePlatePreview 
                  emirate={formData.emirate}
                  plateCode={formData.plate_code}
                  plateNumber={formData.plate_number}
                />
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Update Customer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerEdit;


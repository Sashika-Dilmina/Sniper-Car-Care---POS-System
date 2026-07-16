import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import SearchableSelect from '../components/SearchableSelect';
import VehiclePlatePreview from '../components/VehiclePlatePreview';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicle_type: '4x4',
    emirate: 'Dubai',
    plate_code: '',
    plate_number: ''
  });

  const [plateCodes, setPlateCodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const emiratesList = [
    'Dubai',
    'Abu Dhabi',
    'Sharjah',
    'Ajman',
    'Umm Al Quwain',
    'Ras Al Khaimah',
    'Fujairah'
  ];

  // Fetch plate codes when Emirate changes
  useEffect(() => {
    const fetchPlateCodes = async () => {
      if (!formData.emirate) return;
      setLoadingCodes(true);
      try {
        const response = await axios.get(`/api/public/plate-codes/${formData.emirate}`);
        if (response.data.success) {
          const codes = response.data.codes || [];
          setPlateCodes(codes);
          // Set first code as default if available
          setFormData(prev => ({ ...prev, plate_code: codes[0] || '' }));
        }
      } catch (error) {
        console.error('Error loading plate codes:', error);
        toast.error('Failed to load plate codes');
      } finally {
        setLoadingCodes(false);
      }
    };

    fetchPlateCodes();
  }, [formData.emirate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Name is required');
    if (!formData.phone.trim()) return toast.error('Phone number is required');
    if (!formData.plate_code) return toast.error('Plate code is required');
    if (!formData.plate_number.trim()) return toast.error('Plate number is required');

    // Combine plate code and number for database
    const vehicle_plate = `${formData.plate_code} ${formData.emirate} ${formData.plate_number.trim()}`;

    setLoading(true);
    try {
      const response = await axios.post('/api/public/customer/register', {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        vehicle_plate,
        vehicle_type: formData.vehicle_type,
        province: formData.emirate
      });

      if (response.data.success) {
        setIsSuccess(true);
        toast.success('Registration successful!');
      }
    } catch (error) {
      console.error('Registration error:', error);
      const errMsg = error.response?.data?.message || 'Failed to register customer';
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-gray-900 leading-tight">REGISTERED SUCCESSFULLY!</h1>
          <p className="text-gray-650 text-sm">
            Thank you <strong className="text-gray-900">{formData.name}</strong>, your vehicle plate <strong className="text-gray-900 notranslate" translate="no">{formData.plate_code} {formData.plate_number}</strong> is now registered in our system.
          </p>
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => {
                setFormData({
                  name: '',
                  phone: '',
                  vehicle_type: '4x4',
                  emirate: 'Dubai',
                  plate_code: '',
                  plate_number: ''
                });
                setIsSuccess(false);
              }}
              className="w-full py-3 bg-gray-100 text-gray-800 font-bold rounded-xl hover:bg-gray-250 transition-colors"
            >
              Register Another Vehicle
            </button>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md transition-colors"
            >
              Go to Home Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      {/* Branding */}
      <div className="text-center mb-6">
        <span className="text-center leading-tight block">
          <span className="block text-3xl font-black italic tracking-tight text-black">SNIPER</span>
          <span className="block text-xs font-bold text-red-600 tracking-[0.2em] uppercase mt-0.5">Car Care</span>
        </span>
        <h2 className="text-xl font-bold text-gray-700 mt-3">Customer Registration Form</h2>
        <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
          Register your vehicle details to speed up service orders and earn loyalty stamps.
        </p>
      </div>

      {/* Main Registration Card */}
      <div className="bg-white p-6 rounded-3xl shadow-lg max-w-md w-full border border-gray-100">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="e.g. 971500000000"
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white"
            />
          </div>

          {/* Vehicle Type selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Type</label>
            <select
              value={formData.vehicle_type}
              onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white"
            >
              <option value="4x4">4x4 / SUV</option>
              <option value="Saloon">Saloon Car</option>
            </select>
          </div>

          {/* Emirate Selection */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Emirate</label>
            <select
              value={formData.emirate}
              onChange={(e) => setFormData({ ...formData, emirate: e.target.value })}
              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white"
            >
              {emiratesList.map((em) => (
                <option key={em} value={em}>
                  {em}
                </option>
              ))}
            </select>
          </div>

          {/* Plate details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plate Code</label>
              <SearchableSelect
                options={plateCodes}
                value={formData.plate_code}
                onChange={(val) => setFormData({ ...formData, plate_code: val })}
                disabled={loadingCodes || plateCodes.length === 0}
                placeholder="Code..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plate Number</label>
              <input
                type="text"
                required
                value={formData.plate_number}
                onChange={(e) => setFormData({ ...formData, plate_number: e.target.value.replace(/\D/g, '') })}
                placeholder="e.g. 52256"
                maxLength={6}
                className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-sm bg-white"
              />
            </div>
          </div>

          {/* Plate graphic preview */}
          <div className="notranslate" translate="no">
            <VehiclePlatePreview
              emirate={formData.emirate}
              plateCode={formData.plate_code}
              plateNumber={formData.plate_number}
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-md transition-colors disabled:bg-gray-400 mt-2 text-sm uppercase tracking-wide"
          >
            {loading ? 'Registering...' : 'Submit Registration'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;

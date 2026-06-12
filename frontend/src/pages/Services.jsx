import { useEffect, useState } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Saloon'); // 'Saloon' or '4x4'
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    vehicle_type: 'Saloon',
    image_url: ''
  });

  const resolveImageUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (import.meta.env.PROD) return url;
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    return `${apiBaseUrl.replace(/\/$/, '')}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products?category=Services');
      setServices(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setUploading(true);
        const response = await axios.post('/api/products/upload-image', { image: reader.result });
        setFormData((prev) => ({ ...prev, image_url: response.data.imageUrl }));
        toast.success('Image uploaded successfully');
      } catch (error) {
        console.error('Image upload failed:', error);
        toast.error(error.response?.data?.message || 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.price < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    const serviceData = {
      name: formData.name,
      description: formData.description,
      category: 'Services',
      price: parseFloat(formData.price),
      stock: 0,
      image_url: formData.image_url,
      vehicle_type: formData.vehicle_type
    };

    try {
      if (editingService) {
        await axios.put(`/api/products/${editingService.id}`, serviceData);
        toast.success('Service updated successfully');
      } else {
        await axios.post('/api/products', serviceData);
        toast.success('Service created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchServices();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save service');
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      price: service.price,
      vehicle_type: service.vehicle_type || 'Saloon',
      image_url: service.image_url || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service package? This will remove it from the customer websites.')) return;

    try {
      await axios.delete(`/api/products/${id}`);
      toast.success('Service deleted successfully');
      fetchServices();
    } catch (error) {
      toast.error('Failed to delete service');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      vehicle_type: activeTab,
      image_url: ''
    });
  };

  const filteredServices = services.filter(
    (service) => service.vehicle_type === activeTab
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Service Offerings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure and manage services offered on Saloon and 4x4 websites.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Service
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setActiveTab('Saloon');
            setFormData(prev => ({ ...prev, vehicle_type: 'Saloon' }));
          }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 ${
            activeTab === 'Saloon'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🚗 Saloon Services
        </button>
        <button
          onClick={() => {
            setActiveTab('4x4');
            setFormData(prev => ({ ...prev, vehicle_type: '4x4' }));
          }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 ${
            activeTab === '4x4'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🚙 4x4 Services
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredServices.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group"
            >
              <div className="relative h-44 bg-gray-100 overflow-hidden shrink-0 border-b">
                {service.image_url ? (
                  <img
                    src={resolveImageUrl(service.image_url)}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 gap-1 bg-gradient-to-br from-gray-50 to-gray-100">
                    <svg className="w-10 h-10 stroke-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">No image uploaded</span>
                  </div>
                )}
                <div className="absolute top-3 right-3 bg-primary-600 text-white font-black px-3 py-1 rounded-full text-sm shadow-md">
                  AED {parseFloat(service.price).toLocaleString()}
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-grow justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-primary-600 transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-3 leading-relaxed">
                    {service.description || <span className="italic">No description provided.</span>}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-gray-100">
                  <button
                    onClick={() => handleEdit(service)}
                    className="px-3.5 py-1.5 text-sm font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="px-3.5 py-1.5 text-sm font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-12 text-center shadow-sm">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-gray-600 font-medium">No service offerings configured for {activeTab}.</p>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
          >
            + Create First Service
          </button>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 transition-all duration-300 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden transform transition-all duration-300">
            <div className="bg-gray-50 px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingService ? '✏️ Edit Service Package' : '✨ Add Service Package'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  placeholder="e.g., Full Body wash with shampoo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={formData.vehicle_type}
                    onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  >
                    <option value="Saloon">Saloon</option>
                    <option value="4x4">4x4</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Price (AED)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    placeholder="25.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  rows="3"
                  placeholder="Describe what is included in this service..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Service Image
                </label>
                <div className="mt-1 flex items-center gap-4">
                  {formData.image_url ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img
                        src={resolveImageUrl(formData.image_url)}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image_url: '' })}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                        title="Remove image"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 cursor-pointer flex flex-col items-center justify-center text-gray-400 transition hover:text-primary-600 bg-gray-50">
                      <svg className="w-6 h-6 stroke-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-[10px] font-semibold mt-1">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  <div className="flex-grow text-xs text-gray-500">
                    {uploading ? (
                      <span className="text-primary-600 font-bold animate-pulse">Uploading image...</span>
                    ) : (
                      <span>Select an image from your device. Recommended: landscape photo (4:3 ratio).</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4 border-t">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-grow bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition font-bold disabled:opacity-50"
                >
                  {editingService ? 'Save Changes' : 'Create Service'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-grow bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;

import { useEffect, useState } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Services = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Saloon'); // 'Saloon' or '4x4'
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    purchase_price: '',
    vehicle_type: 'Saloon',
    image_url: ''
  });

  const resolveImageUrl = (url) => {
    if (!url) return '';
    
    // Normalize legacy localhost URLs to relative paths
    let cleanUrl = url;
    if (url.startsWith('http://localhost:5000')) {
      cleanUrl = url.replace('http://localhost:5000', '');
    } else if (url.startsWith('https://localhost:5000')) {
      cleanUrl = url.replace('https://localhost:5000', '');
    }

    if (cleanUrl.startsWith('http')) return cleanUrl;
    const apiBaseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : (import.meta.env.PROD ? '' : 'http://localhost:5000');
    return `${apiBaseUrl}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products');
      setServices(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result);
      setZoomScale(1.0);
      setPanX(0);
      setPanY(0);
    };
    reader.readAsDataURL(file);
  };

  const handleCropSave = () => {
    if (!cropImageSrc) return;

    const img = new Image();
    img.src = cropImageSrc;
    img.onload = async () => {
      try {
        setUploading(true);
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 600;
        const ctx = canvas.getContext('2d');
        
        ctx.clearRect(0, 0, 600, 600);
        ctx.save();
        ctx.translate(300, 300);
        ctx.scale(zoomScale, zoomScale);
        
        // Translate by scaled pan offset (Preview is 200px, Canvas is 600px, so 3x factor)
        ctx.translate(panX * 3, panY * 3);
        
        // Draw image covering 600x600 centered
        const containerSize = 600;
        const aspect = img.width / img.height;
        let drawW, drawH;
        if (aspect > 1) {
          drawH = containerSize;
          drawW = containerSize * aspect;
        } else {
          drawW = containerSize;
          drawH = containerSize / aspect;
        }
        
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        
        const croppedDataUrl = canvas.toDataURL('image/png');
        const response = await axios.post('/api/products/upload-image', { image: croppedDataUrl });
        setFormData((prev) => ({ ...prev, image_url: response.data.imageUrl }));
        setCropImageSrc(null);
        toast.success('Image cropped & uploaded successfully');
      } catch (error) {
        console.error('Cropping upload failed:', error);
        toast.error('Failed to crop and upload image');
      } finally {
        setUploading(false);
      }
    };
  };

  const handleUploadOriginal = async () => {
    if (!cropImageSrc) return;
    try {
      setUploading(true);
      const response = await axios.post('/api/products/upload-image', { image: cropImageSrc });
      setFormData((prev) => ({ ...prev, image_url: response.data.imageUrl }));
      setCropImageSrc(null);
      toast.success('Original image uploaded successfully');
    } catch (error) {
      console.error('Original upload failed:', error);
      toast.error('Failed to upload original image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.price < 0) {
      toast.error('Selling price cannot be negative');
      return;
    }

    if (formData.purchase_price < 0) {
      toast.error('Cost price cannot be negative');
      return;
    }

    let categoryVal = formData.category || 'Services';
    if (activeTab === 'Saloon Extra Service') categoryVal = 'Saloon Extra Service';
    else if (activeTab === '4x4 Extra Service') categoryVal = '4x4 Extra Service';

    const serviceData = {
      name: formData.name,
      description: formData.description,
      category: categoryVal,
      price: parseFloat(formData.price),
      purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : 0,
      stock: 0,
      image_url: formData.image_url,
      vehicle_type: formData.vehicle_type,
      is_active: editingService ? (editingService.is_active !== undefined ? editingService.is_active : 1) : 1
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
      category: service.category || 'Services',
      price: service.price,
      purchase_price: service.purchase_price || '',
      vehicle_type: service.vehicle_type || 'Saloon',
      image_url: service.image_url || ''
    });
    setShowModal(true);
  };

  const handleToggleActive = async (service) => {
    try {
      await axios.patch(`/api/products/${service.id}/toggle-active`);
      toast.success(`Service ${service.is_active === 0 ? 'activated' : 'deactivated'}`);
      fetchServices();
    } catch (error) {
      toast.error('Failed to toggle active status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this service?')) return;

    try {
      await axios.delete(`/api/products/${id}`);
      toast.success('Service permanently deleted');
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
      category: activeTab.includes('Extra Service') ? activeTab : 'Services',
      price: '',
      purchase_price: '',
      vehicle_type: activeTab.includes('4x4') ? '4x4' : 'Saloon',
      image_url: ''
    });
  };

  const filteredServices = services.filter((service) => {
    if (activeTab === 'Saloon Extra Service') {
      return service.category === 'Saloon Extra Service' || (service.category === 'Extra Service' && (service.vehicle_type === 'Saloon' || service.vehicle_type === 'Both'));
    }
    if (activeTab === '4x4 Extra Service') {
      return service.category === '4x4 Extra Service' || (service.category === 'Extra Service' && service.vehicle_type === '4x4');
    }
    return (
      service.category !== 'Saloon Extra Service' &&
      service.category !== '4x4 Extra Service' &&
      service.category !== 'Extra Service' &&
      service.category !== 'Car Freshner' &&
      service.category !== 'Acce' &&
      (service.vehicle_type === activeTab || service.vehicle_type === 'Both' || !service.vehicle_type)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Service Offerings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure and manage services offered on <span className="notranslate" translate="no">Saloon</span> and 4x4 websites.</p>
        </div>
        {user?.role === 'admin' && (
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
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('Saloon');
            setFormData(prev => ({ ...prev, vehicle_type: 'Saloon' }));
          }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === 'Saloon'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <span className="notranslate" translate="no">🚗 Saloon Services</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('4x4');
            setFormData(prev => ({ ...prev, vehicle_type: '4x4' }));
          }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === '4x4'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          🚙 4x4 Services
        </button>
        <button
          onClick={() => {
            setActiveTab('Saloon Extra Service');
            setFormData(prev => ({ ...prev, vehicle_type: 'Saloon' }));
          }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === 'Saloon Extra Service'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          ⚡ Saloon Extra Services
        </button>
        <button
          onClick={() => {
            setActiveTab('4x4 Extra Service');
            setFormData(prev => ({ ...prev, vehicle_type: '4x4' }));
          }}
          className={`py-3 px-6 font-bold text-sm border-b-2 transition-all duration-200 whitespace-nowrap ${
            activeTab === '4x4 Extra Service'
              ? 'border-primary-600 text-primary-600 bg-primary-50/50 rounded-t-lg'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          ⚡ 4x4 Extra Services
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
              className={`bg-white rounded-xl border border-gray-150 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col group ${service.is_active === 0 ? 'opacity-70 bg-gray-50' : ''}`}
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
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                  <span className="bg-primary-600 text-white font-black px-3 py-1 rounded-full text-xs shadow-md">
                    Sell: AED {parseFloat(service.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </span>
                  {user?.role === 'admin' && (
                    <span className="bg-gray-800 text-white font-semibold px-2 py-0.5 rounded-full text-[10px] shadow-md">
                      Cost: AED {parseFloat(service.purchase_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-grow justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-primary-600 transition-colors">
                      {service.name}
                    </h3>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                      service.is_active !== 0 ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-200 text-gray-700 border-gray-300'
                    }`}>
                      {service.is_active !== 0 ? '👁️ Active' : '👁️‍🗨️ Hidden'}
                    </span>
                  </div>
                  <p className="text-gray-500 text-sm mt-2 line-clamp-3 leading-relaxed">
                    {service.description || <span className="italic">No description provided.</span>}
                  </p>
                </div>

                {user?.role === 'admin' && (
                  <div className="flex justify-end items-center gap-2 pt-5 mt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleToggleActive(service)}
                      className={`px-3 py-1.5 text-xs font-semibold border rounded-lg transition flex items-center gap-1 ${
                        service.is_active !== 0
                          ? 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                          : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                      }`}
                      title={service.is_active !== 0 ? 'Visible on website (Click to hide)' : 'Hidden from website (Click to show)'}
                    >
                      {service.is_active !== 0 ? '👁️ Active' : '👁️‍🗨️ Inactive'}
                    </button>
                    <button
                      onClick={() => handleEdit(service)}
                      className="px-3 py-1.5 text-xs font-semibold border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
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
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-semibold"
            >
              + Create First Service
            </button>
          )}
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
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition notranslate"
                    translate="no"
                  >
                    <option value="Saloon">Saloon</option>
                    <option value="4x4">4x4</option>
                    <option value="Both">Both (Saloon & 4x4)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    placeholder="Services, Offer, VIP..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Cost / Purchase Price (AED)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    placeholder="15.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Selling Price (AED)
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
                  Service Image
                </label>
                
                {cropImageSrc ? (
                  <div className="border rounded-lg p-4 bg-gray-50 flex flex-col items-center gap-3">
                    <div 
                      className="relative w-[200px] h-[200px] rounded-lg border overflow-hidden bg-gray-200 cursor-move"
                      style={{ touchAction: 'none' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                        setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
                      }}
                      onMouseMove={(e) => {
                        if (!isDragging) return;
                        setPanX(e.clientX - dragStart.x);
                        setPanY(e.clientY - dragStart.y);
                      }}
                      onMouseUp={() => setIsDragging(false)}
                      onMouseLeave={() => setIsDragging(false)}
                      onTouchStart={(e) => {
                        const touch = e.touches[0];
                        setIsDragging(true);
                        setDragStart({ x: touch.clientX - panX, y: touch.clientY - panY });
                      }}
                      onTouchMove={(e) => {
                        if (!isDragging) return;
                        const touch = e.touches[0];
                        setPanX(touch.clientX - dragStart.x);
                        setPanY(touch.clientY - dragStart.y);
                      }}
                      onTouchEnd={() => setIsDragging(false)}
                    >
                      <img 
                        src={cropImageSrc}
                        alt="To Crop"
                        className="absolute max-w-none pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(-50%, -50%) translate(${panX}px, ${panY}px) scale(${zoomScale})`,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <div className="absolute inset-0 border-2 border-primary-500 rounded-lg pointer-events-none" />
                    </div>
                    <div className="w-full flex flex-col gap-1">
                      <div className="flex justify-between text-xs font-bold text-gray-500">
                        <span>Zoom / Size Bar: {zoomScale.toFixed(1)}x</span>
                        <span>Drag image to pan</span>
                      </div>
                      <input 
                        type="range"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={zoomScale}
                        onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                    </div>
                    <div className="flex gap-2 w-full flex-wrap">
                      <button
                        type="button"
                        onClick={handleCropSave}
                        disabled={uploading}
                        className="flex-grow min-w-[120px] bg-primary-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-primary-700 transition"
                      >
                        {uploading ? 'Uploading...' : 'Crop & Confirm'}
                      </button>
                      <button
                        type="button"
                        onClick={handleUploadOriginal}
                        disabled={uploading}
                        className="flex-grow min-w-[120px] bg-green-600 text-white text-xs font-bold py-1.5 rounded-lg hover:bg-green-700 transition"
                      >
                        Upload Original
                      </button>
                      <button
                        type="button"
                        onClick={() => setCropImageSrc(null)}
                        disabled={uploading}
                        className="px-3 bg-gray-200 text-gray-700 text-xs font-bold py-1.5 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
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
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    )}
                    <div className="flex-grow text-xs text-gray-500">
                      {uploading ? (
                        <span className="text-primary-600 font-bold animate-pulse">Uploading image...</span>
                      ) : (
                        <span>Recommended image size: 600x600 px (Square / 1:1 ratio) to match existing thumbnails.</span>
                      )}
                    </div>
                  </div>
                )}
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

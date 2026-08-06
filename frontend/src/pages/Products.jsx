import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const Products = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Car Freshner',
    price: '',
    purchase_price: '',
    stock: 0,
    image_url: ''
  });
  const [uploading, setUploading] = useState(false);

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

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    // Check for low stock products and show alert
    const lowStockProducts = products.filter(product => product.stock <= 5 && product.stock > 0);
    const outOfStockProducts = products.filter(product => product.stock === 0);

    if (lowStockProducts.length > 0) {
      toast.error(`⚠️ Low Stock Alert: ${lowStockProducts.length} product(s) have 5 or fewer items in stock!`, {
        duration: 6000,
        id: 'low-stock-alert'
      });
    }

    if (outOfStockProducts.length > 0) {
      toast.error(`🚨 Out of Stock: ${outOfStockProducts.length} product(s) are out of stock!`, {
        duration: 6000,
        id: 'out-of-stock-alert'
      });
    }
  }, [products]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      const filtered = (response.data.products || []).filter(p => p.category !== 'Services');
      setProducts(filtered);
    } catch (error) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate stock is not negative
    if (formData.stock < 0) {
      toast.error('Stock cannot be negative');
      return;
    }

    // Validate price is not negative
    if (formData.price < 0) {
      toast.error('Selling price cannot be negative');
      return;
    }

    if (formData.purchase_price < 0) {
      toast.error('Purchase price cannot be negative');
      return;
    }

    try {
      if (editingProduct) {
        await axios.put(`/api/products/${editingProduct.id}`, formData);
        toast.success('Product updated successfully');
      } else {
        await axios.post('/api/products', formData);
        toast.success('Product created successfully');
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        category: 'Car Freshner',
        price: '',
        purchase_price: '',
        stock: 0,
        image_url: ''
      });
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      purchase_price: product.purchase_price || '',
      stock: product.stock,
      image_url: product.image_url || ''
    });
    setShowModal(true);
  };

  const handleToggleActive = async (product) => {
    try {
      await axios.patch(`/api/products/${product.id}/toggle-active`);
      toast.success(`Product ${product.is_active === 0 ? 'activated' : 'deactivated'}`);
      fetchProducts();
    } catch (error) {
      toast.error('Failed to toggle active status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this product?')) return;

    try {
      await axios.delete(`/api/products/${id}`);
      toast.success('Product permanently deleted successfully');
      fetchProducts();
    } catch (error) {
      toast.error('Failed to delete product');
    }
  };

  const exportToExcel = () => {
    try {
      // Create CSV content from filtered products
      const headers = ['ID', 'Name', 'Category', 'Price (AED)', 'Stock', 'Description'];
      const csvContent = [
        headers.join(','),
        ...filteredProducts.map(product => [
          product.id,
          `"${product.name}"`,
          product.category,
          product.price,
          product.stock,
          `"${(product.description || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Products exported to CSV successfully');
    } catch (error) {
      toast.error('Failed to export products');
      console.error('Export error:', error);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockProducts = filteredProducts.filter(product => product.stock <= 5 && product.stock > 0);
  const outOfStockProducts = filteredProducts.filter(product => product.stock === 0);

  return (
    <div className="space-y-6">
      {/* Low Stock Alert Banner */}
      {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Stock Alert</h3>
              <div className="mt-2 text-sm text-red-700">
                {outOfStockProducts.length > 0 && (
                  <p className="mb-1">
                    <strong>Out of Stock ({outOfStockProducts.length}):</strong>{' '}
                    {outOfStockProducts.map(p => p.name).join(', ')}
                  </p>
                )}
                {lowStockProducts.length > 0 && (
                  <p>
                    <strong>Low Stock ({lowStockProducts.length}):</strong>{' '}
                    {lowStockProducts.map(p => `${p.name} (${p.stock} left)`).join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Products</h1>
        <div className="flex gap-3">
          {user?.role === 'admin' && (
            <button
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export to Excel
            </button>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => {
                setEditingProduct(null);
                setFormData({
                  name: '',
                  description: '',
                  category: 'Car Freshner',
                  price: '',
                  purchase_price: '',
                  stock: 0,
                  image_url: ''
                });
                setShowModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name, description or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              title="Clear search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              {user?.role === 'admin' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <tr key={product.id} className={`hover:bg-gray-50 ${product.is_deleted === 1 ? 'opacity-60 bg-red-50/20' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {product.image_url ? (
                      <img
                        src={resolveImageUrl(product.image_url)}
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/64?text=No+Image';
                        }}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-gray-500">{product.description}</p>
                      )}
                      {product.is_deleted === 1 && (
                        <span className="block text-xs text-red-500 font-medium italic mt-0.5">
                          Deleted (Reason: {product.delete_reason})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    AED {parseFloat(product.purchase_price || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    AED {parseFloat(product.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${product.stock > 10 ? 'bg-green-100 text-green-800' :
                          product.stock > 5 ? 'bg-yellow-100 text-yellow-800' :
                            product.stock > 0 ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                        }`}>
                        {product.stock}
                      </span>
                      {product.stock <= 5 && product.stock > 0 && (
                        <svg className="w-4 h-4 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      {product.stock === 0 && (
                        <span className="text-xs text-red-600 font-semibold">OUT</span>
                      )}
                    </div>
                  </td>
                    <td className="px-6 py-4 whitespace-nowrap space-x-2">
                      <button
                        onClick={() => handleToggleActive(product)}
                        className={`text-xs font-semibold px-2 py-1 rounded transition ${
                          product.is_active !== 0
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title={product.is_active !== 0 ? 'Visible on website (Click to hide)' : 'Hidden from website (Click to show)'}
                      >
                        {product.is_active !== 0 ? '👁️ Active' : '👁️‍🗨️ Inactive'}
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-primary-600 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="mt-2 text-gray-600">No products found matching "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-primary-600 hover:underline text-sm"
                  >
                    Clear search
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editingProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Product Image
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg font-semibold bg-white"
                >
                  <option value="Car Freshner">Car Freshner</option>
                  <option value="Acce">Acce</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Selling Price
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
                >
                  {editingProduct ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition"
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

export default Products;


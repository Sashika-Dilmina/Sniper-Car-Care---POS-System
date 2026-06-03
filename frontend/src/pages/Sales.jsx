import { useEffect, useState } from 'react';
import axios from '../config/axios';
import toast from 'react-hot-toast';

const Sales = () => {
  // Products & Catalog State
  const [products, setProducts] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Customer State
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Quick Customer Registration State
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    vehicle_plate: '',
    vehicle_type: 'Saloon',
    province: 'Dubai'
  });

  // Cart State
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, card, credit (unpaid)
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (error) {
      toast.error('Failed to load catalog items');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      setCustomers(response.data.customers || []);
    } catch (error) {
      toast.error('Failed to load customers');
    }
  };

  // Add Product/Service to Cart
  const addToCart = (product) => {
    if (product.stock !== undefined && product.stock <= 0 && product.category !== 'Services') {
      toast.error('Item is out of stock!');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // If not a service, check stock limits
        if (product.category !== 'Services' && existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} items available in stock!`);
          return prev;
        }
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  // Update Cart Quantity
  const updateQuantity = (productId, amount) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + amount;
          if (newQty <= 0) return null;
          
          // Check stock limits for physical products
          if (amount > 0 && item.category !== 'Services' && newQty > item.stock) {
            toast.error(`Only ${item.stock} items available in stock!`);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Remove from Cart
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // Quick Register Customer Submit
  const handleQuickRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!newCustomer.name || !newCustomer.vehicle_plate) {
      toast.error('Please provide name and vehicle plate');
      return;
    }

    try {
      const response = await axios.post('/api/anpr/register', newCustomer);
      const createdCustomer = response.data.customer;
      toast.success('Customer registered successfully!');
      
      // Update customers local state & select the newly created customer
      fetchCustomers();
      setSelectedCustomer(createdCustomer);
      setCustomerSearch(createdCustomer.name + ' (' + createdCustomer.vehicle_plate + ')');
      
      // Reset registration form
      setNewCustomer({
        name: '',
        phone: '',
        vehicle_plate: '',
        vehicle_type: 'Saloon',
        province: 'Dubai'
      });
      setShowQuickRegister(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to register customer');
    }
  };

  // Calculate Cart Totals
  const subtotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const discountVal = parseFloat(discount) || 0;
  const total = Math.max(0, subtotal - discountVal);

  // Complete Order Checkout Flow
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    setIsCheckingOut(true);
    try {
      // 1. Create order in the backend
      const orderItems = cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: parseFloat(item.price)
      }));

      const orderData = {
        customer_id: selectedCustomer ? selectedCustomer.id : null,
        items: orderItems,
        total: total,
        discount: discountVal
      };

      const orderResponse = await axios.post('/api/orders', orderData);
      const createdOrder = orderResponse.data.order;

      // 2. If Cash or Card, record manual payment
      if (paymentMethod === 'cash' || paymentMethod === 'card') {
        await axios.post('/api/payments/manual', {
          order_id: createdOrder.id,
          amount: total,
          method: paymentMethod
        });
      }

      // 3. Complete the order/service
      await axios.put(`/api/orders/${createdOrder.id}/status`, {
        status: 'completed'
      });

      toast.success('Sale completed successfully! Receipt generated.', {
        duration: 4000,
        icon: '🛒'
      });

      // 4. Reset Register State
      setCart([]);
      setDiscount('');
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPaymentMethod('cash');
      
      // Refresh local products (for updated stock counts)
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Failed to complete sale');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Filter Catalog
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          product.description?.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter Customers for Search Dropdown
  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.vehicle_plate?.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-800 tracking-tight">Point of Sale (POS)</h1>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-green-200">
          <span className="h-2 w-2 rounded-full bg-green-500 animate-ping"></span>
          POS Terminal Active
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Catalog / Product & Service List (Col Span 2) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            
            {/* Category tabs and Search bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
                {['All', 'Services', 'Accessories', 'Spare Parts'].map(cat => (
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
                placeholder="Search services & products..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none w-full md:max-w-xs"
              />
            </div>

            {/* Catalog Grid */}
            {loadingProducts ? (
              <div className="flex justify-center items-center h-64 text-gray-500">Loading catalog...</div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
                {filteredProducts.map(product => {
                  const isService = product.category === 'Services';
                  const outOfStock = !isService && product.stock <= 0;

                  return (
                    <div
                      key={product.id}
                      onClick={() => !outOfStock && addToCart(product)}
                      className={`group border rounded-2xl p-4 transition-all duration-300 flex flex-col justify-between ${
                        outOfStock 
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200' 
                          : 'cursor-pointer hover:shadow-lg hover:border-primary-500 bg-white border-gray-100'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isService ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                          }`}>
                            {product.category}
                          </span>
                          {!isService && (
                            <span className={`text-[10px] font-bold ${
                              product.stock <= 5 ? 'text-red-500' : 'text-gray-500'
                            }`}>
                              Stock: {product.stock}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-800 group-hover:text-primary-600 transition-colors line-clamp-1">
                          {product.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-2">{product.description || 'No description available'}</p>
                      </div>
                      <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
                        <span className="font-extrabold text-gray-900">AED {parseFloat(product.price).toFixed(2)}</span>
                        <span className="text-primary-600 font-bold text-lg group-hover:translate-x-1 transition-transform">
                          {outOfStock ? '❌' : '+'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg">No items match your query</p>
                <button onClick={() => { setSelectedCategory('All'); setCatalogSearch(''); }} className="text-primary-600 underline text-sm mt-1">
                  Reset filters
                </button>
              </div>
            )}

          </div>
        </div>

        {/* RIGHT COLUMN: Cart & Billing Checkout Panel (Col Span 1) */}
        <div className="space-y-4">
          
          {/* Customer Search & Selector */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4 relative">
            <h2 className="text-lg font-bold text-gray-800 flex items-center justify-between">
              <span>👤 Customer Select</span>
              {selectedCustomer && (
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                  className="text-xs text-red-500 font-semibold hover:underline"
                >
                  Clear Selection
                </button>
              )}
            </h2>

            {!selectedCustomer ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Search customer by name or plate..."
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                    
                    {/* Customer Dropdown Results */}
                    {showCustomerDropdown && customerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto divide-y">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(cust => (
                            <div
                              key={cust.id}
                              onClick={() => {
                                setSelectedCustomer(cust);
                                setCustomerSearch(`${cust.name} (${cust.vehicle_plate})`);
                                setShowCustomerDropdown(false);
                              }}
                              className="px-4 py-2 hover:bg-primary-50 cursor-pointer flex justify-between items-center"
                            >
                              <div>
                                <p className="font-bold text-sm text-gray-800">{cust.name}</p>
                                <p className="text-xs text-gray-500">{cust.phone || 'No phone'}</p>
                              </div>
                              <span className="font-mono text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                                {cust.vehicle_plate}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-center text-gray-400 text-sm">No customers found</div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowQuickRegister(true)}
                    className="px-3 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition font-bold"
                    title="Register New Customer"
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">Leaves order under default "Walk-in Customer" if unselected</p>
              </div>
            ) : (
              <div className="bg-primary-50/50 p-4 rounded-xl border border-primary-100 flex items-center justify-between">
                <div>
                  <h4 className="font-black text-primary-900">{selectedCustomer.name}</h4>
                  <p className="text-xs text-primary-700 font-mono mt-0.5">{selectedCustomer.vehicle_plate} ({selectedCustomer.vehicle_type})</p>
                  {selectedCustomer.phone && <p className="text-xs text-primary-600 mt-0.5">{selectedCustomer.phone}</p>}
                </div>
                <span className="text-3xl">🚗</span>
              </div>
            )}

            {/* Quick Customer Registration Form Modal Inside Card */}
            {showQuickRegister && (
              <div className="bg-gray-50 border p-4 rounded-xl space-y-3">
                <h4 className="text-sm font-bold text-gray-700">Quick Register Customer</h4>
                <form onSubmit={handleQuickRegisterSubmit} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Name *"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Plate Number (e.g. DXB123) *"
                    value={newCustomer.vehicle_plate}
                    onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      placeholder="Phone (+971)"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <select
                      value={newCustomer.vehicle_type}
                      onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_type: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    >
                      <option value="Saloon">Saloon</option>
                      <option value="4x4">4x4</option>
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowQuickRegister(false)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold"
                    >
                      Save & Select
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>

          {/* Cart & Billing Checkout Summary */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center justify-between border-b pb-2">
              <span>🛒 Register Cart</span>
              <span className="bg-primary-100 text-primary-800 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} items
              </span>
            </h2>

            {/* Cart Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {cart.length > 0 ? (
                cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center gap-3 border-b border-gray-50 pb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">AED {parseFloat(item.price).toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-7 w-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 transition"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold text-gray-800 w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-7 w-7 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center font-bold text-gray-600 transition"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 ml-1"
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <span className="text-4xl block mb-2">🛒</span>
                  <p className="text-sm">Click products or services on the left to add them to this sale register.</p>
                </div>
              )}
            </div>

            {/* Discount & Payment Method Selection */}
            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t">
                
                {/* Discount */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Apply Discount (AED)</label>
                  <input
                    type="number"
                    min="0"
                    max={subtotal}
                    step="0.01"
                    placeholder="Enter discount amount"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'cash', label: '💵 Cash' },
                      { key: 'card', label: '💳 Card' },
                      { key: 'credit', label: '📝 Credit' }
                    ].map(pm => (
                      <button
                        key={pm.key}
                        type="button"
                        onClick={() => setPaymentMethod(pm.key)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                          paymentMethod === pm.key
                            ? 'bg-primary-600 text-white border-primary-600 shadow'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {pm.label}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Checkout Totals Summary */}
            <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span>AED {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-red-600">
                <span>Discount:</span>
                <span>- AED {discountVal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-gray-900 border-t pt-2 mt-1">
                <span>Net Total:</span>
                <span>AED {total.toFixed(2)}</span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              onClick={handleCheckout}
              disabled={isCheckingOut || cart.length === 0}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-primary-200 ${
                isCheckingOut || cart.length === 0
                  ? 'bg-gray-300 cursor-not-allowed shadow-none'
                  : 'bg-primary-600 hover:bg-primary-700'
              }`}
            >
              {isCheckingOut ? 'Processing checkout...' : 'Complete POS Sale & Pay'}
            </button>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Sales;

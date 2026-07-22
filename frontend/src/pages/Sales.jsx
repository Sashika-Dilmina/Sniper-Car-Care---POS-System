import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import VehiclePlatePreview from '../components/VehiclePlatePreview';
import SearchableSelect from '../components/SearchableSelect';

const Sales = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get('customer_id');
  const [activeSubTab, setActiveSubTab] = useState('pos'); // 'pos' or 'ledger'

  // POS - Products & Catalog State
  const [products, setProducts] = useState([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Services');
  const [loadingProducts, setLoadingProducts] = useState(true);

  // POS - Customer State
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // POS - Quick Customer Registration State
  const [showQuickRegister, setShowQuickRegister] = useState(false);
  const [plateCodes, setPlateCodes] = useState([]);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '+9715',
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
    
    if (showQuickRegister && newCustomer.emirate) {
      fetchPlateCodes();
    } else {
      setPlateCodes([]);
    }
  }, [newCustomer.emirate, showQuickRegister]);

  // POS - Cart State
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, tap, card, credit (unpaid)
  const [tapSubOption, setTapSubOption] = useState('apple_pay');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const isCheckingOutRef = useRef(false);

  // Register check state
  const [activeRegister, setActiveRegister] = useState(null);
  const [loadingRegister, setLoadingRegister] = useState(true);

  // Ledger - State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  });
  const [sharing, setSharing] = useState(false);
  const [ledgerOrders, setLedgerOrders] = useState([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState('');

  // Force staff users to only access 'pos' sub-tab
  useEffect(() => {
    if (user && user.role !== 'admin') {
      setActiveSubTab('pos');
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const err = params.get('error');
    if (status === 'success') {
      toast.success('Payment completed successfully via Tap Payments!');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (status === 'failed') {
      toast.error(`Payment failed: ${decodeURIComponent(err || 'Unknown error')}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    checkRegisterStatus();
  }, []);

  const checkRegisterStatus = async () => {
    try {
      const response = await axios.get('/api/registers/active');
      if (response.data.success && response.data.active) {
        setActiveRegister(response.data.register);
      } else {
        setActiveRegister(null);
      }
    } catch (err) {
      console.error('Error checking register status:', err);
    } finally {
      setLoadingRegister(false);
    }
  };

  // Fetch ledger sales when active sub-tab is ledger or date changes, and poll every 7 seconds for real-time updates
  useEffect(() => {
    let interval;
    if (activeSubTab === 'ledger') {
      fetchDailySales(false); // Initial non-silent fetch

      interval = setInterval(() => {
        fetchDailySales(true); // Silent background updates
      }, 7000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDate, activeSubTab]);

  const fetchDailySales = async (silent = false) => {
    try {
      if (!silent) setLoadingLedger(true);
      const response = await axios.get(`/api/orders?date=${selectedDate}`);
      setLedgerOrders(response.data.orders || []);
    } catch (error) {
      if (!silent) toast.error('Failed to load daily sales data');
    } finally {
      if (!silent) setLoadingLedger(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      const activeProducts = (response.data.products || []).filter(p => p.is_deleted !== 1);
      setProducts(activeProducts);
    } catch (error) {
      toast.error('Failed to load catalog items');
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('/api/customers');
      const activeCustomers = (response.data.customers || []).filter(c => c.is_deleted !== 1);
      setCustomers(activeCustomers);
    } catch (error) {
      toast.error('Failed to load customers');
    }
  };

  useEffect(() => {
    if (customerIdParam && customers.length > 0) {
      const cust = customers.find(c => c.id === parseInt(customerIdParam));
      if (cust) {
        setSelectedCustomer(cust);
        setCustomerSearch(`${cust.name} (${cust.vehicle_plate})`);
      }
    }
  }, [customerIdParam, customers]);

  // Add Product/Service to Cart
  const addToCart = (product) => {
    if (product.stock !== undefined && product.stock <= 0 && product.category !== 'Services' && product.category !== 'VIP') {
      toast.error('Item is out of stock!');
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // If not a service, check stock limits
        if (product.category !== 'Services' && product.category !== 'VIP' && existing.quantity >= product.stock) {
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
          if (amount > 0 && item.category !== 'Services' && item.category !== 'VIP' && newQty > item.stock) {
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
    const isNoVehicle = newCustomer.emirate === 'Garage' || newCustomer.emirate === 'Sniper car care';
    if (!newCustomer.name || !newCustomer.phone || (!isNoVehicle && !newCustomer.plate_number)) {
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
      const payload = {
        ...newCustomer,
        phone: cleanPhone
      };
      if (isNoVehicle) {
        payload.plate_code = '';
        payload.plate_number = `${newCustomer.emirate} - ${cleanPhone}`;
      }

      const response = await axios.post('/api/anpr/register', payload);
      const createdCustomer = response.data.customer;
      toast.success('Customer registered successfully!');
      
      // Update customers local state & select the newly created customer
      fetchCustomers();
      setSelectedCustomer(createdCustomer);
      setCustomerSearch(`${createdCustomer.name} (${createdCustomer.vehicle_plate})`);
      
      // Reset registration form
      setNewCustomer({
        name: '',
        phone: '+9715',
        emirate: '',
        plate_code: '',
        plate_number: '',
        vehicle_type: 'Saloon'
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
    if (isCheckingOutRef.current) return;
    if (cart.length === 0) {
      toast.error('Your cart is empty!');
      return;
    }

    if (paymentMethod === 'credit' && !selectedCustomer) {
      toast.error('Credit checkout requires selecting a registered customer.');
      return;
    }

    const hasServiceInCart = cart.some(item => item.category === 'Services' || item.category === 'VIP');
    if (hasServiceInCart && !selectedCustomer) {
      toast.error('Booking a service requires selecting a customer.');
      return;
    }

    isCheckingOutRef.current = true;
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

      // 2. Process payment based on method
      if (paymentMethod === 'cash' || paymentMethod === 'card') {
        const hasService = cart.some(item => item.category === 'Services' || item.category === 'VIP');
        await axios.post('/api/payments/manual', {
          order_id: createdOrder.id,
          amount: total,
          method: total === 0 ? 'free' : paymentMethod,
          status: hasService ? 'pending' : 'completed'
        });
      } else if (paymentMethod === 'tap') {
        const tapResponse = await axios.post('/api/payments/tap/create', {
          order_id: createdOrder.id,
          amount: total,
          redirect_url: window.location.origin + '/sales?status=success&order_id=' + createdOrder.id
        });
        if (tapResponse.data?.transaction_url) {
          window.location.href = tapResponse.data.transaction_url;
          return; // Stop cart clearing since we redirect
        } else {
          throw new Error('Failed to retrieve Tap payment URL');
        }
      } else if (paymentMethod === 'credit') {
        await axios.post('/api/credits', {
          customer_id: selectedCustomer.id,
          order_id: createdOrder.id,
          amount: total
        });
      }

      // 3. Keep status as 'pending' to process in the Services/Orders queue

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
      // Refresh daily sales ledger
      fetchDailySales();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || error.message || 'Failed to complete sale');
    } finally {
      isCheckingOutRef.current = false;
      setIsCheckingOut(false);
    }
  };

  const handleWhatsAppShare = async () => {
    setSharing(true);
    try {
      const params = new URLSearchParams();
      params.append('tab', 'daily');
      params.append('date', selectedDate);
      
      const response = await axios.get(`/api/analytics/reports/pdf?${params.toString()}`);
      if (response.data.success && response.data.pdfUrl) {
        const backendBaseUrl = axios.defaults.baseURL || window.location.origin;
        const fullPdfUrl = `${backendBaseUrl}${response.data.pdfUrl}`;
        
        try {
          // Fetch the PDF blob to create a File object
          const fileResponse = await fetch(fullPdfUrl);
          const blob = await fileResponse.blob();
          const file = new File([blob], `sales-ledger-${selectedDate}-${Date.now()}.pdf`, { type: 'application/pdf' });
          
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Sniper Car Care Daily Sales Ledger',
              text: `Sales Ledger for ${selectedDate}`
            });
            toast.success('Sales Ledger PDF shared successfully!');
            return;
          }
        } catch (shareErr) {
          console.warn('Native sharing failed, falling back to link:', shareErr);
        }
        
        // Fallback to text link if navigator.share fails or is not supported
        const message = `Check out the Sniper Car Care Daily Sales Ledger for ${selectedDate}: ${fullPdfUrl}`;
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        toast.success('Opened PDF report link in browser.');
      } else {
        toast.error('Failed to generate sales ledger PDF');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      toast.error('Failed to generate and share sales ledger PDF');
    } finally {
      setSharing(false);
    }
  };

  // Filter Catalog
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                          product.description?.toLowerCase().includes(catalogSearch.toLowerCase());
    const matchesCategory = 
      (selectedCategory === 'VIP' && (product.category === 'VIP' || product.name?.toLowerCase().includes('vip'))) ||
      (selectedCategory === 'Services' && product.category === 'Services' && !product.name?.toLowerCase().includes('vip')) ||
      (selectedCategory === 'Acce' && (product.category === 'Acce' || product.category === 'Accessories')) ||
      (selectedCategory === 'Car Freshner' && (product.category === 'Car Freshner' || product.category === 'Car Freshener')) ||
      (selectedCategory !== 'VIP' && selectedCategory !== 'Services' && selectedCategory !== 'Acce' && selectedCategory !== 'Car Freshner' && product.category === selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Filter Customers for Search Dropdown
  const filteredCustomers = customers.filter(c => {
    if (!c) return false;
    if (!customerSearch || typeof customerSearch !== 'string' || !customerSearch.trim()) return true;

    try {
      const rawSearch = String(customerSearch).trim().toLowerCase();
      const cleanSearch = rawSearch.replace(/[\s\-_]+/g, '');

      const name = String(c.name || '').toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      const phoneClean = phone.replace(/[^0-9]/g, '');
      const plate = String(c.vehicle_plate || '').toLowerCase();
      const plateClean = plate.replace(/[\s\-_]+/g, '');
      const province = String(c.province || '').toLowerCase();

      return (
        name.includes(rawSearch) ||
        phone.includes(rawSearch) ||
        (phoneClean && cleanSearch && phoneClean.includes(cleanSearch)) ||
        plate.includes(rawSearch) ||
        (plateClean && cleanSearch && plateClean.includes(cleanSearch)) ||
        province.includes(rawSearch)
      );
    } catch (err) {
      console.error('Error filtering sales customer:', err);
      return false;
    }
  });



  // Filter Ledger Orders
  const filteredLedgerOrders = ledgerOrders.filter(order => {
    const customer = (order.customer_name || 'Walk-in').toLowerCase();
    const plate = (order.vehicle_plate || '').toLowerCase();
    const phone = (order.customer_phone || '').toLowerCase();
    const query = ledgerSearchQuery.toLowerCase();
    return customer.includes(query) || plate.includes(query) || phone.includes(query);
  });

  // Ledger stats (excluding cancelled orders)
  const totalSalesCount = filteredLedgerOrders.filter(o => o.status !== 'cancelled').length;
  const totalDiscount = filteredLedgerOrders.reduce((sum, o) => sum + (o.status === 'cancelled' ? 0 : parseFloat(o.discount || 0)), 0);
  const totalRevenue = filteredLedgerOrders.reduce((sum, o) => sum + (o.status === 'cancelled' ? 0 : parseFloat(o.total || 0)), 0);

  console.log('DEBUG: filteredLedgerOrders =', filteredLedgerOrders);
  console.log('DEBUG: totalRevenue =', totalRevenue);

  const renderCatalogCard = (product) => {
    const isService = product.category === 'Services' || product.category === 'VIP';
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
          <p className="text-sm font-extrabold text-primary-600 mt-0.5">
            AED {parseFloat(product.price).toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description || 'No description available'}</p>
        </div>
        <div className="flex justify-between items-center mt-4 pt-2 border-t border-gray-50">
          <span className="font-extrabold text-gray-900">AED {parseFloat(product.price).toFixed(2)}</span>
          <span className="text-primary-600 font-bold text-lg group-hover:translate-x-1 transition-transform">
            {outOfStock ? '❌' : '+'}
          </span>
        </div>
      </div>
    );
  };

  const formatSource = (source) => {
    if (source === 'vip_booking') return { label: '👑 VIP Booking', color: 'bg-purple-100 text-purple-800' };
    if (source === 'customer_website_saloon' || source === 'customer_website_4x4' || source === 'customer_website') {
      return { label: '🌐 Website', color: 'bg-blue-100 text-blue-800' };
    }
    return { label: '🖥️ POS Terminal', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          aside, nav, header, button, input, select, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            background-color: white !important;
            color: black !important;
            width: 100% !important;
          }
          .print-full-width {
            width: 100% !important;
            max-width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 8px 4px !important;
            font-size: 10px !important;
            white-space: normal !important;
            word-break: break-word !important;
          }
          th:nth-child(1), td:nth-child(1) { width: 10% !important; }
          th:nth-child(2), td:nth-child(2) { width: 22% !important; }
          th:nth-child(3), td:nth-child(3) { width: 20% !important; }
          th:nth-child(4), td:nth-child(4) { width: 16% !important; }
          th:nth-child(5), td:nth-child(5) { width: 11% !important; }
          th:nth-child(6), td:nth-child(6) { width: 11% !important; }
          th:nth-child(7), td:nth-child(7) { width: 10% !important; }
        }
      `}} />

      {/* Unified Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print border-b pb-4 border-gray-100">
        <div>
          <h1 className="text-3xl font-black text-gray-800 tracking-tight">Sales & Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Manage POS checkouts and trace daily transactions ledger.</p>
        </div>

        {/* Tab Selector for Admins */}
        {user?.role === 'admin' && (
          <div className="flex bg-gray-100 p-1.5 rounded-xl gap-2 shadow-inner">
            <button
              onClick={() => setActiveSubTab('pos')}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeSubTab === 'pos'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🛒 POS Terminal
            </button>
            <button
              onClick={() => setActiveSubTab('ledger')}
              className={`px-5 py-2.5 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                activeSubTab === 'ledger'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Sales Ledger
            </button>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: POS TERMINAL VIEW */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 no-print">
          {/* LEFT COLUMN: Catalog / Product & Service List (Col Span 2) */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
              {/* Category tabs and Search bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex bg-gray-100 p-1.5 rounded-xl gap-1 overflow-x-auto">
                  {['Services', 'Car Freshner', 'Acce', 'VIP'].map(cat => (
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
                <div className="flex justify-center items-center h-64 text-gray-550">Loading catalog...</div>
              ) : filteredProducts.length > 0 ? (
                (selectedCategory === 'Services' || selectedCategory === 'VIP') ? (
                  <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1">
                    {/* Saloon Services Group */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-gray-700 flex items-center gap-2 border-b pb-1">
                        <span className="notranslate" translate="no">🚗 Saloon Services</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                          {filteredProducts.filter(p => p.vehicle_type === 'Saloon' || p.vehicle_type === 'Both').length} items
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredProducts
                          .filter(p => p.vehicle_type === 'Saloon' || p.vehicle_type === 'Both')
                          .map(product => renderCatalogCard(product))}
                      </div>
                    </div>

                    {/* 4x4 Services Group */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-black text-gray-700 flex items-center gap-2 border-b pb-1">
                        <span>🚙 4x4 Services</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">
                          {filteredProducts.filter(p => p.vehicle_type === '4x4' || p.vehicle_type === 'Both').length} items
                        </span>
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {filteredProducts
                          .filter(p => p.vehicle_type === '4x4' || p.vehicle_type === 'Both')
                          .map(product => renderCatalogCard(product))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto pr-1">
                    {filteredProducts.map(product => renderCatalogCard(product))}
                  </div>
                )
              ) : (
                <div className="text-center py-20 text-gray-400">
                  <p className="text-lg">No items match your query</p>
                  <button onClick={() => { setSelectedCategory('Services'); setCatalogSearch(''); }} className="text-primary-600 underline text-sm mt-1">
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
                <div className="bg-gray-50 border p-4 rounded-xl space-y-3 text-left">
                  <h4 className="text-sm font-bold text-gray-700">Quick Register Customer</h4>
                  <form onSubmit={handleQuickRegisterSubmit} className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Customer Name *"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Phone (+971...) *"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm"
                    />
                    <select
                      value={newCustomer.vehicle_type}
                      onChange={(e) => setNewCustomer({ ...newCustomer, vehicle_type: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded-lg text-sm notranslate"
                      translate="no"
                    >
                      <option value="Saloon">Saloon</option>
                      <option value="4x4">4x4</option>
                    </select>

                    <div className="border-t pt-2 mt-2 space-y-2">
                      <p className="text-xs font-bold text-gray-500">Vehicle Registration</p>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={newCustomer.emirate}
                          onChange={(e) => setNewCustomer({ ...newCustomer, emirate: e.target.value })}
                          className="w-full px-2 py-1.5 border rounded-lg text-xs"
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

                        {!(newCustomer.emirate === 'Garage' || newCustomer.emirate === 'Sniper car care') && (
                          <SearchableSelect
                            options={plateCodes}
                            value={newCustomer.plate_code}
                            onChange={(val) => setNewCustomer({ ...newCustomer, plate_code: val })}
                            disabled={plateCodes.length === 0}
                          />
                        )}
                      </div>

                      {!(newCustomer.emirate === 'Garage' || newCustomer.emirate === 'Sniper car care') && (
                        <input
                          type="text"
                          required={!(newCustomer.emirate === 'Garage' || newCustomer.emirate === 'Sniper car care')}
                          placeholder="Plate Number (e.g. 12345) *"
                          value={newCustomer.plate_number}
                          onChange={(e) => setNewCustomer({ ...newCustomer, plate_number: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm font-mono"
                        />
                      )}

                      {!(newCustomer.emirate === 'Garage' || newCustomer.emirate === 'Sniper car care') && (
                        <VehiclePlatePreview 
                          emirate={newCustomer.emirate} 
                          plateCode={newCustomer.plate_code} 
                          plateNumber={newCustomer.plate_number} 
                        />
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-1">
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
                        { key: 'credit', label: '🏦 Credit' }
                      ].map(pm => (
                        <button
                          key={pm.key}
                          type="button"
                          onClick={() => {
                            setPaymentMethod(pm.key);
                          }}
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

              {/* Register closed warning */}
              {!activeRegister && !loadingRegister && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-semibold space-y-2 mt-4">
                  <p className="flex items-center gap-1.5 font-bold text-left">
                    <span>⚠️</span> Cash Register is Closed
                  </p>
                  <p className="text-xs text-red-600 font-normal text-left">
                    You cannot perform checkout operations while the register is closed. Please open the register from the Dashboard first.
                  </p>
                  <div className="text-left">
                    <Link to="/" className="inline-block mt-1 text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 px-3 rounded-lg transition">
                      Go to Dashboard
                    </Link>
                  </div>
                </div>
              )}

              {/* Complete Sale Button */}
              <button
                onClick={handleCheckout}
                disabled={isCheckingOut || cart.length === 0 || (!activeRegister && !loadingRegister)}
                className={`w-full py-4 rounded-xl font-bold text-white transition-all text-center flex items-center justify-center gap-2 shadow-lg shadow-primary-200 ${
                  isCheckingOut || cart.length === 0 || (!activeRegister && !loadingRegister)
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-primary-600 hover:bg-primary-700'
                }`}
              >
                {isCheckingOut ? 'Processing checkout...' : 'Complete POS Sale & Pay'}
              </button>

            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: SALES LEDGER VIEW */}
      {activeSubTab === 'ledger' && user?.role === 'admin' && (
        <div className="space-y-6">
          {/* Ledger Date & Action Picker */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border shadow-sm no-print">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-gray-100 rounded-xl p-1 border">
                <button
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition"
                  title="Previous Day"
                >
                  ◀
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1 font-bold text-gray-800 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
                />
                <button
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split('T')[0]);
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition"
                  title="Next Day"
                >
                  ▶
                </button>
              </div>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition text-sm"
              >
                Today
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleWhatsAppShare}
                disabled={sharing}
                className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-sm"
              >
                {sharing ? '⏳ Generating PDF...' : '💬 Share via WhatsApp'}
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-md transition flex items-center gap-2 text-sm"
              >
                🖨️ Print Daily Invoice
              </button>
            </div>
          </div>

          {/* Ledger Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 no-print">
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 p-6 rounded-2xl shadow-sm border text-white flex flex-col justify-between">
              <span className="text-sm font-bold uppercase tracking-wider opacity-85">Daily Sales Revenue</span>
              <h3 className="text-3xl font-black mt-2 notranslate">AED {totalRevenue.toFixed(2)}</h3>
              <span className="text-xs opacity-75 mt-4">Total net sales generated today</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Total Sales Count</span>
              <h3 className="text-3xl font-black text-gray-800 mt-2"><span className="notranslate">{totalSalesCount}</span> Sales</h3>
              <span className="text-xs text-green-500 font-semibold mt-4">Including normal and VIP services</span>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
              <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Applied Discounts</span>
              <h3 className="text-3xl font-black text-red-500 mt-2 notranslate">AED {totalDiscount.toFixed(2)}</h3>
              <span className="text-xs text-gray-400 mt-4">Discounts offered to customers</span>
            </div>
          </div>

          {/* Search ledger */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center no-print">
            <input
              type="text"
              placeholder="Filter ledger by customer name, phone, or plate/model..."
              value={ledgerSearchQuery}
              onChange={(e) => setLedgerSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-primary-500 border-gray-200"
            />
          </div>

          {/* Printable Invoice Header (Hidden on Screen, Visible on Print) */}
          <div className="hidden print:block border-b-2 border-gray-300 pb-6 print-full-width">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-black text-black">SNIPER CAR CARE</h1>
                <p className="text-sm text-gray-500 mt-1">Premium Vehicle Care & Detailing Center</p>
                <p className="text-xs text-gray-400 mt-0.5">Hostinger VPS Server Network</p>
              </div>
              <div className="text-right">
                <h2 className="text-xl font-bold text-gray-800">DAILY SALES STATEMENT</h2>
                <p className="text-sm text-gray-600 mt-1">Date: <span className="font-bold">{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 bg-gray-50 p-4 rounded-xl border">
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Total Sales Count</p>
                <p className="text-lg font-black text-black">{totalSalesCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Total Discounts</p>
                <p className="text-lg font-black text-black">AED {totalDiscount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-bold">Grand Total Revenue</p>
                <p className="text-xl font-black text-red-600">AED {totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Sales Ledger Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print-full-width">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100 print:bg-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Sale ID</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Customer</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Vehicle / Plate</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Source</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider print:text-black">Payment</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right print:text-black">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLedger ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-500 no-print">Loading ledger...</td>
                    </tr>
                  ) : filteredLedgerOrders.length > 0 ? (
                    filteredLedgerOrders.map((order) => {
                      const src = formatSource(order.source);
                      return (
                        <tr key={order.id} className="hover:bg-gray-50/50 transition">
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-700">
                            #{order.id}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-bold text-gray-800">{order.customer_name || 'Walk-in'}</div>
                            {order.customer_phone && (
                              <div className="text-xs text-gray-500 print:text-gray-600 mt-0.5">{order.customer_phone}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-700">
                            {order.vehicle_plate || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${src.color}`}>
                              {src.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                              order.status === 'completed' ? 'bg-green-50 text-green-700' :
                              order.status === 'processing' ? 'bg-yellow-50 text-yellow-700' :
                              order.status === 'cancelled' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-700'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(() => {
                              const getPaymentLabel = () => {
                                if (order.credit_status) {
                                  if (order.credit_status === 'unpaid') return 'Credit / Unpaid';
                                  if (order.credit_status === 'partially_paid') return 'Credit / Partial';
                                }
                                if (order.payment_status === 'free') return 'Free';
                                if (order.payment_methods) {
                                  return order.payment_methods.split(',').map(m => {
                                    const val = m.trim().toLowerCase();
                                    if (val === 'tap') return 'TAP';
                                    if (val === 'bank_transfer') return 'Bank';
                                    return val.charAt(0).toUpperCase() + val.slice(1);
                                  }).join(', ');
                                }
                                if (order.payment_status === 'paid') return 'Paid';
                                return order.payment_status ? (order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)) : 'Pending';
                              };

                              const getPaymentBadgeClass = () => {
                                if (order.credit_status) {
                                  if (order.credit_status === 'unpaid') return 'bg-red-50 text-red-750';
                                  if (order.credit_status === 'partially_paid') return 'bg-yellow-50 text-yellow-750';
                                  return 'bg-green-50 text-green-700';
                                }
                                if (order.payment_status === 'paid' || order.payment_status === 'free') {
                                  return 'bg-green-50 text-green-700';
                                }
                                return 'bg-red-50 text-red-700';
                              };

                              return (
                                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${getPaymentBadgeClass()}`}>
                                  {getPaymentLabel()}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-extrabold text-gray-900 text-right">
                            {order.payment_status === 'free' ? (
                              <span className="text-green-600 font-bold">AED {parseFloat(order.discount).toFixed(2)} (Free)</span>
                            ) : (
                              `AED ${parseFloat(order.total).toFixed(2)}`
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center text-gray-400">
                        No transactions registered for this date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Printable Invoice Footer (Hidden on Screen, Visible on Print) */}
          <div className="hidden print:block mt-12 border-t pt-6 text-center text-xs text-gray-400 print-full-width">
            <p>This statement represents the official record of daily transactions for Sniper Car Care POS System.</p>
            <p className="mt-1">Generated by Sniper POS Admin Ledger</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;

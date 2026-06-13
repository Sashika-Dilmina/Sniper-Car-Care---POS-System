import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { images, getServiceImage } from '../config/siteImages';
import BottomNav from '../components/BottomNav';

const Reveal = ({ children, delay = 0, className = '' }) => {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={elementRef} className={`reveal ${isVisible ? 'visible' : ''} ${className || ''}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const SniperBrandLogo = ({ variant = 'header' }) => {
  if (variant === 'header') {
    return (
      <span className="text-center leading-tight block">
        <span className="block text-[1.65rem] sm:text-3xl font-black italic tracking-tight text-black">SNIPER</span>
        <span className="block text-xs sm:text-sm font-bold text-red-600 tracking-[0.2em] uppercase mt-0.5">Car Care</span>
      </span>
    );
  }
  return (
    <h1 className="text-4xl sm:text-5xl md:text-[3.35rem] font-black uppercase tracking-tight text-gray-900 leading-tight">
      <span className="block">Sniper</span>
      <span className="block text-red-600">Car Care</span>
    </h1>
  );
};

const LoyaltyProgress = ({ washStamps = 0 }) => {
  const filled = Math.min(Math.max(washStamps, 0), 5);
  const freeReady = washStamps >= 5;

  return (
    <div className="relative w-full">
      <div
        className="absolute left-[8%] right-[8%] top-[12px] sm:top-[16px] h-0.5 bg-gray-200 z-0"
        aria-hidden="true"
      />
      <div className="relative z-10 flex justify-between items-center w-full">
        {[1, 2, 3, 4, 5].map((n) => {
          const isFilled = n <= filled;
          return (
            <div key={n} className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full border border-gray-200 text-[8px] sm:text-xs shadow-sm transition-all duration-300 ${
                  isFilled
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'bg-white text-gray-400'
                }`}
              >
                🚗
              </div>
            </div>
          );
        })}
        <div className="flex flex-col items-center">
          <div
            className={`flex h-7 w-7 sm:h-10 sm:w-10 items-center justify-center rounded-full text-[10px] sm:text-sm transition-all duration-300 ${
              freeReady
                ? 'bg-red-600 text-white shadow-md ring-2 ring-red-200 scale-110 animate-pulse'
                : 'bg-gray-100 text-gray-400 border border-gray-200'
            }`}
          >
            🎁
          </div>
        </div>
      </div>
    </div>
  );
};

const CrownIcon = ({ className = 'w-16 h-16 text-red-600' }) => (
  <svg className={className} viewBox="0 0 64 64" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M8 44h48l-6-28-10 12-8-16-8 16-10-12-6 28z" />
    <path d="M10 46h44v4H10v-4z" opacity="0.85" />
    <circle cx="32" cy="22" r="3" fill="#fbbf24" />
    <circle cx="18" cy="28" r="2.5" fill="#fbbf24" />
    <circle cx="46" cy="28" r="2.5" fill="#fbbf24" />
  </svg>
);

const stats = [
  { label: 'Chauffeur Clients', value: '8.2k+' },
  { label: 'Executive Details', value: '27k+' },
  { label: 'Ceramic Finishes', value: '5.4k' },
  { label: 'Google Rating', value: '4.9/5' },
];

const vipServices = [
  {
    name: 'Interior Deep Clean',
    icon: '🧹',
    description: 'Complete interior detailing with premium products',
    features: 'Deep vacuum, leather conditioning, window cleaning',
    price: '150 AED',
    duration: '120 minutes'
  },
  {
    name: 'Paint Protection',
    icon: '🛡️',
    description: 'Professional paint protection and ceramic coating',
    features: 'Scratch protection, UV protection, water beading',
    price: '250 AED',
    duration: '240 minutes'
  },
  {
    name: 'Polish & Finishing',
    icon: '✨',
    description: 'Paint polishing and professional finishing',
    features: 'Swirl mark removal, high gloss finish',
    price: '200 AED',
    duration: '180 minutes'
  },
  {
    name: 'Trim Restoration',
    icon: '⚙️',
    description: 'Restore and finish trim pieces',
    features: 'Trim coating, protective sealant',
    price: '180 AED',
    duration: '150 minutes'
  },
  {
    name: 'Premium Finishing',
    icon: '👑',
    description: 'Complete premium car care package',
    features: 'All services included, 2-day service',
    price: '400 AED',
    duration: '480 minutes'
  }
];

// Service packages are loaded dynamically from the backend

const heroFeatures = [
  { label: 'Safe Products', icon: '🛡️' },
  { label: 'Expert Team', icon: '👥' },
  { label: 'Fast Service', icon: '⚡' },
];

const howItWorks = [
  { step: 1, title: 'BOOK SERVICE', description: 'Choose your package and book online or via your SMS link.', icon: '📅' },
  { step: 2, title: 'WE ARRIVE', description: 'Our mobile team comes to your location fully equipped.', icon: '🚗' },
  { step: 3, title: 'PREMIUM CARE', description: 'Professional interior and exterior detailing with premium products.', icon: '✨' },
  { step: 4, title: 'DRIVE AWAY', description: 'Enjoy your spotless vehicle. Pay on completion or online.', icon: '🔑' },
];

const trustFeatures = [
  { title: 'CUSTOMER SUPPORT', subtitle: '24/7 Available', icon: '📞' },
  { title: 'QUALITY GUARANTEE', subtitle: 'Satisfaction guaranteed', icon: '✅' },
  { title: 'EXPERT TEAM', subtitle: 'Trained professionals you can trust', icon: '👥' },
];

const vipHighlights = [
  'Interior Deep Clean',
  'Paint Protection',
  'Polish & Wax',
  'Trim Restoration',
  'Premium Finishing',
];

const testimonials = [
  {
    name: 'Ahmed M.',
    location: 'Dubai Desert',
    quote: 'After a weekend of off-roading, my Jeep looked muddy but Sniper brought it back to showroom condition! Impressive work.',
    rating: 5,
  },
  {
    name: 'Fatima R.',
    location: 'Abu Dhabi, UAE',
    quote: "Best 4x4 detailing service I've tried. They handled the tough mud stains perfectly and my vehicle looks brand new!",
    rating: 5,
  },
  {
    name: 'Hassan K.',
    location: 'Sharjah, UAE',
    quote: 'VIP premium service for my Land Cruiser was exceptional. Every detail was taken care of. Highly recommended!',
    rating: 5,
  },
];

const products = [
  {
    name: 'Luxe Cabin Fragrance Pods',
    description: 'Fragrance pods that clip to vents for fresh cabin scent.',
    price: '12 AED',
    accent: 'Best Seller',
    art: (props) => (
      <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
          <linearGradient id="podBody" x1="60" y1="40" x2="260" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="55%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <radialGradient id="podGlow" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="220" rx="32" fill="#0f172a" />
        <rect width="320" height="220" rx="32" fill="url(#podGlow)" />
        <g opacity="0.2">
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx={40 + i * 40} cy={200 - (i % 2) * 18} r="3" fill="#94a3b8" />
          ))}
        </g>
        <path d="M110 58h100c12 0 22 10 22 22v60c0 12-10 22-22 22H110c-12 0-22-10-22-22V80c0-12 10-22 22-22z" fill="url(#podBody)" />
        <path d="M124 78h72c8 0 14 6 14 14v36c0 8-6 14-14 14h-72c-8 0-14-6-14-14V92c0-8 6-14 14-14z" fill="#0f172a" opacity="0.6" />
        <circle cx="160" cy="132" r="18" stroke="#bae6fd" strokeWidth="6" opacity="0.65" />
        <path d="M160 98c-14-10-16-24-10-34" stroke="#e0f2fe" strokeWidth="6" strokeLinecap="round" opacity="0.5" />
        <path d="M160 98c14-10 16-24 10-34" stroke="#e0f2fe" strokeWidth="6" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
    benefits: ['Easy to install', 'Long-lasting scent', 'Adjustable']
  },
  {
    name: 'Velvet Guard Seat Duo',
    description: 'Soft seat covers to protect your luxury interior.',
    price: '89 AED',
    accent: 'Concierge pick',
    art: (props) => (
      <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
          <linearGradient id="seatGradient" x1="80" y1="40" x2="240" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="45%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
          <radialGradient id="seatGlow" cx="55%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="220" rx="32" fill="#0f172a" />
        <rect width="320" height="220" rx="32" fill="url(#seatGlow)" />
        <path d="M94 180h40l10-50c2-8 2-18-2-26l-18-44c-4-8-12-12-20-12-8 0-16 4-20 12l-18 44c-4 8-4 18-2 26l10 50z" fill="#1e293b" />
        <path d="M186 180h40l10-50c2-8 2-18-2-26l-18-44c-4-8-12-12-20-12-8 0-16 4-20 12l-18 44c-4 8-4 18-2 26l10 50z" fill="#1e293b" />
        <path d="M96 174h36l9-46c2-8 1-16-2-22l-15-36c-2-5-6-8-10-8-4 0-8 3-10 8l-15 36c-3 6-4 14-2 22l9 46z" fill="url(#seatGradient)" />
        <path d="M188 174h36l9-46c2-8 1-16-2-22l-15-36c-2-5-6-8-10-8-4 0-8 3-10 8l-15 36c-3 6-4 14-2 22l9 46z" fill="url(#seatGradient)" opacity="0.85" />
        <path d="M120 60h16" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <path d="M212 60h16" stroke="#93c5fd" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        <path d="M110 138h20" stroke="#e0f2fe" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
        <path d="M202 138h20" stroke="#e0f2fe" strokeWidth="4" strokeLinecap="round" opacity="0.3" />
      </svg>
    ),
    benefits: ['Easy to install', 'Water-resistant', 'Machine washable']
  },
  {
    name: 'Executive Mat Bundle',
    description: 'Premium floor mats for luxury interiors.',
    price: '129 AED',
    accent: 'Limited Drop',
    art: (props) => (
      <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
          <linearGradient id="matGradient" x1="100" y1="60" x2="240" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="60%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
          <radialGradient id="matGlow" cx="45%" cy="40%" r="70%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="220" rx="32" fill="#0f172a" />
        <rect width="320" height="220" rx="32" fill="url(#matGlow)" />
        <rect x="82" y="54" width="156" height="112" rx="26" fill="#0b1221" />
        <rect x="90" y="62" width="140" height="84" rx="20" fill="#111c33" />
        <rect x="102" y="74" width="116" height="72" rx="18" fill="url(#matGradient)" />
        <path d="M120 92h80" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
        <path d="M120 108h80" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
        <path d="M120 124h80" stroke="#0f172a" strokeWidth="4" strokeLinecap="round" opacity="0.35" />
        <rect x="140" y="150" width="40" height="18" rx="6" fill="#0f172a" opacity="0.5" />
        <path d="M118 176h84" stroke="#38bdf8" strokeWidth="6" strokeLinecap="round" opacity="0.35" />
      </svg>
    ),
    benefits: ['Spill protection', 'Anti-slip', 'Premium quality']
  }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [vipStep, setVipStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    vehicle_plate: '',
    notes: ''
  });
  const [vipBookingForm, setVipBookingForm] = useState({
    name: '',
    phone: '',
    vehicle_model: '',
    vehicle_type: '4x4',
    service_type: '4x4 VIP Service',
    appointment_date: '',
    appointment_time: '',
    notes: ''
  });
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [quickBookForm, setQuickBookForm] = useState({ service: '', date: '', time: '' });
  const [showSupportOptions, setShowSupportOptions] = useState(false);
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [washStamps, setWashStamps] = useState(0);
  const [packages, setPackages] = useState([]);
  const [dbProducts, setDbProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    phone: '',
    vehicle_plate: '',
    quantity: 1,
    notes: ''
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/public/products?category=Services&vehicle_type=4x4');
        const mappedPackages = (response.data.products || []).map(p => ({
          id: p.id,
          name: p.name,
          price: typeof p.price === 'number' ? p.price : parseFloat(p.price),
          description: p.description || '',
          image_url: p.image_url,
          featured: p.name === 'Double Soap'
        }));
        setPackages(mappedPackages);
      } catch (err) {
        console.error('Error fetching services:', err);
      }
    };
    const fetchDbProducts = async () => {
      try {
        const response = await axios.get('/api/public/products');
        const filtered = (response.data.products || []).filter(p => p.category !== 'Services');
        setDbProducts(filtered);
      } catch (err) {
        console.error('Error fetching products:', err);
      }
    };
    fetchServices();
    fetchDbProducts();
  }, []);

  const vehiclePlate = searchParams.get('plate') || '';

  // Real-time order status notifications
  useEffect(() => {
    if (!vehiclePlate) return;

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const checkOrderStatusNotifications = async () => {
      try {
        const response = await axios.get(`/api/public/customer/orders?plate=${encodeURIComponent(vehiclePlate)}`);
        const ordersList = response.data.orders || [];

        // Load previously seen statuses
        const storageKey = `seen_orders_${vehiclePlate}`;
        const seenOrders = JSON.parse(localStorage.getItem(storageKey) || '{}');
        let updated = false;

        ordersList.forEach(order => {
          const prevStatus = seenOrders[order.id];
          
          if (prevStatus !== undefined && prevStatus !== order.status) {
            // Status changed!
            let title = '';
            let body = '';

            if (order.status === 'processing') {
              title = 'Order Confirmed 🚗';
              body = `Your service (Order #${order.id}) has been confirmed by our staff and is now in progress!`;
            } else if (order.status === 'completed') {
              title = 'Service Completed! ✨';
              body = `Your vehicle is ready. You can view payment details and complete checkout on the site.`;
            } else if (order.status === 'cancelled') {
              title = 'Order Cancelled ❌';
              body = `Your order #${order.id} has been cancelled.`;
            }

            if (title) {
              // Show in-app toast
              toast.success(
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gray-900">{title}</span>
                  <span className="text-xs text-gray-600 mt-0.5">{body}</span>
                </div>,
                { duration: 8000 }
              );

              // Show browser native notification
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
              }
            }
            updated = true;
          }
          
          // Update status in storage
          seenOrders[order.id] = order.status;
        });

        // Save current statuses if it's the first run (initialize)
        ordersList.forEach(order => {
          if (seenOrders[order.id] === undefined) {
            seenOrders[order.id] = order.status;
            updated = true;
          }
        });

        if (updated) {
          localStorage.setItem(storageKey, JSON.stringify(seenOrders));
        }
      } catch (err) {
        console.error('Error fetching orders for notifications:', err);
      }
    };

    // Run initially and then every 10 seconds
    checkOrderStatusNotifications();
    const interval = setInterval(checkOrderStatusNotifications, 10000);

    return () => clearInterval(interval);
  }, [vehiclePlate]);

  useEffect(() => {
    if (searchParams.get('action') === 'book') {
      setQuickBookOpen(true);
      // Clean up URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('action');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (location.hash) {
      setTimeout(() => {
        const element = document.getElementById(location.hash.slice(1));
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [location]);

  // Fetch customer info by plate number
  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!vehiclePlate) return;

      try {
        const response = await axios.get(`/api/public/customer/by-plate?plate=${vehiclePlate}`);
        if (response.data.customer) {
          setCustomerInfo(response.data.customer);
          setWashStamps(
            response.data.loyalty?.wash_stamps ??
              response.data.customer.wash_stamps ??
              0
          );
          setBookingForm({
            name: response.data.customer.name || '',
            phone: response.data.customer.phone || '',
            vehicle_plate: vehiclePlate,
            notes: ''
          });
        }
      } catch (error) {
        console.log('Customer not found or error:', error.message);
      }
    };

    fetchCustomerInfo();
  }, [vehiclePlate]);

  const defaultTimeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'];

  // Fetch available time slots when date changes
  useEffect(() => {
    const fetchAvailableSlots = async () => {
      if (!vipBookingForm.appointment_date) {
        setAvailableTimeSlots(defaultTimeSlots);
        return;
      }

      try {
        const response = await axios.get(`/api/vip/bookings/available-slots/${vipBookingForm.appointment_date}`);
        const slots = response.data.available_slots;
        setAvailableTimeSlots(
          Array.isArray(slots) && slots.length > 0 ? slots : defaultTimeSlots
        );
      } catch (error) {
        console.log('Error fetching time slots:', error.message);
        setAvailableTimeSlots(defaultTimeSlots);
      }
    };

    fetchAvailableSlots();
  }, [vipBookingForm.appointment_date]);

  const submitBooking = async (service, form) => {
    try {
      // Extract price from service.price
      let servicePrice = 0;
      if (typeof service.price === 'number') {
        servicePrice = service.price;
      } else if (typeof service.price === 'string') {
        const priceMatch = service.price.match(/[\d,]+/);
        servicePrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;
      }

      // Create order with service details
      const orderData = {
        customer_id: customerInfo?.id || null,
        customer_name: form.name,
        customer_phone: form.phone,
        vehicle_plate: form.vehicle_plate || null,
        items: [], // Empty items array since we're booking a service, not a product
        total: servicePrice,
        source: 'customer_website_4x4',
        status: 'pending',
        payment_status: 'pending',
        notes: form.notes || `One-Tap Booking via Website - ${service.name}`
      };

      const response = await axios.post('/api/public/orders', orderData);
      const order = response.data.order;

      if (response.data.loyalty?.wash_stamps !== undefined) {
        setWashStamps(response.data.loyalty.wash_stamps);
      }

      const isFreeWash = response.data.loyalty?.free_wash_earned;

      if (isFreeWash) {
        toast.success('Service booked! You earned a FREE wash — enjoy your reward!', { duration: 5000 });
      } else if (response.data.loyalty) {
        toast.success(
          `Service booked! Loyalty progress: ${response.data.loyalty.wash_stamps}/5 washes.`
        );
      } else {
        toast.success('Service booked successfully! Redirecting to payment...');
      }
      setShowBookingModal(false);
      setSelectedService(null);
      setBookingForm({
        name: '',
        phone: '',
        vehicle_plate: '',
        notes: ''
      });

      if (!isFreeWash && order && order.id) {
        setTimeout(() => {
          navigate(`/payment?order_id=${order.id}&plate=${encodeURIComponent(form.vehicle_plate || '')}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to book service. Please try again.');
    }
  };

  const handleProductPurchaseClick = (product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
    setProductForm({
      name: customerInfo?.name || '',
      phone: customerInfo?.phone || '',
      vehicle_plate: vehiclePlate || customerInfo?.vehicle_plate || '',
      quantity: 1,
      notes: ''
    });
  };

  const submitProductPurchase = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    if (!productForm.name || !productForm.phone) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    try {
      const price = typeof selectedProduct.price === 'number'
        ? selectedProduct.price
        : parseFloat(String(selectedProduct.price).replace(/[^0-9.]/g, ''));

      const orderData = {
        customer_id: customerInfo?.id || null,
        customer_name: productForm.name,
        customer_phone: productForm.phone,
        vehicle_plate: productForm.vehicle_plate || null,
        items: [
          {
            product_id: selectedProduct.id || null,
            quantity: productForm.quantity,
            price: price
          }
        ],
        total: price * productForm.quantity,
        source: 'customer_website_4x4',
        status: 'pending',
        payment_status: 'pending',
        notes: productForm.notes || `Product Purchase via Website - ${selectedProduct.name} (Qty: ${productForm.quantity})`
      };

      const response = await axios.post('/api/public/orders', orderData);
      const order = response.data.order;

      toast.success('Product order created successfully! Redirecting to payment...');
      setShowProductModal(false);
      setSelectedProduct(null);

      if (order && order.id) {
        setTimeout(() => {
          navigate(`/payment?order_id=${order.id}&plate=${encodeURIComponent(productForm.vehicle_plate || '')}`);
        }, 1500);
      }
    } catch (error) {
      console.error('Product purchase error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order. Please try again.');
    }
  };

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

  const renderProductArt = (product) => {
    if (typeof product.art === 'function') {
      return product.art({ className: 'h-full w-full object-cover' });
    }
    
    const match = products.find(p => p.name.toLowerCase() === product.name.toLowerCase());
    if (match && typeof match.art === 'function') {
      return match.art({ className: 'h-full w-full object-cover' });
    }

    if (product.image_url) {
      return (
        <img
          src={resolveImageUrl(product.image_url)}
          alt={product.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://via.placeholder.com/320x220?text=Premium+Accessory';
          }}
        />
      );
    }

    return (
      <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full object-cover">
        <defs>
          <linearGradient id="prodGrad" x1="0" y1="0" x2="320" y2="220" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="50%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
        </defs>
        <rect width="320" height="220" rx="32" fill="url(#prodGrad)" />
        <circle cx="160" cy="110" r="45" fill="#1e293b" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 6" />
        <path d="M160 85v50M135 110h50" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  };

  const getProductBenefits = (product) => {
    if (Array.isArray(product.benefits)) return product.benefits;
    
    const match = products.find(p => p.name.toLowerCase() === product.name.toLowerCase());
    if (match && Array.isArray(match.benefits)) return match.benefits;

    return ['Premium Quality', 'Best in class', 'Satisfaction Guaranteed'];
  };

  const submitVIPBooking = async (e) => {
    e.preventDefault();

    if (!vipBookingForm.name || !vipBookingForm.phone || !vipBookingForm.vehicle_model || !vipBookingForm.service_type || !vipBookingForm.appointment_date || !vipBookingForm.appointment_time) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const response = await axios.post('/api/vip/bookings', {
        name: vipBookingForm.name,
        phone: vipBookingForm.phone,
        vehicle_model: vipBookingForm.vehicle_model,
        vehicle_type: vipBookingForm.vehicle_type,
        service_type: vipBookingForm.service_type,
        appointment_date: vipBookingForm.appointment_date,
        appointment_time: vipBookingForm.appointment_time,
        notes: vipBookingForm.notes
      });

      toast.success('VIP booking confirmed! Redirecting to payment...');
      setShowVIPModal(false);
      setVipStep(1);
      
      const orderId = response.data.orderId;
      const vehicleModel = vipBookingForm.vehicle_model;

      setVipBookingForm({
        name: '',
        phone: '',
        vehicle_model: '',
        vehicle_type: '4x4',
        service_type: '4x4 VIP Service',
        appointment_date: '',
        appointment_time: '',
        notes: ''
      });
      setAvailableTimeSlots([]);

      if (orderId) {
        setTimeout(() => {
          navigate(`/payment?order_id=${orderId}&plate=${encodeURIComponent(vehicleModel || '')}`);
        }, 1500);
      }
    } catch (error) {
      console.error('VIP Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to book VIP service. Please try again.');
    }
  };

  const handleVipNextStep = () => {
    if (vipStep === 1) {
      if (!vipBookingForm.name || !vipBookingForm.phone || !vipBookingForm.vehicle_model) {
        toast.error('Please fill in your name, phone and vehicle model');
        return;
      }
      setAvailableTimeSlots(['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00']);
      setVipStep(2);
    }
  };

  const handleVipPrevStep = () => {
    if (vipStep === 2) {
      setVipStep(1);
    }
  };

  const openVIPModal = () => {
    setVipStep(1);
    setVipBookingForm({
      name: customerInfo?.name || '',
      phone: customerInfo?.phone || '',
      vehicle_model: '',
      vehicle_type: '4x4',
      service_type: '4x4 VIP Service',
      appointment_date: '',
      appointment_time: '',
      notes: ''
    });
    setShowVIPModal(true);
  };

  const handleServiceClick = (service) => {
    // If we have customer info from the plate, do ONE-TAP BOOKING
    if (customerInfo) {
      const autoForm = {
        name: customerInfo.name || 'Existing Customer',
        phone: customerInfo.phone || '',
        vehicle_plate: vehiclePlate || customerInfo.vehicle_plate || '',
        notes: `Quick Book via Plate Link: ${vehiclePlate}`
      };

      // Show a loading toast for immediate feedback
      const loadingToast = toast.loading('Booking your service...');

      submitBooking(service, autoForm).finally(() => {
        toast.dismiss(loadingToast);
      });
      return;
    }

    // Otherwise, show the manual booking modal
    setSelectedService(service);
    setShowBookingModal(true);
    setBookingForm({
      name: '',
      phone: '',
      vehicle_plate: vehiclePlate || '',
      notes: ''
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService) return;

    if (!bookingForm.name || !bookingForm.phone) {
      toast.error('Please fill in your name and phone number');
      return;
    }

    await submitBooking(selectedService, bookingForm);
  };



  return (
    <div className="bg-white text-gray-900 overflow-hidden pb-24">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
        <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:py-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-800 hover:text-red-600 transition"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
          <a href="#top" className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center max-w-[55%] sm:max-w-none">
            {images.logo ? (
              <img src={images.logo} alt="Sniper Car Care" className="h-14 sm:h-16 w-auto object-contain" />
            ) : (
              <SniperBrandLogo variant="header" />
            )}
          </a>
          <div className="relative p-2 text-gray-800" aria-hidden="true">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-white" />
          </div>
        </nav>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
            <div className="flex flex-col gap-3 pt-3">
              <a href="#services" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-red-600">Services</a>
              <a href="#vip" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-red-600">VIP Premium</a>
              <a href="#products" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-red-600">Products</a>
              <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-red-600">Reviews</a>
              <button onClick={() => { setMobileMenuOpen(false); openVIPModal(); }} className="text-left text-sm font-semibold text-red-600">Register VIP</button>
            </div>
          </div>
        )}
      </header>

      {customerInfo && (
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Welcome back, <strong>{customerInfo.name}</strong>! Select a service below for instant booking.
          </div>
        </div>
      )}

      <section id="top" className="relative w-full max-w-6xl mx-auto px-2 sm:px-4 pt-2">
        <Reveal>
          <div className="relative overflow-hidden rounded-xl border border-gray-200 shadow-sm h-[100px] sm:h-[160px] w-full">
            <img src={images.hero} alt="Sniper Car Care" className="hero-photo absolute inset-0 h-full w-full object-cover" loading="eager" />
            <div className="relative z-10 flex h-[100px] sm:h-[160px] items-center justify-start p-0 h-full w-full">
              <div className="hero-text-panel flex flex-col justify-center w-full px-4 shrink-0">
                <SniperBrandLogo variant="hero" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="w-full px-2 sm:px-4 py-1 sm:py-2">
        <Reveal>
          <div className="w-full max-w-6xl mx-auto template-card border-red-100 bg-gradient-to-br from-white via-white to-red-50/40 px-2 py-2 sm:p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="shrink-0 flex items-center justify-center w-[50px]">
              <span className="text-[9px] font-black uppercase text-gray-500 text-center leading-tight">5 Washes<br/>Free</span>
            </div>
            <div className="flex-1 ml-2">
              <LoyaltyProgress washStamps={washStamps} />
            </div>
          </div>
        </Reveal>
      </section>

      <section id="services" className="w-full max-w-6xl mx-auto px-3 sm:px-4 pb-10">
        <Reveal>
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-sm sm:text-base font-black uppercase tracking-[0.2em] text-gray-900">— Choose Service —</p>
            <p className="mt-2 text-sm sm:text-base text-gray-600 font-medium">Select the service that suits your needs.</p>
          </div>
        </Reveal>
        <div className="grid grid-cols-5 gap-1.5 sm:gap-4 w-full px-1">
          {packages.map((pkg, idx) => (
            <Reveal key={pkg.name} delay={idx * 50} className="flex w-full min-w-0">
              <div className={`template-card flex flex-col w-full h-full rounded-lg overflow-hidden shadow-sm border border-gray-100 bg-white ${pkg.featured ? 'ring-1 ring-red-600' : ''}`}>
                <div className="p-1 sm:p-2 text-center shrink-0 bg-white h-[36px] sm:h-[48px] flex items-center justify-center">
                  <h3 className="text-[7px] sm:text-xs font-black uppercase tracking-tighter text-gray-900 leading-[1.1] break-words line-clamp-3">{pkg.name}</h3>
                </div>
                <div className="relative h-14 sm:h-24 bg-gray-900 overflow-visible shrink-0 border-y border-gray-100">
                  <img src={getServiceImage(pkg)} alt={pkg.name} className="service-card-photo h-full w-full object-cover object-center opacity-90" />
                  <div className="absolute -bottom-3 sm:-bottom-4 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-red-600 text-white text-[7px] sm:text-sm font-bold shadow-md ring-2 ring-white z-10">
                    {String(pkg.price).replace(' AED', '')}
                  </div>
                </div>
                <div className="px-1 pt-4 pb-2 sm:pt-6 sm:pb-3 flex flex-col flex-1 items-center text-center bg-white justify-between">
                  <p className="text-[6px] sm:text-[10px] text-gray-500 leading-[1.2] mb-1.5 sm:mb-2 line-clamp-3 w-full break-words">{pkg.description}</p>
                  <button
                    onClick={() => handleServiceClick(pkg)}
                    className="w-[90%] rounded bg-black py-1 sm:py-1.5 text-[6px] sm:text-[9px] font-bold uppercase tracking-widest text-white hover:bg-red-600 transition"
                  >
                    SELECT
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="vip" className="mx-auto max-w-6xl px-4 pb-10">
        <Reveal>
          <div
            role="button"
            tabIndex={0}
            onClick={openVIPModal}
            onKeyDown={(e) => e.key === 'Enter' && openVIPModal()}
            className="relative overflow-hidden rounded-2xl bg-black cursor-pointer group hover:ring-2 hover:ring-red-600 transition-shadow"
          >
            <div className="flex flex-row items-stretch">
              <div className="p-4 sm:p-6 relative z-10 flex flex-col justify-center w-[60%] sm:w-1/2 shrink-0">
                <div className="flex items-center gap-2 sm:gap-4">
                  <CrownIcon className="w-10 h-10 sm:w-16 sm:h-16 shrink-0 text-red-600 drop-shadow-[0_0_20px_rgba(220,38,38,0.5)]" />
                  <span className="text-2xl sm:text-4xl font-black uppercase text-red-600 vip-neon-text leading-none">
                    VIP
                  </span>
                </div>
                <p className="mt-1 sm:mt-2 text-[10px] sm:text-sm text-gray-300 font-medium tracking-wide">
                  Premium Car Care Service
                </p>
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  {vipHighlights.map((label) => (
                    <span key={label} className="flex items-center gap-1 text-[8px] sm:text-xs text-gray-300">
                      <span className="text-red-600">●</span> {label}
                    </span>
                  ))}
                </div>
                <span className="mt-3 sm:mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 sm:px-4 sm:py-2 text-[9px] sm:text-sm font-bold uppercase tracking-wide text-white group-hover:bg-red-700 transition w-max">
                  Discover VIP
                  <span>▸</span>
                </span>
              </div>
              <div className="relative flex-1">
                <img src={images.vip} alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-85" />
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 pb-10">
        <Reveal>
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-gray-400">— How It Works —</p>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
          <div className="hidden md:block absolute top-8 left-[12%] right-[12%] border-t border-dashed border-gray-300" aria-hidden="true" />
          {howItWorks.map((item, idx) => (
            <Reveal key={item.step} delay={idx * 80} className={`relative ${item.step === 1 && quickBookOpen ? 'z-50' : 'z-20'}`}>
              <div 
                className={`flex flex-col items-center text-center ${item.step === 1 || item.step === 3 ? 'cursor-pointer hover:scale-[1.02] transition-transform' : ''}`}
                onClick={() => {
                  if (item.step === 1) setQuickBookOpen(!quickBookOpen);
                  if (item.step === 3) openVIPModal();
                }}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white text-sm font-bold z-10 shadow-md">{item.step}</div>
                <div className="mt-3 text-2xl">{item.icon}</div>
                <h3 className="mt-2 text-xs sm:text-sm font-black uppercase text-gray-900">{item.title}</h3>
                <p className="mt-1 text-[10px] sm:text-xs text-gray-500 leading-relaxed">{item.description}</p>
                
                {item.step === 1 && quickBookOpen && (
                  <div className="hidden sm:flex absolute top-full left-1/2 -translate-x-1/2 mt-4 w-[250px] max-w-[250px] p-4 bg-white rounded-xl border border-gray-200 shadow-2xl flex-col gap-3 z-50 before:content-[''] before:absolute before:-top-2 before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-white" onClick={(e) => e.stopPropagation()}>
                    <select className="w-full p-2.5 text-xs text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" value={quickBookForm.service} onChange={e => setQuickBookForm({...quickBookForm, service: e.target.value})}>
                      <option value="">Select Service</option>
                      {packages.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                    <input type="date" className="w-full p-2.5 text-xs text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" value={quickBookForm.date} onChange={e => setQuickBookForm({...quickBookForm, date: e.target.value})} min={new Date().toISOString().split('T')[0]} />
                    <select className="w-full p-2.5 text-xs text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" value={quickBookForm.time} onChange={e => setQuickBookForm({...quickBookForm, time: e.target.value})}>
                      <option value="">Select Time</option>
                      {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <button 
                      className="w-full mt-1 bg-red-600 text-white text-xs font-bold py-3 rounded-lg hover:bg-red-700 shadow-md transition-colors"
                      onClick={() => {
                        if (!quickBookForm.service) return toast.error('Select a service');
                        const svc = packages.find(p => p.name === quickBookForm.service);
                        setSelectedService(svc);
                        
                        let initialNotes = '';
                        if (quickBookForm.date || quickBookForm.time) {
                          initialNotes = `Preferred Appointment: ${quickBookForm.date || 'Any Date'} at ${quickBookForm.time || 'Any Time'}\n`;
                        }
                        setBookingForm(prev => ({ ...prev, notes: initialNotes }));
                        setShowBookingModal(true);
                        setQuickBookOpen(false);
                      }}
                    >
                      Book Now
                    </button>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {trustFeatures.map((item, idx) => (
            <Reveal key={item.title} delay={idx * 60} className={idx === 2 ? 'col-span-2 sm:col-span-1 mx-auto sm:mx-0 max-w-[50%]' : ''}>
              <div 
                className={`flex flex-col items-center text-center p-3 ${item.title === 'CUSTOMER SUPPORT' ? 'cursor-pointer hover:bg-gray-50 rounded-xl transition' : ''}`}
                onClick={() => {
                  if (item.title === 'CUSTOMER SUPPORT') setShowSupportOptions(!showSupportOptions);
                }}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-600 text-lg">{item.icon}</div>
                <p className="mt-2 text-[10px] sm:text-xs font-black uppercase text-gray-900">{item.title}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-500">{item.subtitle}</p>
                
                {item.title === 'CUSTOMER SUPPORT' && showSupportOptions && (
                  <div className="mt-3 flex gap-2 w-full justify-center" onClick={(e) => e.stopPropagation()}>
                    <a href="tel:+971555371811" className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-4 py-2 rounded-lg font-bold shadow-sm transition">Call</a>
                    <a href="https://wa.me/971555371811" target="_blank" rel="noreferrer" className="bg-green-500 hover:bg-green-600 text-white text-[10px] px-4 py-2 rounded-lg font-bold shadow-sm transition">WhatsApp</a>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-4 pb-10 bg-gray-50 py-10 -mx-0">
        <Reveal>
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-gray-400">— Car Care Products —</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-gray-900">Premium Products</h2>
            <p className="mt-2 text-sm text-gray-500">Professional-grade car care products available for purchase.</p>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(dbProducts.length > 0 ? dbProducts : products).map((product, index) => (
            <Reveal key={product.name} delay={index * 100}>
              <div className="template-card overflow-hidden flex flex-col h-full">
                <div className="relative h-40 bg-gray-100">
                  {renderProductArt(product)}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-red-600 font-bold">
                    <span>Sniper</span>
                    <span>{typeof product.price === 'number' ? `${product.price} AED` : product.price}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{product.name}</h3>
                  <p className="mt-1 text-xs text-gray-600">{product.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-gray-500">
                    {getProductBenefits(product).map((benefit) => (
                      <li key={benefit} className="flex gap-2"><span className="text-red-600">•</span>{benefit}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleProductPurchaseClick(product)}
                    className="w-full mt-5 inline-flex items-center justify-center rounded-lg border-2 border-gray-900 py-3 text-xs sm:text-sm font-bold uppercase text-gray-900 hover:bg-gray-900 hover:text-white transition active:scale-[0.98]"
                  >
                    Purchase
                  </button>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-6xl px-4 pb-10">
        <Reveal>
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-gray-400">— Loved By Locals —</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-gray-900">5-star mobile detailing. Every visit.</h2>
          </div>
        </Reveal>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 100}>
              <div className="template-card p-6 h-full">
                <div className="text-amber-500 text-sm mb-3">{'★'.repeat(testimonial.rating)}</div>
                <p className="text-sm text-gray-600 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="mt-4 text-sm font-bold text-gray-900">{testimonial.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-gray-400">{testimonial.location}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-200 bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 px-4 text-xs text-gray-500 md:flex-row">
          <p>© {new Date().getFullYear()} Sniper Car Care. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#services" className="hover:text-red-600 transition">Services</a>
            <a href="#reviews" className="hover:text-red-600 transition">Reviews</a>
            <a href="#products" className="hover:text-red-600 transition">Products</a>
          </div>
        </div>
      </footer>

      <BottomNav />

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => {
                setShowBookingModal(false);
                setSelectedService(null);
              }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-900 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Book {selectedService.name}</h3>
            <p className="text-lg text-red-600 font-semibold mb-6">{selectedService.price}</p>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="03001234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Plate</label>
                <input
                  type="text"
                  value={bookingForm.vehicle_plate}
                  onChange={(e) => setBookingForm({ ...bookingForm, vehicle_plate: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ABC-123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests (Optional)</label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="Any special instructions or preferences..."
                />
              </div>
              <button
                type="submit"
                className="w-full mt-6 inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}

      {/* VIP Booking Modal - Step 1: Basic Info */}
      {showVIPModal && vipStep === 1 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-red-200 p-6 sm:p-8 shadow-2xl my-8">
            <button
              onClick={() => { setShowVIPModal(false); setVipStep(1); }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-900 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">1</span>
                <span className="text-xs text-gray-500">Details</span>
              </div>
              <div className="h-px w-8 bg-gray-300" />
              <div className="flex items-center gap-2 opacity-50">
                <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-xs text-gray-400">Schedule</span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">VIP Service Booking</h3>
            <p className="text-gray-600 mb-6">Enter your details to get started</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                <input
                  type="text"
                  required
                  value={vipBookingForm.name}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telephone Number *</label>
                <input
                  type="tel"
                  required
                  value={vipBookingForm.phone}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="971501234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
                <input
                  type="text"
                  required
                  value={vipBookingForm.vehicle_model}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, vehicle_model: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="e.g., BMW 7 Series, Mercedes S-Class"
                />
              </div>
              <button
                onClick={handleVipNextStep}
                className="w-full mt-6 inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Book Appointment →
              </button>
            </div>
          </div>
        </div>
      )}

      {showVIPModal && vipStep === 2 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-red-200 p-6 sm:p-8 shadow-2xl my-8">
            <button
              onClick={() => { setShowVIPModal(false); setVipStep(1); }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-900 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-2 opacity-50">
                <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">✓</span>
                <span className="text-xs text-gray-400">Details</span>
              </div>
              <div className="h-px w-8 bg-gray-300" />
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold">2</span>
                <span className="text-xs text-gray-500">Schedule</span>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Schedule Your Appointment</h3>
            <p className="text-gray-600 mb-6">Choose your service, date and time</p>

            <form onSubmit={submitVIPBooking} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Selected Service</label>
                <div className="w-full px-4 py-3 rounded-lg bg-gray-100 border border-gray-200 text-gray-900 font-semibold flex justify-between items-center">
                  <span>4x4 VIP Service</span>
                  <span className="text-red-600">90 AED</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date *</label>
                <input
                  type="date"
                  required
                  value={vipBookingForm.appointment_date}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, appointment_date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Time *</label>
                <select
                  required
                  value={vipBookingForm.appointment_time}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, appointment_time: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Select a time...</option>
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))
                  ) : (
                    <option disabled>No slots available - select another date</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note (Optional)</label>
                <textarea
                  value={vipBookingForm.notes}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="Any additional information..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleVipPrevStep}
                  className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Confirm VIP Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Book Mobile Modal */}
      {quickBookOpen && (
        <div className="fixed inset-0 z-[100] flex sm:hidden items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setQuickBookOpen(false)}>
          <div className="relative w-full max-w-sm rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <span className="font-bold text-gray-900 text-xl">Quick Book</span>
              <button onClick={() => setQuickBookOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 bg-gray-100 rounded-full transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Service Type</label>
                <select className="w-full p-3.5 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" value={quickBookForm.service} onChange={e => setQuickBookForm({...quickBookForm, service: e.target.value})}>
                  <option value="">Select Service</option>
                  {packages.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                <input type="date" className="w-full p-3.5 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" value={quickBookForm.date} onChange={e => setQuickBookForm({...quickBookForm, date: e.target.value})} min={new Date().toISOString().split('T')[0]} />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Time</label>
                <select className="w-full p-3.5 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" value={quickBookForm.time} onChange={e => setQuickBookForm({...quickBookForm, time: e.target.value})}>
                  <option value="">Select Time</option>
                  {['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <button 
                className="w-full mt-2 bg-red-600 text-white text-base font-bold py-4 rounded-xl hover:bg-red-700 shadow-lg shadow-red-600/30 transition-all active:scale-[0.98]"
                onClick={() => {
                  if (!quickBookForm.service) return toast.error('Select a service');
                  const svc = packages.find(p => p.name === quickBookForm.service);
                  setSelectedService(svc);
                  
                  let initialNotes = '';
                  if (quickBookForm.date || quickBookForm.time) {
                    initialNotes = `Preferred Appointment: ${quickBookForm.date || 'Any Date'} at ${quickBookForm.time || 'Any Time'}\n`;
                  }
                  setBookingForm(prev => ({ ...prev, notes: initialNotes }));
                  setShowBookingModal(true);
                  setQuickBookOpen(false);
                }}
              >
                Continue Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Purchase Modal */}
      {showProductModal && selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => {
                setShowProductModal(false);
                setSelectedProduct(null);
              }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-900 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-bold text-gray-900 mb-2">Purchase {selectedProduct.name}</h3>
            <p className="text-lg text-red-600 font-semibold mb-6">
              {typeof selectedProduct.price === 'number' ? `${selectedProduct.price} AED` : selectedProduct.price}
            </p>

            <form onSubmit={submitProductPurchase} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={productForm.phone}
                  onChange={(e) => setProductForm({ ...productForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="03001234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Plate (Optional)</label>
                <input
                  type="text"
                  value={productForm.vehicle_plate}
                  onChange={(e) => setProductForm({ ...productForm, vehicle_plate: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="ABC-123"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setProductForm(prev => ({ ...prev, quantity: Math.max(1, prev.quantity - 1) }))}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg text-gray-700 transition"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-bold text-lg text-gray-900">{productForm.quantity}</span>
                  <button
                    type="button"
                    onClick={() => setProductForm(prev => ({ ...prev, quantity: Math.min(selectedProduct.stock || 99, prev.quantity + 1) }))}
                    className="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-lg text-gray-700 transition"
                  >
                    +
                  </button>
                  {selectedProduct.stock !== undefined && (
                    <span className="text-xs text-gray-500 font-medium">({selectedProduct.stock} in stock)</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Special Notes (Optional)</label>
                <textarea
                  value={productForm.notes}
                  onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="Any special instructions or preferences..."
                />
              </div>
              <button
                type="submit"
                className="w-full mt-6 inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Confirm Purchase - {(parseFloat(typeof selectedProduct.price === 'number' ? selectedProduct.price : String(selectedProduct.price).replace(/[^0-9.]/g, '')) * productForm.quantity).toLocaleString()} AED
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;


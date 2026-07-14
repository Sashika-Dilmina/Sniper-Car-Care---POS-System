import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { images, getServiceImage } from '../config/siteImages';
import BottomNav from '../components/BottomNav';
import VehiclePlatePreview from '../components/VehiclePlatePreview';
import SearchableSelect from '../components/SearchableSelect';
import stamp1 from '../assets/loyalty/stamp-1.png';
import stamp2 from '../assets/loyalty/stamp-2.png';
import stamp3 from '../assets/loyalty/stamp-3.png';
import stamp4 from '../assets/loyalty/stamp-4.png';
import stamp5 from '../assets/loyalty/stamp-5.png';
import freeStamp from '../assets/loyalty/free-stamp.png';

const stamps = [stamp1, stamp2, stamp3, stamp4, stamp5];

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
                className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full overflow-hidden transition-all duration-300 ${
                  isFilled
                    ? 'shadow-md ring-2 ring-red-500 scale-110'
                    : 'border border-gray-300'
                }`}
              >
                <img 
                  src={isFilled ? stamp1 : stamp4} 
                  alt={`Stamp ${n}`} 
                  className="w-full h-full object-contain transition-all duration-300" 
                />
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 mt-1.5">{n}</span>
            </div>
          );
        })}
        <div className="flex flex-col items-center">
          <div
            className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full transition-all duration-300 ${
              freeReady
                ? 'shadow-md ring-2 ring-red-500 scale-110 animate-pulse'
                : 'border border-gray-300'
            }`}
          >
            <img 
              src={freeStamp} 
              alt="Free Wash" 
              className="w-full h-full object-contain p-0.5 rounded-full transition-all duration-300" 
              style={{ filter: freeReady ? 'none' : 'grayscale(100%) opacity(0.35)' }}
            />
          </div>
          <span className="text-[10px] sm:text-xs font-bold text-red-600 mt-1.5 uppercase tracking-wide">Free</span>
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
    name: 'Maria L.',
    location: 'SoHo, NYC',
    quote: 'Sniper Saloon Care revived my S-Class between client pickups. Leather felt new and the finish still beads weeks later!',
    rating: 5,
  },
  {
    name: 'James R.',
    location: 'Brooklyn, NYC',
    quote: 'Booked between meetings and they treated my A8L like a concours entry. Piano black trim is flawless.',
    rating: 5,
  },
  {
    name: 'Chloe P.',
    location: 'Upper East Side, NYC',
    quote: 'The concierge full service is worth every dirham. The team is efficient, discreet, and meticulous with every surface.',
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
  const vehiclePlate = searchParams.get('plate') || '';
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showVIPModal, setShowVIPModal] = useState(false);
  const [vipStep, setVipStep] = useState(1);
  const [selectedService, setSelectedService] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [showFreeWashPopup, setShowFreeWashPopup] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '+9715',
    vehicle_type: 'Saloon',
    emirate: '',
    plate_code: '',
    plate_number: '',
    notes: ''
  });
  const [plateCodes, setPlateCodes] = useState([]);
  const [vipPlateCodes, setVipPlateCodes] = useState([]);
  const [vipBookingForm, setVipBookingForm] = useState({
    name: '',
    phone: '+9715',
    emirate: '',
    plate_code: '',
    plate_number: '',
    vehicle_type: 'Saloon',
    service_type: 'Saloon VIP Service',
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
    phone: '+9715',
    vehicle_plate: '',
    quantity: 1,
    notes: ''
  });

  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    if (!vehiclePlate) return;
    try {
      const response = await axios.get(`/api/public/customer/notifications?plate=${encodeURIComponent(vehiclePlate)}`);
      if (response.data.success) {
        setNotifications(response.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleMarkNotificationsAsRead = async () => {
    if (!vehiclePlate) return;
    try {
      await axios.post('/api/public/customer/notifications/mark-read', { plate: vehiclePlate });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  useEffect(() => {
    if (!vehiclePlate) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [vehiclePlate]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await axios.get('/api/public/products?category=Services&vehicle_type=Saloon');
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
            phone: response.data.customer.phone || '+9715',
            vehicle_type: response.data.customer.vehicle_type || 'Saloon',
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

  // Fetch plate codes dynamically based on selected Emirate
  useEffect(() => {
    const fetchPlateCodes = async () => {
      try {
        const response = await axios.get(`/api/public/plate-codes/${bookingForm.emirate}`);
        const codes = response.data.codes || [];
        setPlateCodes(codes);
        
        // If the current plate code is NOT in the new codes list, select the first one
        if (bookingForm.emirate && !codes.includes(bookingForm.plate_code)) {
          setBookingForm(prev => ({
            ...prev,
            plate_code: codes.length > 0 ? codes[0] : ''
          }));
        }
      } catch (error) {
        console.error('Failed to load plate codes:', error);
      }
    };
    
    if (bookingForm.emirate) {
      fetchPlateCodes();
    } else {
      setPlateCodes([]);
    }
  }, [bookingForm.emirate]);

  // Parse vehiclePlate if present in URL
  useEffect(() => {
    if (vehiclePlate) {
      const parts = vehiclePlate.trim().split(/\s+/);
      let plateCode = '';
      let emirate = 'Dubai';
      let plateNumber = vehiclePlate;
      
      if (parts.length >= 3) {
        plateCode = parts[0];
        plateNumber = parts[parts.length - 1];
        emirate = parts.slice(1, parts.length - 1).join(' ');
      }
      
      setBookingForm(prev => ({
        ...prev,
        emirate,
        plate_code: plateCode,
        plate_number: plateNumber
      }));

      setVipBookingForm(prev => ({
        ...prev,
        emirate,
        plate_code: plateCode,
        plate_number: plateNumber
      }));
    }
  }, [vehiclePlate]);

  // Fetch plate codes dynamically based on selected Emirate for VIP
  useEffect(() => {
    const fetchVipPlateCodes = async () => {
      try {
        const response = await axios.get(`/api/public/plate-codes/${vipBookingForm.emirate}`);
        const codes = response.data.codes || [];
        setVipPlateCodes(codes);
        
        // If the current plate code is NOT in the new codes list, select the first one
        if (vipBookingForm.emirate && !codes.includes(vipBookingForm.plate_code)) {
          setVipBookingForm(prev => ({
            ...prev,
            plate_code: codes.length > 0 ? codes[0] : ''
          }));
        }
      } catch (error) {
        console.error('Failed to load VIP plate codes:', error);
      }
    };
    
    if (vipBookingForm.emirate) {
      fetchVipPlateCodes();
    } else {
      setVipPlateCodes([]);
    }
  }, [vipBookingForm.emirate]);

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

      // Check if eligible for a Free Wash
      const isEligibleForFreeWash = washStamps >= 5;

      if (isEligibleForFreeWash) {
        // If it is a free wash, we create the order immediately (no payment needed)
        const orderData = {
          customer_id: customerInfo?.id || null,
          customer_name: form.name,
          customer_phone: form.phone,
          vehicle_plate: form.vehicle_plate || null,
          vehicle_type: form.vehicle_type,
          items: [], 
          total: servicePrice,
          source: 'customer_website_saloon',
          status: 'pending',
          payment_status: 'paid', // Immediately paid
          notes: form.notes || `One-Tap Booking via Website - ${service.name}`
        };

        const response = await axios.post('/api/public/orders', orderData);
        const order = response.data.order;

        if (form.vehicle_plate) {
          setSearchParams({ plate: form.vehicle_plate });
        }

        if (response.data.loyalty?.wash_stamps !== undefined) {
          setWashStamps(response.data.loyalty.wash_stamps);
        }

        toast.success('Service booked! You earned a FREE wash — enjoy your reward!', { duration: 5000 });
        setShowFreeWashPopup(true);
        
        setShowBookingModal(false);
        setSelectedService(null);
        setBookingForm({
          name: '',
          phone: '+9715',
          vehicle_type: 'Saloon',
          emirate: '',
          plate_code: '',
          plate_number: '',
          notes: ''
        });
      } else {
        // Paid booking: Defer order creation until payment method selection!
        const tempBooking = {
          customer_id: customerInfo?.id || null,
          customer_name: form.name,
          customer_phone: form.phone,
          vehicle_plate: form.vehicle_plate || null,
          vehicle_type: form.vehicle_type,
          service_id: service.id,
          service_name: service.name,
          total: servicePrice,
          source: 'customer_website_saloon',
          notes: form.notes || `One-Tap Booking via Website - ${service.name}`
        };

        sessionStorage.setItem('temp_booking', JSON.stringify(tempBooking));
        sessionStorage.removeItem('current_order_id');

        toast.success('Redirecting to payment...');
        setShowBookingModal(false);
        setSelectedService(null);
        setBookingForm({
          name: '',
          phone: '+9715',
          vehicle_type: 'Saloon',
          emirate: '',
          plate_code: '',
          plate_number: '',
          notes: ''
        });

        setTimeout(() => {
          navigate(`/payment?plate=${encodeURIComponent(form.vehicle_plate || '')}`);
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
      phone: customerInfo?.phone || '+9715',
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
        source: 'customer_website_saloon',
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
    
    let cleanUrl = url;
    if (cleanUrl.includes('/uploads/')) {
      cleanUrl = '/uploads/' + cleanUrl.split('/uploads/')[1];
    }
    if (cleanUrl.startsWith('http') && !cleanUrl.includes('/uploads/')) return cleanUrl;

    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const apiBaseUrl = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : (import.meta.env.PROD ? '' : `http://${hostname}:5000`);
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

    const isRegistered = !!customerInfo;
    const isNoVehicle = vipBookingForm.emirate === 'Garage' || vipBookingForm.emirate === 'Sniper car care';
    const requiredFields = isRegistered
      ? (vipBookingForm.name && vipBookingForm.phone && vipBookingForm.service_type)
      : (vipBookingForm.name && vipBookingForm.phone && vipBookingForm.emirate && (isNoVehicle || vipBookingForm.plate_number) && vipBookingForm.service_type);

    if (!requiredFields) {
      toast.error('Please fill all required fields');
      return;
    }

    const cleanPhone = vipBookingForm.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      toast.error('Phone number must contain between 9 and 15 digits');
      return;
    }

    const plateStr = isRegistered
      ? (vehiclePlate || customerInfo.vehicle_plate || '')
      : (isNoVehicle ? `${vipBookingForm.emirate} - ${cleanPhone}` : `${vipBookingForm.plate_code} ${vipBookingForm.emirate} ${vipBookingForm.plate_number}`);

    try {
      await axios.post('/api/vip/bookings', {
        name: vipBookingForm.name,
        phone: cleanPhone,
        vehicle_model: plateStr,
        vehicle_type: vipBookingForm.vehicle_type,
        service_type: vipBookingForm.service_type,
        notes: vipBookingForm.notes
      });

      if (plateStr) {
        setSearchParams({ plate: plateStr });
      }

      toast.success('VIP booking request submitted! We will contact you soon with confirmation details.', { duration: 5000 });
      setShowVIPModal(false);
      setVipStep(1);

      setVipBookingForm({
        name: '',
        phone: '+9715',
        emirate: '',
        plate_code: '',
        plate_number: '',
        vehicle_type: 'Saloon',
        service_type: 'Saloon VIP Service',
        appointment_date: '',
        appointment_time: '',
        notes: ''
      });
      setAvailableTimeSlots([]);
    } catch (error) {
      console.error('VIP Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to book VIP service. Please try again.');
    }
  };

  const openVIPModal = () => {
    setVipStep(1);
    
    const parts = (vehiclePlate || '').trim().split(/\s+/);
    let plateCode = '';
    let emirate = '';
    let plateNumber = '';
    
    if (parts.length >= 3) {
      plateCode = parts[0];
      plateNumber = parts[parts.length - 1];
      emirate = parts.slice(1, parts.length - 1).join(' ');
    } else if (vehiclePlate) {
      plateNumber = vehiclePlate;
    }

    setVipBookingForm({
      name: customerInfo?.name || '',
      phone: customerInfo?.phone || '+9715',
      emirate: emirate,
      plate_code: plateCode,
      plate_number: plateNumber,
      vehicle_type: customerInfo?.vehicle_type || (location.pathname.includes('4x4') ? '4x4' : 'Saloon'),
      service_type: location.pathname.includes('4x4') ? '4x4 VIP Service' : 'Saloon VIP Service',
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

    const parts = (vehiclePlate || '').trim().split(/\s+/);
    let plateCode = '';
    let emirate = '';
    let plateNumber = '';
    
    if (parts.length >= 3) {
      plateCode = parts[0];
      plateNumber = parts[parts.length - 1];
      emirate = parts.slice(1, parts.length - 1).join(' ');
    } else if (vehiclePlate) {
      plateNumber = vehiclePlate;
    }

    setBookingForm({
      name: '',
      phone: '+9715',
      emirate: emirate,
      plate_code: plateCode,
      plate_number: plateNumber,
      notes: ''
    });
  };

  const handleBookingSubmit = async (e) => {
    e.preventDefault();

    if (!selectedService) return;

    const isNoVehicle = bookingForm.emirate === 'Garage' || bookingForm.emirate === 'Sniper car care';
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.emirate || (!isNoVehicle && !bookingForm.plate_number)) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Phone validation: numbers only, 9-15 digits
    const cleanPhone = bookingForm.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      toast.error('Phone number must contain between 9 and 15 digits');
      return;
    }

    const plateStr = isNoVehicle 
      ? `${bookingForm.emirate} - ${cleanPhone}`
      : `${bookingForm.plate_code} ${bookingForm.emirate} ${bookingForm.plate_number}`;

    await submitBooking(selectedService, {
      ...bookingForm,
      phone: cleanPhone,
      vehicle_plate: plateStr
    });
  };



  const sortedPackages = [...packages].sort((a, b) => {
    const getOrder = (name) => {
      const n = name.toLowerCase();
      if (n.includes('full body') || n.includes('full service') || n.includes('full wash')) return 1;
      if (n.includes('double soap')) return 2;
      if (n.includes('ceramic')) return 3;
      if (n.includes('body wash') || n.includes('exterior wash')) return 4;
      if (n.includes('just water') || n.includes('water wash') || n.includes('quick wash')) return 5;
      return 100;
    };
    return getOrder(a.name) - getOrder(b.name);
  });

  const displayPackages = sortedPackages.filter(pkg => !pkg.name.toLowerCase().includes('vip'));

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
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                navigate(`/notifications?plate=${encodeURIComponent(vehiclePlate)}`);
              }}
              className="relative p-2 text-gray-800 hover:text-red-600 transition outline-none"
              aria-label="View notifications"
              disabled={!vehiclePlate}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {vehiclePlate && unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-white">
                  {unreadCount}
                </span>
              )}
            </button>
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
        <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-2xl mx-auto w-full px-1">
          {displayPackages.map((pkg, idx) => {
            const isFullBody = pkg.name.toLowerCase().includes('full body') || pkg.name.toLowerCase().includes('full service') || pkg.name.toLowerCase().includes('full wash');
            return (
              <Reveal 
                key={pkg.id || pkg.name} 
                delay={idx * 50} 
                className={`flex w-full min-w-0 ${isFullBody ? 'col-span-2 justify-center' : 'col-span-1'}`}
              >
                <div 
                  role="button"
                  onClick={() => handleServiceClick(pkg)}
                  className={`group relative flex flex-col rounded-xl overflow-hidden shadow-sm border border-gray-150 bg-white cursor-pointer hover:shadow-md hover:ring-2 hover:ring-red-600 transition-all duration-300 ${isFullBody ? 'w-full aspect-[1.5/1]' : 'w-full aspect-square'}`}
                >
                  <img 
                    src={getServiceImage(pkg)} 
                    alt={pkg.name} 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="vip" className="mx-auto max-w-6xl px-4 pb-10">
        <Reveal>
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const vipPkg = packages.find(p => p.name.toLowerCase().includes('vip'));
              if (vipPkg) {
                handleServiceClick(vipPkg);
              } else {
                openVIPModal();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const vipPkg = packages.find(p => p.name.toLowerCase().includes('vip'));
                if (vipPkg) handleServiceClick(vipPkg);
                else openVIPModal();
              }
            }}
            className="group relative w-full rounded-2xl overflow-hidden shadow-sm border border-gray-150 bg-white cursor-pointer hover:shadow-md hover:ring-2 hover:ring-red-600 transition-all duration-300"
          >
            <img 
              src={images.vip} 
              alt="VIP Service" 
              className="w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-500 ease-out" 
            />
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        </Reveal>
      </section>

      <section id="products" className="mx-auto max-w-6xl px-4 pb-10 bg-gray-50 py-10 -mx-0">
        <Reveal>
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-gray-400">— Car Care Products —</p>
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-gray-900">Premium Products</h2>
            <p className="mt-2 text-sm text-gray-500">Professional-grade car care products available for purchase.</p>
          </div>
        </Reveal>

        {(() => {
          const allProducts = dbProducts.length > 0 ? dbProducts : products;
          const freshnerProducts = allProducts.filter(p =>
            p.category === 'Car Freshner' || p.category === 'car freshner' || p.category === 'Car Freshener'
          );
          const acceProducts = allProducts.filter(p =>
            p.category === 'Acce' || p.category === 'Accessories' || p.category === 'accessories' || p.category === 'acce'
          );

          const CategoryBox = ({ title, icon, products: catProducts, colorClass }) => {
            const [open, setOpen] = useState(false);
            return (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpen(!open)}
                  className="w-full flex items-center gap-4 p-5 sm:p-6 hover:bg-gray-50 transition-colors group"
                >
                  <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${colorClass} text-white text-2xl shadow-md flex-shrink-0`}>
                    {icon}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-wide">{title}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{catProducts.length} product{catProducts.length !== 1 ? 's' : ''} available</p>
                  </div>
                  <span className={`text-gray-400 text-xl transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>▾</span>
                </button>

                {open && (
                  <div className="border-t border-gray-100 px-5 pb-6 pt-4">
                    {catProducts.length > 0 ? (
                      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {catProducts.map((product) => (
                          <div key={product.name} className="template-card overflow-hidden flex flex-col h-full">
                            <div className="relative h-36 bg-gray-100">
                              {renderProductArt(product)}
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                              <div className="flex justify-between text-[10px] uppercase tracking-widest text-red-600 font-bold">
                                <span>Sniper</span>
                                <span>{typeof product.price === 'number' ? `${product.price} AED` : product.price}</span>
                              </div>
                              <h4 className="mt-2 text-sm font-bold text-gray-900">{product.name}</h4>
                              <p className="mt-1 text-xs text-gray-500">{product.description}</p>
                              <button
                                onClick={() => handleProductPurchaseClick(product)}
                                className="w-full mt-4 inline-flex items-center justify-center rounded-lg border-2 border-gray-900 py-2.5 text-xs font-bold uppercase text-gray-900 hover:bg-gray-900 hover:text-white transition active:scale-[0.98]"
                              >
                                Purchase
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 text-center py-4">No products available in this category yet.</p>
                    )}
                  </div>
                )}
              </div>
            );
          };

          return (
            <div className="grid gap-5 sm:grid-cols-2">
              <Reveal>
                <CategoryBox
                  title="Car Freshner"
                  icon="🌸"
                  products={freshnerProducts}
                  colorClass="bg-red-600"
                />
              </Reveal>
              <Reveal delay={100}>
                <CategoryBox
                  title="Acce"
                  icon="🛠️"
                  products={acceProducts}
                  colorClass="bg-red-600"
                />
              </Reveal>
            </div>
          );
        })()}
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

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 pb-10">
        <Reveal>
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-gray-400">— How It Works —</p>
          </div>
        </Reveal>

        {/* Customer Support row (Trust Features) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
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

        {/* 1-4 Steps row */}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-gray-200 p-5 sm:p-7 shadow-2xl max-h-[95vh] flex flex-col">
            <button
              onClick={() => {
                setShowBookingModal(false);
                setSelectedService(null);
              }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-900 transition z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="shrink-0 mb-2">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">Book {selectedService.name}</h3>
              <p className="text-lg text-red-600 font-semibold">{selectedService.price}</p>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-4">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Model *</label>
                <select
                  value={bookingForm.vehicle_type}
                  onChange={(e) => setBookingForm({ ...bookingForm, vehicle_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  <option value="Saloon">Saloon</option>
                  <option value="4x4">4x4</option>
                </select>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-md font-bold text-gray-800 mb-3">Vehicle Registration</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Emirate Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Emirate *</label>
                    <select
                      value={bookingForm.emirate}
                      onChange={(e) => setBookingForm({ ...bookingForm, emirate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
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

                  {/* Plate Code Dropdown */}
                  {!(bookingForm.emirate === 'Garage' || bookingForm.emirate === 'Sniper car care') && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">Plate Code *</label>
                      <SearchableSelect
                        options={plateCodes}
                        value={bookingForm.plate_code}
                        onChange={(val) => setBookingForm(prev => ({ ...prev, plate_code: val }))}
                        disabled={plateCodes.length === 0}
                      />
                    </div>
                  )}
                </div>

                {/* Plate Number Input */}
                {!(bookingForm.emirate === 'Garage' || bookingForm.emirate === 'Sniper car care') && (
                  <div className="mt-3">
                    <label className="block text-xs font-bold text-gray-600 mb-1">Plate Number *</label>
                    <input
                      type="text"
                      required={!(bookingForm.emirate === 'Garage' || bookingForm.emirate === 'Sniper car care')}
                      value={bookingForm.plate_number}
                      onChange={(e) => setBookingForm({ ...bookingForm, plate_number: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                      className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm bg-white"
                      placeholder="12345"
                    />
                  </div>
                )}
              </div>

              {/* Plate Live Preview */}
              {!(bookingForm.emirate === 'Garage' || bookingForm.emirate === 'Sniper car care') && (
                <VehiclePlatePreview 
                  emirate={bookingForm.emirate}
                  plateCode={bookingForm.plate_code}
                  plateNumber={bookingForm.plate_number}
                />
              )}
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

      {/* VIP Booking Modal */}
      {showVIPModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-4">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-red-200 p-5 sm:p-7 shadow-2xl max-h-[95vh] flex flex-col">
            <button
              onClick={() => { setShowVIPModal(false); setVipStep(1); }}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-900 transition z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="shrink-0 mb-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">VIP Service Booking</h3>
              <p className="text-sm text-gray-600 font-medium">Register and request your premium car care service.</p>
            </div>

            <form onSubmit={submitVIPBooking} className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-4 py-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Telephone Number *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                <select
                  required
                  value={vipBookingForm.vehicle_type}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, vehicle_type: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                >
                  <option value="Saloon">Saloon</option>
                  <option value="4x4">4x4</option>
                </select>
              </div>

              {!customerInfo && (
                <>
                  <div className="border-t pt-3">
                    <h4 className="text-sm font-bold text-gray-800 mb-2">Vehicle Registration</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {/* Emirate Dropdown */}
                      <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Emirate *</label>
                        <select
                          value={vipBookingForm.emirate}
                          onChange={(e) => setVipBookingForm({ ...vipBookingForm, emirate: e.target.value })}
                          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none text-sm bg-white"
                          required={!customerInfo}
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

                      {/* Plate Code Dropdown */}
                      {!(vipBookingForm.emirate === 'Garage' || vipBookingForm.emirate === 'Sniper car care') && (
                        <div>
                          <label className="block text-xs font-bold text-gray-600 mb-1">Plate Code *</label>
                          <SearchableSelect
                            options={vipPlateCodes}
                            value={vipBookingForm.plate_code}
                            onChange={(val) => setVipBookingForm(prev => ({ ...prev, plate_code: val }))}
                            disabled={vipPlateCodes.length === 0}
                          />
                        </div>
                      )}
                    </div>

                    {/* Plate Number Input */}
                    {!(vipBookingForm.emirate === 'Garage' || vipBookingForm.emirate === 'Sniper car care') && (
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-gray-600 mb-1">Plate Number *</label>
                        <input
                          type="text"
                          required={!customerInfo && !(vipBookingForm.emirate === 'Garage' || vipBookingForm.emirate === 'Sniper car care')}
                          value={vipBookingForm.plate_number}
                          onChange={(e) => setVipBookingForm({ ...vipBookingForm, plate_number: e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() })}
                          className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-mono text-sm bg-white"
                          placeholder="12345"
                        />
                      </div>
                    )}
                  </div>

                  {/* Plate Live Preview */}
                  {!(vipBookingForm.emirate === 'Garage' || vipBookingForm.emirate === 'Sniper car care') && (
                    <VehiclePlatePreview 
                      emirate={vipBookingForm.emirate}
                      plateCode={vipBookingForm.plate_code}
                      plateNumber={vipBookingForm.plate_number}
                    />
                  )}
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (Optional)</label>
                <textarea
                  value={vipBookingForm.notes}
                  onChange={(e) => setVipBookingForm({ ...vipBookingForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                  placeholder="Any additional information..."
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 inline-flex items-center justify-center rounded-lg bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Confirm VIP Booking
              </button>
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
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 py-6 overflow-y-auto">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 sm:p-8 shadow-2xl my-auto">
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
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
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
      {/* Free Wash Celebration Popup */}
      {showFreeWashPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl p-8 max-w-md w-full text-center border-4 border-white shadow-2xl relative animate-scaleUp">
            <div className="text-6xl mb-4 animate-bounce">🎁</div>
            <h2 className="text-3xl font-black text-white italic tracking-wide mb-2 uppercase">FREE WASH EARNED!</h2>
            <p className="text-white font-bold text-lg mb-6">Congratulations! You completed 5 washes. Your 6th service is 100% FREE!</p>
            <button
              onClick={() => setShowFreeWashPopup(false)}
              className="w-full py-4 bg-white text-yellow-600 font-black rounded-xl hover:bg-gray-150 transition-all text-lg shadow-md uppercase tracking-wider"
            >
              Great, Thank you!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LandingPage;


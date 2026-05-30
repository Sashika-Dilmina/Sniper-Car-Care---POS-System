import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import { images, getServiceImage } from '../config/siteImages';

const Reveal = ({ children, delay = 0 }) => {
  const elementRef = useRef(null);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
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
    <div ref={elementRef} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
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

const packages = [
  {
    name: 'Full Body Service',
    price: '25 AED',
    accent: 'Complete refresh',
    description: 'Complete interior and exterior detailing for your 4x4.',
    features: ['Deep interior cleaning', 'Exterior foam wash', 'Wheel cleaning'],
    duration: '120-150 minutes',
  },
  {
    name: 'Double Soap',
    price: '30 AED',
    accent: 'Off-road favorite',
    featured: true,
    description: 'Double soap foam wash for heavy mud and dirt removal.',
    features: ['Double foam wash', 'Hand wash', 'Undercarriage rinse'],
    duration: '60-90 minutes',
  },
  {
    name: 'Ceramic Wash',
    price: '30 AED',
    accent: 'Protection',
    description: 'Ceramic infused wash for extra shine and protection.',
    features: ['Ceramic soap wash', 'Paint protection', 'Gloss finish'],
    duration: '60-90 minutes',
  },
  {
    name: 'Body Wash',
    price: '20 AED',
    accent: 'Quick refresh',
    description: 'Standard exterior wash.',
    features: ['Foam wash', 'Hand dry'],
    duration: '45-60 minutes',
  },
  {
    name: 'Just Water',
    price: '5 AED',
    accent: 'Quick rinse',
    description: 'Quick exterior wash with pure water.',
    features: ['Water wash', 'Basic glass clean'],
    duration: '15-20 minutes',
  },
];

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
  { title: 'COMPETITIVE PRICES', subtitle: 'Best quality at the best price', icon: '💰' },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
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
  const [availableTimeSlots, setAvailableTimeSlots] = useState([]);
  const [washStamps, setWashStamps] = useState(0);

  const vehiclePlate = searchParams.get('plate') || '';

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
      // Extract price from service.price (format: "15 AED" or "Rs. 15,000")
      const priceMatch = service.price.match(/[\d,]+/);
      const servicePrice = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) : 0;

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

      if (response.data.loyalty?.wash_stamps !== undefined) {
        setWashStamps(response.data.loyalty.wash_stamps);
      }

      if (response.data.loyalty?.free_wash_earned) {
        toast.success('Service booked! You earned a FREE wash — enjoy your reward!');
      } else if (response.data.loyalty) {
        toast.success(
          `Service booked! Loyalty progress: ${response.data.loyalty.wash_stamps}/5 washes.`
        );
      } else {
        toast.success('Service booked successfully! We will contact you soon.');
      }
      setShowBookingModal(false);
      setSelectedService(null);
      setBookingForm({
        name: '',
        phone: '',
        vehicle_plate: '',
        notes: ''
      });
    } catch (error) {
      console.error('Booking error:', error);
      toast.error(error.response?.data?.message || 'Failed to book service. Please try again.');
    }
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

      toast.success('VIP booking confirmed! We will contact you soon.');
      setShowVIPModal(false);
      setVipStep(1);
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
                    {pkg.price.replace(' AED', '')}
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
            <Reveal key={item.step} delay={idx * 80}>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white text-sm font-bold z-10">{item.step}</div>
                <div className="mt-3 text-2xl">{item.icon}</div>
                <h3 className="mt-2 text-xs sm:text-sm font-black uppercase text-gray-900">{item.title}</h3>
                <p className="mt-1 text-[10px] sm:text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {trustFeatures.map((item, idx) => (
            <Reveal key={item.title} delay={idx * 60}>
              <div className="flex flex-col items-center text-center p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-red-600 text-lg">{item.icon}</div>
                <p className="mt-2 text-[10px] sm:text-xs font-black uppercase text-gray-900">{item.title}</p>
                <p className="text-[9px] sm:text-[10px] text-gray-500">{item.subtitle}</p>
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
          {products.map((product, index) => (
            <Reveal key={product.name} delay={index * 100}>
              <div className="template-card overflow-hidden flex flex-col h-full">
                <div className="relative h-40 bg-gray-100">
                  {product.art({ className: 'h-full w-full object-cover' })}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between text-[10px] uppercase tracking-widest text-red-600 font-bold">
                    <span>Sniper</span>
                    <span>{product.price}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-gray-900">{product.name}</h3>
                  <p className="mt-1 text-xs text-gray-600">{product.description}</p>
                  <ul className="mt-3 space-y-1 text-xs text-gray-500">
                    {product.benefits.map((benefit) => (
                      <li key={benefit} className="flex gap-2"><span className="text-red-600">•</span>{benefit}</li>
                    ))}
                  </ul>
                  <a href="tel:+12125550123" className="mt-5 inline-flex items-center justify-center rounded-lg border-2 border-gray-900 py-2.5 text-xs font-bold uppercase text-gray-900 hover:bg-gray-900 hover:text-white transition">
                    Purchase
                  </a>
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

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 bottom-nav-shadow md:hidden">
        <div className="flex items-end justify-around px-2 pt-2 pb-3 max-w-lg mx-auto">
          <a href="#top" className="flex flex-col items-center gap-0.5 text-red-600 min-w-[56px]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/></svg>
            <span className="text-[10px] font-semibold">Home</span>
          </a>
          <a href="#services" className="flex flex-col items-center gap-0.5 text-gray-600 min-w-[56px]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            <span className="text-[10px] font-medium">Services</span>
          </a>
          <a href="#services" className="flex flex-col items-center -mt-6 min-w-[72px]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <span className="text-[10px] font-bold text-red-600 mt-1">Book Now</span>
          </a>
          <a href="#vip" className="flex flex-col items-center gap-0.5 text-gray-600 min-w-[56px]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            <span className="text-[10px] font-medium">Bookings</span>
          </a>
          <a href="#reviews" className="flex flex-col items-center gap-0.5 text-gray-600 min-w-[56px]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            <span className="text-[10px] font-medium">Profile</span>
          </a>
        </div>
      </nav>

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

    </div>
  );
};

export default LandingPage;


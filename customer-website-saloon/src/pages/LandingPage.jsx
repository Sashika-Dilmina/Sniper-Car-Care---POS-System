import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from '../config/axios';
import toast from 'react-hot-toast';
import heroSaloon from '../assets/hero-saloon.avif';

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

const stats = [
  { label: 'Chauffeur Clients', value: '8.2k+' },
  { label: 'Executive Details', value: '27k+' },
  { label: 'Ceramic Finishes', value: '5.4k' },
  { label: 'Google Rating', value: '4.9/5' },
];

const packages = [
  {
    name: 'Full Service',
    price: '15 AED',
    accent: 'Complete refresh',
    description: 'Complete interior and exterior detailing for your luxury saloon.',
    features: [
      'Interior deep cleaning with leather treatment',
      'Exterior foam wash and hand wash',
      'Wheel and tire cleaning',
      'Glass cleaning and final inspection',
    ],
    duration: '90-120 minutes',
  },
  {
    name: 'Full Body Wash with Shampoo',
    price: '10 AED',
    accent: 'Daily driver favorite',
    featured: true,
    description: 'Comprehensive exterior wash with shampoo for regular maintenance.',
    features: [
      'Foam shampoo wash',
      'Hand wash and dry',
      'Wheel and tire cleaning',
      'Light interior vacuum',
    ],
    duration: '45-60 minutes',
  },
  {
    name: 'Only Water Body Wash',
    price: '5 AED',
    accent: 'Quick rinse',
    description: 'Quick exterior wash with pure water.',
    features: [
      'Water exterior wash',
      'Hand wash and dry',
      'Wheel cleaning',
      'Basic glass clean',
    ],
    duration: '15-20 minutes',
  },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [customerInfo, setCustomerInfo] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    vehicle_plate: '',
    notes: ''
  });

  const vehiclePlate = searchParams.get('plate') || '';

  // Fetch customer info by plate number
  useEffect(() => {
    const fetchCustomerInfo = async () => {
      if (!vehiclePlate) return;

      try {
        const response = await axios.get(`/api/public/customer/by-plate?plate=${vehiclePlate}`);
        if (response.data.customer) {
          setCustomerInfo(response.data.customer);
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
        source: 'customer_website',
        status: 'pending',
        payment_status: 'pending',
        notes: form.notes || `One-Tap Booking via Website - ${service.name}`
      };

      await axios.post('/api/public/orders', orderData);

      toast.success('Service booked successfully! We will contact you soon.');
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
    <div className="bg-slate-950 text-white overflow-hidden">
      <div className="relative min-h-screen pb-20">
        <div className="absolute inset-0 hero-glow opacity-70" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.04),_transparent_65%)]" aria-hidden="true" />

        <header className="relative z-10">
          <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 sm:px-6 pt-6 sm:pt-8">
            <a href="#top" className="text-xl sm:text-2xl font-semibold tracking-tight">
              Sniper<span className="text-primary-400">CarCare</span>
            </a>
            <div className="hidden items-center gap-6 lg:gap-8 text-sm text-slate-200/80 md:flex">
              <a href="#services" className="hover:text-white transition">Services</a>
              <a href="#products" className="hover:text-white transition">Products</a>
              <a href="#reviews" className="hover:text-white transition">Reviews</a>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-200/80 hover:text-white transition"
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
          </nav>
          {mobileMenuOpen && (
            <div className="md:hidden mx-auto max-w-6xl px-4 sm:px-6 pt-4 pb-6">
              <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur">
                <a href="#services" onClick={() => setMobileMenuOpen(false)} className="text-sm text-slate-200/80 hover:text-white transition">
                  Services
                </a>
                <a href="#products" onClick={() => setMobileMenuOpen(false)} className="text-sm text-slate-200/80 hover:text-white transition">
                  Products
                </a>
                <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="text-sm text-slate-200/80 hover:text-white transition">
                  Reviews
                </a>
              </div>
            </div>
          )}
        </header>

        <main className="relative z-10">
          <section id="top" className="mx-auto mt-8 sm:mt-14 grid max-w-6xl grid-cols-1 gap-12 sm:gap-16 px-4 sm:px-6 md:grid-cols-2 md:items-center">
            <Reveal>
              <div className="space-y-6 sm:space-y-8">
                <div className="inline-flex items-center gap-2 sm:gap-3 rounded-full bg-white/5 px-4 sm:px-5 py-2 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-slate-200/80">
                  <span className="text-amber-300 text-base sm:text-lg">★★★★★</span>
                  <span className="hidden xs:inline">Highly rated mobile detailing</span>
                  <span className="xs:hidden">Highly rated</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold leading-tight tracking-[-0.02em] md:text-5xl lg:text-6xl">
                  Mobile Detailing for Luxury Saloon Vehicles
                </h1>
                <p className="max-w-xl text-base sm:text-lg text-slate-200/80">
                  Professional mobile car detailing service for your luxury saloon. We come to you with everything needed for a perfect finish.
                </p>
                <div className="flex flex-col sm:flex-row">
                  <a
                    href="#services"
                    className="flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 sm:px-8 py-3 sm:py-4 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:text-white"
                  >
                    View Packages
                    <span className="text-lg">▸</span>
                  </a>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:gap-6 sm:grid-cols-4">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 sm:px-5 py-3 sm:py-4 backdrop-blur">
                      <p className="text-xl sm:text-2xl font-semibold text-white">{stat.value}</p>
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-300/70 leading-tight">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={150}>
              <div className="relative">
                <div className="absolute -left-6 -top-6 h-24 w-24 rounded-full bg-primary-500/30 blur-2xl animate-pulseGlow" aria-hidden="true" />
                <div className="absolute -right-10 bottom-10 h-28 w-28 rounded-full bg-indigo-500/30 blur-2xl animate-pulseGlow" aria-hidden="true" />
                <div className="relative overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/10 bg-slate-900/40 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.85)]">
                  <div className="relative h-[280px] sm:h-[300px] md:h-[380px] lg:h-[400px]">
                    <img
                      src={heroSaloon}
                      alt="Luxury saloon sedan with premium finish"
                      className="h-full w-full object-cover object-center"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          </section>
        </main>
      </div>

      <section id="services" className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-16 sm:pb-24">
        <Reveal>
          <div className="mb-10 sm:mb-14 text-center">
            <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-primary-300/70">Our Services</p>
            <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight md:text-4xl">Choose Your Service Package</h2>
            <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-300/80 px-4">
              Professional mobile detailing services for your luxury saloon.
            </p>
          </div>
        </Reveal>
        <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg, idx) => (
            <Reveal key={pkg.name} delay={idx * 120}>
              <div
                className={`glass-card relative flex h-full flex-col justify-between rounded-2xl sm:rounded-3xl p-6 sm:p-8 transition duration-500 hover:-translate-y-2 hover:shadow-[0_50px_120px_-50px_rgba(56,189,248,0.4)] ${pkg.featured ? 'border-primary-500/40 bg-gradient-to-br from-primary-500/20 via-indigo-500/10 to-transparent' : ''
                  }`}
              >
                <div className="space-y-4 flex flex-col items-center justify-center text-center">
                  <h3 className="text-xl sm:text-2xl font-semibold">{pkg.name}</h3>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{pkg.price}</p>
                </div>
                <button
                  onClick={() => handleServiceClick(pkg)}
                  className="mt-6 sm:mt-8 inline-flex items-center justify-center rounded-full border border-white/15 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:border-primary-400 hover:bg-primary-400 hover:text-slate-900"
                >
                  Book Service
                </button>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="products" className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 pb-20 sm:pb-28">
        <div className="relative mx-auto max-w-6xl">
          <Reveal>
            <div className="text-center">
              <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-primary-200/80">Car Care Products</p>
              <h2 className="mt-4 text-2xl sm:text-3xl font-semibold tracking-tight md:text-4xl">Premium Products</h2>
              <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base text-slate-300/80 px-4">
                Professional-grade car care products available for purchase.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <Reveal key={product.name} delay={index * 130}>
                <div className="glass-card relative flex h-full flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl">
                  <div className="relative h-40 sm:h-48 w-full overflow-hidden bg-slate-900/80">
                    {product.art({ className: 'h-full w-full scale-[1.02] object-cover transition duration-700 ease-out hover:scale-105' })}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5 sm:p-7">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs uppercase tracking-[0.3em] text-primary-200/80">
                      <span>Sniper</span>
                      <span className="rounded-full bg-primary-500/20 px-2 sm:px-3 py-1 text-[9px] sm:text-[10px] font-semibold text-primary-200 shadow-inner">
                        {product.price}
                      </span>
                    </div>
                    <h3 className="mt-4 sm:mt-5 text-xl sm:text-2xl font-semibold text-white">{product.name}</h3>
                    <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-slate-200/80">{product.description}</p>
                    <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-xs sm:text-sm text-slate-200/70">
                      {product.benefits.map((benefit) => (
                        <li key={benefit} className="flex items-start gap-2 sm:gap-3">
                          <span className="mt-0.5 text-primary-300">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                    <a
                      href="tel:+12125550123"
                      className="mt-6 sm:mt-8 inline-flex items-center justify-center rounded-full border border-white/15 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white transition hover:border-primary-400 hover:bg-primary-400 hover:text-slate-900"
                    >
                      Add to Appointment
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="reviews" className="relative z-10 bg-slate-900/30 py-16 sm:py-24">
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <p className="text-xs sm:text-sm uppercase tracking-[0.3em] text-primary-200/80">Loved By Locals</p>
              <h2 className="mt-4 text-2xl sm:text-3xl font-semibold md:text-4xl">5-star mobile detailing. Every visit.</h2>
            </div>
          </Reveal>
          <div className="mt-12 sm:mt-16 grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => (
              <Reveal key={testimonial.name} delay={index * 140}>
                <div className="glass-card h-full rounded-2xl sm:rounded-3xl p-6 sm:p-8">
                  <div className="mb-3 sm:mb-4 flex items-center gap-1 text-amber-300 text-base sm:text-lg">
                    {'★★★★★'.slice(0, testimonial.rating)}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200/80 leading-relaxed">"{testimonial.quote}"</p>
                  <div className="mt-5 sm:mt-6 text-xs sm:text-sm font-semibold text-white">
                    {testimonial.name}
                    <span className="block text-[10px] sm:text-xs font-normal uppercase tracking-[0.25em] text-slate-400/70">
                      {testimonial.location}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-slate-950/80 py-8 sm:py-10">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center justify-between gap-4 sm:gap-6 px-4 sm:px-6 text-[10px] sm:text-xs text-slate-400/70 md:flex-row">
          <p className="text-center md:text-left">© {new Date().getFullYear()} Sniper Car Care. All rights reserved.</p>
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-center">
            <a href="#services" className="hover:text-white transition">
              Services
            </a>
            <a href="#reviews" className="hover:text-white transition">
              Reviews
            </a>
            <a href="#products" className="hover:text-white transition">
              Products
            </a>
          </div>
        </div>
      </footer>

      {/* Booking Modal */}
      {showBookingModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 sm:p-8 shadow-2xl">
            <button
              onClick={() => {
                setShowBookingModal(false);
                setSelectedService(null);
              }}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h3 className="text-2xl font-semibold text-white mb-2">Book {selectedService.name}</h3>
            <p className="text-lg text-primary-300 mb-6">{selectedService.price}</p>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={bookingForm.name}
                  onChange={(e) => setBookingForm({ ...bookingForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={bookingForm.phone}
                  onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="03001234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Vehicle Plate
                </label>
                <input
                  type="text"
                  value={bookingForm.vehicle_plate}
                  onChange={(e) => setBookingForm({ ...bookingForm, vehicle_plate: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="ABC-123"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={bookingForm.notes}
                  onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Any special instructions or preferences..."
                />
              </div>

              <button
                type="submit"
                className="w-full mt-6 inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-600"
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>
      )}


    </div>
  );
};

export default LandingPage;


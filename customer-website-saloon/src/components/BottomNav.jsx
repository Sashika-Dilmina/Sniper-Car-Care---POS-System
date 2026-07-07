import { Link, useLocation } from 'react-router-dom';

const BottomNav = () => {
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const getBookNowLink = () => {
    const params = new URLSearchParams(location.search);
    params.set('action', 'book');
    return `/?${params.toString()}`;
  };

  const handleHomeClick = (e) => {
    if (location.pathname === '/' && !location.hash) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 bottom-nav-shadow md:hidden">
      <div className="flex items-end justify-around px-2 pt-2 pb-3 max-w-lg mx-auto">
        <Link 
          to={`/${location.search}`} 
          onClick={handleHomeClick}
          className={`flex flex-col items-center gap-0.5 min-w-[56px] transition-colors ${isActive('/') && !location.hash && !new URLSearchParams(location.search).has('action') ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}
        >
          <svg className="h-5 w-5" fill={isActive('/') && !location.hash && !new URLSearchParams(location.search).has('action') ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-semibold">Home</span>
        </Link>
        <Link to={`/${location.search}#services`} className={`flex flex-col items-center gap-0.5 min-w-[56px] transition-colors ${location.hash === '#services' ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
          <span className="text-[10px] font-medium">Services</span>
        </Link>
        <Link to={getBookNowLink()} className="flex flex-col items-center -mt-6 min-w-[72px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/40 hover:bg-red-700 transition-colors">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <span className="text-[10px] font-bold text-red-600 mt-1">Book Now</span>
        </Link>
        <Link to={`/history${location.search}`} className={`flex flex-col items-center gap-0.5 min-w-[56px] transition-colors ${isActive('/history') ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-[10px] font-medium">History</span>
        </Link>
        <Link to={`/profile${location.search}`} className={`flex flex-col items-center gap-0.5 min-w-[56px] transition-colors ${isActive('/profile') ? 'text-red-600' : 'text-gray-600 hover:text-red-600'}`}>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;

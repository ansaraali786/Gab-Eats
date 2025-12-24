
import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const CustomerDashboard: React.FC = () => {
  const { restaurants, settings } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const handleInstallPromptAvailable = () => setCanInstall(true);
    window.addEventListener('pwa-install-available', handleInstallPromptAvailable);
    if ((window as any).deferredPrompt) setCanInstall(true);

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOSDevice && !isStandalone) setIsIOS(true);

    return () => window.removeEventListener('pwa-install-available', handleInstallPromptAvailable);
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    (window as any).deferredPrompt = null;
    setCanInstall(false);
  };

  const handleShareApp = async () => {
    if (navigator.share) {
      await navigator.share({
        title: settings.general.platformName,
        text: `Best food in town! Download the ${settings.general.platformName} app.`,
        url: window.location.origin
      });
    }
  };

  const cuisines = useMemo(() => {
    const set = new Set(restaurants.flatMap(r => r.cuisine.split(',').map(c => c.trim())));
    return ['All', ...Array.from(set)];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || 
                           r.menu.some(m => m.name.toLowerCase().includes(search.toLowerCase()));
      const matchesCuisine = selectedCuisine === 'All' || r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase());
      return matchesSearch && matchesCuisine;
    });
  }, [restaurants, search, selectedCuisine]);

  if (settings.general.maintenanceMode) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 md:w-32 md:h-32 bg-amber-100 text-amber-600 rounded-[2.5rem] flex items-center justify-center text-4xl md:text-6xl mb-8 animate-pulse shadow-xl shadow-amber-100">
          ⚙️
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-4 tracking-tighter">Under Maintenance</h1>
        <p className="text-gray-400 font-bold max-w-md mx-auto leading-relaxed text-sm md:text-base">
          We are upgrading our culinary tech to serve you better. We'll be back shortly!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-10">
      {/* PWA Banners optimized for vertical space */}
      {canInstall && (
        <div className="mb-8 bg-gray-900 text-white p-5 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl border border-white/10">
          <div className="flex items-center gap-4 text-center md:text-left">
             <div className="w-12 h-12 flex-shrink-0 gradient-primary rounded-xl flex items-center justify-center text-xl">📱</div>
             <div>
                <h4 className="text-lg font-black tracking-tight">App Experience</h4>
                <p className="text-gray-400 text-xs font-bold">Install for a faster, smoother experience.</p>
             </div>
          </div>
          <button onClick={handleInstallClick} className="w-full md:w-auto px-8 py-3 gradient-primary rounded-xl font-black text-xs uppercase tracking-widest shadow-xl">
            Install App
          </button>
        </div>
      )}

      {/* Hero Section - Better responsive scaling */}
      <div className="relative rounded-[2rem] md:rounded-[3rem] p-8 md:p-20 mb-12 md:mb-16 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 gradient-primary opacity-90"></div>
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-20 md:opacity-30 mix-blend-overlay">
           <img src={settings.marketing.banners.find(b => b.isActive)?.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000"} alt="bg" className="w-full h-full object-cover" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 text-white rounded-full text-[9px] font-black uppercase tracking-widest mb-4 backdrop-blur-sm">
            {settings.marketing.heroSubtitle}
          </span>
          <h1 className="text-4xl md:text-7xl font-extrabold text-white mb-6 md:mb-8 leading-[1.1] tracking-tighter">
            {settings.marketing.heroTitle}
          </h1>
          
          <div className="flex flex-col bg-white p-1.5 rounded-2xl md:rounded-3xl shadow-2xl items-stretch gap-1.5 max-w-xl">
            <div className="flex-grow relative flex items-center pl-3">
              <svg className="w-5 h-5 text-orange-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Find Biryani, Burgers..." 
                className="w-full py-3 bg-transparent outline-none text-gray-800 font-bold text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="gradient-accent text-white px-6 py-3.5 rounded-xl md:rounded-2xl font-black text-xs uppercase shadow-lg">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Cuisines Filter - Horizontal scrolling fixed for smoothness */}
      <div className="mb-10">
        <h2 className="text-lg font-black text-gray-900 mb-5 flex items-center uppercase tracking-wider">
          <span className="w-6 h-1 gradient-secondary rounded-full mr-3"></span>
          Cuisines
        </h2>
        <div className="flex overflow-x-auto space-x-3 pb-4 no-scrollbar flex-nowrap scroll-smooth touch-pan-x overscroll-x-contain">
          {cuisines.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(c)}
              className={`px-6 py-3.5 rounded-xl font-black whitespace-nowrap transition-all border-2 text-xs flex-shrink-0 ${
                selectedCuisine === c 
                ? 'gradient-secondary border-transparent text-white shadow-xl scale-105' 
                : 'bg-white text-gray-500 border-gray-100 hover:border-teal-400'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
        {filteredRestaurants.map(r => (
          <div key={r.id} className="group relative bg-white rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm transition-all duration-300 hover:-translate-y-2">
            <Link to={`/restaurant/${r.id}`}>
              <div className="h-48 md:h-60 relative overflow-hidden">
                <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-4 left-4">
                  <div className="bg-white/95 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] font-black text-gray-900 flex items-center shadow-md">
                    <span className="text-orange-500 mr-1">★</span> {r.rating}
                  </div>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 mb-2 truncate">{r.name}</h3>
                <p className="text-gray-400 font-bold text-[11px] uppercase tracking-widest mb-4 truncate">{r.cuisine}</p>
                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[10px] font-black text-teal-600 bg-teal-50 px-3 py-1 rounded-full uppercase tracking-wider">
                    {settings.commissions.deliveryFee === 0 ? 'Free Delivery' : `Rs. ${settings.commissions.deliveryFee}`}
                  </span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CustomerDashboard;

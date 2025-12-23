
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
    // Check if install is available (Android/Chrome)
    const handleInstallPromptAvailable = () => setCanInstall(true);
    window.addEventListener('pwa-install-available', handleInstallPromptAvailable);
    // Fix: Cast window to any to access custom deferredPrompt property
    if ((window as any).deferredPrompt) setCanInstall(true);

    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isIOSDevice && !isStandalone) setIsIOS(true);

    return () => window.removeEventListener('pwa-install-available', handleInstallPromptAvailable);
  }, []);

  const handleInstallClick = async () => {
    // Fix: Cast window to any to access custom deferredPrompt property
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) return;
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    // Fix: Cast window to any to access custom deferredPrompt property
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
        <div className="w-32 h-32 bg-amber-100 text-amber-600 rounded-[2.5rem] flex items-center justify-center text-6xl mb-8 animate-pulse shadow-xl shadow-amber-100">
          ⚙️
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter">Under Maintenance</h1>
        <p className="text-gray-400 font-bold max-w-md mx-auto leading-relaxed">
          We are upgrading our culinary tech to serve you better. We'll be back shortly with more flavor!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* PWA Install Banner (Android/Chrome) */}
      {canInstall && (
        <div className="mb-8 bg-gray-900 text-white p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-white/10 animate-pulse-slow">
          <div className="flex items-center gap-5">
             <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center text-3xl shadow-lg">📱</div>
             <div>
                <h4 className="text-xl font-black tracking-tight">App Experience is Better</h4>
                <p className="text-gray-400 text-sm font-bold">Install {settings.general.platformName} for faster ordering.</p>
             </div>
          </div>
          <button 
            onClick={handleInstallClick}
            className="w-full md:w-auto px-10 py-4 gradient-primary rounded-xl font-black text-sm uppercase tracking-widest shadow-xl"
          >
            One-Tap Install
          </button>
        </div>
      )}

      {/* iOS Install Guide Banner */}
      {isIOS && (
        <div className="mb-8 bg-white p-6 rounded-[2rem] border border-orange-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
             <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center text-3xl">🍎</div>
             <div>
                <h4 className="text-xl font-black text-gray-900 tracking-tight">iPhone User?</h4>
                <p className="text-gray-400 text-sm font-bold">Tap 'Share' and then 'Add to Home Screen' to install.</p>
             </div>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            <span className="text-xs font-black text-gray-300 uppercase">+</span>
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative rounded-[3rem] p-10 md:p-20 mb-16 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 gradient-primary opacity-90"></div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-30 mix-blend-overlay">
           <img src={settings.marketing.banners.find(b => b.isActive)?.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000"} alt="bg" className="w-full h-full object-cover" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-4 py-1 bg-white/20 text-white rounded-full text-xs font-black uppercase tracking-widest mb-6 backdrop-blur-sm">
            {settings.marketing.heroSubtitle}
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-[1.1] tracking-tighter">
            {settings.marketing.heroTitle}
          </h1>
          
          <div className="flex flex-col sm:flex-row bg-white p-2 rounded-3xl shadow-2xl items-stretch gap-2 max-w-xl">
            <div className="flex-grow relative flex items-center pl-4">
              <svg className="w-6 h-6 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search Biryani, Burgers, Pizza..." 
                className="w-full py-4 bg-transparent outline-none text-gray-800 font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="gradient-accent text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-purple-200">
              Find Food
            </button>
          </div>
        </div>
      </div>

      {/* Sharing Section */}
      <div className="mb-16 bg-white p-8 md:p-12 rounded-[3rem] border border-gray-100 shadow-sm text-center">
         <h2 className="text-3xl font-black text-gray-900 mb-2">Invite Friends, Spread Flavor</h2>
         <p className="text-gray-400 font-bold mb-8">Share the app link and let everyone enjoy gourmet delivery.</p>
         <button 
           onClick={handleShareApp}
           className="px-12 py-5 bg-gray-900 text-white rounded-[2rem] font-black text-lg shadow-2xl hover:scale-105 transition-transform flex items-center gap-4 mx-auto"
         >
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
           Share Direct Link
         </button>
      </div>

      {/* Cuisines Filter */}
      <div className="mb-12">
        <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center uppercase tracking-wider">
          <span className="w-8 h-1 gradient-secondary rounded-full mr-3"></span>
          Explore Cuisines
        </h2>
        <div className="flex overflow-x-auto space-x-4 pb-4 no-scrollbar">
          {cuisines.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(c)}
              className={`px-8 py-4 rounded-2xl font-bold whitespace-nowrap transition-all border-2 ${
                selectedCuisine === c 
                ? 'gradient-secondary border-transparent text-white shadow-xl shadow-teal-100 scale-105' 
                : 'bg-white text-gray-500 border-gray-100 hover:border-teal-400 hover:text-teal-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {filteredRestaurants.map(r => (
          <div 
            key={r.id} 
            className="group relative bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-3"
          >
            <Link to={`/restaurant/${r.id}`}>
              <div className="h-64 relative overflow-hidden">
                <img src={r.image} alt={r.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute top-6 left-6 flex space-x-2">
                  <div className="bg-white/90 backdrop-blur px-3 py-1.5 rounded-xl text-xs font-black text-gray-900 flex items-center shadow-sm">
                    <span className="text-orange-500 mr-1.5">★</span> {r.rating}
                  </div>
                </div>
              </div>
              <div className="p-8">
                <h3 className="text-2xl font-black text-gray-900 mb-2 group-hover:text-orange-600 transition-colors leading-tight">{r.name}</h3>
                <p className="text-gray-400 font-medium text-sm mb-6 line-clamp-1">{r.cuisine}</p>
                <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-sm font-bold text-teal-600 bg-teal-50 px-4 py-1.5 rounded-full uppercase tracking-wider">
                    {settings.commissions.deliveryFee === 0 ? 'Free Delivery' : `Rs. ${settings.commissions.deliveryFee} Delivery`}
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

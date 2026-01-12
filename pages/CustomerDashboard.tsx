import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const CustomerDashboard: React.FC = () => {
  const { restaurants, settings } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleInstallPromptAvailable = () => setCanInstall(true);
    window.addEventListener('pwa-install-available', handleInstallPromptAvailable);
    if ((window as any).deferredPrompt) setCanInstall(true);
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
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center bg-gray-950">
        <div className="w-32 h-32 bg-orange-500/10 text-orange-500 rounded-[3rem] flex items-center justify-center text-6xl mb-10 animate-pulse border border-orange-500/20">
          ⚙️
        </div>
        <h1 className="text-5xl font-black text-white mb-6 tracking-tighter">Maintenance in Progress</h1>
        <p className="text-gray-500 font-bold max-w-md mx-auto leading-relaxed text-lg">
          We're fine-tuning the gourmet experience. Be back soon!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* PWA Banner */}
      {canInstall && (
        <div className="mb-10 bg-gray-950 text-white p-8 rounded-[3.5rem] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl border border-white/10">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 flex-shrink-0 gradient-primary rounded-[2rem] flex items-center justify-center text-3xl shadow-xl">📱</div>
             <div>
                <h4 className="text-2xl font-black tracking-tight uppercase">GAB-EATS Native Hub</h4>
                <p className="text-gray-400 font-bold text-sm tracking-wide">Install the app for the ultimate performance.</p>
             </div>
          </div>
          <button onClick={handleInstallClick} className="w-full md:w-auto px-10 py-5 gradient-primary rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform">
            Install Hub
          </button>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative rounded-[4.5rem] p-12 md:p-24 mb-16 overflow-hidden shadow-2xl group">
        <div className="absolute inset-0 gradient-primary opacity-90 transition-all group-hover:opacity-95"></div>
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-30 mix-blend-overlay">
           <img src={settings.marketing.banners[0]?.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000"} alt="bg" className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-125" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-5 py-2 bg-white/20 text-white rounded-full text-[11px] font-black uppercase tracking-widest mb-8 backdrop-blur-xl border border-white/10">
            {settings.marketing.heroSubtitle}
          </span>
          <h1 className="text-6xl md:text-8xl font-black text-white mb-12 leading-[0.95] tracking-tighter">
            {settings.marketing.heroTitle}
          </h1>
          
          <div className="flex flex-col md:flex-row bg-white p-3 rounded-[3rem] shadow-2xl items-stretch gap-3 max-w-2xl border border-gray-100">
            <div className="flex-grow relative flex items-center pl-6">
              <svg className="w-7 h-7 text-orange-500 mr-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="What are you craving?" 
                className="w-full py-6 bg-transparent outline-none text-gray-950 font-black text-xl placeholder-gray-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button className="gradient-accent text-white px-10 py-6 rounded-[2.5rem] font-black text-sm uppercase shadow-2xl hover:scale-105 transition-all tracking-widest">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Cuisines Filter */}
      <div className="mb-14">
        <h2 className="text-3xl font-black text-gray-950 mb-10 flex items-center uppercase tracking-tighter">
          <span className="w-12 h-2 gradient-secondary rounded-full mr-6"></span>
          Popular Categories
        </h2>
        <div className="flex overflow-x-auto space-x-5 pb-8 no-scrollbar">
          {cuisines.map(c => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(c)}
              className={`px-10 py-5 rounded-[2rem] font-black whitespace-nowrap transition-all border-4 text-[12px] uppercase flex-shrink-0 tracking-widest ${
                selectedCuisine === c 
                ? 'gradient-secondary border-transparent text-white shadow-2xl scale-110 translate-y-[-6px]' 
                : 'bg-white text-gray-400 border-gray-50 hover:border-gray-100'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-14">
        {filteredRestaurants.map(r => (
          <div key={r.id} className="group relative bg-white rounded-[4rem] overflow-hidden border border-gray-50 shadow-nova transition-all duration-500 hover:-translate-y-4 hover:shadow-2xl">
            <Link to={`/restaurant/${r.id}`}>
              <div className="h-80 relative overflow-hidden">
                <img src={r.image} alt={r.name} className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
                <div className="absolute top-8 left-8">
                  <div className="bg-white/95 backdrop-blur-xl px-5 py-2 rounded-[1.5rem] text-[12px] font-black text-gray-950 flex items-center shadow-xl border border-white">
                    <span className="text-orange-500 mr-2 text-lg">★</span> {r.rating}
                  </div>
                </div>
              </div>
              <div className="p-12">
                <h3 className="text-3xl font-black text-gray-950 mb-4 truncate group-hover:text-orange-600 transition-colors tracking-tighter">{r.name}</h3>
                <p className="text-gray-400 font-black text-[12px] uppercase tracking-[0.25em] mb-8 truncate">{r.cuisine}</p>
                <div className="pt-10 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[11px] font-black text-teal-600 bg-teal-50 px-5 py-2.5 rounded-[1.5rem] uppercase tracking-widest">
                    {settings.commissions.deliveryFee === 0 ? 'Free Delivery' : `${settings.general.currencySymbol}${settings.commissions.deliveryFee} Fee`}
                  </span>
                  <span className="text-gray-950 font-black text-sm uppercase tracking-tighter">{r.deliveryTime}</span>
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

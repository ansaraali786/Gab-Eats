import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const CustomerDashboard: React.FC = () => {
  const { restaurants, settings } = useApp();
  const [search, setSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(() => {
    try {
      const saved = localStorage.getItem('user_location');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isLocating, setIsLocating] = useState(false);

  // Haversine formula to calculate distance in KM
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return 999;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const cuisines = useMemo(() => {
    const set = new Set(restaurants.flatMap(r => (r.cuisine || '').split(',').map(c => c.trim())));
    return ['All', ...Array.from(set)];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter(r => {
      // 1. Text Search
      const matchesSearch = (r.name || '').toLowerCase().includes(search.toLowerCase()) || 
                           (r.menu || []).some(m => (m.name || '').toLowerCase().includes(search.toLowerCase()));
      
      // 2. Cuisine Filter
      const matchesCuisine = selectedCuisine === 'All' || (r.cuisine || '').toLowerCase().includes(selectedCuisine.toLowerCase());
      
      // 3. Proximity Filter (Location Wise)
      let isNearby = true;
      if (userLocation) {
        // SAFETY CHECK: If restaurant is missing coordinates, skip it to prevent crash
        if (!r.coordinates || typeof r.coordinates.lat !== 'number' || typeof r.coordinates.lng !== 'number') {
          return false;
        }
        const dist = calculateDistance(userLocation.lat, userLocation.lng, r.coordinates.lat, r.coordinates.lng);
        isNearby = dist <= (r.deliveryRadius || 10);
      } else {
        // If user hasn't set location, we don't show restaurants yet as per requirement
        isNearby = false; 
      }

      return matchesSearch && matchesCuisine && isNearby;
    });
  }, [restaurants, search, selectedCuisine, userLocation]);

  const handleSetLocation = () => {
    if (!navigator.geolocation) return alert("Browser does not support geolocation.");
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        localStorage.setItem('user_location', JSON.stringify(loc));
        setIsLocating(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to get location. Please enable location permissions in your browser settings.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  if (settings.general.maintenanceMode) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center bg-gray-950">
        <div className="w-24 h-24 bg-orange-500/10 text-orange-500 rounded-cut-md flex items-center justify-center text-5xl mb-8 animate-pulse border border-orange-500/20">⚙️</div>
        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">Offline for Gourmet Tuning</h1>
        <p className="text-gray-500 font-bold max-w-sm mx-auto leading-relaxed">The GAB-EATS engine is receiving updates. Be back soon!</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Location Bar */}
      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-3xl border border-gray-100 shadow-sm mb-10 group">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 gradient-secondary rounded-xl flex items-center justify-center text-white text-xl">📍</div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Current Zone</p>
            <p className="text-sm font-black text-gray-950 truncate max-w-[200px]">
              {userLocation ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}` : 'Location not set'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSetLocation}
          disabled={isLocating}
          className="px-6 py-3 gradient-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
        >
          {isLocating ? 'Pinpointing...' : userLocation ? 'Update Location' : 'Set My Location'}
        </button>
      </div>

      {/* Hero Section */}
      <div className="relative rounded-cut-xl p-8 md:p-24 mb-14 overflow-hidden shadow-2xl group">
        <div className="absolute inset-0 gradient-primary opacity-90 transition-all group-hover:opacity-95"></div>
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full opacity-30 mix-blend-overlay">
           <img src={settings.marketing.banners[0]?.image || "https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000"} alt="bg" className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110" />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="inline-block px-5 py-2 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-xl border border-white/10">
            {settings.marketing.heroSubtitle}
          </span>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-10 leading-[1] tracking-tighter">
            {settings.marketing.heroTitle}
          </h1>
          <div className="flex flex-col sm:flex-row bg-white p-2 rounded-cut-md shadow-2xl items-stretch gap-2 max-w-xl">
            <div className="flex-grow relative flex items-center pl-6">
              <svg className="w-6 h-6 text-orange-500 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search food or branches..." className="w-full py-5 bg-transparent outline-none text-gray-950 font-black text-lg placeholder-gray-300" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="gradient-accent text-white px-8 py-5 rounded-cut-sm font-black text-xs uppercase shadow-2xl tracking-widest">Search</button>
          </div>
        </div>
      </div>

      {/* Cuisines Filter */}
      <div className="mb-12">
        <div className="flex overflow-x-auto space-x-4 pb-6 no-scrollbar">
          {cuisines.map(c => (
            <button key={c} onClick={() => setSelectedCuisine(c)} className={`px-8 py-4 rounded-cut-sm font-black whitespace-nowrap transition-all border-4 text-[10px] uppercase flex-shrink-0 tracking-widest ${selectedCuisine === c ? 'gradient-secondary border-transparent text-white shadow-xl scale-105' : 'bg-white text-gray-400 border-gray-50'}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Restaurant Grid */}
      {!userLocation ? (
        <div className="bg-white p-20 text-center rounded-cut-lg border-2 border-dashed border-gray-100 mb-20">
           <div className="text-6xl mb-6">📍</div>
           <h3 className="text-2xl font-black text-gray-950 mb-4 uppercase">Select Location to View Menus</h3>
           <p className="text-gray-400 font-bold max-w-xs mx-auto mb-8">We only show restaurants within a 10km radius of your current position to ensure lightning-fast delivery.</p>
           <button onClick={handleSetLocation} className="px-10 py-5 gradient-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">Get Started</button>
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="bg-white p-20 text-center rounded-cut-lg border-2 border-dashed border-gray-100 mb-20">
           <div className="text-6xl mb-6">🛵</div>
           <h3 className="text-2xl font-black text-gray-950 mb-4 uppercase">No Branches Nearby</h3>
           <p className="text-gray-400 font-bold max-w-sm mx-auto">We couldn't find any partners within {settings.general.platformName}'s delivery network in your immediate area. Try another location!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredRestaurants.map(r => {
            const distance = calculateDistance(userLocation.lat, userLocation.lng, r.coordinates.lat, r.coordinates.lng);
            return (
              <div key={r.id} className="group relative bg-white rounded-cut-lg overflow-hidden border border-gray-50 shadow-nova transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                <Link to={`/restaurant/${r.id}`}>
                  <div className="h-64 relative overflow-hidden">
                    <img src={r.image} alt={r.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute top-6 left-6">
                      <div className="bg-white/95 backdrop-blur-xl px-4 py-1.5 rounded-full text-[10px] font-black text-gray-950 flex items-center shadow-lg">
                        <span className="text-orange-500 mr-1.5 text-base">★</span> {r.rating}
                      </div>
                    </div>
                    <div className="absolute top-6 right-6">
                      <div className="bg-teal-500 px-4 py-1.5 rounded-full text-[10px] font-black text-white shadow-lg">
                        {distance.toFixed(1)} KM
                      </div>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-2xl font-black text-gray-950 mb-2 truncate group-hover:text-orange-600 transition-colors tracking-tighter">{r.name}</h3>
                    <p className="text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4 truncate">{r.cuisine}</p>
                    <p className="text-xs text-orange-600 font-bold uppercase mb-6 truncate">🚚 Serves: {r.deliveryAreas || 'All nearby zones'}</p>
                    <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-4 py-2 rounded-lg uppercase tracking-widest">
                        {settings.commissions.deliveryFee === 0 ? 'Free Delivery' : `${settings.general.currencySymbol}${settings.commissions.deliveryFee} Fee`}
                      </span>
                      <span className="text-gray-950 font-black text-xs uppercase">{r.deliveryTime}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CustomerDashboard;

import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { restaurants, addToCart, currentUser, settings } = useApp();
  
  const restaurant = restaurants.find(r => r.id === id);
  if (!restaurant) return <div className="text-center py-24 text-3xl font-black uppercase tracking-widest">Branch Not Found</div>;

  const handleAddToCart = (item: any) => {
    if (!currentUser) {
      alert("Please login with your phone number to start ordering!");
      navigate('/login');
      return;
    }
    addToCart({
      ...item,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      quantity: 1
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <Link to="/" className="inline-flex items-center text-[10px] md:text-[12px] font-black text-orange-600 uppercase tracking-[0.3em] mb-8 md:mb-12 hover:translate-x-[-5px] transition-transform">
        <svg className="w-5 h-5 md:w-6 md:h-6 mr-2 md:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Hub
      </Link>

      <div className="bg-white rounded-[2.5rem] md:rounded-[4rem] p-6 md:p-20 shadow-nova border border-gray-100 flex flex-col md:flex-row gap-8 md:gap-16 items-center mb-12 md:mb-20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 md:h-3 gradient-primary"></div>
        <img src={restaurant.image} alt={restaurant.name} className="w-full md:w-96 h-64 md:h-80 rounded-[2rem] md:rounded-[3rem] object-cover shadow-2xl transform hover:scale-105 transition-transform duration-700" />
        <div className="flex-grow text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-4 md:gap-6 mb-6 md:mb-8">
            <h1 className="text-4xl md:text-6xl font-black text-gray-950 tracking-tighter">{restaurant.name}</h1>
            {settings.features.ratingsEnabled && (
              <span className="bg-amber-50 text-amber-600 font-black px-4 md:px-6 py-1.5 md:py-2.5 rounded-[1.2rem] md:rounded-[1.5rem] text-sm md:text-lg flex items-center shadow-sm border border-amber-100/50">
                ★ {restaurant.rating}
              </span>
            )}
          </div>
          <p className="text-gray-400 font-black text-sm md:text-xl mb-8 md:mb-10 uppercase tracking-[0.3em] md:tracking-[0.4em]">{restaurant.cuisine}</p>
          <div className="grid grid-cols-2 md:flex md:flex-wrap justify-center md:justify-start gap-6 md:gap-12">
            {[
              { label: 'Delivery', val: restaurant.deliveryTime, color: 'text-teal-600' },
              { label: 'Min Order', val: `${settings.general.currencySymbol}${settings.commissions.minOrderValue}`, color: 'text-gray-900' },
              { label: 'Fee', val: settings.commissions.deliveryFee === 0 ? 'Free' : `${settings.general.currencySymbol}${settings.commissions.deliveryFee}`, color: 'text-orange-600' }
            ].map(stat => (
              <div key={stat.label}>
                <span className="block text-[9px] md:text-[11px] font-black text-gray-300 uppercase tracking-widest mb-1.5 md:mb-3">{stat.label}</span>
                <span className={`text-lg md:text-2xl font-black ${stat.color}`}>{stat.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 md:mb-16 flex items-center justify-between border-b-4 border-gray-50 pb-6 md:pb-10">
        <h2 className="text-3xl md:text-5xl font-black text-gray-950 tracking-tighter uppercase">Fresh Menu</h2>
        <div className="w-20 md:w-32 h-1.5 md:h-2 gradient-accent rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        {restaurant.menu?.map(item => (
          <div key={item.id} className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[3.5rem] shadow-nova border border-gray-50 flex flex-col sm:flex-row gap-6 md:gap-8 hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
            <div className="w-full sm:w-40 h-48 sm:h-40 flex-shrink-0 relative overflow-hidden rounded-[1.8rem] md:rounded-[2.5rem] shadow-xl">
               <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-125 transition-transform duration-700" />
            </div>
            <div className="flex-grow flex flex-col justify-between py-1">
              <div>
                <h3 className="text-2xl md:text-3xl font-black text-gray-950 group-hover:text-orange-600 transition-colors mb-2 md:mb-3 tracking-tighter">{item.name}</h3>
                <p className="text-gray-400 font-bold text-xs md:text-sm leading-relaxed mb-4 md:mb-6 line-clamp-2">{item.description}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl md:text-3xl font-black text-gray-950 tracking-tighter">{settings.general.currencySymbol}{item.price}</span>
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="gradient-primary text-white p-4 md:p-5 rounded-[1.4rem] md:rounded-[1.8rem] shadow-2xl hover:scale-110 transition-all active:scale-95"
                >
                  <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
        {(!restaurant.menu || restaurant.menu.length === 0) && (
          <div className="col-span-full py-20 md:py-32 text-center">
            <p className="text-gray-300 font-black uppercase tracking-[0.3em] md:tracking-[0.5em] text-sm md:text-lg">No Items Available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDetail;

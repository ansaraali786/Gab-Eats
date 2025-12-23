
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const RestaurantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { restaurants, addToCart, currentUser, settings } = useApp();
  
  const restaurant = restaurants.find(r => r.id === id);
  if (!restaurant) return <div className="text-center py-20 text-2xl font-black">Restaurant not found</div>;

  const handleAddToCart = (item: any) => {
    if (!currentUser) {
      alert("Hold your hunger! Login with your phone number first.");
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
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center text-sm font-black text-orange-600 uppercase tracking-widest mb-10 hover:translate-x-[-8px] transition-transform">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to restaurants
      </Link>

      <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-gray-100 flex flex-col md:flex-row gap-12 items-center mb-16 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 gradient-primary"></div>
        <img src={restaurant.image} alt={restaurant.name} className="w-full md:w-80 h-64 rounded-[2rem] object-cover shadow-2xl transform hover:rotate-2 transition-transform" />
        <div className="flex-grow text-center md:text-left">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-6">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">{restaurant.name}</h1>
            {settings.features.ratingsEnabled && (
              <span className="bg-amber-50 text-amber-600 font-black px-4 py-1.5 rounded-2xl text-sm flex items-center shadow-sm">
                ★ {restaurant.rating}
              </span>
            )}
          </div>
          <p className="text-gray-400 font-bold text-xl mb-8 uppercase tracking-widest">{restaurant.cuisine}</p>
          <div className="flex flex-wrap justify-center md:justify-start gap-10">
            <div>
              <span className="block text-[10px] font-black text-gray-300 uppercase mb-2">Delivery</span>
              <span className="text-lg font-black text-teal-600">{restaurant.deliveryTime}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black text-gray-300 uppercase mb-2">Min Order</span>
              <span className="text-lg font-black text-gray-900">{settings.general.currencySymbol} {settings.commissions.minOrderValue}</span>
            </div>
            <div>
              <span className="block text-[10px] font-black text-gray-300 uppercase mb-2">Fee</span>
              <span className={`text-lg font-black ${settings.commissions.deliveryFee === 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                {settings.commissions.deliveryFee === 0 ? 'Free' : `${settings.general.currencySymbol} ${settings.commissions.deliveryFee}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-10 flex items-center justify-between border-b border-gray-100 pb-8">
        <h2 className="text-4xl font-black text-gray-900 tracking-tight">Today's Menu</h2>
        <div className="w-20 h-1 gradient-accent rounded-full"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {restaurant.menu.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 flex gap-6 hover:shadow-2xl transition-all group relative overflow-hidden">
            <img src={item.image} alt={item.name} className="w-32 h-32 rounded-[2rem] object-cover shadow-md group-hover:scale-110 transition-transform" />
            <div className="flex-grow flex flex-col justify-between">
              <div>
                <h3 className="text-2xl font-black text-gray-900 group-hover:text-orange-600 transition-colors mb-2">{item.name}</h3>
                <p className="text-gray-400 font-medium text-sm leading-relaxed mb-4">{item.description}</p>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-2xl font-black text-gray-900">{settings.general.currencySymbol} {item.price}</span>
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="bg-gray-900 text-white p-3 rounded-2xl hover:gradient-primary transition-all shadow-lg group-hover:shadow-orange-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantDetail;

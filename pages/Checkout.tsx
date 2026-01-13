
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GoogleGenAI } from "@google/genai";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, currentUser, addOrder, clearCart, settings } = useApp();
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groundingLinks, setGroundingLinks] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    contactNo: currentUser?.identifier || '',
    address: '',
    coordinates: undefined as { lat: number, lng: number } | undefined
  });

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const total = subtotal + settings.commissions.deliveryFee;

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          coordinates: { lat: latitude, lng: longitude }
        }));

        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Reverse geocode this location: Latitude ${latitude}, Longitude ${longitude}. Provide only a short, readable street address or building name for a food delivery rider in ${settings.general.timezone.split('/')[1] || 'Pakistan'}.`,
            config: {
              tools: [{ googleMaps: {} }],
              toolConfig: {
                retrievalConfig: {
                  latLng: { latitude, longitude }
                }
              }
            },
          });

          if (response.text) {
            setFormData(prev => ({ ...prev, address: response.text.trim() }));
          }
          
          if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            setGroundingLinks(response.candidates[0].groundingMetadata.groundingChunks);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          setFormData(prev => ({ 
            ...prev, 
            address: `Current Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` 
          }));
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        alert("Unable to retrieve location. Please enter address manually.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || isSubmitting) return;
    
    if (subtotal < settings.commissions.minOrderValue) {
      alert(`Minimum order is ${settings.general.currencySymbol} ${settings.commissions.minOrderValue}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const newOrder = {
        id: Math.random().toString(36).substr(2, 9),
        customerName: formData.name,
        contactNo: formData.contactNo,
        address: formData.address,
        coordinates: formData.coordinates,
        items: cart,
        total: total,
        status: 'Pending' as const,
        createdAt: new Date().toISOString()
      };

      // We don't await because addOrder handles persistence internally
      addOrder(newOrder);
      clearCart();
      navigate('/order-success');
    } catch (err) {
      console.error("Order submission failed:", err);
      alert("Something went wrong while placing your order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMapPreviewUrl = () => {
    if (!formData.coordinates) return null;
    return `https://maps.google.com/maps?q=${formData.coordinates.lat},${formData.coordinates.lng}&z=15&output=embed`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
        <div className="order-1">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 md:mb-8 tracking-tighter uppercase">Delivery Details</h2>
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-nova">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-900"
                placeholder="e.g. Ali Ahmed"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
            
            <div className="relative">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Delivery Address</label>
                <button 
                  type="button"
                  onClick={handleUseLocation}
                  disabled={isLocating}
                  className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 hover:underline disabled:opacity-50"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                  {isLocating ? 'Locating...' : 'Use My GPS'}
                </button>
              </div>
              <textarea 
                required
                rows={3}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-orange-500 transition-all font-bold text-gray-900"
                placeholder="Street name, House number, Landmark..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              ></textarea>
              
              {groundingLinks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {groundingLinks.map((chunk, idx) => (
                    chunk.maps && (
                      <div key={idx} className="bg-blue-50/30 p-3 rounded-xl border border-blue-100">
                        <a 
                          href={chunk.maps.uri} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 font-bold hover:underline flex items-center gap-1"
                        >
                          📍 {chunk.maps.title || 'View Grounded Location'}
                        </a>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {formData.coordinates && (
              <div className="rounded-2xl overflow-hidden border border-gray-100 h-48 md:h-40 w-full relative group shadow-sm">
                <iframe 
                  title="Location Preview"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  scrolling="no" 
                  src={getMapPreviewUrl() || ''}
                ></iframe>
                <div className="absolute inset-0 bg-transparent pointer-events-none group-hover:bg-black/5 transition-colors"></div>
              </div>
            )}

            <button 
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-5 gradient-primary text-white rounded-2xl font-black text-lg md:text-xl shadow-xl shadow-orange-100 transition-all uppercase tracking-widest flex items-center justify-center gap-3 ${isSubmitting ? 'opacity-70 scale-95' : 'hover:scale-[1.02]'}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : 'Complete Order'}
            </button>
          </form>
        </div>

        <div className="order-2 lg:order-2">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-6 md:mb-8 tracking-tighter uppercase">Your Feast</h2>
          <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 shadow-nova lg:sticky lg:top-10">
            <div className="space-y-6 mb-8 pr-1 md:pr-2">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center group gap-4">
                  <div className="flex items-center gap-4 flex-grow min-w-0">
                    <div className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-gray-50 rounded-xl flex items-center justify-center font-black text-orange-600 text-[11px] md:text-sm border border-gray-100 group-hover:gradient-primary group-hover:text-white transition-all">
                      {item.quantity}x
                    </div>
                    <div className="truncate">
                      <p className="font-black text-gray-800 text-sm leading-tight truncate">{item.name}</p>
                      <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest truncate">{item.restaurantName}</p>
                    </div>
                  </div>
                  <span className="font-black text-gray-900 whitespace-nowrap text-sm">{settings.general.currencySymbol} {item.price * item.quantity}</span>
                </div>
              ))}
            </div>
            
            <div className="border-t-2 border-dashed border-gray-100 pt-8 space-y-4">
              <div className="flex justify-between text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                <span>Items Subtotal</span>
                <span className="text-gray-900">{settings.general.currencySymbol} {subtotal}</span>
              </div>
              <div className="flex justify-between text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                <span>Delivery Charge</span>
                <span className={settings.commissions.deliveryFee === 0 ? "text-teal-600 font-black" : "text-gray-900 font-black"}>
                  {settings.commissions.deliveryFee === 0 ? 'Free' : `${settings.general.currencySymbol} ${settings.commissions.deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-6 text-gray-900">
                <span className="text-xl md:text-2xl font-black tracking-tighter uppercase">Total Payable</span>
                <span className="text-3xl md:text-4xl font-black text-orange-600 tracking-tighter">{settings.general.currencySymbol} {total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

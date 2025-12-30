
import React, { useState } from 'react';
// Fix: Ensuring standard named imports for react-router-dom v6
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { GoogleGenAI } from "@google/genai";

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, currentUser, addOrder, clearCart, settings } = useApp();
  const [isLocating, setIsLocating] = useState(false);
  // Fix: Track grounding links for Maps requirement
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
          // Fix: Maps grounding is only supported in Gemini 2.5 series models
          const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The user is at latitude: ${latitude}, longitude: ${longitude}. Provide a friendly, concise, and accurate street address or landmark description for this location in ${settings.general.timezone.split('/')[1] || 'this area'}.`,
            config: {
              tools: [{ googleMaps: {} }],
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude: latitude,
                    longitude: longitude
                  }
                }
              }
            },
          });

          // Fix: Extracting text from response property (not method)
          if (response.text) {
            setFormData(prev => ({ ...prev, address: response.text.trim() }));
          }
          
          // Fix: MUST ALWAYS extract URLs from groundingChunks and list them
          if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            setGroundingLinks(response.candidates[0].groundingMetadata.groundingChunks);
          }
        } catch (error) {
          console.error("Geocoding error:", error);
          setFormData(prev => ({ 
            ...prev, 
            address: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)}` 
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (subtotal < settings.commissions.minOrderValue) {
      alert(`Minimum order is ${settings.general.currencySymbol} ${settings.commissions.minOrderValue}`);
      return;
    }

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

    addOrder(newOrder);
    clearCart();
    navigate('/order-success');
  };

  const getMapPreviewUrl = () => {
    if (!formData.coordinates) return null;
    return `https://maps.google.com/maps?q=${formData.coordinates.lat},${formData.coordinates.lng}&z=15&output=embed`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter">Delivery Details</h2>
          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Full Name</label>
              <input 
                type="text" 
                required
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-orange-500 transition-all font-bold"
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
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-orange-500 transition-all font-bold"
                placeholder="Street name, House number, Landmark..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              ></textarea>
              
              {/* Fix: Rendering mandatory grounding URLs */}
              {groundingLinks.length > 0 && (
                <div className="mt-2 space-y-1">
                  {groundingLinks.map((chunk, idx) => (
                    chunk.maps && (
                      <a 
                        key={idx} 
                        href={chunk.maps.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 font-bold hover:underline block"
                      >
                        📍 {chunk.maps.title || 'View Grounded Location'}
                      </a>
                    )
                  ))}
                </div>
              )}
            </div>

            {formData.coordinates && (
              <div className="rounded-2xl overflow-hidden border border-gray-100 h-40 w-full relative group">
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
              className="w-full py-5 gradient-primary text-white rounded-2xl font-black text-xl shadow-xl shadow-orange-100 transition-transform hover:scale-[1.02]"
            >
              Complete Order ({settings.general.currencySymbol} {total})
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-4xl font-black text-gray-900 mb-8 tracking-tighter">Your Feast</h2>
          <div className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm sticky top-24">
            <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-orange-600 text-sm border border-gray-100 group-hover:gradient-primary group-hover:text-white transition-all">
                      {item.quantity}x
                    </div>
                    <div>
                      <p className="font-black text-gray-800 text-sm leading-tight">{item.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.restaurantName}</p>
                    </div>
                  </div>
                  <span className="font-black text-gray-900">{settings.general.currencySymbol} {item.price * item.quantity}</span>
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
                <span className="text-2xl font-black tracking-tighter">Grand Total</span>
                <span className="text-4xl font-black text-orange-600 tracking-tighter">{settings.general.currencySymbol} {total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

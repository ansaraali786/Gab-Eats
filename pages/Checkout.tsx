
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { cart, currentUser, addOrder, clearCart, settings } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    contactNo: currentUser?.identifier || '',
    address: ''
  });

  const subtotal = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);
  const total = subtotal + settings.commissions.deliveryFee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (subtotal < settings.commissions.minOrderValue) {
      alert(`Minimum order value is ${settings.general.currencySymbol} ${settings.commissions.minOrderValue}`);
      return;
    }

    const newOrder = {
      id: Math.random().toString(36).substr(2, 9),
      customerName: formData.name,
      contactNo: formData.contactNo,
      address: formData.address,
      items: cart,
      total: total,
      status: 'Pending' as const,
      createdAt: new Date().toISOString()
    };

    addOrder(newOrder);
    clearCart();
    navigate('/order-success');
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
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Verified Contact</label>
              <input 
                type="tel" 
                required
                className="w-full px-6 py-4 rounded-2xl bg-gray-100 border border-transparent font-bold text-gray-500 cursor-not-allowed"
                value={formData.contactNo}
                readOnly
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Address</label>
              <textarea 
                required
                rows={4}
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-orange-500 transition-all font-bold"
                placeholder="Street name, House number, Landmark, City..."
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              ></textarea>
            </div>
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

            <div className="mt-10 p-6 bg-teal-50 rounded-[2rem] flex items-center gap-5 border border-teal-100/50">
              <div className="w-14 h-14 gradient-secondary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-teal-100">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-teal-900 font-black">Settlement Method</p>
                <p className="text-[10px] text-teal-600 font-bold uppercase tracking-widest">
                  {settings.payments.codEnabled ? 'Cash on Delivery Active' : 'Online Payment Only'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

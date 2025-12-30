
import React from 'react';
// Fix: Ensuring standard named imports for react-router-dom v6
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { CURRENCY_SYMBOL } from '../constants';

const Cart: React.FC = () => {
  const { cart, removeFromCart } = useApp();
  const total = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="text-8xl mb-6">🛒</div>
        <h2 className="text-3xl font-bold text-gray-900">Your cart is empty</h2>
        <p className="text-gray-500 mt-2 mb-8 text-lg">Add some delicious food from our restaurants!</p>
        <Link to="/" className="inline-block bg-green-600 text-white px-8 py-3 rounded-full font-bold hover:bg-green-700 shadow-xl shadow-green-100">
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Review Your Order</h1>
      
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="divide-y divide-gray-100">
          {cart.map(item => (
            <div key={item.id} className="p-6 flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <img src={item.image} alt={item.name} className="w-20 h-20 rounded-xl object-cover" />
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                  <p className="text-gray-500 text-sm">{item.restaurantName}</p>
                  <p className="text-green-600 font-semibold mt-1">Qty: {item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-bold text-gray-900">{CURRENCY_SYMBOL} {item.price * item.quantity}</span>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-400 hover:text-red-600 transition-colors p-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-600 font-medium">Subtotal</span>
            <span className="font-bold text-xl">{CURRENCY_SYMBOL} {total}</span>
          </div>
          <div className="flex justify-between items-center mb-8 pb-8 border-b border-gray-200">
            <span className="text-gray-600 font-medium">Delivery Fee</span>
            <span className="font-bold text-green-600">FREE</span>
          </div>
          <div className="flex justify-between items-center mb-10">
            <span className="text-2xl font-bold text-gray-900">Total</span>
            <span className="text-3xl font-extrabold text-green-700">{CURRENCY_SYMBOL} {total}</span>
          </div>

          <Link 
            to="/checkout" 
            className="block text-center w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-xl hover:bg-green-700 transition-all shadow-xl shadow-green-100"
          >
            Proceed to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Cart;

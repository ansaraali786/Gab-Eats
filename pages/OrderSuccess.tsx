
import React from 'react';
import { Link } from 'react-router-dom';

const OrderSuccess: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 overflow-hidden relative">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 gradient-primary opacity-10 blur-[100px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 gradient-secondary opacity-10 blur-[100px] rounded-full animate-pulse delay-700"></div>
      
      <div className="max-w-xl w-full text-center bg-white/80 backdrop-blur-xl p-16 rounded-[4rem] shadow-2xl border border-white relative z-10">
        <div className="w-32 h-32 gradient-secondary text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-teal-100 animate-bounce">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-6 tracking-tighter">Wohoo! Order Placed.</h1>
        <p className="text-gray-400 font-bold text-lg mb-12 leading-relaxed">
          Your gourmet meal is being prepared by our chefs. You can track the live status in the "My Orders" tab.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link 
            to="/" 
            className="py-5 gradient-primary text-white rounded-3xl font-black text-lg shadow-xl shadow-orange-100 hover:scale-105 transition-transform"
          >
            Order More
          </Link>
          <Link 
            to="/my-orders" 
            className="py-5 bg-white text-gray-900 border-2 border-gray-100 rounded-3xl font-black text-lg hover:bg-gray-50 transition-colors"
          >
            Track Order
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;

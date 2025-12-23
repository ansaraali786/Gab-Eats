
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Navbar: React.FC = () => {
  const { currentUser, logout, cart, settings } = useApp();
  const navigate = useNavigate();
  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (e.detail === 1) {
      navigate('/');
    }
  };

  const handleLogoDoubleClick = () => {
    navigate('/staff-portal');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-3">
            <div 
              onClick={handleLogoClick}
              onDoubleClick={handleLogoDoubleClick}
              className="flex items-center space-x-2 group cursor-pointer select-none"
              title="Double-click for Staff Portal"
            >
              <div className="w-11 h-11 gradient-primary rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-orange-200 transform group-hover:rotate-12 transition-transform">
                {settings.general.platformName.charAt(0)}
              </div>
              <span className="text-2xl font-black tracking-tighter text-gray-900">
                {settings.general.platformName.split('-')[0]}
                <span className="text-orange-600">-{settings.general.platformName.split('-')[1]}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 md:space-x-8">
            <div className="hidden lg:flex items-center space-x-6 text-sm font-bold text-gray-600 uppercase tracking-widest">
              <Link to="/" className="hover:text-orange-600 transition-colors">Restaurants</Link>
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'staff') && (
                <Link to="/admin" className="text-purple-600 hover:text-purple-800 transition-colors font-black">Console</Link>
              )}
              {currentUser?.role === 'customer' && (
                <Link to="/my-orders" className="text-teal-600 hover:text-teal-800 transition-colors font-black">My Orders</Link>
              )}
            </div>
            
            <div className="flex items-center space-x-3 md:space-x-5">
              {currentUser && currentUser.role === 'customer' && (
                <Link to="/cart" className="relative group">
                  <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-orange-50 transition-colors border border-gray-100">
                    <svg className="w-6 h-6 text-gray-700 group-hover:text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 gradient-primary text-white text-[10px] font-black rounded-full w-6 h-6 flex items-center justify-center shadow-lg border-2 border-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

              {currentUser ? (
                <div className="flex items-center bg-gray-50 rounded-2xl p-1 pr-4 border border-gray-100">
                  <div className={`w-8 h-8 ${currentUser.role === 'customer' ? 'gradient-primary' : 'gradient-accent'} rounded-xl flex items-center justify-center text-white text-xs font-bold mr-3`}>
                    {currentUser.identifier.charAt(0).toUpperCase()}
                  </div>
                  <button onClick={handleLogout} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-wider">
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link to="/login" className="gradient-primary text-white px-6 py-3 rounded-2xl font-black hover:shadow-xl hover:shadow-orange-200 transition-all text-sm uppercase tracking-wider">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import React from 'react';

const Navbar: React.FC = () => {
  const { currentUser, logout, cart, settings } = useApp();
  const navigate = useNavigate();
  const cartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: settings.general.platformName,
          text: `Order gourmet food from ${settings.general.platformName}!`,
          url: window.location.origin,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.origin);
      alert('Link copied to clipboard!');
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    if (e.detail === 1) navigate('/');
  };

  const handleLogoDoubleClick = () => navigate('/staff-portal');

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          <div className="flex items-center space-x-2">
            <div 
              onClick={handleLogoClick}
              onDoubleClick={handleLogoDoubleClick}
              className="flex items-center space-x-2 group cursor-pointer select-none"
            >
              <div className="w-9 h-9 md:w-11 md:h-11 gradient-primary rounded-xl flex items-center justify-center text-white font-black text-xl md:text-2xl shadow-lg transform group-active:scale-95 transition-transform">
                {settings.general.platformName.charAt(0)}
              </div>
              <span className="text-xl md:text-2xl font-black tracking-tighter text-gray-900 truncate max-w-[120px] md:max-w-none">
                {settings.general.platformName.split('-')[0]}
                <span className="text-orange-600">-{settings.general.platformName.split('-')[1] || 'EATS'}</span>
              </span>
            </div>
            
            <div className="hidden md:flex items-center ml-4 px-3 py-1 bg-gray-50 rounded-full border border-gray-100">
               <div className="w-1.5 h-1.5 rounded-full mr-2 bg-emerald-500"></div>
               <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">
                 NOVA CORE ACTIVE
               </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-6">
            <button onClick={handleShare} className="p-2.5 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              {currentUser && currentUser.role === 'customer' && (
                <Link to="/cart" className="relative group">
                  <div className="p-2.5 bg-gray-50 rounded-xl group-active:bg-orange-100 border border-gray-100">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  {cartCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 gradient-primary text-white text-[9px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md border-2 border-white">
                      {cartCount}
                    </span>
                  )}
                </Link>
              )}

              {currentUser ? (
                <div className="flex items-center bg-gray-50 rounded-xl p-1 pr-3 border border-gray-100 max-w-[120px] md:max-w-none">
                  <div className={`w-7 h-7 md:w-8 md:h-8 flex-shrink-0 ${currentUser.role === 'customer' ? 'gradient-primary' : 'gradient-accent'} rounded-lg flex items-center justify-center text-white text-[10px] md:text-xs font-bold mr-2 md:mr-3`}>
                    {currentUser.identifier.charAt(0).toUpperCase()}
                  </div>
                  <button onClick={handleLogout} className="text-[9px] md:text-[10px] font-black text-red-500 uppercase tracking-tight truncate">
                    Out
                  </button>
                </div>
              ) : (
                <Link to="/login" className="gradient-primary text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-black text-[10px] md:text-sm uppercase tracking-wider whitespace-nowrap shadow-lg">
                  Login
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

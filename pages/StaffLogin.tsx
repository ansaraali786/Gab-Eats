
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { loginStaff, syncStatus } = useApp();

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    // Slight delay to show loading state for better UX
    setTimeout(() => {
      const success = loginStaff(username, password);
      if (success) {
        navigate('/admin');
      } else {
        alert('Invalid credentials. If this is a new installation, please wait 5 seconds for the cloud sync to finish.');
        setIsLoggingIn(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-gray-950 relative overflow-hidden">
      {/* Decorative ambient background */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex gradient-accent p-5 rounded-[2rem] shadow-2xl mb-6 transform hover:rotate-6 transition-transform">
             <span className="text-white text-4xl font-black">G</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Staff Portal</h2>
          <div className="flex items-center justify-center gap-2 mt-3">
             <div className={`w-2 h-2 rounded-full ${syncStatus === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-spin'}`}></div>
             <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
               {syncStatus === 'online' ? 'Cloud Sync Established' : 'Connecting to Terminal...'}
             </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 p-10">
          <form onSubmit={handleStaffLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Access Identifier</label>
              <input 
                type="text" 
                placeholder="Staff Username"
                className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Secure Passcode</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button 
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-5 gradient-accent text-white rounded-2xl font-black text-lg shadow-2xl transition-all ${isLoggingIn ? 'opacity-50 scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
            >
              {isLoggingIn ? 'Verifying...' : 'Enter Console'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-12 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">
          Proprietary GAB-EATS Multi-Device Infrastructure
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;

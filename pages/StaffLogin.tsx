import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { loginStaff } = useApp();

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    setTimeout(() => {
      const success = loginStaff(username, password);
      if (success) {
        navigate('/admin');
      } else {
        alert('Invalid Credentials. Access Denied.');
        setIsLoggingIn(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-gray-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-orange-600 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-12">
          <div className="inline-flex gradient-accent p-8 rounded-[3rem] shadow-2xl mb-10 transform hover:scale-110 transition-transform">
             <span className="text-white text-6xl font-black">G</span>
          </div>
          <h2 className="text-6xl font-black text-white tracking-tighter">Staff Portal</h2>
          <p className="text-gray-500 font-black uppercase text-[11px] tracking-[0.4em] mt-5">Secured Gateway V13</p>
        </div>

        <div className="bg-white rounded-[4rem] shadow-2xl overflow-hidden p-14 border border-white/5">
          <form onSubmit={handleStaffLogin} className="space-y-10">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Operator Username</label>
              <input 
                type="text" 
                placeholder="Enter Staff ID"
                className="w-full px-8 py-7 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-500 outline-none transition-all font-black text-gray-950 text-lg placeholder-gray-300"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Master Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-8 py-7 rounded-[2rem] bg-gray-50 border-4 border-transparent focus:border-purple-500 outline-none transition-all font-black text-gray-950 text-lg placeholder-gray-300"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-7 gradient-accent text-white rounded-[2rem] font-black text-xl shadow-2xl transition-all tracking-widest uppercase ${isLoggingIn ? 'opacity-50 scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
            >
              {isLoggingIn ? 'Authenticating...' : 'Enter Console'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-16 text-[11px] font-black text-gray-800 uppercase tracking-[0.5em]">
          GAB-EATS CORE • WORLDWIDE STABLE
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;

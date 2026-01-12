
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
        alert('Invalid Credentials. Try: Ansar / Anudada@007');
        setIsLoggingIn(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-gray-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex gradient-accent p-6 rounded-3rem shadow-2xl mb-8 transform hover:scale-110 transition-transform">
             <span className="text-white text-5xl font-black">G</span>
          </div>
          <h2 className="text-5xl font-black text-white tracking-tighter">System Portal</h2>
          <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.4em] mt-4">Authorized Personnel Only</p>
        </div>

        <div className="bg-white rounded-3rem shadow-2xl overflow-hidden p-12">
          <form onSubmit={handleStaffLogin} className="space-y-8">
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Operator Username</label>
              <input 
                type="text" 
                placeholder="Staff ID"
                className="w-full px-8 py-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-purple-500 outline-none transition-all font-black text-gray-900"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Master Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-8 py-6 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-purple-500 outline-none transition-all font-black text-gray-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-6 gradient-accent text-white rounded-2xl font-black text-lg shadow-xl transition-all ${isLoggingIn ? 'opacity-50 scale-95' : 'hover:scale-[1.02] active:scale-95'}`}
            >
              {isLoggingIn ? 'Verifying...' : 'Access Console'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-12 text-[10px] font-black text-gray-700 uppercase tracking-[0.3em]">
          NOVA CORE STABLE | GAB-EATS V13
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;

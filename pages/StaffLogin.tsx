
import React, { useState } from 'react';
// Fix: Ensuring standard named imports for react-router-dom v6
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { loginStaff, peerCount } = useApp();

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    // Attempt local-first login (Quasar V37)
    setTimeout(() => {
      const success = loginStaff(username, password);
      if (success) {
        navigate('/admin');
      } else {
        alert('Credentials rejected. (Note: Root login is Ansar/Anudada@007)');
        setIsLoggingIn(false);
      }
    }, 300);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-gray-950 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600 rounded-full blur-[120px]"></div>
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex gradient-accent p-5 rounded-[2rem] shadow-2xl mb-6 transform hover:rotate-6 transition-transform">
             <span className="text-white text-4xl font-black">G</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Staff Portal</h2>
          
          <div className="flex items-center justify-center gap-3 mt-3">
             <div className={`w-2 h-2 rounded-full ${peerCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
             <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
               {peerCount > 0 ? `${peerCount} CLOUD NODES ACTIVE` : 'LOCAL MESH ONLY'}
             </p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 p-10">
          <form onSubmit={handleStaffLogin} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Username</label>
              <input 
                type="text" 
                placeholder="Staff ID"
                className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-orange-500 outline-none transition-all font-bold"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Passcode</label>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full px-6 py-5 rounded-2xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-orange-500 outline-none transition-all font-bold"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className={`w-full py-5 gradient-accent text-white rounded-2xl font-black text-lg shadow-2xl transition-all ${isLoggingIn ? 'opacity-50 scale-95' : 'hover:scale-[1.02]'}`}
            >
              {isLoggingIn ? 'Authenticating...' : 'Access Console'}
            </button>
          </form>
        </div>
        
        <p className="text-center mt-12 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em] max-w-[200px] mx-auto leading-relaxed">
          QUASAR OPTIMISTIC INFRASTRUCTURE V37
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;

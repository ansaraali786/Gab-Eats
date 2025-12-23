
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const StaffLogin: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { loginStaff } = useApp();

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = loginStaff(username, password);
    if (success) {
      navigate('/admin');
    } else {
      alert('Invalid staff credentials.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-gray-900">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex gradient-accent p-4 rounded-3xl shadow-xl mb-6">
             <span className="text-white text-3xl font-black">G</span>
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight">Staff Portal</h2>
          <p className="text-purple-400 font-bold mt-2 uppercase text-xs tracking-[0.2em]">Authorized Access Only</p>
        </div>

        <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-white/10">
          <div className="p-10">
            <form onSubmit={handleStaffLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Username</label>
                <input 
                  type="text" 
                  placeholder="Admin/Staff ID"
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Password</label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white focus:bg-white/10 focus:border-purple-500 outline-none transition-all font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full py-5 gradient-accent text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-900/20 hover:scale-[1.02] transition-transform"
              >
                Enter Terminal
              </button>
            </form>
          </div>
        </div>
        
        <p className="text-center mt-10 text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">
          Internal GAB-EATS Infrastructure Only
        </p>
      </div>
    </div>
  );
};

export default StaffLogin;

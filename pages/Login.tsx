
import React, { useState } from 'react';
// Fix: Ensuring standard named imports for react-router-dom v6
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const { loginCustomer } = useApp();

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return alert('Enter a valid cell number');
    loginCustomer(phone);
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="inline-flex gradient-primary p-4 rounded-3xl shadow-xl mb-6">
             <span className="text-white text-3xl font-black">G</span>
          </div>
          <h2 className="text-4xl font-black text-gray-900 tracking-tight">Welcome Back</h2>
          <p className="text-gray-400 font-bold mt-2 uppercase text-xs tracking-[0.2em]">Customer Sign In</p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
          <div className="p-10">
            <form onSubmit={handleCustomerLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Cell Number</label>
                <input 
                  type="tel" 
                  placeholder="03XXXXXXXXX"
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent focus:bg-white focus:border-orange-500 outline-none transition-all font-bold text-lg"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full py-5 gradient-primary text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-100 hover:scale-[1.02] transition-transform"
              >
                Start Ordering
              </button>
            </form>
            <p className="text-center mt-6 text-gray-400 text-xs font-medium">
              We'll use your number to track your orders.
            </p>
          </div>
        </div>
        
        <p className="text-center mt-10 text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
          Secured by GAB-EATS Infrastructure
        </p>
      </div>
    </div>
  );
};

export default Login;

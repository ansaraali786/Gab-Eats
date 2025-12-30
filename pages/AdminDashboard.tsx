
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order, GlobalSettings } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, syncStatus, peerCount, forceSync, resetLocalCache,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'cloud'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  
  // Local Form States
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [isResAdding, setIsResAdding] = useState(false);
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState<{username: string, password: string, role: 'staff' | 'admin' | 'manager'}>({ 
    username: '', 
    password: '', 
    role: 'staff' 
  });
  
  const [tempSettings, setTempSettings] = useState<GlobalSettings>(settings);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAILab, setShowAILab] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const itemFileInputRef = useRef<HTMLInputElement>(null);
  const resFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Sync Probe for V36
  useEffect(() => {
    if (peerCount === 0 && activeTab === 'cloud') {
      const probe = setInterval(() => forceSync(), 30000);
      return () => clearInterval(probe);
    }
  }, [peerCount, activeTab]);

  useEffect(() => {
    setTempSettings(settings);
    checkApiKey();
  }, [settings]);

  const checkApiKey = async () => {
    if ((window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    }
  };

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleItemFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await processFile(file);
      setNewItem(prev => ({ ...prev, image: b64 }));
    }
  };

  const handleResFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const b64 = await processFile(file);
      setNewRes(prev => ({ ...prev, image: b64 }));
    }
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResAdding(true);
    const res: Restaurant = {
      id: `res-${Date.now()}`,
      name: newRes.name,
      cuisine: newRes.cuisine,
      image: newRes.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800',
      rating: 5.0,
      deliveryTime: '20-30 min',
      menu: []
    };
    
    addRestaurant(res);
    
    setTimeout(() => {
      setNewRes({ name: '', cuisine: '', image: '' });
      setIsResAdding(false);
    }, 1500);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    let rights: UserRight[] = ['orders'];
    if (newUser.role === 'admin') rights = ['orders', 'restaurants', 'users', 'settings'];
    if (newUser.role === 'manager') rights = ['orders', 'restaurants'];

    const user: User = {
      id: `u-${Date.now()}`,
      identifier: newUser.username,
      password: newUser.password,
      role: newUser.role === 'admin' ? 'admin' : 'staff',
      rights: rights
    };
    addUser(user);
    setNewUser({ username: '', password: '', role: 'staff' });
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a Partner first");
    const item: MenuItem = {
      id: newItem.id || `item-${Date.now()}`,
      name: newItem.name,
      description: newItem.description,
      price: Number(newItem.price),
      category: newItem.category || 'Main',
      image: newItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
    };
    if (newItem.id) updateMenuItem(selectedResId, item);
    else addMenuItem(selectedResId, item);
    setNewItem({ id: '', name: '', description: '', price: '', category: '', image: '' });
  };

  const handleEditItem = (resId: string, item: MenuItem) => {
    setSelectedResId(resId);
    setNewItem({
      id: item.id,
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      image: item.image
    });
    document.getElementById('sku-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUpdateSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(tempSettings);
    alert("Configuration Committed. Updates broadcasting globally.");
  };

  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => o.status === 'Delivered' ? sum + o.total : sum, 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;
    return { revenue: totalRevenue, pending: pendingOrders, partners: restaurants.length, staff: users.length };
  }, [orders, restaurants, users]);

  const generateAIImage = async () => {
    if (!aiPrompt) return alert("Describe the dish");
    setIsAIGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: { parts: [{ text: `High quality food asset: ${aiPrompt}` }] },
        config: { imageConfig: { aspectRatio: "1:1", imageSize: "1K" } }
      });
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            setNewItem(prev => ({ ...prev, image: `data:image/png;base64,${part.inlineData?.data}` }));
            setShowAILab(false);
            break;
          }
        }
      }
    } catch (e) { alert("AI Generation Center is busy."); }
    finally { setIsAIGenerating(false); }
  };

  const handleOpenMap = (order: Order) => {
    const url = order.coordinates 
      ? `https://www.google.com/maps/search/?api=1&query=${order.coordinates.lat},${order.coordinates.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
    window.open(url, '_blank');
  };

  const statusColors: Record<OrderStatus, string> = {
    'Pending': 'bg-amber-100 text-amber-700',
    'Preparing': 'bg-blue-100 text-blue-700',
    'Out for Delivery': 'bg-purple-100 text-purple-700',
    'Delivered': 'bg-emerald-100 text-emerald-700',
    'Cancelled': 'bg-rose-100 text-rose-700'
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
      <div className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">System Console</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Operator: <span className="text-orange-600 font-black">{currentUser.identifier}</span> • <span className="text-gray-900">{currentUser.role}</span>
            </p>
          </div>
          <div className="w-full md:w-auto bg-white shadow-xl rounded-2xl p-1.5 border border-gray-100 overflow-x-auto no-scrollbar flex flex-nowrap scroll-smooth">
            {[
              { id: 'orders', label: 'Orders', icon: '🛒', access: 'orders' },
              { id: 'restaurants', label: 'Inventory', icon: '🏢', access: 'restaurants' },
              { id: 'users', label: 'Security', icon: '🛡️', access: 'users' },
              { id: 'settings', label: 'Controls', icon: '⚙️', access: 'settings' },
              { id: 'cloud', label: 'Cloud Hub', icon: '☁️', access: 'settings' }
            ].filter(tab => currentUser.rights.includes(tab.access as UserRight) || tab.id === 'orders').map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'gradient-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[
            { label: 'Revenue', value: `${settings.general.currencySymbol}${stats.revenue}`, color: 'text-emerald-600', icon: '💰' },
            { label: 'Active Tasks', value: stats.pending, color: 'text-orange-600', icon: '🚀' },
            { label: 'Hyper-Relay', value: peerCount, color: 'text-blue-600', icon: '📶' },
            { label: 'Link Quality', value: syncStatus.toUpperCase(), color: syncStatus === 'online' ? 'text-teal-600' : 'text-amber-600', icon: '📡' }
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm">
              <span className="text-xl md:text-2xl mb-1 md:mb-2 block">{s.icon}</span>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-lg md:text-2xl font-black mt-1 ${s.color} truncate`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border-2 border-dashed border-gray-100">
                  <h3 className="text-xl font-black text-gray-300 uppercase tracking-widest">No Active Traffic</h3>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white rounded-[2rem] p-6 md:p-8 border border-gray-100 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                           <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase">#{order.id.toUpperCase()}</span>
                           <h3 className="text-xl font-black text-gray-900">{order.customerName}</h3>
                           <span className="text-orange-600 font-black text-sm bg-orange-50 px-3 py-1 rounded-lg border border-orange-100 flex items-center gap-1">
                             {order.contactNo}
                           </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 flex items-center gap-1">📍 {order.address}</p>
                        <button onClick={() => handleOpenMap(order)} className="mt-3 text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 hover:underline">Launch GPS</button>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest self-start ${statusColors[order.status]}`}>{order.status}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-gray-50">
                       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                         {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => (
                           <button key={s} onClick={() => updateOrderStatus(order.id, s)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${order.status === s ? 'gradient-primary text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}>{s}</button>
                         ))}
                       </div>
                       <p className="text-2xl font-black text-gray-900 ml-auto">{settings.general.currencySymbol}{order.total}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
              <div className="lg:col-span-1 space-y-8">
                <section className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Add Branch</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-4">
                    <input type="text" placeholder="Branch Label" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Focus" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <div className="space-y-3">
                       <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-4 bg-gray-50 text-gray-500 rounded-xl font-black text-xs uppercase border-2 border-dashed border-gray-200">Identity Media</button>
                       <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={handleResFileUpload} />
                       {newRes.image && <img src={newRes.image} className="h-20 w-full object-cover rounded-xl border mt-2" alt="Preview" />}
                    </div>
                    <button type="submit" disabled={isResAdding} className="w-full py-4 gradient-primary text-white rounded-xl font-black shadow-lg uppercase tracking-widest disabled:opacity-50">
                      {isResAdding ? "Broadcasting..." : "Onboard Branch"}
                    </button>
                  </form>
                </section>
                <section id="sku-form" className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm scroll-mt-24">
                  <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Product Integration</h3>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={selectedResId} onChange={e => setSelectedResId(e.target.value)} required>
                      <option value="">Select Target Node</option>
                      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input type="text" placeholder="Item Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                    <input type="number" placeholder="Price (PKR)" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                    <div className="flex gap-2">
                       <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-orange-50 transition-colors">📷</button>
                       <button type="button" onClick={() => setShowAILab(true)} className="flex-grow bg-purple-50 text-purple-600 rounded-xl font-black text-[10px] uppercase border border-purple-100 shadow-sm">✨ Generative AI Studio</button>
                       <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={handleItemFileUpload} />
                    </div>
                    {newItem.image && <img src={newItem.image} className="h-20 w-full object-cover rounded-xl border mb-2" alt="Preview" />}
                    <button type="submit" className="w-full py-4 gradient-secondary text-white rounded-xl font-black shadow-lg uppercase">Update Mesh Menu</button>
                  </form>
                </section>
              </div>
              <div className="lg:col-span-2 space-y-6">
                {restaurants.map(r => (
                  <div key={r.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-6 flex items-center justify-between bg-gray-50/50">
                      <div className="flex items-center gap-4">
                        <img src={r.image} className="w-12 h-12 rounded-xl object-cover" alt={r.name} />
                        <div>
                          <h4 className="font-black text-lg text-gray-900">{r.name}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{r.cuisine}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteRestaurant(r.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">🗑️</button>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {r.menu.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-50 group hover:border-orange-200 transition-all">
                           <img src={item.image} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt={item.name} />
                           <div className="flex-grow">
                             <h5 className="font-black text-[12px] truncate">{item.name}</h5>
                             <p className="text-[9px] font-bold text-gray-400">{settings.general.currencySymbol}{item.price}</p>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEditItem(r.id, item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">✎</button>
                             <button onClick={() => deleteMenuItem(r.id, item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">✕</button>
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
               <div className="lg:col-span-1">
                 <section className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm sticky top-24">
                   <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Provision Profile</h3>
                   <form onSubmit={handleAddUser} className="space-y-4">
                     <input type="text" placeholder="Username" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 outline-none" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                     <input type="password" placeholder="Passcode" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                     <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                       <option value="staff">Associate (Standard Access)</option>
                       <option value="manager">Officer (Inventory Ops)</option>
                       <option value="admin">Root (Full Clearance)</option>
                     </select>
                     <button type="submit" className="w-full py-4 gradient-accent text-white rounded-xl font-black uppercase tracking-widest shadow-lg shadow-purple-100 transition-transform active:scale-95">Deploy Profile</button>
                   </form>
                 </section>
               </div>
               <div className="lg:col-span-2 space-y-4">
                 {users.map(user => (
                   <div key={user.id} className="bg-white p-6 rounded-[1.5rem] border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-5">
                         <div className={`w-12 h-12 ${user.role === 'admin' ? 'gradient-accent' : 'bg-gray-100 text-gray-400'} rounded-xl flex items-center justify-center font-black text-white text-lg`}>{user.identifier.charAt(0).toUpperCase()}</div>
                         <div>
                            <h4 className="font-black text-gray-900">{user.identifier}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role} Certification</p>
                         </div>
                      </div>
                      <button onClick={() => deleteUser(user.id)} className="p-3 text-rose-400 hover:text-rose-600 transition-colors">🗑️</button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-gray-100 shadow-sm max-w-2xl mx-auto">
               <div className="text-center mb-10">
                  <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-xl animate-pulsar">☁️</div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Pulsar Sync Bridge</h2>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">V36 Hyper-Mesh Monitor</p>
               </div>
               <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                     <div className="mb-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pulsar Namespace</p>
                        <p className="text-sm font-black text-gray-900 font-mono bg-white p-2 rounded border border-gray-100">gab_v36_pulsar</p>
                     </div>
                     <div className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-between ${peerCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${peerCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-spin'}`}></div>
                          {peerCount > 0 ? `Active Nodes: ${peerCount}` : 'Seeking Peer Bridge...'}
                        </div>
                        {peerCount > 0 && <span>STATUS: OPTIMAL</span>}
                     </div>
                  </div>
                  
                  <div className="p-8 bg-amber-50 rounded-[2rem] border border-amber-100">
                     <h4 className="font-black text-amber-900 text-sm mb-2 flex items-center gap-2">
                        <span className="text-lg">🛠️</span> Pulsar Recovery Tools
                     </h4>
                     <p className="text-[10px] text-amber-700 font-bold leading-relaxed mb-6 uppercase tracking-wider">
                       If syncing stops, click 'Atomic Sync' to force a full re-shout of your local data to the entire cluster.
                     </p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button onClick={forceSync} className="w-full py-5 bg-amber-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-amber-100 transition-all hover:scale-[1.02] active:scale-95">Atomic Sync Probe</button>
                        <button onClick={resetLocalCache} className="w-full py-5 bg-rose-500 text-white rounded-2xl font-black uppercase text-xs shadow-xl shadow-rose-100 transition-all hover:scale-[1.02] active:scale-95">Pulsar Reboot</button>
                     </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[600px]">
               <div className="flex overflow-x-auto no-scrollbar border-b border-gray-50 bg-gray-50/50">
                 {[
                   { id: 'general', label: 'Identity', icon: '🌍' },
                   { id: 'financial', label: 'Financials', icon: '💳' },
                   { id: 'payments', label: 'Checkout', icon: '🏧' },
                   { id: 'notifications', label: 'Alerts', icon: '🔔' },
                   { id: 'features', label: 'Modules', icon: '🧩' },
                   { id: 'marketing', label: 'Growth', icon: '📢' },
                   { id: 'themes', label: 'Aesthetics', icon: '🎨' }
                 ].map(tab => (
                   <button key={tab.id} onClick={() => setSettingsSubTab(tab.id)} className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${settingsSubTab === tab.id ? 'text-orange-600 bg-white border-b-2 border-orange-600' : 'text-gray-400 hover:text-gray-600'}`}>
                     <span>{tab.icon}</span>
                     <span>{tab.label}</span>
                   </button>
                 ))}
               </div>
               <div className="p-8 md:p-12">
                 <form onSubmit={handleUpdateSettings} className="max-w-2xl space-y-10">
                    {settingsSubTab === 'general' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">System Name</label>
                             <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 transition-all outline-none shadow-sm" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Regional Hub</label>
                             <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.general.timezone} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, timezone: e.target.value}})}>
                               <option value="Asia/Karachi">Pakistan (PKT)</option>
                               <option value="UTC">International (UTC)</option>
                             </select>
                           </div>
                        </div>
                        <div className="flex items-center gap-4 p-6 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
                           <input type="checkbox" className="w-6 h-6 rounded-lg text-amber-600" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                           <div>
                              <p className="font-black text-amber-900 text-sm uppercase">Maintenance Protocol</p>
                              <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest">Blocks all storefront traffic immediately</p>
                           </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'financial' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Currency Symbol</label>
                             <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500" value={tempSettings.general.currencySymbol} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, currencySymbol: e.target.value}})} />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Commission Rate (%)</label>
                             <input type="number" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500" value={tempSettings.commissions.defaultCommission} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, defaultCommission: Number(e.target.value)}})} />
                           </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Global Delivery Fee</label>
                             <input type="number" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Min Order Threshold</label>
                             <input type="number" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                           </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'payments' && (
                      <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                           <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white transition-colors">
                              <input type="checkbox" className="w-5 h-5 text-orange-600" checked={tempSettings.payments.codEnabled} onChange={e => setTempSettings({...tempSettings, payments: {...tempSettings.payments, codEnabled: e.target.checked}})} />
                              <span className="text-xs font-black uppercase text-gray-700">COD</span>
                           </label>
                           <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white transition-colors">
                              <input type="checkbox" className="w-5 h-5 text-orange-600" checked={tempSettings.payments.easypaisaEnabled} onChange={e => setTempSettings({...tempSettings, payments: {...tempSettings.payments, easypaisaEnabled: e.target.checked}})} />
                              <span className="text-xs font-black uppercase text-gray-700">Easypaisa</span>
                           </label>
                           <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-white transition-colors">
                              <input type="checkbox" className="w-5 h-5 text-orange-600" checked={tempSettings.payments.bankEnabled} onChange={e => setTempSettings({...tempSettings, payments: {...tempSettings.payments, bankEnabled: e.target.checked}})} />
                              <span className="text-xs font-black uppercase text-gray-700">Direct Bank</span>
                           </label>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Settlement Details</label>
                          <textarea rows={4} className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all shadow-sm" value={tempSettings.payments.bankDetails} onChange={e => setTempSettings({...tempSettings, payments: {...tempSettings.payments, bankDetails: e.target.value}})} placeholder="Account Name, IBAN, Bank, Branch..."></textarea>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'themes' && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {APP_THEMES.map(theme => (
                          <button key={theme.id} type="button" onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} className={`p-6 rounded-[2rem] border-4 transition-all text-left shadow-sm ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                             <div className="flex -space-x-2 mb-4">
                                <div className="w-10 h-10 rounded-full border-2 border-white" style={{ background: `linear-gradient(135deg, ${theme.primary[0]}, ${theme.primary[1]})` }}></div>
                                <div className="w-10 h-10 rounded-full border-2 border-white" style={{ background: `linear-gradient(135deg, ${theme.accent[0]}, ${theme.accent[1]})` }}></div>
                             </div>
                             <p className="text-[11px] font-black text-gray-900 uppercase tracking-tighter leading-tight">{theme.name}</p>
                             <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{theme.occasion}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="pt-6 border-t border-gray-100">
                      <button type="submit" className="w-full md:w-auto px-16 py-5 gradient-primary text-white rounded-2xl font-black shadow-2xl uppercase tracking-widest text-sm hover:scale-[1.02] transition-transform shadow-orange-100">Synchronize Cloud Mesh</button>
                    </div>
                 </form>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {showAILab && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-3 gradient-accent"></div>
              <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tighter">AI Lab</h3>
              <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mb-8">Generate Gourmet Platform Assets</p>
              
              {!hasApiKey ? (
                <div className="text-center py-8">
                   <div className="w-20 h-20 bg-purple-100 text-purple-600 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-xl">🔑</div>
                   <button onClick={handleOpenKeySelector} className="w-full py-5 gradient-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-purple-100">Activate AI Engine</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <textarea rows={4} className="w-full px-6 py-5 rounded-[1.5rem] bg-gray-50 border-2 border-transparent focus:border-purple-500 outline-none font-bold text-gray-800 transition-all shadow-sm" placeholder="Describe the dish precisely..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                  <div className="flex gap-4">
                     <button onClick={() => setShowAILab(false)} className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs">Dismiss</button>
                     <button onClick={generateAIImage} disabled={isAIGenerating} className="flex-[2] py-5 gradient-accent text-white rounded-2xl font-black uppercase text-xs shadow-xl disabled:opacity-50">
                       {isAIGenerating ? "Synthesizing..." : "Generate Photo"}
                     </button>
                  </div>
                </div>
              )}
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

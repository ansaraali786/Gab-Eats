
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, GlobalSettings } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, resetLocalCache,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'system'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [tempSettings, setTempSettings] = useState<GlobalSettings>(settings);
  
  const resFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempSettings(settings);
  }, [settings]);

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
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
    setNewRes({ name: '', cuisine: '', image: '' });
    alert("Branch deployed successfully.");
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a branch first!");
    
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
    alert("Inventory SKU Updated.");
  };

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => o.status === 'Delivered' ? s + o.total : s, 0);
    const pending = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    return { revenue, pending, branches: restaurants.length };
  }, [orders, restaurants]);

  if (!currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col lg:flex-row justify-between gap-8 mb-16">
        <div className="flex-grow">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Command Center</h1>
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Authenticated: {currentUser.identifier} | Platform: Nova V7</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</p>
               <p className="text-3xl font-black text-emerald-600 mt-2">{settings.general.currencySymbol}{stats.revenue}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Orders</p>
               <p className="text-3xl font-black text-orange-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Hubs</p>
               <p className="text-3xl font-black text-blue-600 mt-2">{stats.branches}</p>
            </div>
            <div className="bg-gray-950 p-8 rounded-[2.5rem] border border-gray-800 shadow-sm">
               <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">System Health</p>
               <p className="text-3xl font-black text-white mt-2 uppercase">NOMINAL</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white p-3 rounded-[3rem] shadow-2xl border border-gray-50 h-fit self-start w-full lg:w-72">
           {[
             { id: 'orders', label: 'Operations', icon: '🛰️' },
             { id: 'restaurants', label: 'Hubs', icon: '🏢' },
             { id: 'users', label: 'Personnel', icon: '🛡️' },
             { id: 'settings', label: 'Settings', icon: '⚙️' },
             { id: 'system', label: 'Engine', icon: '💎' }
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => setActiveTab(t.id as any)} 
               className={`px-8 py-5 rounded-[2rem] font-black text-[11px] uppercase flex items-center gap-5 transition-all mb-1 ${activeTab === t.id ? 'gradient-primary text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               <span className="text-xl">{t.icon}</span>
               <span>{t.label}</span>
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.2 }}>
          
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white p-32 text-center rounded-[4rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No incoming signals detected.</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex-grow">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400 uppercase">#{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-2xl">{o.customerName}</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-bold truncate max-w-md">📍 {o.address} | 📞 {o.contactNo}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(s => (
                          <button 
                            key={s} 
                            onClick={() => updateOrderStatus(o.id, s as OrderStatus)} 
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${o.status === s ? 'gradient-primary text-white shadow-xl' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black">{settings.general.currencySymbol}{o.total}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-1 space-y-8">
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">New Hub</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-5">
                    <input type="text" placeholder="Hub Name" className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Primary Cuisine" className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-[11px] border-2 border-dashed border-gray-200 uppercase">Upload Asset</button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await processFile(file);
                        setNewRes(prev => ({ ...prev, image: b64 }));
                      }
                    }} />
                    {newRes.image && <img src={newRes.image} className="h-32 w-full object-cover rounded-2xl mt-2 border" />}
                    <button type="submit" className="w-full py-5 gradient-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl">Initialize Hub</button>
                  </form>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-8 uppercase tracking-tight">Active Matrix</h3>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar">
                    {restaurants.map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => setSelectedResId(r.id)}
                        className={`p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedResId === r.id ? 'border-orange-500 bg-orange-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-4">
                          <img src={r.image} className="w-12 h-12 rounded-xl object-cover" />
                          <p className="font-black text-sm">{r.name}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteRestaurant(r.id); }} className="text-rose-500 text-lg">🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm min-h-full">
                  <h3 className="text-3xl font-black mb-10 uppercase tracking-tighter">SKU Management</h3>
                  {selectedResId ? (
                    <div className="space-y-10">
                      <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-10 rounded-[3rem]">
                        <div className="space-y-5">
                           <input type="text" placeholder="Product Name" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                           <textarea placeholder="Ingredients / Notes" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" rows={3} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                        </div>
                        <div className="space-y-5">
                           <input type="number" placeholder="Unit Price" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                           <input type="text" placeholder="Category" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                           <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-full py-4 bg-white text-gray-400 rounded-2xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">Product Image</button>
                           <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const b64 = await processFile(file);
                               setNewItem(prev => ({ ...prev, image: b64 }));
                             }
                           }} />
                        </div>
                        <button type="submit" className="md:col-span-2 py-6 gradient-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl">
                          {newItem.id ? 'Push Update' : 'Initialize SKU'}
                        </button>
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {restaurants.find(r => r.id === selectedResId)?.menu.map(item => (
                          <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-6 group hover:border-orange-200 transition-colors">
                             <img src={item.image} className="w-20 h-20 rounded-2xl object-cover" />
                             <div className="flex-grow">
                                <h4 className="font-black text-base">{item.name}</h4>
                                <p className="text-xs font-bold text-gray-400 uppercase">{settings.general.currencySymbol}{item.price}</p>
                             </div>
                             <div className="flex gap-2">
                                <button onClick={() => setNewItem({...item, price: item.price.toString()})} className="p-3 text-blue-500 bg-blue-50 rounded-xl">✏️</button>
                                <button onClick={() => deleteMenuItem(selectedResId, item.id)} className="p-3 text-rose-500 bg-rose-50 rounded-xl">🗑️</button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-32 bg-gray-50 rounded-[3rem]">
                       <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Awaiting Hub Selection</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm h-fit">
                  <h3 className="text-3xl font-black mb-10 uppercase tracking-tighter">Enrollment</h3>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const user: User = {
                      id: `u-${Date.now()}`,
                      identifier: newUser.username,
                      password: newUser.password,
                      role: newUser.role as any,
                      rights: newUser.role === 'admin' ? ['orders', 'restaurants', 'users', 'settings'] : ['orders']
                    };
                    addUser(user);
                    setNewUser({ username: '', password: '', role: 'staff' });
                    alert("Credential matrix updated.");
                  }} className="space-y-5">
                     <input type="text" placeholder="Platform Alias" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                     <input type="password" placeholder="Secure Key" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                     <select className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Operator Level 1</option>
                        <option value="admin">System Administrator</option>
                     </select>
                     <button type="submit" className="w-full py-6 gradient-accent text-white rounded-3xl font-black uppercase shadow-2xl">Broadcast Credentials</button>
                  </form>
               </div>
               <div className="space-y-5">
                  <h3 className="text-xl font-black text-gray-900 uppercase ml-4 mb-8 tracking-wider">Access Registry</h3>
                  {users.map(u => (
                    <div key={u.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-xl ${u.role === 'admin' ? 'gradient-accent' : 'bg-gray-100 text-gray-400'}`}>{u.identifier[0].toUpperCase()}</div>
                          <div>
                             <h4 className="font-black text-lg">{u.identifier}</h4>
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{u.role} Rank</p>
                          </div>
                       </div>
                       <button onClick={() => deleteUser(u.id)} className="p-4 text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden">
               <div className="flex border-b border-gray-50 overflow-x-auto no-scrollbar bg-gray-50/50">
                  {['general', 'branding', 'financial', 'security'].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setSettingsSubTab(t)} 
                      className={`px-16 py-8 text-[11px] font-black uppercase tracking-[0.3em] transition-all whitespace-nowrap ${settingsSubTab === t ? 'text-orange-600 border-b-4 border-orange-600 bg-white' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
               <div className="p-16">
                  <form onSubmit={(e) => { e.preventDefault(); updateSettings(tempSettings); alert("Platform parameters updated."); }} className="space-y-12 max-w-4xl">
                     
                     {settingsSubTab === 'general' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div className="space-y-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Platform Identity</label>
                                <input type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Timezone Context</label>
                                <input type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.general.timezone} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, timezone: e.target.value}})} />
                            </div>
                          </div>
                          <div className="bg-orange-50 p-8 rounded-[3rem] border border-orange-100 h-fit">
                             <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">Operational Status</h4>
                             <div className="flex gap-4">
                                <button type="button" onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, platformStatus: 'Live'}})} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase ${tempSettings.general.platformStatus === 'Live' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Online</button>
                                <button type="button" onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, platformStatus: 'Paused'}})} className={`px-8 py-4 rounded-2xl font-black text-xs uppercase ${tempSettings.general.platformStatus === 'Paused' ? 'bg-rose-500 text-white shadow-lg' : 'bg-white text-gray-400'}`}>Pause</button>
                             </div>
                          </div>
                       </div>
                     )}

                     {settingsSubTab === 'branding' && (
                        <div className="space-y-10">
                           <div className="p-10 bg-gray-50 rounded-[3rem] border">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Visual Theme Control</h4>
                              <p className="text-gray-500 text-sm font-bold mb-8 italic">Choose the primary visual language for GAB-EATS.</p>
                              <div className="grid grid-cols-2 gap-6">
                                 {['default', 'dark', 'neon'].map(theme => (
                                    <div key={theme} className={`p-6 rounded-3xl border-2 transition-all cursor-pointer ${tempSettings.general.themeId === theme ? 'border-orange-500 bg-white' : 'border-transparent bg-gray-100'}`} onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme}})}>
                                       <span className="font-black uppercase text-xs tracking-widest">{theme}</span>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                     )}

                     {settingsSubTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Default Commission (%)</label>
                              <input type="number" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.commissions.defaultCommission} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, defaultCommission: Number(e.target.value)}})} />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Base Delivery Fee</label>
                              <input type="number" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                           </div>
                        </div>
                     )}

                     {settingsSubTab === 'security' && (
                        <div className="p-10 bg-rose-50 rounded-[3rem] border border-rose-100 flex items-center justify-between">
                           <div>
                              <h4 className="text-rose-600 font-black uppercase text-xs tracking-widest mb-2">Emergency Protocols</h4>
                              <p className="text-rose-400 text-xs font-bold">Instantly clear all localized caches and disconnect nodes.</p>
                           </div>
                           <button type="button" onClick={resetLocalCache} className="px-10 py-5 bg-rose-500 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest shadow-xl">Nuke Cache</button>
                        </div>
                     )}
                     
                     <div className="pt-10 border-t border-gray-100">
                        <button type="submit" className="px-16 py-7 gradient-primary text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl">Deploy System Update</button>
                     </div>
                  </form>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="max-w-5xl mx-auto">
               <div className="bg-gray-950 rounded-[5rem] p-16 md:p-24 border border-white/10 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 gradient-accent"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                    <div className="space-y-10">
                      <div className="w-32 h-32 gradient-accent rounded-[3.5rem] flex items-center justify-center text-white text-6xl shadow-2xl">💎</div>
                      <h2 className="text-5xl font-black tracking-tighter text-white leading-[1.1]">Nova Core V7.0</h2>
                      <p className="text-gray-400 font-bold leading-relaxed text-lg">Platform is operating in Zero-Error Local-First mode. All synchronization is handled via tab-mesh broadcasting for instant updates across instances without external network overhead.</p>
                      
                      <div className="space-y-4">
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[3rem]">
                           <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Broadcast Status</h4>
                           <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                              <span className="text-emerald-500 font-black text-xs uppercase tracking-widest">Active Mesh</span>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-white/5 p-10 rounded-[4rem] border border-white/5">
                         <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6">Engine Diagnostics</h4>
                         <div className="space-y-4">
                            <div className="flex justify-between items-center text-[10px] font-black">
                               <span className="text-gray-500 uppercase">Latency:</span>
                               <span className="text-emerald-400">&lt;1ms (Local)</span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black">
                               <span className="text-gray-500 uppercase">Buffer usage:</span>
                               <span className="text-white">Optimal</span>
                            </div>
                         </div>
                      </div>

                      <div className="bg-white/5 p-10 rounded-[4rem] border border-white/5 font-mono text-[10px] text-gray-500 space-y-3">
                        <p className="flex justify-between"><span>NAMESPACE:</span> <span className="text-blue-400">NOVA_V7</span></p>
                        <p className="flex justify-between"><span>STATE_HASH:</span> <span className="text-emerald-400">NOMINAL</span></p>
                        <p className="flex justify-between"><span>UPTIME:</span> <span className="text-white">CONTINUOUS</span></p>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

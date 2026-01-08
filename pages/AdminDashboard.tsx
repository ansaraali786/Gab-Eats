
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order, GlobalSettings } from '../types';
import { APP_THEMES, NEBULA_KEY, RELAY_PEERS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, syncStatus, peerCount, forceSync, resetLocalCache,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings, addCustomPeer
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'cloud'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [tempSettings, setTempSettings] = useState<GlobalSettings>(settings);
  const [customPeerUrl, setCustomPeerUrl] = useState('');
  
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
    return { revenue, pending, peers: peerCount, branches: restaurants.length };
  }, [orders, peerCount, restaurants]);

  if (!currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col lg:flex-row justify-between gap-8 mb-16">
        <div className="flex-grow">
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Nebula Control</h1>
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-2">Operator: {currentUser.identifier} | Mesh ID: {NEBULA_KEY}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Revenue</p>
               <p className="text-3xl font-black text-emerald-600 mt-2">{settings.general.currencySymbol}{stats.revenue}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Traffic</p>
               <p className="text-3xl font-black text-orange-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Hubs</p>
               <p className="text-3xl font-black text-blue-600 mt-2">{stats.branches}</p>
            </div>
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Global Peers</p>
               <p className={`text-3xl font-black mt-2 uppercase ${peerCount > 0 ? 'text-teal-600' : 'text-rose-500 animate-pulse'}`}>
                 {peerCount}
               </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white p-3 rounded-[3rem] shadow-2xl border border-gray-50 h-fit self-start w-full lg:w-72">
           {[
             { id: 'orders', label: 'Operations', icon: '🛰️' },
             { id: 'restaurants', label: 'Inventory', icon: '🏢' },
             { id: 'users', label: 'Security', icon: '🛡️' },
             { id: 'settings', label: 'Platform', icon: '⚙️' },
             { id: 'cloud', label: 'Mesh Core', icon: '✨' }
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
                  <p className="text-gray-300 font-black uppercase tracking-widest text-sm">Awaiting incoming signals...</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex-grow">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400 uppercase">#{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-2xl">{o.customerName}</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-bold">📍 {o.address} | 📞 {o.contactNo}</p>
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
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Deploy Hub</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-5">
                    <input type="text" placeholder="Branch Name" className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Category" className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-[11px] border-2 border-dashed border-gray-200 uppercase">Hub Thumbnail</button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await processFile(file);
                        setNewRes(prev => ({ ...prev, image: b64 }));
                      }
                    }} />
                    {newRes.image && <img src={newRes.image} className="h-32 w-full object-cover rounded-2xl mt-2" />}
                    <button type="submit" className="w-full py-5 gradient-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl">Broadcast Hub</button>
                  </form>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-8 uppercase tracking-tight">Active Nodes</h3>
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
                <div className="bg-white p-10 rounded-[4rem] border border-gray-100 shadow-sm">
                  <h3 className="text-3xl font-black mb-10 uppercase tracking-tighter">Inventory Control</h3>
                  {selectedResId ? (
                    <div className="space-y-10">
                      <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-10 rounded-[3rem]">
                        <div className="space-y-5">
                           <input type="text" placeholder="SKU Name" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                           <textarea placeholder="SKU Description" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" rows={3} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                        </div>
                        <div className="space-y-5">
                           <input type="number" placeholder="Price (PKR)" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                           <input type="text" placeholder="Category" className="w-full px-6 py-5 rounded-2xl bg-white font-bold outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                           <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-full py-4 bg-white text-gray-400 rounded-2xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">Asset Photo</button>
                           <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const b64 = await processFile(file);
                               setNewItem(prev => ({ ...prev, image: b64 }));
                             }
                           }} />
                        </div>
                        <button type="submit" className="md:col-span-2 py-6 gradient-primary text-white rounded-3xl font-black uppercase tracking-widest shadow-2xl">
                          {newItem.id ? 'Save Asset Changes' : 'Update Mesh Inventory'}
                        </button>
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {restaurants.find(r => r.id === selectedResId)?.menu.map(item => (
                          <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-100 flex items-center gap-6 group">
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
                       <p className="text-gray-400 font-black uppercase text-xs tracking-widest">Select a Node to begin management</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               <div className="bg-white p-12 rounded-[4rem] border border-gray-100 shadow-sm h-fit">
                  <h3 className="text-3xl font-black mb-10 uppercase tracking-tighter">Security Enrollment</h3>
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
                    alert("Account Authorized.");
                  }} className="space-y-5">
                     <input type="text" placeholder="Operator Name" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                     <input type="password" placeholder="Passphrase" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                     <select className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Standard Operator</option>
                        <option value="admin">Platform Administrator</option>
                     </select>
                     <button type="submit" className="w-full py-6 gradient-accent text-white rounded-3xl font-black uppercase shadow-2xl">Deploy Credentials</button>
                  </form>
               </div>
               <div className="space-y-5">
                  <h3 className="text-xl font-black text-gray-900 uppercase ml-4 mb-8 tracking-wider">Mesh Operator Matrix</h3>
                  {users.map(u => (
                    <div key={u.id} className="bg-white p-8 rounded-[3rem] border border-gray-100 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-6">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-white text-xl ${u.role === 'admin' ? 'gradient-accent' : 'bg-gray-100 text-gray-400'}`}>{u.identifier[0].toUpperCase()}</div>
                          <div>
                             <h4 className="font-black text-lg">{u.identifier}</h4>
                             <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{u.role} Access Rank</p>
                          </div>
                       </div>
                       <button onClick={() => deleteUser(u.id)} className="p-4 text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-[4rem] border border-gray-100 shadow-sm overflow-hidden min-h-[700px]">
               <div className="flex border-b border-gray-50 overflow-x-auto no-scrollbar bg-gray-50/50">
                  {['general', 'marketing', 'financial', 'infrastructure', 'themes'].map(t => (
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
                  <form onSubmit={(e) => { e.preventDefault(); updateSettings(tempSettings); alert("Configuration updated."); }} className="space-y-12 max-w-4xl">
                     
                     {settingsSubTab === 'general' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Platform Identity</label>
                            <input type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Base Currency</label>
                            <input type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.general.currencySymbol} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, currencySymbol: e.target.value}})} />
                          </div>
                          <div className="md:col-span-2 p-10 bg-gray-50 rounded-[3rem] border border-gray-100 flex justify-between items-center">
                             <div>
                               <p className="font-black text-sm uppercase">Maintenance Mode</p>
                               <p className="text-xs font-bold text-gray-400 uppercase mt-1">Locks all customer interactions</p>
                             </div>
                             <input type="checkbox" className="w-8 h-8 rounded-xl" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                          </div>
                       </div>
                     )}

                     {settingsSubTab === 'marketing' && (
                        <div className="space-y-10">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                              <div>
                                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Hero Title</label>
                                 <input type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.marketing.heroTitle} onChange={e => setTempSettings({...tempSettings, marketing: {...tempSettings.marketing, heroTitle: e.target.value}})} />
                              </div>
                              <div>
                                 <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Hero Subtitle</label>
                                 <input type="text" className="w-full px-8 py-5 rounded-3xl bg-gray-50 font-bold outline-none" value={tempSettings.marketing.heroSubtitle} onChange={e => setTempSettings({...tempSettings, marketing: {...tempSettings.marketing, heroSubtitle: e.target.value}})} />
                              </div>
                           </div>
                        </div>
                     )}

                     {settingsSubTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                           <div className="bg-gray-50 p-10 rounded-[3rem] border border-gray-100">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Universal Delivery Fee</label>
                              <input type="number" className="w-full px-8 py-5 rounded-3xl bg-white font-bold outline-none" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                           </div>
                        </div>
                     )}

                     {settingsSubTab === 'infrastructure' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 space-y-6">
                              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Gateways</h4>
                              <div className="space-y-4">
                                 {Object.entries(tempSettings.payments).map(([key, val]) => (
                                    typeof val === 'boolean' && (
                                       <div key={key} className="flex justify-between items-center py-2">
                                          <span className="text-xs font-black uppercase">{key.replace('Enabled', '')}</span>
                                          <input type="checkbox" checked={val} onChange={e => setTempSettings({...tempSettings, payments: {...tempSettings.payments, [key]: e.target.checked}})} />
                                       </div>
                                    )
                                 ))}
                              </div>
                           </div>
                        </div>
                     )}
                     
                     <div className="pt-10 border-t border-gray-100">
                        <button type="submit" className="px-16 py-7 gradient-primary text-white rounded-[2.5rem] font-black uppercase tracking-widest text-xs shadow-2xl">Broadcast Platform Updates</button>
                     </div>
                  </form>
               </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="max-w-5xl mx-auto">
               <div className="bg-white rounded-[5rem] p-16 md:p-24 border border-gray-100 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-3 gradient-primary"></div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                    <div className="space-y-10">
                      <div className="w-32 h-32 gradient-primary rounded-[3.5rem] flex items-center justify-center text-white text-6xl shadow-2xl animate-pulse">✨</div>
                      <h2 className="text-5xl font-black tracking-tighter text-gray-900 leading-[1.1]">Mesh Diagnostics</h2>
                      <p className="text-gray-500 font-bold leading-relaxed text-lg text-pretty">Stellar Mesh V300 utilizes an aggressive state document sync to ensure 100% parity across devices globally.</p>
                      
                      <div className="space-y-4">
                        <button onClick={forceSync} className="w-full py-7 gradient-primary text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl hover:scale-105 transition-transform flex items-center justify-center gap-4">
                          <span>🛰️</span> Push Master State
                        </button>
                        <button onClick={resetLocalCache} className="w-full py-7 bg-gray-950 text-white rounded-[2.5rem] font-black uppercase text-xs shadow-2xl hover:bg-black transition-colors flex items-center justify-center gap-4">
                          <span>💀</span> Factory Mesh Reset
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <div className="bg-gray-50 p-10 rounded-[4rem] border border-gray-100">
                         <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Relay Health Matrix</h4>
                         <div className="space-y-4">
                           {RELAY_PEERS.map(peer => (
                             <div key={peer} className="flex justify-between items-center text-[10px] font-black text-gray-500">
                               <span className="truncate max-w-[150px]">{peer.replace('https://', '')}</span>
                               <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase tracking-tighter">Active Node</span>
                             </div>
                           ))}
                         </div>
                      </div>

                      <div className="bg-gray-950 p-10 rounded-[4rem] border border-white/5 font-mono text-[10px] text-gray-500 space-y-3 shadow-2xl">
                        <p className="flex justify-between"><span>V_CORE:</span> <span className="text-white">V300_STELLAR_MESH</span></p>
                        <p className="flex justify-between"><span>NAMESPACE:</span> <span className="text-blue-400">{NEBULA_KEY}</span></p>
                        <p className="flex justify-between"><span>STATE:</span> <span className="text-emerald-400">{syncStatus.toUpperCase()}</span></p>
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

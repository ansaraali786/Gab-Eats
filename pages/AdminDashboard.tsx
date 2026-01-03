
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order, GlobalSettings } from '../types';
import { APP_THEMES, NEBULA_KEY, RELAY_PEERS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, syncStatus, peerCount, forceSync, resetLocalCache,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'cloud'>('orders');
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
    alert("Branch added successfully!");
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Please select a branch first!");
    
    const item: MenuItem = {
      id: newItem.id || `item-${Date.now()}`,
      name: newItem.name,
      description: newItem.description,
      price: Number(newItem.price),
      category: newItem.category || 'Main',
      image: newItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
    };

    if (newItem.id) {
      updateMenuItem(selectedResId, item);
      alert("Item updated!");
    } else {
      addMenuItem(selectedResId, item);
      alert("Item added to menu!");
    }
    
    setNewItem({ id: '', name: '', description: '', price: '', category: '', image: '' });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const user: User = {
      id: `u-${Date.now()}`,
      identifier: newUser.username,
      password: newUser.password,
      role: newUser.role === 'admin' ? 'admin' : 'staff',
      rights: newUser.role === 'admin' ? ['orders', 'restaurants', 'users', 'settings'] : ['orders']
    };
    addUser(user);
    setNewUser({ username: '', password: '', role: 'staff' });
    alert("Security account deployed.");
  };

  const stats = useMemo(() => {
    const revenue = orders.reduce((s, o) => o.status === 'Delivered' ? s + o.total : s, 0);
    const activeCount = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled').length;
    return { revenue, pending: activeCount, peers: peerCount, branches: restaurants.length };
  }, [orders, peerCount, restaurants]);

  if (!currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Stats */}
      <div className="flex flex-col lg:flex-row justify-between gap-8 mb-12">
        <div className="flex-grow">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">System Console</h1>
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.3em] mt-1">Operator: {currentUser.identifier}</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Revenue</p>
               <p className="text-2xl font-black text-emerald-600 mt-1">{settings.general.currencySymbol}{stats.revenue}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Orders</p>
               <p className="text-2xl font-black text-orange-600 mt-1">{stats.pending}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Branches</p>
               <p className="text-2xl font-black text-blue-600 mt-1">{stats.branches}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mesh Rank</p>
               <p className={`text-sm font-black mt-1 uppercase ${peerCount > 0 ? 'text-teal-600' : 'text-blue-500'}`}>
                 {peerCount > 0 ? `Cloud Prime (${peerCount})` : 'Local Authority'}
               </p>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex flex-col bg-white p-2 rounded-[2.5rem] shadow-xl border border-gray-50 h-fit self-start w-full lg:w-64">
           {[
             { id: 'orders', label: 'Live Orders', icon: '🛒' },
             { id: 'restaurants', label: 'Inventory', icon: '🏢' },
             { id: 'users', label: 'Security', icon: '🛡️' },
             { id: 'settings', label: 'Settings', icon: '⚙️' },
             { id: 'cloud', label: 'Nova Hub', icon: '☁️' }
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => setActiveTab(t.id as any)} 
               className={`px-8 py-4 rounded-2xl font-black text-xs uppercase flex items-center gap-4 transition-all ${activeTab === t.id ? 'gradient-primary text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               <span className="text-lg">{t.icon}</span>
               <span>{t.label}</span>
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          
          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white p-20 text-center rounded-[3rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest">No Active Traffic</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex-grow">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-[9px] font-black text-gray-400 uppercase">#{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-xl">{o.customerName}</h3>
                        </div>
                        <p className="text-xs text-gray-400 font-bold">📍 {o.address}</p>
                        <div className="mt-3 flex gap-2">
                          {o.items.map(i => (
                            <span key={i.id} className="text-[9px] font-black bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100">
                              {i.quantity}x {i.name}
                            </span>
                          ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                        {['Pending', 'Preparing', 'Out for Delivery', 'Delivered'].map(s => (
                          <button 
                            key={s} 
                            onClick={() => updateOrderStatus(o.id, s as OrderStatus)} 
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${o.status === s ? 'gradient-primary text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{settings.general.currencySymbol}{o.total}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* INVENTORY TAB */}
          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Branch Creation */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-6 uppercase tracking-tight">Add New Branch</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-4">
                    <input type="text" placeholder="Branch Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Focus" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">Upload Branch Photo</button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await processFile(file);
                        setNewRes(prev => ({ ...prev, image: b64 }));
                      }
                    }} />
                    {newRes.image && <img src={newRes.image} className="h-24 w-full object-cover rounded-xl mt-2" />}
                    <button type="submit" className="w-full py-4 gradient-primary text-white rounded-xl font-black uppercase tracking-widest shadow-xl">Deploy Branch</button>
                  </form>
                </div>

                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-6 uppercase tracking-tight">Active Branches</h3>
                  <div className="space-y-3">
                    {restaurants.map(r => (
                      <div 
                        key={r.id} 
                        onClick={() => setSelectedResId(r.id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${selectedResId === r.id ? 'border-orange-500 bg-orange-50' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-3">
                          <img src={r.image} className="w-10 h-10 rounded-lg object-cover" />
                          <div>
                            <p className="font-black text-xs">{r.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{r.cuisine}</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); deleteRestaurant(r.id); }} className="text-rose-500 text-sm">🗑️</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Menu Item Management */}
              <div className="lg:col-span-2">
                <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Menu Control Hub</h3>
                    <div className="bg-teal-50 text-teal-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase">
                      {selectedResId ? `Editing: ${restaurants.find(r => r.id === selectedResId)?.name}` : 'Select a branch to manage menu'}
                    </div>
                  </div>

                  {selectedResId ? (
                    <div className="space-y-8">
                      <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-[2rem]">
                        <div className="space-y-4">
                           <input type="text" placeholder="Item Name" className="w-full px-5 py-4 rounded-xl bg-white font-bold outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                           <textarea placeholder="Description" className="w-full px-5 py-4 rounded-xl bg-white font-bold outline-none" rows={3} value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                        </div>
                        <div className="space-y-4">
                           <input type="number" placeholder="Price (PKR)" className="w-full px-5 py-4 rounded-xl bg-white font-bold outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                           <input type="text" placeholder="Category (e.g. Main, Dessert)" className="w-full px-5 py-4 rounded-xl bg-white font-bold outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                           <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-full py-3 bg-white text-gray-400 rounded-xl font-black text-[9px] border-2 border-dashed border-gray-200 uppercase">Product Photo</button>
                           <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               const b64 = await processFile(file);
                               setNewItem(prev => ({ ...prev, image: b64 }));
                             }
                           }} />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-4">
                          {newItem.image && <img src={newItem.image} className="h-20 w-20 object-cover rounded-xl border-2 border-white shadow-sm" />}
                          <button type="submit" className="flex-grow py-5 gradient-primary text-white rounded-2xl font-black uppercase tracking-widest shadow-xl">
                            {newItem.id ? 'Save SKU Changes' : 'Add to Inventory'}
                          </button>
                        </div>
                      </form>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {restaurants.find(r => r.id === selectedResId)?.menu.map(item => (
                          <div key={item.id} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 group">
                             <img src={item.image} className="w-16 h-16 rounded-xl object-cover" />
                             <div className="flex-grow">
                                <h4 className="font-black text-sm">{item.name}</h4>
                                <p className="text-[10px] font-bold text-gray-400">{settings.general.currencySymbol}{item.price}</p>
                             </div>
                             <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setNewItem({...item, price: item.price.toString()})} className="p-2 text-blue-500 bg-blue-50 rounded-lg">✏️</button>
                                <button onClick={() => deleteMenuItem(selectedResId, item.id)} className="p-2 text-rose-500 bg-rose-50 rounded-lg">🗑️</button>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-[2rem]">
                       <p className="text-gray-400 font-bold uppercase text-xs">Waiting for branch selection...</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
               <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm h-fit">
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Account Deployment</h3>
                  <form onSubmit={handleAddUser} className="space-y-4">
                     <input type="text" placeholder="Staff Username" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold outline-none" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                     <input type="password" placeholder="Passphrase" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                     <select className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                        <option value="staff">Standard Staff</option>
                        <option value="admin">System Administrator</option>
                     </select>
                     <button type="submit" className="w-full py-5 gradient-accent text-white rounded-2xl font-black uppercase shadow-xl">Authorize Access</button>
                  </form>
               </div>
               <div className="space-y-4">
                  <h3 className="text-xl font-black text-gray-900 uppercase ml-2 mb-6">Credential Matrix</h3>
                  {users.map(u => (
                    <div key={u.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center justify-between shadow-sm">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-white ${u.role === 'admin' ? 'gradient-accent' : 'bg-gray-100 text-gray-400'}`}>{u.identifier[0].toUpperCase()}</div>
                          <div>
                             <h4 className="font-black">{u.identifier}</h4>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{u.role} Rank</p>
                          </div>
                       </div>
                       <button onClick={() => deleteUser(u.id)} className="p-3 text-rose-400 hover:text-rose-600 transition-colors">✕</button>
                    </div>
                  ))}
               </div>
            </div>
          )}

          {/* CLOUD HUB TAB */}
          {activeTab === 'cloud' && (
            <div className="max-w-4xl mx-auto">
               <div className="bg-white rounded-[4rem] p-10 md:p-16 border border-gray-100 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 gradient-primary"></div>
                  
                  <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className="w-full md:w-1/3 text-center">
                      <div className="w-32 h-32 gradient-primary rounded-[3rem] flex items-center justify-center text-white text-6xl mx-auto mb-8 shadow-2xl animate-pulse">☁️</div>
                      <h2 className="text-3xl font-black tracking-tighter mb-2">Nova Core</h2>
                      <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                        {peerCount > 0 ? 'CLOUD PRIME' : 'LOCAL RANK'}
                      </p>
                      <button onClick={forceSync} className="w-full py-5 gradient-primary text-white rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-orange-100 hover:scale-[1.02] transition-transform">Emergency Broadcast</button>
                      <button onClick={resetLocalCache} className="w-full py-5 bg-gray-950 text-white rounded-2xl font-black uppercase text-[10px] shadow-xl mt-4 hover:bg-black transition-colors">Master Reset</button>
                    </div>

                    <div className="flex-grow space-y-6">
                      <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Nova Status Log</p>
                         <div className="font-mono text-[10px] text-gray-600 space-y-2 p-2">
                            <p>{'>'} AUTHORITY: {peerCount > 0 ? 'CLOUD_MESH' : 'LOCAL_HOST'}</p>
                            <p>{'>'} HANDSHAKE: {peerCount > 0 ? 'SUCCESS' : 'PENDING_SOLO'}</p>
                            <p>{'>'} MESH KEY: {NEBULA_KEY}</p>
                            <p>{'>'} PEERS: {peerCount}</p>
                            <div className="mt-4 pt-4 border-t border-gray-200 text-blue-600">
                               Note: Even if peers are 0, data is persistent in Local Storage.
                            </div>
                         </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
               <div className="flex border-b border-gray-50 overflow-x-auto no-scrollbar">
                  {['general', 'marketing', 'financial', 'themes'].map(t => (
                    <button 
                      key={t} 
                      onClick={() => setSettingsSubTab(t)} 
                      className={`px-12 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap ${settingsSubTab === t ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      {t}
                    </button>
                  ))}
               </div>
               <div className="p-12">
                  <form onSubmit={(e) => { e.preventDefault(); updateSettings(tempSettings); alert("Platform Configuration Updated."); }} className="space-y-10 max-w-2xl">
                     {settingsSubTab === 'general' && (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Platform Name</label>
                            <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Currency Symbol</label>
                            <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.general.currencySymbol} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, currencySymbol: e.target.value}})} />
                          </div>
                       </div>
                     )}

                     {settingsSubTab === 'marketing' && (
                        <div className="space-y-6">
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Hero Title</label>
                              <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.marketing.heroTitle} onChange={e => setTempSettings({...tempSettings, marketing: {...tempSettings.marketing, heroTitle: e.target.value}})} />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Hero Subtitle</label>
                              <input type="text" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.marketing.heroSubtitle} onChange={e => setTempSettings({...tempSettings, marketing: {...tempSettings.marketing, heroSubtitle: e.target.value}})} />
                           </div>
                        </div>
                     )}

                     {settingsSubTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Delivery Fee ({tempSettings.general.currencySymbol})</label>
                              <input type="number" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                           </div>
                           <div>
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Min Order Value</label>
                              <input type="number" className="w-full px-6 py-4 rounded-2xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                           </div>
                        </div>
                     )}

                     {settingsSubTab === 'themes' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                           {APP_THEMES.map(theme => (
                              <button 
                                 key={theme.id}
                                 type="button"
                                 onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})}
                                 className={`p-6 rounded-[2rem] border-4 transition-all text-left ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50 shadow-lg scale-105' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}
                              >
                                 <div className="flex gap-1 mb-3">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.primary[0] }}></div>
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.accent[0] }}></div>
                                 </div>
                                 <p className="font-black text-xs uppercase tracking-widest">{theme.name}</p>
                                 <p className="text-[9px] font-bold text-gray-400 mt-1">{theme.occasion}</p>
                              </button>
                           ))}
                        </div>
                     )}
                     
                     <div className="pt-6 border-t border-gray-50">
                        <button type="submit" className="px-12 py-5 gradient-primary text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-100">Broadcast Updates to Mesh</button>
                     </div>
                  </form>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, GlobalSettings } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, 
    syncStatus, updateOrderStatus, addRestaurant, 
    deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings 
  } = useApp();

  // Primary Navigation State
  const [activeTab, setActiveTab] = useState<UserRight | 'system' | 'staff' | 'dispatch'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  
  // Form States
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [itemForm, setItemForm] = useState({ id: '', name: '', description: '', price: '', category: 'Main', image: '' });
  const [newStaff, setNewStaff] = useState({ username: '', password: '', role: 'staff' as 'admin' | 'staff', rights: [] as UserRight[] });
  const [newPhone, setNewPhone] = useState('');
  const [tempSettings, setTempSettings] = useState<GlobalSettings | null>(null);
  
  // Real-time Feedback States
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

  // Refs for File Uploads
  const resFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  // Monitor cloud signals for new order alerts
  useEffect(() => {
    if (orders.length > lastOrderCount) {
      setShowOrderAlert(true);
      setTimeout(() => setShowOrderAlert(false), 5000);
      refreshNotificationLogs();
    }
    setLastOrderCount(orders.length);
  }, [orders.length]);

  // Sync settings and logs on load
  useEffect(() => {
    if (settings) {
      const cleanSettings = JSON.parse(JSON.stringify(settings));
      // Ensure notification array exists
      if (!cleanSettings.notifications.notificationPhones) {
        cleanSettings.notifications.notificationPhones = [cleanSettings.notifications.adminPhone || '03000000000'];
      }
      setTempSettings(cleanSettings);
    }
    refreshNotificationLogs();
  }, [settings]);

  const refreshNotificationLogs = () => {
    const logs = JSON.parse(localStorage.getItem('notification_logs') || '[]');
    setNotificationLogs(logs);
  };

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

  // Branch Logic
  const handleAddRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    const res: Restaurant = {
      id: `res-${Date.now()}`,
      name: newRes.name,
      cuisine: newRes.cuisine,
      image: newRes.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800',
      rating: 5.0,
      deliveryTime: '25-30 min',
      menu: []
    };
    addRestaurant(res);
    setNewRes({ name: '', cuisine: '', image: '' });
  };

  // Menu Item Logic
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Please select a branch first.");
    const item: MenuItem = {
      id: itemForm.id || `item-${Date.now()}`,
      name: itemForm.name,
      description: itemForm.description || 'Gourmet selection.',
      price: Number(itemForm.price),
      category: itemForm.category,
      image: itemForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
    };
    if (itemForm.id) updateMenuItem(selectedResId, item);
    else addMenuItem(selectedResId, item);
    setItemForm({ id: '', name: '', description: '', price: '', category: 'Main', image: '' });
  };

  const handleEditItem = (item: MenuItem) => {
    setItemForm({ id: item.id, name: item.name, description: item.description, price: item.price.toString(), category: item.category, image: item.image });
  };

  // Staff Management
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.username || !newStaff.password) return alert("Fill all credentials.");
    const staffUser: User = {
      id: `staff-${Date.now()}`,
      identifier: newStaff.username,
      password: newStaff.password,
      role: newStaff.role,
      rights: newStaff.role === 'admin' ? ['orders', 'restaurants', 'users', 'settings'] : newStaff.rights
    };
    addUser(staffUser);
    setNewStaff({ username: '', password: '', role: 'staff', rights: [] });
    alert("Operator Access Configured.");
  };

  // Dispatch Hub Mechanism
  const triggerWhatsApp = (phone: string, message: string) => {
    const formattedPhone = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const stats = useMemo(() => {
    const o = Array.isArray(orders) ? orders : [];
    const revenue = o.reduce((sum, order) => order.status === 'Delivered' ? sum + order.total : sum, 0);
    const activeCount = o.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length;
    return { revenue, activeCount, branches: (restaurants || []).length };
  }, [orders, restaurants]);

  const selectedBranch = restaurants.find(r => r.id === selectedResId);

  if (!currentUser || !settings || !tempSettings) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 page-transition relative">
      {/* Dynamic Incoming Order Toast */}
      <AnimatePresence>
        {showOrderAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 20, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 transform -translate-x-1/2 z-[100] gradient-primary text-white px-8 py-5 rounded-cut-sm shadow-2xl flex items-center gap-5 border-2 border-white/30 backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse text-2xl">🚨</div>
            <div className="font-black uppercase tracking-tight">
              <p className="text-[10px] opacity-80 mb-0.5">Global Relay Signal</p>
              <p className="text-sm">New Order Incoming!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header & Main Stats */}
      <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-10 mb-10">
        <div className="flex-grow">
          <h1 className="text-4xl md:text-6xl font-black text-gray-950 tracking-tighter">Control Hub</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Revenue', val: `${settings.general.currencySymbol}${stats.revenue}`, color: 'text-emerald-600' },
              { label: 'Live Orders', val: stats.activeCount, color: 'text-orange-600' },
              { label: 'Branches', val: stats.branches, color: 'text-blue-600' },
              { label: 'Sync', val: syncStatus === 'cloud-active' ? 'ACTIVE' : 'LOCAL', color: syncStatus === 'cloud-active' ? 'text-teal-500' : 'text-gray-400' }
            ].map(s => (
              <div key={s.label} className="bg-white p-6 md:p-10 rounded-cut-md border border-gray-100 shadow-nova">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-2xl md:text-3xl font-black mt-2 tracking-tighter ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Console Side Navigation */}
        <div className="flex lg:flex-col overflow-x-auto no-scrollbar bg-white p-2 rounded-cut-md shadow-lg border border-gray-100 h-fit w-full lg:w-72">
           {[
             { id: 'orders', label: 'Orders', icon: '📦' },
             { id: 'dispatch', label: 'Dispatch', icon: '📲' },
             { id: 'restaurants', label: 'Inventory', icon: '🏪' },
             { id: 'staff', label: 'Operators', icon: '👥' },
             { id: 'settings', label: 'System', icon: '⚙️' }
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => setActiveTab(t.id as any)} 
               className={`px-6 py-4 md:py-5 rounded-cut-sm font-black text-[11px] md:text-[13px] uppercase flex items-center gap-4 transition-all whitespace-nowrap lg:mb-2 ${activeTab === t.id ? 'gradient-primary text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               <span className="text-xl">{t.icon}</span>
               <span className="hidden sm:inline">{t.label}</span>
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
          
          {/* ORDERS MANAGEMENT */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white p-24 text-center rounded-cut-lg border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest">Awaiting Live Signals...</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-8 md:p-10 rounded-cut-lg border border-gray-100 shadow-nova flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-orange-200 transition-all">
                    <div className="flex-grow w-full md:w-auto">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-gray-950 text-white rounded-lg text-[9px] font-black uppercase">#{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-2xl text-gray-950">{o.customerName}</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-bold truncate max-w-md mb-2">📍 {o.address}</p>
                        <p className="text-[10px] text-gray-400 font-bold">📞 {o.contactNo}</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['Pending', 'Preparing', 'Out for Delivery', 'Delivered'].map(s => (
                          <button 
                            key={s} 
                            onClick={() => updateOrderStatus(o.id, s as OrderStatus)} 
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${o.status === s ? 'gradient-primary text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                    <div className="text-right w-full md:w-auto">
                      <p className="text-3xl font-black text-gray-950">{settings.general.currencySymbol}{o.total}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{new Date(o.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* MESSAGING DISPATCH HUB */}
          {activeTab === 'dispatch' && (
            <div className="space-y-8">
              <div className="bg-gray-950 p-10 md:p-14 rounded-cut-lg border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 gradient-primary opacity-10 blur-[100px] rounded-full"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
                   <div>
                     <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4">Messaging Dispatch Hub</h2>
                     <p className="text-gray-400 font-bold max-w-lg leading-relaxed">Instantly relay order details to your delivery team via WhatsApp. All enrolled numbers will appear here as dispatch targets.</p>
                   </div>
                   <div className="bg-white/5 p-6 rounded-cut-sm border border-white/10 min-w-[150px]">
                      <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2 text-center">Active Targets</p>
                      <p className="text-3xl font-black text-white text-center">{(settings.notifications.notificationPhones || []).length}</p>
                   </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {notificationLogs.length === 0 ? (
                  <div className="bg-white p-24 text-center rounded-cut-lg border-2 border-dashed border-gray-100">
                    <p className="text-gray-300 font-black uppercase tracking-widest">Awaiting Communication Signals...</p>
                  </div>
                ) : (
                  notificationLogs.slice().reverse().map((log, idx) => (
                    <div key={idx} className="bg-white p-8 md:p-10 rounded-cut-lg border border-gray-100 shadow-nova flex flex-col lg:flex-row gap-8 items-start lg:items-center justify-between group hover:border-orange-200 transition-all">
                       <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-4">
                             <span className="px-3 py-1 bg-teal-50 text-teal-600 rounded-lg text-[10px] font-black uppercase tracking-widest">Order #{log.orderId.toUpperCase()}</span>
                             <span className="text-gray-400 font-bold text-xs">{new Date(log.time).toLocaleTimeString()}</span>
                          </div>
                          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                             <p className="text-gray-900 font-bold text-sm whitespace-pre-wrap">{log.message}</p>
                          </div>
                       </div>
                       <div className="flex flex-col gap-3 min-w-[240px]">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-2">Recipient: {log.phone}</p>
                          <button 
                            onClick={() => triggerWhatsApp(log.phone, log.message)}
                            className="w-full py-4 gradient-secondary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 group-hover:scale-[1.02] transition-transform"
                          >
                            <span className="text-xl">📲</span> Push WhatsApp
                          </button>
                       </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* BRANCH & MENU INVENTORY */}
          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                {/* Add Branch Form */}
                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">New Branch</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-4">
                    <input type="text" placeholder="Branch Name" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Category" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">
                      {newRes.image ? 'Photo Ready' : 'Upload Cover'}
                    </button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setNewRes({...newRes, image: await processFile(file)});
                    }} />
                    <button type="submit" className="w-full py-5 gradient-primary text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest">Initialize Branch</button>
                  </form>
                </div>

                {/* Add/Edit Menu Item Form */}
                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">{itemForm.id ? 'Edit Item' : 'New Menu Item'}</h3>
                  <select className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black mb-4 outline-none text-gray-900" value={selectedResId} onChange={e => setSelectedResId(e.target.value)}>
                    <option value="">Select Target Branch</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <input type="text" placeholder="Item Label" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
                    <input type="number" placeholder="Price (PKR)" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} required />
                    <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">
                      {itemForm.image ? 'Product Image Ready' : 'Upload Product Photo'}
                    </button>
                    <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setItemForm({...itemForm, image: await processFile(file)});
                    }} />
                    <button type="submit" className="w-full py-5 gradient-accent text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest">
                      {itemForm.id ? 'Update Record' : 'Publish to Menu'}
                    </button>
                    {itemForm.id && (
                      <button type="button" onClick={() => setItemForm({ id: '', name: '', description: '', price: '', category: 'Main', image: '' })} className="w-full py-2 text-[10px] font-black uppercase text-gray-400">Discard Changes</button>
                    )}
                  </form>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                {/* Branch List */}
                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                   <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Network Branches</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {restaurants.map(r => (
                       <div key={r.id} onClick={() => setSelectedResId(r.id)} className={`p-6 rounded-cut-md border-2 cursor-pointer transition-all ${selectedResId === r.id ? 'border-orange-500 bg-orange-50 shadow-md' : 'border-gray-50 bg-white hover:border-gray-200'}`}>
                         <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <img src={r.image} className="w-12 h-12 rounded-xl object-cover shadow-sm" />
                               <div>
                                 <p className="font-black text-gray-900">{r.name}</p>
                                 <p className="text-[10px] text-gray-400 uppercase font-black">{r.cuisine}</p>
                               </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteRestaurant(r.id); }} className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition-colors">🗑️</button>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Branch Menu View */}
                {selectedBranch && (
                  <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter">Menu Control: {selectedBranch.name}</h3>
                      <span className="text-[10px] font-black bg-gray-900 text-white px-3 py-1 rounded-lg uppercase">{(selectedBranch.menu || []).length} Items</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBranch.menu?.map(item => (
                        <div key={item.id} className="p-4 rounded-cut-sm bg-gray-50 border border-gray-100 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <img src={item.image} className="w-10 h-10 rounded-lg object-cover" />
                            <div>
                               <h4 className="font-black text-sm text-gray-900">{item.name}</h4>
                               <p className="text-[10px] font-bold text-gray-400">{settings.general.currencySymbol}{item.price}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditItem(item)} className="p-2 bg-white text-blue-500 rounded-lg shadow-sm hover:scale-110 transition-transform">✏️</button>
                            <button onClick={() => deleteMenuItem(selectedBranch.id, item.id)} className="p-2 bg-white text-rose-500 rounded-lg shadow-sm hover:scale-110 transition-transform">🗑️</button>
                          </div>
                        </div>
                      ))}
                      {(selectedBranch.menu?.length === 0 || !selectedBranch.menu) && (
                        <div className="col-span-full py-10 text-center text-gray-300 font-black uppercase tracking-widest text-xs">Branch Menu Empty</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAFF & OPERATORS */}
          {activeTab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Enroll Operator</h3>
                  <form onSubmit={handleAddStaff} className="space-y-4">
                    <input type="text" placeholder="Unique Identifier" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} required />
                    <input type="password" placeholder="Secure Password" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} required />
                    <button type="submit" className="w-full py-5 gradient-accent text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest mt-4">Grant Credentials</button>
                  </form>
               </div>
               <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Operator Core</h3>
                  <div className="space-y-4">
                    {users.map(u => (
                      <div key={u.id} className="p-6 rounded-cut-sm bg-gray-50 flex items-center justify-between border border-gray-100">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 gradient-accent rounded-lg flex items-center justify-center text-white font-black">{u.identifier.charAt(0)}</div>
                            <div>
                              <p className="font-black text-gray-900">{u.identifier}</p>
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{u.role}</p>
                            </div>
                         </div>
                         {u.id !== 'admin-1' && <button onClick={() => deleteUser(u.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg">🗑️</button>}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {/* GLOBAL SYSTEM SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
               <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                 {['general', 'branding', 'financial', 'notifications'].map(st => (
                   <button key={st} onClick={() => setSettingsSubTab(st)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${settingsSubTab === st ? 'bg-gray-950 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>{st}</button>
                 ))}
               </div>

               {/* General Settings */}
               {settingsSubTab === 'general' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-950">
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Marketplace Brand Name</label>
                     <input type="text" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none border border-transparent focus:border-orange-500" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                   </div>
                   <div className="flex items-center gap-4 p-6 bg-orange-50 rounded-cut-md border border-orange-100">
                      <input type="checkbox" className="w-6 h-6 rounded accent-orange-500" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                      <span className="text-sm font-black text-orange-600 uppercase">Emergency Maintenance Shutdown</span>
                   </div>
                 </div>
               )}

               {/* Branding & Themes */}
               {settingsSubTab === 'branding' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {APP_THEMES.map(theme => (
                     <div key={theme.id} onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} className={`p-8 rounded-cut-md border-4 transition-all cursor-pointer ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50 shadow-xl' : 'border-gray-50 bg-white hover:border-gray-100'}`}>
                        <div className="flex gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.primary[0] }}></div>
                          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.secondary[0] }}></div>
                        </div>
                        <h4 className="font-black text-xl text-gray-950">{theme.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{theme.occasion}</p>
                     </div>
                   ))}
                 </div>
               )}

               {/* Financial Configurations */}
               {settingsSubTab === 'financial' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-950">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Service Commission (%)</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.defaultCommission} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, defaultCommission: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Default Delivery Fee</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Min Order Val</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                    </div>
                 </div>
               )}

               {/* Notification Hub Settings */}
               {settingsSubTab === 'notifications' && (
                 <div className="space-y-10">
                   <div className="bg-gray-50 p-8 rounded-cut-md border border-gray-100">
                     <h4 className="text-xl font-black text-gray-950 mb-6 uppercase tracking-tighter">Broadcast Enrollment</h4>
                     <p className="text-xs text-gray-400 font-bold mb-8 uppercase tracking-widest">Enroll numbers to receive order broadcast summaries in the Dispatch Hub console.</p>
                     <div className="flex flex-col sm:flex-row gap-4 mb-10">
                        <input type="tel" placeholder="e.g. 03001234567" className="flex-grow px-8 py-4 rounded-xl bg-white border border-gray-200 font-black outline-none focus:border-orange-500" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        <button onClick={() => { if(newPhone) { const n = {...tempSettings, notifications: {...tempSettings.notifications, notificationPhones: [...(tempSettings.notifications.notificationPhones || []), newPhone]}}; setTempSettings(n); setNewPhone(''); } }} className="px-10 py-4 gradient-secondary text-white rounded-xl font-black uppercase text-[10px] shadow-lg tracking-widest">Enroll Target</button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {(tempSettings.notifications.notificationPhones || []).map(phone => (
                         <div key={phone} className="bg-white p-4 px-6 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                           <span className="font-black text-gray-900">{phone}</span>
                           <button onClick={() => { const n = {...tempSettings, notifications: {...tempSettings.notifications, notificationPhones: tempSettings.notifications.notificationPhones.filter(p => p !== phone)}}; setTempSettings(n); }} className="text-rose-500 font-black text-xs hover:underline">Remove</button>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="flex items-center gap-4 p-8 bg-blue-50 rounded-cut-md border border-blue-100">
                      <input type="checkbox" className="w-6 h-6 rounded accent-blue-500" checked={tempSettings.notifications.orderPlacedAlert} onChange={e => setTempSettings({...tempSettings, notifications: {...tempSettings.notifications, orderPlacedAlert: e.target.checked}})} />
                      <span className="text-sm font-black text-blue-600 uppercase">Automatic Broadcast Generation (Dispatch Hub)</span>
                   </div>
                 </div>
               )}

               <div className="mt-12 pt-8 border-t border-gray-100 flex justify-end">
                  <button onClick={() => { updateSettings(tempSettings); alert("Global Parameters Synchronized."); }} className="px-12 py-5 gradient-primary text-white rounded-cut-sm font-black text-sm uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95">Synchronize Core Settings</button>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

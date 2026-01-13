import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, GlobalSettings } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, 
    resetLocalCache, syncStatus, updateOrderStatus, addRestaurant, 
    deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings 
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'system' | 'staff'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [itemForm, setItemForm] = useState({ id: '', name: '', description: '', price: '', category: 'Main', image: '' });
  const [newStaff, setNewStaff] = useState({ username: '', password: '', role: 'staff' as 'admin' | 'staff', rights: [] as UserRight[] });
  const [newPhone, setNewPhone] = useState('');
  const [tempSettings, setTempSettings] = useState<GlobalSettings | null>(null);
  
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

  const resFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  // Monitor for incoming orders from cloud to trigger alerts
  useEffect(() => {
    if (orders.length > lastOrderCount) {
      setShowOrderAlert(true);
      setTimeout(() => setShowOrderAlert(false), 5000);
      const logs = JSON.parse(localStorage.getItem('notification_logs') || '[]');
      setNotificationLogs(logs);
    }
    setLastOrderCount(orders.length);
  }, [orders.length]);

  useEffect(() => {
    if (settings) {
      const cleanSettings = JSON.parse(JSON.stringify(settings));
      if (!cleanSettings.notifications.notificationPhones) {
        cleanSettings.notifications.notificationPhones = [cleanSettings.notifications.adminPhone || '03000000000'];
      }
      setTempSettings(cleanSettings);
    }
    const logs = JSON.parse(localStorage.getItem('notification_logs') || '[]');
    setNotificationLogs(logs);
  }, [settings]);

  const processFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  };

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
    alert("New Branch Integrated.");
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a target branch.");
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
    alert("Menu Updated Successfully.");
  };

  const handleEditItem = (item: MenuItem) => {
    setItemForm({ id: item.id, name: item.name, description: item.description, price: item.price.toString(), category: item.category, image: item.image });
  };

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
    alert("Staff Member Enrolled.");
  };

  const toggleRight = (right: UserRight) => {
    setNewStaff(prev => ({
      ...prev,
      rights: prev.rights.includes(right) ? prev.rights.filter(r => r !== right) : [...prev.rights, right]
    }));
  };

  const stats = useMemo(() => {
    const o = Array.isArray(orders) ? orders : [];
    const revenue = o.reduce((sum, order) => order.status === 'Delivered' ? sum + order.total : sum, 0);
    const activeCount = o.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length;
    return { revenue, activeCount, branches: (restaurants || []).length };
  }, [orders, restaurants]);

  const selectedBranch = restaurants.find(r => r.id === selectedResId);

  const addNotificationPhone = () => {
    if (!newPhone || !tempSettings) return;
    const currentList = tempSettings.notifications.notificationPhones || [];
    if (currentList.includes(newPhone)) return alert("Number already in list.");
    
    const nextSettings = {
      ...tempSettings,
      notifications: { ...tempSettings.notifications, notificationPhones: [...currentList, newPhone] }
    };
    setTempSettings(nextSettings);
    setNewPhone('');
  };

  const removeNotificationPhone = (phone: string) => {
    if (!tempSettings) return;
    const nextSettings = {
      ...tempSettings,
      notifications: { ...tempSettings.notifications, notificationPhones: (tempSettings.notifications.notificationPhones || []).filter(p => p !== phone) }
    };
    setTempSettings(nextSettings);
  };

  if (!currentUser || !settings || !tempSettings) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 page-transition relative">
      <AnimatePresence>
        {showOrderAlert && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }} 
            animate={{ y: 20, opacity: 1 }} 
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 transform -translate-x-1/2 z-[100] gradient-primary text-white px-8 py-5 rounded-cut-sm shadow-2xl flex items-center gap-5 border-2 border-white/30 backdrop-blur-md"
          >
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse text-2xl">🔔</div>
            <div className="font-black uppercase tracking-tight">
              <p className="text-[10px] opacity-80 mb-0.5">Cloud Signal Received</p>
              <p className="text-sm">Incoming Feast Detected!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between gap-6 md:gap-10 mb-10">
        <div className="flex-grow">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h1 className="text-4xl md:text-6xl font-black text-gray-950 tracking-tighter">Control Hub</h1>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { label: 'Revenue', val: `${settings.general.currencySymbol}${stats.revenue}`, color: 'text-emerald-600' },
              { label: 'Live Orders', val: stats.activeCount, color: 'text-orange-600' },
              { label: 'Branches', val: stats.branches, color: 'text-blue-600' },
              { label: 'Status', val: syncStatus === 'cloud-active' ? 'ONLINE' : 'CONNECTING', color: syncStatus === 'cloud-active' ? 'text-teal-500' : 'text-orange-500' }
            ].map(s => (
              <div key={s.label} className="bg-white p-6 md:p-10 rounded-cut-md border border-gray-100 shadow-nova">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-2xl md:text-3xl font-black mt-2 tracking-tighter ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="flex lg:flex-col overflow-x-auto no-scrollbar bg-white p-2 rounded-cut-md shadow-lg border border-gray-100 h-fit w-full lg:w-72">
           {[
             { id: 'orders', label: 'Orders', icon: '📦' },
             { id: 'restaurants', label: 'Branches', icon: '🏪' },
             { id: 'staff', label: 'Staff Hub', icon: '👥' },
             { id: 'settings', label: 'Settings', icon: '⚙️' },
             { id: 'system', label: 'Core', icon: '🛰️' }
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
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white p-24 text-center rounded-cut-lg border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest">Awaiting Remote Signals</p>
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

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Add Branch</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-4">
                    <input type="text" placeholder="Branch Name" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">Upload Branch Photo</button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setNewRes({...newRes, image: await processFile(file)});
                    }} />
                    <button type="submit" className="w-full py-5 gradient-primary text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest">Create Branch</button>
                  </form>
                </div>

                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">{itemForm.id ? 'Edit Item' : 'Add Item'}</h3>
                  <select className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black mb-4 outline-none" value={selectedResId} onChange={e => setSelectedResId(e.target.value)}>
                    <option value="">Select Target Branch</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <input type="text" placeholder="Item Name" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
                    <input type="number" placeholder="Price" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} required />
                    <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-full py-4 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] border-2 border-dashed border-gray-200 uppercase">
                      {itemForm.image ? 'Image Selected' : 'Upload Item Photo'}
                    </button>
                    <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setItemForm({...itemForm, image: await processFile(file)});
                    }} />
                    <button type="submit" className="w-full py-5 gradient-accent text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest">
                      {itemForm.id ? 'Update Item' : 'Publish Item'}
                    </button>
                    {itemForm.id && (
                      <button type="button" onClick={() => setItemForm({ id: '', name: '', description: '', price: '', category: 'Main', image: '' })} className="w-full py-2 text-[10px] font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancel Edit</button>
                    )}
                  </form>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
                <div className="bg-white p-8 md:p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                   <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Active Branches</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {restaurants.map(r => (
                       <div key={r.id} onClick={() => setSelectedResId(r.id)} className={`p-6 rounded-cut-md border-2 flex items-center justify-between group cursor-pointer transition-all ${selectedResId === r.id ? 'border-orange-500 bg-orange-50' : 'border-gray-50 bg-white hover:border-gray-200'}`}>
                         <div className="flex items-center gap-4">
                           <img src={r.image} className="w-16 h-16 rounded-cut-sm object-cover shadow-md" alt="" />
                           <div>
                             <h4 className="font-black text-lg text-gray-950">{r.name}</h4>
                             <p className="text-[10px] text-gray-400 font-black uppercase">{r.cuisine}</p>
                           </div>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); deleteRestaurant(r.id); }} className="text-rose-500 text-xs font-black p-2 hover:bg-rose-100 rounded-lg transition-colors">🗑️</button>
                       </div>
                     ))}
                   </div>
                </div>

                {selectedBranch && (
                  <div className="bg-white p-8 md:p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                    <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Menu Inventory: {selectedBranch.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBranch.menu?.map(item => (
                        <div key={item.id} className="p-4 rounded-cut-md bg-gray-50 border border-gray-100 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <img src={item.image} className="w-12 h-12 rounded-cut-sm object-cover" alt="" />
                            <div>
                               <h4 className="font-black text-sm text-gray-900">{item.name}</h4>
                               <p className="text-[10px] font-bold text-gray-400">{settings.general.currencySymbol}{item.price}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditItem(item)} className="p-2 bg-white text-blue-500 rounded-lg shadow-sm border border-gray-100">✏️</button>
                            <button onClick={() => deleteMenuItem(selectedBranch.id, item.id)} className="p-2 bg-white text-rose-500 rounded-lg shadow-sm border border-gray-100">🗑️</button>
                          </div>
                        </div>
                      ))}
                      {(!selectedBranch.menu || selectedBranch.menu.length === 0) && <p className="col-span-2 text-center text-gray-300 font-black uppercase tracking-widest py-8">No Items Found</p>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Enroll Operator</h3>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <input type="text" placeholder="Username" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} required />
                  <input type="password" placeholder="Password" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} required />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setNewStaff({...newStaff, role: 'staff'})} className={`flex-grow py-3 rounded-xl font-black text-[10px] uppercase ${newStaff.role === 'staff' ? 'bg-gray-950 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>Staff</button>
                    <button type="button" onClick={() => setNewStaff({...newStaff, role: 'admin'})} className={`flex-grow py-3 rounded-xl font-black text-[10px] uppercase ${newStaff.role === 'admin' ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>Admin</button>
                  </div>
                  {newStaff.role === 'staff' && (
                    <div className="pt-4 space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Access Privileges</p>
                      <div className="grid grid-cols-2 gap-2">
                        {['orders', 'restaurants', 'users', 'settings'].map(right => (
                          <button key={right} type="button" onClick={() => toggleRight(right as UserRight)} className={`p-3 rounded-xl font-black text-[9px] uppercase transition-all ${newStaff.rights.includes(right as UserRight) ? 'bg-teal-500 text-white' : 'bg-gray-50 text-gray-300'}`}>
                            {right}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="submit" className="w-full py-5 gradient-accent text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest mt-4">Sync Access</button>
                </form>
              </div>
              <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                 <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Operational Core</h3>
                 <div className="space-y-4">
                   {users.map(u => (
                     <div key={u.id} className="p-6 rounded-cut-md border border-gray-50 bg-gray-50 flex items-center justify-between group hover:border-gray-200 transition-all">
                       <div className="flex items-center gap-4">
                         <div className={`w-12 h-12 rounded-cut-sm flex items-center justify-center text-white text-lg font-black ${u.role === 'admin' ? 'gradient-accent' : 'gradient-secondary'}`}>
                           {u.identifier.charAt(0).toUpperCase()}
                         </div>
                         <div>
                           <h4 className="font-black text-lg text-gray-950">{u.identifier}</h4>
                           <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{u.role} Access</span>
                         </div>
                       </div>
                       {u.id !== 'admin-1' && (
                         <button onClick={() => deleteUser(u.id)} className="text-rose-500 text-xs font-black p-2 hover:bg-rose-100 rounded-lg transition-colors">🗑️</button>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
               <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                 {['general', 'branding', 'financial', 'marketing', 'notifications'].map(st => (
                   <button key={st} onClick={() => setSettingsSubTab(st)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${settingsSubTab === st ? 'bg-gray-950 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>{st}</button>
                 ))}
               </div>

               {settingsSubTab === 'general' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-950">
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Platform Branding</label>
                     <input type="text" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                   </div>
                   <div className="flex items-center gap-4 p-6 bg-orange-50 rounded-cut-md border border-orange-100">
                      <input type="checkbox" className="w-6 h-6 rounded accent-orange-500" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                      <span className="text-sm font-black text-orange-600 uppercase">Emergency Maintenance Mode</span>
                   </div>
                 </div>
               )}

               {settingsSubTab === 'branding' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {APP_THEMES.map(theme => (
                     <div key={theme.id} onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} className={`p-8 rounded-cut-md border-4 transition-all cursor-pointer ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50 shadow-xl' : 'border-gray-50 bg-white hover:border-gray-100'}`}>
                        <div className="flex gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg shadow-md" style={{ backgroundColor: theme.primary[0] }}></div>
                          <div className="w-8 h-8 rounded-lg shadow-md" style={{ backgroundColor: theme.secondary[0] }}></div>
                          <div className="w-8 h-8 rounded-lg shadow-md" style={{ backgroundColor: theme.accent[0] }}></div>
                        </div>
                        <h4 className="font-black text-xl text-gray-950">{theme.name}</h4>
                        <p className="text-[9px] font-black text-gray-400 uppercase mt-1 tracking-widest">{theme.occasion}</p>
                     </div>
                   ))}
                 </div>
               )}

               {settingsSubTab === 'financial' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-950">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Sales Tax / Comm (%)</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.defaultCommission} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, defaultCommission: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Delivery Fee</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Minimum Order</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                    </div>
                 </div>
               )}

               {settingsSubTab === 'notifications' && (
                 <div className="space-y-10">
                   <div className="bg-gray-50 p-8 rounded-cut-md">
                     <h4 className="text-xl font-black text-gray-950 mb-6 uppercase tracking-tighter">Notification Core</h4>
                     <p className="text-xs text-gray-400 font-bold mb-8 uppercase tracking-widest">Global list of mobile recipients for new order broadcasts.</p>
                     <div className="flex flex-col sm:flex-row gap-4 mb-10">
                        <input type="tel" placeholder="e.g. 03001234567" className="flex-grow px-8 py-4 rounded-xl bg-white border border-gray-200 font-black outline-none focus:border-orange-500" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        <button onClick={addNotificationPhone} className="px-10 py-4 gradient-secondary text-white rounded-xl font-black uppercase text-[10px] shadow-lg whitespace-nowrap">Enroll Number</button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {(tempSettings.notifications.notificationPhones || []).map(phone => (
                         <div key={phone} className="bg-white p-4 px-6 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm hover:border-teal-200 transition-colors">
                           <span className="font-black text-gray-900">{phone}</span>
                           <button onClick={() => removeNotificationPhone(phone)} className="text-rose-500 font-black text-xs p-2 hover:bg-rose-50 rounded-lg transition-colors">Remove</button>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="bg-gray-950 rounded-cut-md p-8 border border-gray-800">
                      <h5 className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-6">Dispatch Telemetry (Simulated)</h5>
                      <div className="space-y-3 max-h-60 overflow-y-auto pr-2 no-scrollbar">
                         {notificationLogs.length > 0 ? notificationLogs.slice().reverse().map((log, idx) => (
                           <div key={idx} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                              <div className="flex items-center gap-3">
                                 <span className="text-teal-400 text-xs font-black">✓</span>
                                 <span className="text-white text-[11px] font-bold">SMS Sent to {log.phone}</span>
                              </div>
                              <span className="text-gray-500 text-[9px] font-black">ORDER #{log.orderId.toUpperCase()} • {new Date(log.time).toLocaleTimeString()}</span>
                           </div>
                         )) : (
                           <p className="text-center py-8 text-gray-700 font-black uppercase text-[10px]">No telemetry signals yet</p>
                         )}
                      </div>
                   </div>

                   <div className="flex items-center gap-4 p-8 bg-blue-50 rounded-cut-md border border-blue-100">
                      <input type="checkbox" className="w-6 h-6 rounded accent-blue-500" checked={tempSettings.notifications.orderPlacedAlert} onChange={e => setTempSettings({...tempSettings, notifications: {...tempSettings.notifications, orderPlacedAlert: e.target.checked}})} />
                      <div>
                        <span className="text-sm font-black text-blue-600 uppercase">Broadcast Active</span>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Ensures every device in the list receives the real-time feast alert.</p>
                      </div>
                   </div>
                 </div>
               )}

               <div className="mt-12 pt-8 border-t border-gray-100 flex justify-end">
                  <button onClick={() => { updateSettings(tempSettings); alert("Global Core Configuration Synchronized."); }} className="px-12 py-5 gradient-primary text-white rounded-cut-sm font-black text-sm uppercase shadow-2xl hover:scale-105 transition-transform">Save & Sync Hub</button>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-gray-950 p-20 rounded-cut-lg text-center border-8 border-gray-900 shadow-2xl">
               <div className="text-7xl mb-10">🛰️</div>
               <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Orbital Sync Link</h3>
               <p className="text-gray-500 font-bold text-lg mb-12 max-w-xl mx-auto">Connected to global relay nodes. Latency within optimized boundaries for real-time order tracking.</p>
               <div className="flex flex-wrap justify-center gap-6">
                 <button onClick={() => window.location.reload()} className="px-10 py-5 bg-white/5 border border-white/10 text-white rounded-cut-sm font-black text-xs uppercase tracking-widest hover:bg-white/10">Reload Core</button>
                 <button onClick={resetLocalCache} className="px-10 py-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-cut-sm font-black text-xs uppercase tracking-widest hover:bg-rose-500/20">Purge Memory</button>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

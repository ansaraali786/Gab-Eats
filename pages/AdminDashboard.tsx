
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, GlobalSettings } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const app = useApp();
  
  const { 
    restaurants = [], 
    orders = [], 
    users = [], 
    currentUser, 
    settings, 
    resetLocalCache, 
    syncStatus,
    updateOrderStatus, 
    addRestaurant, 
    deleteRestaurant, 
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem, 
    addUser, 
    deleteUser, 
    updateSettings 
  } = app;

  const [activeTab, setActiveTab] = useState<UserRight | 'system'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' });
  const [tempSettings, setTempSettings] = useState<GlobalSettings | null>(null);
  
  const resFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) setTempSettings(settings);
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
    alert("Branch Hub Initialized.");
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a hub first!");
    
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
    alert("SKU Updated.");
  };

  const stats = useMemo(() => {
    const o = Array.isArray(orders) ? orders : [];
    const revenue = o.reduce((sum, order) => order.status === 'Delivered' ? sum + order.total : sum, 0);
    const pending = o.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length;
    return { revenue, pending, branches: (restaurants || []).length };
  }, [orders, restaurants]);

  if (!currentUser || !settings) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 page-transition">
      <div className="flex flex-col lg:flex-row justify-between gap-8 mb-16">
        <div className="flex-grow">
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-black text-gray-900 tracking-tighter">Control Center</h1>
            <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-sm mt-2 ${
              syncStatus === 'cloud-active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}>
               <div className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'cloud-active' ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
               {syncStatus === 'cloud-active' ? 'Synchronized' : 'Linking...'}
            </div>
          </div>
          <p className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] mt-3">Node: Global-Edge-01</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            <div className="bg-white p-8 rounded-3rem border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Rev</p>
               <p className="text-3xl font-black text-emerald-600 mt-2">{settings.general.currencySymbol}{stats.revenue}</p>
            </div>
            <div className="bg-white p-8 rounded-3rem border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Trans</p>
               <p className="text-3xl font-black text-orange-600 mt-2">{stats.pending}</p>
            </div>
            <div className="bg-white p-8 rounded-3rem border border-gray-100 shadow-sm">
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hub Count</p>
               <p className="text-3xl font-black text-blue-600 mt-2">{stats.branches}</p>
            </div>
            <div className="bg-gray-950 p-8 rounded-3rem border border-gray-800 shadow-sm">
               <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Diagnostics</p>
               <p className="text-3xl font-black text-white mt-2 uppercase">STABLE</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col bg-white p-3 rounded-3rem shadow-2xl border border-gray-50 h-fit self-start w-full lg:w-72">
           {[
             { id: 'orders', label: 'Orders', icon: '📦' },
             { id: 'restaurants', label: 'Hubs', icon: '🏪' },
             { id: 'users', label: 'Staff', icon: '👤' },
             { id: 'settings', label: 'Config', icon: '⚙️' },
             { id: 'system', label: 'Core', icon: '🛸' }
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => setActiveTab(t.id as any)} 
               className={`px-8 py-5 rounded-2rem font-black text-[11px] uppercase flex items-center gap-5 transition-all mb-1 ${activeTab === t.id ? 'gradient-primary text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}
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
              {(!orders || orders.length === 0) ? (
                <div className="bg-white p-32 text-center rounded-4rem border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest text-sm">No incoming telemetry...</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-10 rounded-3rem border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-10">
                    <div className="flex-grow">
                        <div className="flex items-center gap-4 mb-3">
                          <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-400 uppercase">#{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-2xl">{o.customerName}</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-bold">📍 {o.address} | 📞 {o.contactNo}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                <div className="bg-white p-10 rounded-3rem border border-gray-100 shadow-sm">
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Initialize Hub</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-5">
                    <input type="text" placeholder="Hub Name" className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Category" className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-5 bg-gray-50 text-gray-400 rounded-2xl font-black text-[11px] border-2 border-dashed border-gray-200 uppercase">Asset Upload</button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const b64 = await processFile(file);
                        setNewRes(prev => ({ ...prev, image: b64 }));
                      }
                    }} />
                    <button type="submit" className="w-full py-5 gradient-primary text-white rounded-2xl font-black text-[13px] shadow-xl uppercase tracking-widest">Broadcast Hub</button>
                  </form>
                </div>

                <div className="bg-white p-10 rounded-3rem border border-gray-100 shadow-sm">
                  <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Add SKU</h3>
                  <div className="mb-6">
                    <select className="w-full px-6 py-5 rounded-2xl bg-gray-50 font-bold outline-none" value={selectedResId} onChange={e => setSelectedResId(e.target.value)}>
                      <option value="">Select a Hub</option>
                      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <input type="text" placeholder="SKU Name" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                    <input type="number" placeholder="Price" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                    <button type="submit" className="w-full py-5 gradient-accent text-white rounded-2xl font-black text-[13px] shadow-xl uppercase">Push SKU</button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-10 rounded-3rem border border-gray-100 shadow-sm min-h-[600px]">
                   <h3 className="text-2xl font-black mb-8 uppercase tracking-tighter">Network View</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {restaurants.map(r => (
                       <div key={r.id} className="p-6 rounded-2rem border border-gray-50 bg-gray-50/30 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                           <img src={r.image} className="w-16 h-16 rounded-xl object-cover shadow-md" alt="" />
                           <div>
                             <h4 className="font-black text-lg">{r.name}</h4>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{r.cuisine}</p>
                           </div>
                         </div>
                         <button onClick={() => deleteRestaurant(r.id)} className="text-rose-500 p-3 hover:bg-rose-50 rounded-xl transition-colors">🗑️</button>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && tempSettings && (
            <div className="bg-white p-10 rounded-3rem border border-gray-100 shadow-sm">
               <div className="flex flex-wrap gap-4 mb-10 pb-6 border-b border-gray-50">
                 {['general', 'branding', 'financial'].map(st => (
                   <button key={st} onClick={() => setSettingsSubTab(st)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settingsSubTab === st ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>{st}</button>
                 ))}
               </div>

               {settingsSubTab === 'general' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-6">
                      <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 px-1">Platform Identity</label>
                        <input type="text" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-bold" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                      </div>
                   </div>
                   <div className="flex items-center gap-4 mt-8">
                      <label className="flex items-center gap-3 cursor-pointer">
                         <input type="checkbox" className="w-5 h-5 rounded accent-orange-500" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                         <span className="text-[11px] font-black text-gray-900 uppercase">Maintenance Mode</span>
                      </label>
                   </div>
                 </div>
               )}

               {settingsSubTab === 'branding' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {APP_THEMES.map(theme => (
                     <div key={theme.id} onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} className={`p-6 rounded-2rem border-2 transition-all cursor-pointer ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50' : 'border-gray-50'}`}>
                        <div className="flex gap-2 mb-4">
                          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: theme.primary[0] }}></div>
                          <div className="w-5 h-5 rounded-full" style={{ backgroundColor: theme.secondary[0] }}></div>
                        </div>
                        <h4 className="font-black text-xs uppercase">{theme.name}</h4>
                     </div>
                   ))}
                 </div>
               )}

               <div className="mt-12 pt-8 border-t border-gray-50 flex justify-end">
                  <button onClick={() => { updateSettings(tempSettings); alert("Sync Broadcasted."); }} className="px-12 py-5 gradient-primary text-white rounded-2xl font-black text-sm uppercase shadow-xl hover:scale-105 transition-transform">Commit Sync</button>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-gray-950 p-16 rounded-4rem text-center border border-gray-800 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 gradient-primary"></div>
               <div className="text-6xl mb-10">🛸</div>
               <h3 className="text-4xl font-black text-white mb-4 tracking-tighter">Nova Core V13 Global</h3>
               <p className="text-gray-500 font-bold mb-12 max-w-lg mx-auto">Firebase Realtime Sync Link: STABLE</p>
               <button onClick={resetLocalCache} className="px-10 py-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-500/20">Purge Node Cache</button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

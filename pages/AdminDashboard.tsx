
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, GlobalSettings } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const app = useApp();
  const { 
    restaurants = [], orders = [], users = [], currentUser, settings, 
    resetLocalCache, syncStatus, updateOrderStatus, addRestaurant, 
    deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings 
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
    if (settings) setTempSettings(JSON.parse(JSON.stringify(settings)));
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
      deliveryTime: '20-30 min',
      menu: []
    };
    addRestaurant(res);
    setNewRes({ name: '', cuisine: '', image: '' });
    alert("Branch Added Successfully.");
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a branch first.");
    const item: MenuItem = {
      id: newItem.id || `item-${Date.now()}`,
      name: newItem.name,
      description: newItem.description || 'Freshly prepared for you.',
      price: Number(newItem.price),
      category: newItem.category || 'Main',
      image: newItem.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400'
    };
    if (newItem.id) updateMenuItem(selectedResId, item);
    else addMenuItem(selectedResId, item);
    setNewItem({ id: '', name: '', description: '', price: '', category: '', image: '' });
    alert("Food Item Updated.");
  };

  const stats = useMemo(() => {
    const o = Array.isArray(orders) ? orders : [];
    const revenue = o.reduce((sum, order) => order.status === 'Delivered' ? sum + order.total : sum, 0);
    const pending = o.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length;
    return { revenue, pending, branches: (restaurants || []).length };
  }, [orders, restaurants]);

  if (!currentUser || !settings || !tempSettings) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 page-transition">
      <div className="flex flex-col lg:flex-row justify-between gap-12 mb-16">
        <div className="flex-grow">
          <div className="flex items-center gap-6">
            <h1 className="text-6xl font-black text-gray-950 tracking-tighter">Control Center</h1>
            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border shadow-sm ${
              syncStatus === 'cloud-active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-100 border-gray-200 text-gray-400'
            }`}>
               <div className={`w-2.5 h-2.5 rounded-full ${syncStatus === 'cloud-active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
               {syncStatus === 'cloud-active' ? 'Online Sync' : 'Connecting...'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {[
              { label: 'Total Earnings', val: `${settings.general.currencySymbol}${stats.revenue}`, color: 'text-emerald-600' },
              { label: 'Active Orders', val: stats.pending, color: 'text-orange-600' },
              { label: 'Total Branches', val: stats.branches, color: 'text-blue-600' },
              { label: 'System Health', val: 'STABLE', color: 'text-gray-950' }
            ].map(s => (
              <div key={s.label} className="bg-white p-12 rounded-3rem border border-gray-100 shadow-nova transition-all hover:scale-105">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className={`text-4xl font-black mt-4 ${s.color}`}>{s.val}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col bg-white p-4 rounded-3rem shadow-2xl border border-gray-100 h-fit self-start w-full lg:w-80">
           {[
             { id: 'orders', label: 'Live Orders', icon: '📦' },
             { id: 'restaurants', label: 'Branches', icon: '🏪' },
             { id: 'users', label: 'Staff Hub', icon: '👤' },
             { id: 'settings', label: 'App Settings', icon: '⚙️' },
             { id: 'system', label: 'System Core', icon: '🛸' }
           ].map(t => (
             <button 
               key={t.id} 
               onClick={() => setActiveTab(t.id as any)} 
               className={`px-8 py-6 rounded-2rem font-black text-[13px] uppercase flex items-center gap-6 transition-all mb-2 ${activeTab === t.id ? 'gradient-primary text-white shadow-2xl scale-105' : 'text-gray-400 hover:bg-gray-50'}`}
             >
               <span className="text-2xl">{t.icon}</span>
               <span>{t.label}</span>
             </button>
           ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
          
          {activeTab === 'orders' && (
            <div className="space-y-8">
              {(!orders || orders.length === 0) ? (
                <div className="bg-white p-40 text-center rounded-4rem border-4 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest text-lg">No Orders Found</p>
                </div>
              ) : (
                orders.map(o => (
                  <div key={o.id} className="bg-white p-12 rounded-4rem border border-gray-100 shadow-nova flex flex-col md:flex-row justify-between items-center gap-12 group hover:border-orange-200 transition-all">
                    <div className="flex-grow">
                        <div className="flex items-center gap-5 mb-4">
                          <span className="px-5 py-2 bg-gray-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest">ORDER #{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-3xl text-gray-950">{o.customerName}</h3>
                        </div>
                        <p className="text-lg text-gray-400 font-bold">📍 {o.address} | 📞 {o.contactNo}</p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'].map(s => (
                          <button 
                            key={s} 
                            onClick={() => updateOrderStatus(o.id, s as OrderStatus)} 
                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${o.status === s ? 'gradient-primary text-white shadow-xl scale-110' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                          >
                            {s}
                          </button>
                        ))}
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black text-gray-950">{settings.general.currencySymbol}{o.total}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-1 space-y-10">
                <div className="bg-white p-12 rounded-3rem border border-gray-100 shadow-nova">
                  <h3 className="text-3xl font-black mb-10 text-gray-950 uppercase tracking-tighter">Add Branch</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-6">
                    <input type="text" placeholder="Branch Name" className="w-full px-8 py-6 rounded-2xl bg-gray-50 font-black text-gray-950 outline-none border-2 border-transparent focus:border-orange-500" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine (e.g. Fast Food)" className="w-full px-8 py-6 rounded-2xl bg-gray-50 font-black text-gray-950 outline-none border-2 border-transparent focus:border-orange-500" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="button" onClick={() => resFileInputRef.current?.click()} className="w-full py-6 bg-gray-50 text-gray-400 rounded-2xl font-black text-[12px] border-2 border-dashed border-gray-200 uppercase flex items-center justify-center gap-3">
                      <span>📷</span> {newRes.image ? 'Image Attached' : 'Branch Photo'}
                    </button>
                    <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setNewRes({...newRes, image: await processFile(file)});
                    }} />
                    <button type="submit" className="w-full py-6 gradient-primary text-white rounded-2xl font-black text-sm uppercase shadow-2xl tracking-widest hover:scale-105 transition-transform">Create Branch</button>
                  </form>
                </div>

                <div className="bg-white p-12 rounded-3rem border border-gray-100 shadow-nova">
                  <h3 className="text-3xl font-black mb-10 text-gray-950 uppercase tracking-tighter">Add Food Item</h3>
                  <select className="w-full px-8 py-6 rounded-2xl bg-gray-50 font-black mb-6 outline-none text-gray-950 border-2 border-transparent focus:border-purple-500" value={selectedResId} onChange={e => setSelectedResId(e.target.value)}>
                    <option value="">Select Branch</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <form onSubmit={handleSaveItem} className="space-y-6">
                    <input type="text" placeholder="Dish Name" className="w-full px-8 py-5 rounded-xl bg-gray-50 font-black text-gray-950" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                    <input type="number" placeholder="Price (PKR)" className="w-full px-8 py-5 rounded-xl bg-gray-50 font-black text-gray-950" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                    <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-full py-5 bg-gray-50 text-gray-400 rounded-xl font-black text-[11px] border-2 border-dashed border-gray-200 uppercase flex items-center justify-center gap-2">
                       <span>🍔</span> {newItem.image ? 'Photo Selected' : 'Dish Photo'}
                    </button>
                    <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setNewItem({...newItem, image: await processFile(file)});
                    }} />
                    <button type="submit" className="w-full py-6 gradient-accent text-white rounded-2xl font-black text-sm uppercase shadow-2xl">Publish Item</button>
                  </form>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white p-12 rounded-4rem border border-gray-100 shadow-nova min-h-[800px]">
                   <h3 className="text-3xl font-black mb-10 text-gray-950 uppercase tracking-tighter">Branch Directory</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     {restaurants.map(r => (
                       <div key={r.id} className="p-8 rounded-3rem border border-gray-50 bg-gray-50/40 flex items-center justify-between group hover:shadow-xl transition-all">
                         <div className="flex items-center gap-6">
                           <img src={r.image} className="w-24 h-24 rounded-3xl object-cover shadow-xl group-hover:rotate-6 transition-transform" alt="" />
                           <div>
                             <h4 className="font-black text-2xl text-gray-950">{r.name}</h4>
                             <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest">{r.cuisine}</p>
                           </div>
                         </div>
                         <button onClick={() => deleteRestaurant(r.id)} className="text-rose-500 p-4 hover:bg-rose-50 rounded-2xl transition-all font-black text-xs uppercase tracking-widest">Delete</button>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-12 rounded-4rem border border-gray-100 shadow-nova">
               <div className="flex flex-wrap gap-5 mb-12 pb-8 border-b border-gray-50">
                 {['general', 'branding', 'financial', 'marketing'].map(st => (
                   <button key={st} onClick={() => setSettingsSubTab(st)} className={`px-10 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all ${settingsSubTab === st ? 'bg-gray-950 text-white shadow-2xl scale-110' : 'text-gray-400 hover:bg-gray-50'}`}>{st}</button>
                 ))}
               </div>

               {settingsSubTab === 'general' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-10">
                      <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">App Display Name</label>
                        <input type="text" className="w-full px-8 py-6 rounded-3xl bg-gray-50 font-black text-gray-950" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                      </div>
                      <div className="flex items-center gap-6 p-10 bg-orange-50 rounded-3rem border border-orange-100 shadow-sm">
                         <input type="checkbox" className="w-8 h-8 rounded accent-orange-500" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                         <div>
                            <span className="text-[14px] font-black text-orange-600 uppercase">Emergency Maintenance Mode</span>
                            <p className="text-[11px] text-orange-400 font-bold mt-1">Stops all new orders immediately across the globe.</p>
                         </div>
                      </div>
                   </div>
                 </div>
               )}

               {settingsSubTab === 'branding' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                   {APP_THEMES.map(theme => (
                     <div 
                        key={theme.id} 
                        onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} 
                        className={`p-12 rounded-3rem border-4 transition-all cursor-pointer relative overflow-hidden ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50/40' : 'border-gray-50 bg-white hover:border-gray-200'}`}
                      >
                        <div className="flex gap-5 mb-8">
                          <div className="w-12 h-12 rounded-2xl shadow-xl" style={{ backgroundColor: theme.primary[0] }}></div>
                          <div className="w-12 h-12 rounded-2xl shadow-xl" style={{ backgroundColor: theme.secondary[0] }}></div>
                          <div className="w-12 h-12 rounded-2xl shadow-xl" style={{ backgroundColor: theme.accent[0] }}></div>
                        </div>
                        <h4 className="font-black text-2xl text-gray-950 tracking-tighter">{theme.name}</h4>
                        <p className="text-[11px] font-black text-gray-400 uppercase mt-3 tracking-widest">{theme.occasion}</p>
                     </div>
                   ))}
                 </div>
               )}

               {settingsSubTab === 'financial' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-gray-950">
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">App Commission (%)</label>
                      <input type="number" className="w-full px-8 py-6 rounded-3xl bg-gray-50 font-black" value={tempSettings.commissions.defaultCommission} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, defaultCommission: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Standard Delivery Fee</label>
                      <input type="number" className="w-full px-8 py-6 rounded-3xl bg-gray-50 font-black" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Min. Order Amount</label>
                      <input type="number" className="w-full px-8 py-6 rounded-3xl bg-gray-50 font-black" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                    </div>
                 </div>
               )}

               {settingsSubTab === 'marketing' && (
                 <div className="space-y-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div>
                         <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Main Welcome Title</label>
                         <input type="text" className="w-full px-8 py-6 rounded-3xl bg-gray-50 font-black text-gray-950" value={tempSettings.marketing.heroTitle} onChange={e => setTempSettings({...tempSettings, marketing: {...tempSettings.marketing, heroTitle: e.target.value}})} />
                       </div>
                       <div>
                         <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Welcome Sub-Text</label>
                         <input type="text" className="w-full px-8 py-6 rounded-3xl bg-gray-50 font-black text-gray-950" value={tempSettings.marketing.heroSubtitle} onChange={e => setTempSettings({...tempSettings, marketing: {...tempSettings.marketing, heroSubtitle: e.target.value}})} />
                       </div>
                    </div>
                 </div>
               )}

               <div className="mt-20 pt-12 border-t border-gray-100 flex justify-end">
                  <button onClick={() => { updateSettings(tempSettings); alert("Settings Broadcasted Successfully."); }} className="px-20 py-8 gradient-primary text-white rounded-3rem font-black text-xl uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95">Save & Broadcast All</button>
               </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-gray-950 p-24 rounded-4rem text-center border-8 border-gray-900 shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-2 gradient-primary"></div>
               <div className="text-8xl mb-12 animate-bounce">🛸</div>
               <h3 className="text-6xl font-black text-white mb-6 tracking-tighter">System Core V13</h3>
               <p className="text-gray-500 font-bold text-xl mb-16 max-w-2xl mx-auto leading-relaxed">Stable Worldwide Connection Active. Database latency remains within optimized limits.</p>
               <div className="flex flex-wrap justify-center gap-10">
                 <button onClick={() => window.location.reload()} className="px-14 py-7 bg-white/5 border border-white/10 text-white rounded-2rem font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all">Reload Console</button>
                 <button onClick={resetLocalCache} className="px-14 py-7 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2rem font-black text-sm uppercase tracking-widest hover:bg-rose-500/20 transition-all">Reset All Local Data</button>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

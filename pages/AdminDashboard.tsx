import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings, updateOrder
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  
  // Forms State
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff' as const, rights: [] as UserRight[] });

  // Calculated Stats
  const stats = useMemo(() => {
    const totalRevenue = orders.reduce((sum, o) => o.status === 'Delivered' ? sum + o.total : sum, 0);
    const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing').length;
    return {
      revenue: totalRevenue,
      pending: pendingOrders,
      partners: restaurants.length,
      staff: users.length
    };
  }, [orders, restaurants, users]);

  const handleAddRes = (e: React.FormEvent) => {
    e.preventDefault();
    const res: Restaurant = {
      id: `res-${Date.now()}`,
      name: newRes.name,
      cuisine: newRes.cuisine,
      rating: 5.0,
      image: newRes.image || `https://picsum.photos/seed/${newRes.name}/600/400`,
      deliveryTime: '20-30 min',
      menu: []
    };
    addRestaurant(res);
    setNewRes({ name: '', cuisine: '', image: '' });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a partner first");
    const item: MenuItem = {
      id: `item-${Date.now()}`,
      name: newItem.name,
      description: newItem.description,
      price: Number(newItem.price),
      category: newItem.category,
      image: newItem.image || `https://picsum.photos/seed/${newItem.name}/200/200`
    };
    addMenuItem(selectedResId, item);
    setNewItem({ name: '', description: '', price: '', category: '', image: '' });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const u: User = {
      id: `staff-${Date.now()}`,
      identifier: newUser.username,
      password: newUser.password,
      role: newUser.role,
      rights: newUser.rights
    };
    addUser(u);
    setNewUser({ username: '', password: '', role: 'staff', rights: [] });
  };

  const toggleRight = (right: UserRight) => {
    setNewUser(prev => ({
      ...prev,
      rights: prev.rights.includes(right) 
        ? prev.rights.filter(r => r !== right) 
        : [...prev.rights, right]
    }));
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
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Admin Interface Header */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Console Command</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Auth Level: <span className="text-orange-600 font-black">{currentUser.role.toUpperCase()}</span> • Session: <span className="text-gray-900">{currentUser.identifier}</span>
            </p>
          </div>
          <div className="flex bg-white shadow-xl rounded-2xl p-1.5 border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
            {[
              { id: 'orders', label: 'Operations', icon: '🛒' },
              { id: 'restaurants', label: 'Inventory', icon: '🏢' },
              { id: 'users', label: 'Security', icon: '🛡️' },
              { id: 'settings', label: 'Platform', icon: '⚙️' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'gradient-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Global Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Settled Revenue', value: `${settings.general.currencySymbol}${stats.revenue}`, color: 'text-emerald-600', icon: '💰' },
            { label: 'Pending Logistics', value: stats.pending, color: 'text-orange-600', icon: '🚀' },
            { label: 'Active Partners', value: stats.partners, color: 'text-blue-600', icon: '🏢' },
            { label: 'System Operators', value: stats.staff, color: 'text-purple-600', icon: '👮' }
          ].map((s, i) => (
            <motion.div 
              key={s.label} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm"
            >
              <span className="text-2xl mb-2 block">{s.icon}</span>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                  <div className="text-6xl mb-6 grayscale opacity-20">📦</div>
                  <h3 className="text-xl font-black text-gray-300">Terminal idle. No incoming orders.</h3>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm relative group overflow-hidden">
                    <div className="flex flex-wrap justify-between items-start mb-8 gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                           <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 uppercase tracking-widest">#{order.id.toUpperCase()}</span>
                           <h3 className="text-xl font-black text-gray-900">{order.customerName}</h3>
                        </div>
                        <p className="text-xs font-bold text-gray-400">📞 {order.contactNo} • 📍 {order.address}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[order.status]}`}>
                            {order.status}
                         </span>
                         <span className="text-[10px] font-bold text-gray-300">{new Date(order.createdAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mb-8">
                      {order.items.map(item => (
                        <div key={item.id} className="bg-gray-50 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-gray-100 text-gray-600">
                          <span className="text-orange-600 font-black">{item.quantity}x</span> {item.name}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-50 gap-6">
                      <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-100 gap-1 overflow-x-auto no-scrollbar max-w-full">
                        {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => updateOrderStatus(order.id, s)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${order.status === s ? 'gradient-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Collection Value</p>
                        <p className="text-3xl font-black text-gray-900 tracking-tighter">{settings.general.currencySymbol} {order.total}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Restaurant Management Panel */}
              <div className="lg:col-span-1 space-y-8">
                <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-6 text-gray-900">Partner Onboarding</h3>
                  <form onSubmit={handleAddRes} className="space-y-4">
                    <input type="text" placeholder="Brand Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border border-transparent outline-none focus:bg-white focus:border-orange-500" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Style" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border border-transparent outline-none focus:bg-white focus:border-orange-500" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="submit" className="w-full py-4 gradient-primary text-white rounded-xl font-black shadow-lg shadow-orange-100">Establish Partner</button>
                  </form>
                </section>

                <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-6 text-gray-900">SKU Integration</h3>
                  <form onSubmit={handleAddItem} className="space-y-4">
                    <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border border-transparent outline-none cursor-pointer" value={selectedResId} onChange={e => setSelectedResId(e.target.value)} required>
                      <option value="">Target Brand</option>
                      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input type="text" placeholder="Item Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border border-transparent outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                    <input type="number" placeholder="Pricing" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border border-transparent outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                    <button type="submit" className="w-full py-4 gradient-secondary text-white rounded-xl font-black shadow-lg">Inject Menu Item</button>
                  </form>
                </section>
              </div>

              {/* List View */}
              <div className="lg:col-span-2 space-y-6">
                {restaurants.map(r => (
                  <div key={r.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 flex items-center gap-6 group">
                    <img src={r.image} className="w-20 h-20 rounded-2xl object-cover shadow-md" alt={r.name} />
                    <div className="flex-grow">
                      <h4 className="font-black text-xl text-gray-900">{r.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{r.cuisine} • {r.menu.length} SKUs</p>
                    </div>
                    <button onClick={() => deleteRestaurant(r.id)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-sm">
                <h3 className="text-xl font-black mb-8 text-gray-900">Deploy Operator</h3>
                <form onSubmit={handleAddUser} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Operator Identifier</label>
                    <input type="text" placeholder="e.g. admin_ali" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-purple-500 font-bold" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Encryption Key</label>
                    <input type="password" placeholder="••••••••" className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-transparent outline-none focus:bg-white focus:border-purple-500 font-bold" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Command Clearances</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['orders', 'restaurants', 'users', 'settings'] as UserRight[]).map(right => (
                        <button
                          key={right}
                          type="button"
                          onClick={() => toggleRight(right)}
                          className={`px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-left flex items-center justify-between ${newUser.rights.includes(right) ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                          {right}
                          {newUser.rights.includes(right) && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" className="w-full py-5 gradient-accent text-white rounded-2xl font-black shadow-xl shadow-purple-900/20">Authorize & Deploy</button>
                </form>
              </div>

              <div className="space-y-4">
                {users.map(u => (
                  <div key={u.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 flex justify-between items-center group">
                    <div className="flex items-center gap-5">
                       <div className={`w-12 h-12 ${u.role === 'admin' ? 'gradient-primary' : 'gradient-accent'} rounded-2xl flex items-center justify-center text-white font-black text-lg`}>
                          {u.identifier.charAt(0).toUpperCase()}
                       </div>
                       <div>
                          <h4 className="font-black text-gray-900 text-lg">{u.identifier}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.role} • {u.rights.join(', ')}</p>
                       </div>
                    </div>
                    <button onClick={() => deleteUser(u.id)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm min-h-[600px]">
              {/* Settings Navigation */}
              <div className="flex gap-8 border-b border-gray-50 mb-10 pb-4 overflow-x-auto no-scrollbar">
                {[
                  { id: 'general', label: 'Identity', icon: '🏛️' },
                  { id: 'financial', label: 'Financials', icon: '💰' },
                  { id: 'marketing', label: 'Marketing', icon: '📢' },
                  { id: 'themes', label: 'Themes', icon: '🎨' }
                ].map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSettingsSubTab(s.id)}
                    className={`flex items-center gap-2 text-xs font-black uppercase tracking-widest pb-4 border-b-2 transition-all whitespace-nowrap ${settingsSubTab === s.id ? 'text-orange-600 border-orange-600' : 'text-gray-300 border-transparent hover:text-gray-500'}`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>

              {settingsSubTab === 'general' && (
                <div className="max-w-2xl space-y-10">
                  <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center justify-between">
                    <div>
                       <h4 className="text-rose-900 font-black text-lg">Platform Panic Switch</h4>
                       <p className="text-rose-600 text-xs font-bold mt-1">Maintenance mode locks the app for all customers.</p>
                    </div>
                    <button 
                      onClick={() => updateSettings({...settings, general: {...settings.general, maintenanceMode: !settings.general.maintenanceMode}})}
                      className={`px-8 py-3 rounded-xl font-black text-xs uppercase transition-all shadow-lg ${settings.general.maintenanceMode ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-rose-500 border border-rose-200'}`}
                    >
                      {settings.general.maintenanceMode ? 'ACTIVE' : 'OFFLINE'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Global Platform Name</label>
                        <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border border-transparent focus:bg-white focus:border-orange-500" value={settings.general.platformName} onChange={e => updateSettings({...settings, general: {...settings.general, platformName: e.target.value}})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Active Currency Symbol</label>
                        <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border border-transparent focus:bg-white focus:border-orange-500" value={settings.general.currencySymbol} onChange={e => updateSettings({...settings, general: {...settings.general, currencySymbol: e.target.value}})} />
                     </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'financial' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
                  {[
                    { label: 'Platform Commission (%)', val: settings.commissions.defaultCommission, key: 'defaultCommission' },
                    { label: 'Flat Delivery Fee', val: settings.commissions.deliveryFee, key: 'deliveryFee' },
                    { label: 'Minimum Checkout Value', val: settings.commissions.minOrderValue, key: 'minOrderValue' }
                  ].map(f => (
                    <div key={f.key} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{f.label}</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 rounded-xl bg-white font-black text-xl border border-transparent outline-none focus:border-orange-500 text-orange-600" 
                        value={f.val} 
                        onChange={e => updateSettings({...settings, commissions: {...settings.commissions, [f.key]: Number(e.target.value)}})}
                      />
                    </div>
                  ))}
                </div>
              )}

              {settingsSubTab === 'marketing' && (
                <div className="space-y-10 max-w-3xl">
                   <div className="bg-orange-50/50 p-8 rounded-[2.5rem] border border-orange-100">
                      <h4 className="text-orange-900 font-black mb-6">Home Hero Controls</h4>
                      <div className="space-y-4">
                         <input type="text" className="w-full px-6 py-4 rounded-2xl bg-white font-bold border border-orange-100 outline-none" placeholder="Hero Main Title" value={settings.marketing.heroTitle} onChange={e => updateSettings({...settings, marketing: {...settings.marketing, heroTitle: e.target.value}})} />
                         <input type="text" className="w-full px-6 py-4 rounded-2xl bg-white font-bold border border-orange-100 outline-none" placeholder="Hero Subtitle Tagline" value={settings.marketing.heroSubtitle} onChange={e => updateSettings({...settings, marketing: {...settings.marketing, heroSubtitle: e.target.value}})} />
                      </div>
                   </div>

                   <div>
                      <h4 className="text-gray-900 font-black mb-6">Campaign Banners</h4>
                      <div className="space-y-4">
                         {settings.marketing.banners.map((banner, idx) => (
                           <div key={banner.id} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100 flex items-center gap-6">
                              <img src={banner.image} className="w-32 h-20 rounded-xl object-cover shadow-sm" alt="banner" />
                              <div className="flex-grow">
                                 <h5 className="font-black text-gray-900">{banner.title}</h5>
                                 <p className="text-xs font-bold text-gray-400">{banner.subtitle}</p>
                              </div>
                              <button 
                                onClick={() => {
                                  const newBanners = [...settings.marketing.banners];
                                  newBanners[idx].isActive = !newBanners[idx].isActive;
                                  updateSettings({...settings, marketing: {...settings.marketing, banners: newBanners}});
                                }}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${banner.isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-gray-200 text-gray-400'}`}
                              >
                                {banner.isActive ? 'LIVE' : 'DRAFT'}
                              </button>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}

              {settingsSubTab === 'themes' && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {APP_THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => updateSettings({...settings, general: {...settings.general, themeId: theme.id}})}
                      className={`p-5 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group ${settings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50/20 shadow-xl' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'}`}
                    >
                      <div className="h-10 w-full rounded-xl mb-3 shadow-inner" style={{ background: `linear-gradient(135deg, ${theme.primary[0]} 0%, ${theme.primary[1]} 100%)` }}></div>
                      <h4 className="text-[11px] font-black uppercase text-gray-900 leading-tight mb-1">{theme.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{theme.occasion}</p>
                      
                      {settings.general.themeId === theme.id && (
                        <div className="absolute top-4 right-4 bg-orange-500 text-white text-[8px] px-2 py-1 rounded-full font-black">ACTIVE</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

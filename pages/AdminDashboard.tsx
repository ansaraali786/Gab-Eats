
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order, GlobalSettings } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, syncStatus, peerCount, forceSync,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'cloud'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  
  // Forms State
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState<{username: string, password: string, role: 'staff' | 'admin' | 'manager'}>({ 
    username: '', 
    password: '', 
    role: 'staff' 
  });
  
  // Settings Temporary State
  const [tempSettings, setTempSettings] = useState<GlobalSettings>(settings);
  
  // AI Lab State
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAILab, setShowAILab] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const itemFileInputRef = useRef<HTMLInputElement>(null);
  const resFileInputRef = useRef<HTMLInputElement>(null);

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

  // Actions
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
    if (!selectedResId) return alert("Select a Restaurant first");
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
    alert("System parameters updated successfully.");
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
        contents: { parts: [{ text: `Gourmet food photo: ${aiPrompt}` }] },
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
    } catch (e) { alert("AI Service Error. Check billing."); }
    finally { setIsAIGenerating(false); }
  };

  const handleOpenMap = (order: Order) => {
    let url = "";
    if (order.coordinates) {
      url = `https://www.google.com/maps/search/?api=1&query=${order.coordinates.lat},${order.coordinates.lng}`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
    }
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
              { id: 'users', label: 'Users', icon: '🛡️', access: 'users' },
              { id: 'settings', label: 'Settings', icon: '⚙️', access: 'settings' },
              { id: 'cloud', label: 'Sync', icon: '☁️', access: 'settings' }
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
            { label: 'Pending', value: stats.pending, color: 'text-orange-600', icon: '🚀' },
            { label: 'Mesh Neighbors', value: peerCount, color: 'text-blue-600', icon: '📶' },
            { label: 'Sync Health', value: syncStatus.toUpperCase(), color: syncStatus === 'online' ? 'text-teal-600' : 'text-amber-600', icon: '📡' }
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
                  <h3 className="text-xl font-black text-gray-300 uppercase tracking-widest">Order Queue Empty</h3>
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
                             <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/></svg>
                             {order.contactNo}
                           </span>
                        </div>
                        <p className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          📍 {order.address}
                        </p>
                        <button 
                          onClick={() => handleOpenMap(order)}
                          className="mt-3 text-[10px] font-black text-orange-600 uppercase flex items-center gap-1 hover:underline"
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                          Open Delivery Pin
                        </button>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest self-start ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-6 border-t border-gray-50">
                       <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                         {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => (
                           <button key={s} onClick={() => updateOrderStatus(order.id, s)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${order.status === s ? 'gradient-primary text-white' : 'bg-gray-50 text-gray-400'}`}>
                             {s}
                           </button>
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
                  <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Onboard Partner</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-4">
                    <input type="text" placeholder="Restaurant Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine (e.g. Fast Food)" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Brand Identity (Logo)</label>
                       <div className="flex gap-2">
                          <button type="button" onClick={() => resFileInputRef.current?.click()} className="flex-grow py-4 bg-gray-50 text-gray-500 rounded-xl font-black text-xs uppercase border-2 border-dashed border-gray-200 hover:border-orange-300 hover:text-orange-500 transition-all">
                            {newRes.image ? 'Swap Image' : 'Upload Logo'}
                          </button>
                          <input type="file" ref={resFileInputRef} className="hidden" accept="image/*" onChange={handleResFileUpload} />
                       </div>
                       {newRes.image && <img src={newRes.image} className="h-20 w-full object-cover rounded-xl border" alt="Preview" />}
                    </div>
                    <button type="submit" className="w-full py-4 gradient-primary text-white rounded-xl font-black shadow-lg uppercase tracking-widest">Register Branch</button>
                  </form>
                </section>

                <section id="sku-form" className="bg-white p-6 md:p-8 rounded-[2rem] border border-gray-100 shadow-sm scroll-mt-24">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">{newItem.id ? 'Modify SKU' : 'SKU Integration'}</h3>
                    {newItem.id && (
                      <button onClick={() => setNewItem({ id: '', name: '', description: '', price: '', category: '', image: '' })} className="text-[9px] font-black text-rose-500 uppercase hover:underline">Cancel</button>
                    )}
                  </div>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={selectedResId} onChange={e => setSelectedResId(e.target.value)} required>
                      <option value="">Select Partner</option>
                      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input type="text" placeholder="Item Title" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Price" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                      <input type="text" placeholder="Cat" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => itemFileInputRef.current?.click()} className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200 hover:bg-orange-50 transition-colors">
                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                       </button>
                       <button type="button" onClick={() => setShowAILab(true)} className="flex-grow bg-purple-50 text-purple-600 rounded-xl font-black text-xs uppercase border border-purple-100">✨ AI LAB</button>
                       <input type="file" ref={itemFileInputRef} className="hidden" accept="image/*" onChange={handleItemFileUpload} />
                    </div>
                    {newItem.image && <img src={newItem.image} className="h-20 w-full object-cover rounded-xl border mb-2" alt="Preview" />}
                    <button type="submit" className={`w-full py-4 ${newItem.id ? 'gradient-accent' : 'gradient-secondary'} text-white rounded-xl font-black shadow-lg uppercase tracking-widest`}>
                      {newItem.id ? 'Synchronize Data' : 'Sync Product'}
                    </button>
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
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{r.cuisine}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteRestaurant(r.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {r.menu.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-50 group hover:border-orange-200 transition-all">
                           <img src={item.image} className="w-10 h-10 rounded-lg object-cover" alt={item.name} />
                           <div className="flex-grow">
                             <h5 className="font-black text-[12px]">{item.name}</h5>
                             <p className="text-[9px] font-bold text-gray-400">{settings.general.currencySymbol}{item.price}</p>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => handleEditItem(r.id, item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             </button>
                             <button onClick={() => deleteMenuItem(r.id, item.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                             </button>
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
                   <h3 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-tighter">Onboard Staff</h3>
                   <form onSubmit={handleAddUser} className="space-y-4">
                     <input type="text" placeholder="Display Identifier" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 outline-none" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                     <input type="password" placeholder="Secure Passcode" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 outline-none" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                     <div className="space-y-2">
                       <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Access Tier</label>
                       <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 outline-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}>
                         <option value="staff">Staff (Orders Only)</option>
                         <option value="manager">Manager (Inventory + Orders)</option>
                         <option value="admin">Admin (Full Access)</option>
                       </select>
                     </div>
                     <div className="p-4 bg-purple-50 rounded-2xl">
                        <p className="text-[9px] font-black text-purple-900 uppercase tracking-widest mb-2">Granted Permissions:</p>
                        <ul className="text-[10px] font-bold text-purple-600 space-y-1">
                          <li>• Live Order Queue</li>
                          {newUser.role !== 'staff' && <li>• Inventory Management</li>}
                          {newUser.role === 'admin' && <li>• User Directory</li>}
                          {newUser.role === 'admin' && <li>• System Settings</li>}
                        </ul>
                     </div>
                     <button type="submit" className="w-full py-4 gradient-accent text-white rounded-xl font-black shadow-lg uppercase tracking-widest">Grant Credentials</button>
                   </form>
                 </section>
               </div>
               <div className="lg:col-span-2 space-y-4">
                 {users.map(user => (
                   <div key={user.id} className="bg-white p-6 rounded-[1.5rem] border border-gray-100 flex items-center justify-between shadow-sm">
                      <div className="flex items-center gap-5">
                         <div className={`w-12 h-12 ${user.role === 'admin' ? 'gradient-accent' : 'bg-gray-100 text-gray-400'} rounded-xl flex items-center justify-center font-black text-white`}>{user.identifier.charAt(0).toUpperCase()}</div>
                         <div>
                            <h4 className="font-black text-gray-900">{user.identifier}</h4>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user.role} • {user.rights.length} Privileges</p>
                         </div>
                      </div>
                      <button onClick={() => deleteUser(user.id)} className="p-3 text-gray-300 hover:text-rose-500 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-gray-100 shadow-sm max-w-2xl mx-auto">
               <div className="text-center mb-10">
                  <div className="w-20 h-20 gradient-primary rounded-3xl flex items-center justify-center text-white text-4xl mx-auto mb-6 shadow-xl">☁️</div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Real-Time Cloud Sync</h2>
                  <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Global Multi-Device Mesh</p>
               </div>

               <div className="space-y-6">
                  <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Sync Room ID</p>
                     <p className="text-lg font-black text-gray-900 break-all">gab-eats-v1-global-cluster-master</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 bg-teal-50 rounded-2xl border border-teal-100 text-center">
                        <p className="text-[10px] font-black text-teal-600 uppercase mb-1">Neighbors</p>
                        <p className="text-3xl font-black text-teal-900">{peerCount}</p>
                     </div>
                     <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100 text-center">
                        <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Uplinks</p>
                        <p className="text-3xl font-black text-blue-900">6</p>
                     </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                     <div className="flex items-center gap-4 mb-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">📡</div>
                        <div>
                           <p className="text-sm font-black text-amber-900">Connectivity Hub</p>
                           <p className="text-xs font-bold text-amber-600 uppercase">{peerCount > 0 ? 'Device is Discovered' : 'Searching for Peers...'}</p>
                        </div>
                     </div>
                     <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                        If other devices aren't showing data, ensure they are on this screen and click **Force Global Pull**. Data can take up to 10 seconds to propagate to new nodes.
                     </p>
                  </div>

                  <div className="flex gap-4">
                     <button onClick={forceSync} className="flex-1 py-4 gradient-primary text-white rounded-xl font-black uppercase text-xs shadow-lg">Force Global Pull</button>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
               <div className="flex overflow-x-auto no-scrollbar border-b border-gray-50 bg-gray-50/50">
                 {['general', 'financial', 'marketing', 'themes'].map(tab => (
                   <button key={tab} onClick={() => setSettingsSubTab(tab)} className={`px-10 py-5 text-xs font-black uppercase tracking-widest transition-all ${settingsSubTab === tab ? 'text-orange-600 bg-white border-b-2 border-orange-600' : 'text-gray-400'}`}>
                     {tab}
                   </button>
                 ))}
               </div>
               <div className="p-8 md:p-12">
                 <form onSubmit={handleUpdateSettings} className="max-w-2xl space-y-8">
                    {settingsSubTab === 'general' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Platform Label</label>
                             <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Timezone Zone</label>
                             <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={tempSettings.general.timezone} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, timezone: e.target.value}})}>
                               <option value="Asia/Karachi">Pakistan (PKT)</option>
                               <option value="UTC">Universal (UTC)</option>
                             </select>
                           </div>
                        </div>
                        <div className="flex items-center gap-4 p-6 bg-amber-50 rounded-2xl border border-amber-100">
                           <input type="checkbox" className="w-6 h-6 rounded-lg text-amber-600" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                           <div>
                              <p className="font-black text-amber-900 text-sm">Maintenance Mode</p>
                              <p className="text-[10px] text-amber-700 font-bold uppercase">Locks customer access</p>
                           </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'financial' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Delivery Fee</label>
                             <input type="number" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                           </div>
                           <div>
                             <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Min Order</label>
                             <input type="number" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                           </div>
                        </div>
                      </div>
                    )}

                    {settingsSubTab === 'themes' && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {APP_THEMES.map(theme => (
                          <button key={theme.id} type="button" onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} className={`p-4 rounded-2xl border-2 transition-all text-left ${tempSettings.general.themeId === theme.id ? 'border-orange-600 bg-orange-50' : 'border-gray-100 hover:border-gray-200'}`}>
                             <div className="flex gap-1 mb-3">
                                <div className="w-6 h-6 rounded-full" style={{ background: theme.primary[0] }}></div>
                                <div className="w-6 h-6 rounded-full" style={{ background: theme.accent[0] }}></div>
                             </div>
                             <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight truncate">{theme.name}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <button type="submit" className="px-12 py-4 gradient-primary text-white rounded-xl font-black shadow-xl shadow-orange-100 uppercase tracking-widest">Commit Changes</button>
                 </form>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {showAILab && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2rem] p-8 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 gradient-accent"></div>
              <h3 className="text-2xl font-black text-gray-900 mb-2">AI Creative Lab</h3>
              {!hasApiKey ? (
                <div className="text-center py-6">
                   <p className="text-gray-500 font-bold text-sm mb-4">High-Quality model requires an API key.</p>
                   <p className="text-[10px] text-gray-400 mb-6 leading-relaxed">
                     Please select an API key from a paid GCP project. 
                     <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-purple-600 font-bold underline ml-1">Learn about billing</a>
                   </p>
                   <button onClick={handleOpenKeySelector} className="w-full py-4 gradient-accent text-white rounded-2xl font-black uppercase tracking-widest">Setup Key</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <textarea rows={4} className="w-full px-5 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-purple-500 outline-none font-bold" placeholder="Describe the gourmet dish..." value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                  <div className="flex gap-4">
                     <button onClick={() => setShowAILab(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs">Close</button>
                     <button onClick={generateAIImage} disabled={isAIGenerating} className="flex-[2] py-4 gradient-accent text-white rounded-2xl font-black uppercase text-xs shadow-xl">{isAIGenerating ? "Cooking..." : "Generate"}</button>
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

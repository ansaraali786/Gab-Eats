import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  
  // Forms State
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ id: '', name: '', description: '', price: '', category: '', image: '' });
  
  // AI Lab State
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAILab, setShowAILab] = useState(false);

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
      image: newRes.image || `https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800`,
      deliveryTime: '20-30 min',
      menu: []
    };
    addRestaurant(res);
    setNewRes({ name: '', cuisine: '', image: '' });
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Please select a Restaurant first!");
    
    const item: MenuItem = {
      id: newItem.id || `item-${Date.now()}`,
      name: newItem.name,
      description: newItem.description,
      price: Number(newItem.price),
      category: newItem.category || 'Main',
      image: newItem.image || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400`
    };

    if (newItem.id) {
      updateMenuItem(selectedResId, item);
    } else {
      addMenuItem(selectedResId, item);
    }

    // Reset form
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
    // Scroll to the SKU form smoothly
    const formElement = document.getElementById('sku-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const generateAIImage = async () => {
    if (!aiPrompt) return alert("Please describe the dish for the AI!");
    setIsAIGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `Gourmet food commercial photography, high resolution, professional lighting, centered, appetizing: ${aiPrompt}` },
          ],
        },
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64Data = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64Data}`;
            setNewItem(prev => ({ ...prev, image: imageUrl }));
            foundImage = true;
            setShowAILab(false);
            break;
          }
        }
      }
      if (!foundImage) alert("AI generated the response but no image data was found. Try a different description.");
    } catch (error) {
      console.error("AI Generation Error:", error);
      alert("Failed to generate image. Please check your API configuration.");
    } finally {
      setIsAIGenerating(false);
    }
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
      {/* Header */}
      <div className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Console</h1>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              Operator: <span className="text-orange-600 font-black">{currentUser.identifier}</span> • Level: <span className="text-gray-900">{currentUser.role}</span>
            </p>
          </div>
          <div className="flex bg-white shadow-xl rounded-2xl p-1.5 border border-gray-100 overflow-x-auto no-scrollbar">
            {[
              { id: 'orders', label: 'Orders', icon: '🛒' },
              { id: 'restaurants', label: 'Inventory', icon: '🏢' },
              { id: 'users', label: 'Users', icon: '🛡️' },
              { id: 'settings', label: 'Settings', icon: '⚙️' }
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Revenue', value: `${settings.general.currencySymbol}${stats.revenue}`, color: 'text-emerald-600', icon: '💰' },
            { label: 'Pending Logistics', value: stats.pending, color: 'text-orange-600', icon: '🚀' },
            { label: 'Active Partners', value: stats.partners, color: 'text-blue-600', icon: '🏢' },
            { label: 'System Operators', value: stats.staff, color: 'text-purple-600', icon: '👮' }
          ].map((s) => (
            <div key={s.label} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <span className="text-2xl mb-2 block">{s.icon}</span>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
        >
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
                  <h3 className="text-xl font-black text-gray-300">No active orders in queue.</h3>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="bg-gray-100 px-3 py-1 rounded-lg text-[10px] font-black text-gray-400 mr-3 uppercase tracking-widest">#{order.id.toUpperCase()}</span>
                        <h3 className="text-xl font-black text-gray-900 inline">{order.customerName}</h3>
                        <p className="text-xs font-bold text-gray-400 mt-2">📍 {order.address}</p>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${statusColors[order.status]}`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="flex gap-2 mb-8">
                      {order.items.map(item => (
                        <div key={item.id} className="bg-gray-50 px-3 py-1.5 rounded-xl text-[10px] font-bold text-gray-600">
                          <span className="text-orange-600 font-black">{item.quantity}x</span> {item.name}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between items-center pt-6 border-t border-gray-50">
                       <div className="flex gap-1 overflow-x-auto no-scrollbar">
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
                       <p className="text-2xl font-black text-gray-900">{settings.general.currencySymbol}{order.total}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Form Column */}
              <div className="lg:col-span-1 space-y-8">
                {/* SKU Form */}
                <section id="sku-form" className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm scroll-mt-24">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black text-gray-900">{newItem.id ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
                    {newItem.id && (
                      <button 
                        onClick={() => setNewItem({ id: '', name: '', description: '', price: '', category: '', image: '' })}
                        className="text-[10px] font-black text-rose-500 uppercase hover:underline"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <select 
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all"
                      value={selectedResId} 
                      onChange={e => setSelectedResId(e.target.value)} 
                      required
                    >
                      <option value="">Select Restaurant</option>
                      {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <input type="text" placeholder="Item Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                    <input type="text" placeholder="Short Description" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                    <div className="grid grid-cols-2 gap-4">
                      <input type="number" placeholder="Price" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} required />
                      <input type="text" placeholder="Category" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} />
                    </div>
                    
                    {/* Image Field with AI Button - This is clearly visible now */}
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Visual Content (URL or AI)</label>
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Image URL" 
                            className="flex-grow px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" 
                            value={newItem.image} 
                            onChange={e => setNewItem({...newItem, image: e.target.value})} 
                          />
                          <button 
                            type="button"
                            onClick={() => setShowAILab(true)}
                            className="px-4 py-4 gradient-accent text-white rounded-xl font-black text-[10px] shadow-lg whitespace-nowrap group hover:scale-105 transition-transform"
                            title="Generate AI Photo"
                          >
                            ✨ AI LAB
                          </button>
                       </div>
                       {newItem.image && (
                         <div className="mt-2 rounded-xl overflow-hidden h-32 w-full border border-gray-100">
                           <img src={newItem.image} alt="Preview" className="w-full h-full object-cover" />
                         </div>
                       )}
                    </div>

                    <button type="submit" className={`w-full py-4 ${newItem.id ? 'gradient-accent' : 'gradient-secondary'} text-white rounded-xl font-black shadow-lg uppercase tracking-widest`}>
                      {newItem.id ? 'Update Item' : 'Add to Menu'}
                    </button>
                  </form>
                </section>

                <section className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h3 className="text-xl font-black mb-6 text-gray-900">New Restaurant Partner</h3>
                  <form onSubmit={handleAddRes} className="space-y-4">
                    <input type="text" placeholder="Brand Name" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Style" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-orange-500 outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <button type="submit" className="w-full py-4 gradient-primary text-white rounded-xl font-black shadow-lg">Onboard Partner</button>
                  </form>
                </section>
              </div>

              {/* Inventory List Column */}
              <div className="lg:col-span-2 space-y-6">
                {restaurants.map(r => (
                  <div key={r.id} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-6 flex items-center gap-6 group bg-gray-50/50">
                      <img src={r.image} className="w-16 h-16 rounded-2xl object-cover shadow-md" alt={r.name} />
                      <div className="flex-grow">
                        <h4 className="font-black text-xl text-gray-900">{r.name}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{r.cuisine} • {r.menu.length} Items</p>
                      </div>
                      <button onClick={() => deleteRestaurant(r.id)} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      {r.menu.map(item => (
                        <div key={item.id} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-50 group/item hover:border-orange-200 transition-colors">
                           <img src={item.image} className="w-14 h-14 rounded-xl object-cover shadow-sm" alt={item.name} />
                           <div className="flex-grow">
                              <h5 className="font-black text-sm text-gray-900">{item.name}</h5>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{settings.general.currencySymbol}{item.price}</p>
                           </div>
                           <div className="flex gap-2 opacity-0 group-hover/item:opacity-100 transition-all">
                             <button 
                               onClick={() => handleEditItem(r.id, item)}
                               className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-500 hover:text-white transition-colors"
                               title="Edit Item (Populates Form & AI Lab)"
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                             </button>
                             <button 
                               onClick={() => deleteMenuItem(r.id, item.id)}
                               className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
                               title="Delete Item"
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm min-h-[600px]">
              <div className="flex gap-8 border-b border-gray-50 mb-10 pb-4 overflow-x-auto no-scrollbar">
                {['general', 'financial', 'marketing', 'themes'].map(sub => (
                  <button 
                    key={sub} 
                    onClick={() => setSettingsSubTab(sub)}
                    className={`text-xs font-black uppercase tracking-widest pb-4 border-b-2 transition-all ${settingsSubTab === sub ? 'text-orange-600 border-orange-600' : 'text-gray-300 border-transparent hover:text-gray-500'}`}
                  >
                    {sub}
                  </button>
                ))}
              </div>

              {settingsSubTab === 'general' && (
                <div className="max-w-2xl space-y-8">
                  <div className="p-8 bg-rose-50 rounded-[2rem] border border-rose-100 flex items-center justify-between">
                    <div>
                       <h4 className="text-rose-900 font-black text-lg">Maintenance Mode</h4>
                       <p className="text-rose-600 text-xs font-bold">Instantly lock the app for updates.</p>
                    </div>
                    <button 
                      onClick={() => updateSettings({...settings, general: {...settings.general, maintenanceMode: !settings.general.maintenanceMode}})}
                      className={`px-8 py-3 rounded-xl font-black text-xs uppercase shadow-lg ${settings.general.maintenanceMode ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-rose-500 border border-rose-200'}`}
                    >
                      {settings.general.maintenanceMode ? 'ACTIVE' : 'OFFLINE'}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Brand Name</label>
                        <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={settings.general.platformName} onChange={e => updateSettings({...settings, general: {...settings.general, platformName: e.target.value}})} />
                     </div>
                     <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Currency Symbol</label>
                        <input type="text" className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold outline-none border-2 border-transparent focus:border-orange-500" value={settings.general.currencySymbol} onChange={e => updateSettings({...settings, general: {...settings.general, currencySymbol: e.target.value}})} />
                     </div>
                  </div>
                </div>
              )}

              {settingsSubTab === 'financial' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
                  {[
                    { label: 'Commission (%)', val: settings.commissions.defaultCommission, key: 'defaultCommission' },
                    { label: 'Delivery Fee', val: settings.commissions.deliveryFee, key: 'deliveryFee' },
                    { label: 'Min. Order Value', val: settings.commissions.minOrderValue, key: 'minOrderValue' }
                  ].map(f => (
                    <div key={f.key} className="p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">{f.label}</label>
                      <input 
                        type="number" 
                        className="w-full px-5 py-4 rounded-xl bg-white font-black text-xl border-2 border-transparent focus:border-orange-500 text-orange-600" 
                        value={f.val} 
                        onChange={e => updateSettings({...settings, commissions: {...settings.commissions, [f.key as any]: Number(e.target.value)}})}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* AI Image Lab Modal */}
      {showAILab && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative"
           >
              <h3 className="text-3xl font-black text-gray-900 mb-2">AI Creative Lab</h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-8">Powered by Gemini Visual Engine</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Prompt Description</label>
                  <textarea 
                    rows={4} 
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-purple-500 outline-none font-bold"
                    placeholder="e.g. 'A juicy beef burger with cheddar, bacon, and lettuce on a charcoal bun'"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                </div>
                
                <div className="flex gap-4">
                   <button 
                     onClick={() => setShowAILab(false)}
                     className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm uppercase"
                   >
                     Discard
                   </button>
                   <button 
                     onClick={generateAIImage}
                     disabled={isAIGenerating}
                     className="flex-[2] py-4 gradient-accent text-white rounded-2xl font-black text-sm uppercase shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                   >
                     {isAIGenerating ? (
                       <>
                         <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                         Cooking Image...
                       </>
                     ) : (
                       'Generate Photo'
                     )}
                   </button>
                </div>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

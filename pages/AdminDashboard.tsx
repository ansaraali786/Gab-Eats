
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  const [hasApiKey, setHasApiKey] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    checkApiKey();
  }, []);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large! Please upload an image under 2MB for optimal performance.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
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
    const formElement = document.getElementById('sku-form');
    if (formElement) formElement.scrollIntoView({ behavior: 'smooth' });
  };

  const generateAIImage = async () => {
    if (!aiPrompt) return alert("Please describe the dish for the AI!");
    
    const hasKey = (window as any).aistudio ? await (window as any).aistudio.hasSelectedApiKey() : false;
    if (!hasKey) {
      alert("Please setup your API key first using the button in the Lab.");
      return;
    }

    setIsAIGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [
            { text: `High-end gourmet food photography, 8k resolution, cinematic lighting, studio setup, delicious and professional: ${aiPrompt}` },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
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
      if (!foundImage) alert("AI returned text but no image part was found. Try being more descriptive.");
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      if (error.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        alert("The selected API key does not have access to this model. Please select a key from a paid project.");
      } else {
        alert("Image generation failed. Ensure your API Key is from a project with billing enabled.");
      }
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
              {/* SKU Form */}
              <div className="lg:col-span-1 space-y-8">
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
                    
                    {/* Visual Asset Management */}
                    <div className="space-y-3">
                       <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Visual Asset Control</label>
                       
                       {/* Triple Action Media Selector */}
                       <div className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder="Paste Image URL..." 
                            className="flex-grow px-5 py-4 rounded-xl bg-gray-50 font-bold text-xs border-2 border-transparent focus:border-orange-500 outline-none" 
                            value={newItem.image.startsWith('data:') ? 'Custom Upload / AI Generated' : newItem.image} 
                            onChange={e => setNewItem({...newItem, image: e.target.value})} 
                          />
                          
                          {/* File Upload Trigger */}
                          <button 
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-12 h-12 flex items-center justify-center bg-gray-100 text-gray-600 rounded-xl hover:bg-orange-100 hover:text-orange-600 transition-all border border-gray-200"
                            title="Upload from Device"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                          </button>
                          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />

                          {/* AI Lab Trigger */}
                          <button 
                            type="button"
                            onClick={() => {
                              setShowAILab(true);
                              checkApiKey();
                            }}
                            className="px-4 h-12 gradient-accent text-white rounded-xl font-black text-[10px] shadow-lg whitespace-nowrap hover:scale-105 transition-transform"
                            title="Generate with Gemini"
                          >
                            ✨ AI LAB
                          </button>
                       </div>

                       {newItem.image && (
                         <div className="mt-2 rounded-2xl overflow-hidden h-40 w-full border border-gray-100 bg-gray-50 relative group">
                           <img src={newItem.image} alt="Preview" className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => setNewItem({...newItem, image: ''})} className="bg-white text-rose-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Remove Asset</button>
                           </div>
                         </div>
                       )}
                    </div>

                    <button type="submit" className={`w-full py-4 ${newItem.id ? 'gradient-accent' : 'gradient-secondary'} text-white rounded-xl font-black shadow-lg uppercase tracking-widest`}>
                      {newItem.id ? 'Update Item' : 'Add to Menu'}
                    </button>
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
                             >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                             </button>
                             <button 
                               onClick={() => deleteMenuItem(r.id, item.id)}
                               className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
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

          {activeTab === 'settings' && (
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 shadow-sm min-h-[600px] flex items-center justify-center">
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">System parameters available for modification.</p>
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
             className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
           >
              <div className="absolute top-0 left-0 w-full h-2 gradient-accent"></div>
              <h3 className="text-3xl font-black text-gray-900 mb-2">AI Creative Lab</h3>
              <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-6">Powered by Gemini 3 Pro Vision</p>
              
              {!hasApiKey ? (
                <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 text-center mb-8">
                   <div className="text-4xl mb-4">🔑</div>
                   <h4 className="text-lg font-black text-amber-900 mb-2">API Key Required</h4>
                   <p className="text-amber-700 text-sm font-bold mb-6">High-quality image generation requires a valid API key from a paid GCP project.</p>
                   <a 
                     href="https://ai.google.dev/gemini-api/docs/billing" 
                     target="_blank" 
                     rel="noreferrer"
                     className="block text-[10px] font-black text-amber-500 uppercase tracking-widest mb-6 underline"
                   >
                     View Billing Documentation
                   </a>
                   <button 
                     onClick={handleOpenKeySelector}
                     className="w-full py-4 gradient-accent text-white rounded-2xl font-black uppercase tracking-widest shadow-xl"
                   >
                     Setup API Key
                   </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dish Description</label>
                    <textarea 
                      rows={4} 
                      className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-purple-500 outline-none font-bold"
                      placeholder="e.g. 'A close up of a spicy Zinger burger with dripping cheese, crisp lettuce, on a toasted brioche bun, dark background'"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex gap-4">
                     <button 
                       onClick={() => setShowAILab(false)}
                       className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm uppercase"
                     >
                       Close
                     </button>
                     <button 
                       onClick={generateAIImage}
                       disabled={isAIGenerating}
                       className="flex-[2] py-4 gradient-accent text-white rounded-2xl font-black text-sm uppercase shadow-xl disabled:opacity-50 flex items-center justify-center gap-3"
                     >
                       {isAIGenerating ? (
                         <>
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           Generating...
                         </>
                       ) : (
                         'Generate Photo'
                       )}
                     </button>
                  </div>
                  <button 
                    onClick={handleOpenKeySelector}
                    className="w-full py-2 text-[9px] font-black text-gray-300 uppercase tracking-widest hover:text-purple-500 transition-colors"
                  >
                    Change API Key
                  </button>
                </div>
              )}
           </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

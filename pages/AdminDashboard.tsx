import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, GlobalSettings, Order } from '../types';
import { APP_THEMES } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings, 
    syncStatus, updateOrderStatus, addRestaurant, 
    deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings, deleteOrder, updateRestaurant
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight | 'system' | 'staff' | 'dispatch'>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [newRes, setNewRes] = useState({ 
    name: '', cuisine: '', image: '', 
    lat: '24.8607', lng: '67.0011', radius: '10', areas: '' 
  });
  const [selectedResId, setSelectedResId] = useState('');
  const [itemForm, setItemForm] = useState({ 
    id: '', name: '', description: '', price: '', category: 'Main', image: '', isActive: true 
  });
  const [newStaff, setNewStaff] = useState({ 
    username: '', 
    password: '', 
    role: 'staff' as 'admin' | 'staff', 
    rights: [] as UserRight[],
    assignedRestaurants: [] as string[]
  });
  const [newPhone, setNewPhone] = useState('');
  const [tempSettings, setTempSettings] = useState<GlobalSettings | null>(null);
  const [lastOrderCount, setLastOrderCount] = useState(orders.length);
  const [showOrderAlert, setShowOrderAlert] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);

  const resFileInputRef = useRef<HTMLInputElement>(null);
  const itemFileInputRef = useRef<HTMLInputElement>(null);

  // Available Rights Definition
  const AVAILABLE_RIGHTS: { id: UserRight; label: string }[] = [
    { id: 'orders', label: 'Order Management' },
    { id: 'restaurants', label: 'Inventory & Menu' },
    { id: 'users', label: 'Operator Management' },
    { id: 'settings', label: 'System Settings' }
  ];

  // Logic to filter orders based on assigned restaurants
  const filteredOrders = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return orders;
    
    // For staff, only show orders if any of the items belong to an assigned restaurant
    // If no restaurants are explicitly assigned, they see nothing (security first)
    if (!currentUser.assignedRestaurants || currentUser.assignedRestaurants.length === 0) return [];
    
    return orders.filter(order => 
      order.items.some(item => currentUser.assignedRestaurants.includes(item.restaurantId))
    );
  }, [orders, currentUser]);

  // Filter tabs based on current user rights
  const visibleTabs = useMemo(() => {
    if (!currentUser) return [];
    
    const tabs = [
      { id: 'orders', label: 'Orders', icon: '📦', right: 'orders' as UserRight },
      { id: 'dispatch', label: 'Dispatch', icon: '📲', right: 'orders' as UserRight },
      { id: 'restaurants', label: 'Inventory', icon: '🏪', right: 'restaurants' as UserRight },
      { id: 'staff', label: 'Operators', icon: '👥', right: 'users' as UserRight },
      { id: 'settings', label: 'System', icon: '⚙️', right: 'settings' as UserRight }
    ];

    if (currentUser.role === 'admin') return tabs;
    return tabs.filter(t => currentUser.rights.includes(t.right));
  }, [currentUser]);

  // Set initial active tab if current is hidden
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id as any);
    }
  }, [visibleTabs]);

  useEffect(() => {
    // Only alert for orders the current user can actually see
    const visibleCount = filteredOrders.length;
    if (orders.length > lastOrderCount) {
        // Find if any of the NEW orders are visible to this staff
        const hasNewVisibleOrder = orders.slice(0, orders.length - lastOrderCount).some(o => 
            currentUser?.role === 'admin' || o.items.some(i => currentUser?.assignedRestaurants?.includes(i.restaurantId))
        );
        
        if (hasNewVisibleOrder) {
            setShowOrderAlert(true);
            setTimeout(() => setShowOrderAlert(false), 5000);
            refreshNotificationLogs();
        }
    }
    setLastOrderCount(orders.length);
  }, [orders.length, filteredOrders.length]);

  useEffect(() => {
    if (settings) {
      const cleanSettings = JSON.parse(JSON.stringify(settings));
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

  const handleAddRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    const res: Restaurant = {
      id: `res-${Date.now()}`,
      name: newRes.name,
      cuisine: newRes.cuisine,
      image: newRes.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=800',
      rating: 5.0,
      deliveryTime: '25-30 min',
      coordinates: { 
        lat: parseFloat(newRes.lat) || 24.8607, 
        lng: parseFloat(newRes.lng) || 67.0011 
      },
      deliveryRadius: parseFloat(newRes.radius) || 10,
      deliveryAreas: newRes.areas,
      menu: []
    };
    addRestaurant(res);
    setNewRes({ name: '', cuisine: '', image: '', lat: '24.8607', lng: '67.0011', radius: '10', areas: '' });
  };

  const handlePrintInvoice = (order: Order) => {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    const itemsHtml = order.items.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 12px 0;">${item.name} x ${item.quantity}</td>
        <td style="padding: 12px 0; text-align: right;">${settings.general.currencySymbol}${item.price * item.quantity}</td>
      </tr>
    `).join('');

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
            body { font-family: 'Outfit', sans-serif; padding: 40px; color: #111; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 4px solid #f3f4f6; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: 900; color: #000; }
            .order-meta { display: flex; justify-content: space-between; margin-bottom: 30px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            .totals { text-align: right; border-top: 2px solid #000; padding-top: 15px; font-weight: 900; font-size: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">${settings.general.platformName} - ADMIN COPY</div>
          </div>
          <div class="order-meta">
            <div><strong>ORDER:</strong> #${order.id.toUpperCase()}<br><strong>DATE:</strong> ${new Date(order.createdAt).toLocaleString()}</div>
            <div style="text-align: right;"><strong>CUSTOMER:</strong> ${order.customerName}<br>${order.contactNo}<br>${order.address}</div>
          </div>
          <table>
            <thead><tr style="text-align: left; border-bottom: 2px solid #eee;"><th>Item</th><th style="text-align: right;">Price</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">GRAND TOTAL: ${settings.general.currencySymbol}${order.total}</div>
        </body>
      </html>
    `;

    doc.open();
    doc.write(content);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => document.body.removeChild(printFrame), 1000);
    }, 500);
  };

  const handleRemoveOrder = (id: string) => {
    if (window.confirm("Permanently delete this order record? This action helps clear database storage.")) {
      deleteOrder(id);
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select branch.");
    const item: MenuItem = {
      id: itemForm.id || `item-${Date.now()}`,
      name: itemForm.name,
      description: itemForm.description || 'Gourmet selection.',
      price: Number(itemForm.price),
      category: itemForm.category,
      image: itemForm.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400',
      isActive: itemForm.isActive
    };
    if (itemForm.id) updateMenuItem(selectedResId, item);
    else addMenuItem(selectedResId, item);
    setItemForm({ id: '', name: '', description: '', price: '', category: 'Main', image: '', isActive: true });
  };

  const handleEditItem = (item: MenuItem) => {
    setItemForm({ 
      id: item.id, name: item.name, description: item.description, 
      price: item.price.toString(), category: item.category, image: item.image, 
      isActive: item.isActive 
    });
  };

  const toggleItemActive = (resId: string, item: MenuItem) => {
    updateMenuItem(resId, { ...item, isActive: !item.isActive });
  };

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStaff.role === 'staff' && newStaff.rights.length === 0) {
      return alert("Grant at least one access right to the staff member.");
    }
    const staffUser: User = {
      id: `staff-${Date.now()}`,
      identifier: newStaff.username,
      password: newStaff.password,
      role: newStaff.role,
      rights: newStaff.role === 'admin' ? ['orders', 'restaurants', 'users', 'settings'] : newStaff.rights,
      assignedRestaurants: newStaff.role === 'admin' ? [] : newStaff.assignedRestaurants
    };
    addUser(staffUser);
    setNewStaff({ username: '', password: '', role: 'staff', rights: [], assignedRestaurants: [] });
  };

  const toggleRight = (rightId: UserRight) => {
    setNewStaff(prev => {
      const exists = prev.rights.includes(rightId);
      if (exists) return { ...prev, rights: prev.rights.filter(r => r !== rightId) };
      return { ...prev, rights: [...prev.rights, rightId] };
    });
  };

  const toggleAssignedRestaurant = (resId: string) => {
    setNewStaff(prev => {
      const exists = prev.assignedRestaurants.includes(resId);
      if (exists) return { ...prev, assignedRestaurants: prev.assignedRestaurants.filter(r => r !== resId) };
      return { ...prev, assignedRestaurants: [...prev.assignedRestaurants, resId] };
    });
  };

  const triggerWhatsApp = (phone: string, message: string) => {
    const formattedPhone = phone.startsWith('0') ? '92' + phone.slice(1) : phone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const stats = useMemo(() => {
    const revenue = filteredOrders.reduce((sum, order) => order.status === 'Delivered' ? sum + order.total : sum, 0);
    const activeCount = filteredOrders.filter(order => order.status !== 'Delivered' && order.status !== 'Cancelled').length;
    return { revenue, activeCount, branches: restaurants.length };
  }, [filteredOrders, restaurants]);

  const selectedBranch = restaurants.find(r => r.id === selectedResId);

  if (!currentUser || !settings || !tempSettings) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 page-transition relative">
      <AnimatePresence>
        {showOrderAlert && (
          <motion.div initial={{ y: -100, opacity: 0 }} animate={{ y: 20, opacity: 1 }} exit={{ y: -100, opacity: 0 }} className="fixed top-0 left-1/2 transform -translate-x-1/2 z-[100] gradient-primary text-white px-8 py-5 rounded-cut-sm shadow-2xl flex items-center gap-5 border-2 border-white/30 backdrop-blur-md">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse text-2xl">🚨</div>
            <div className="font-black uppercase tracking-tight">
              <p className="text-[10px] opacity-80 mb-0.5">Global Relay Signal</p>
              <p className="text-sm">New Order Incoming!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

        <div className="flex lg:flex-col overflow-x-auto no-scrollbar bg-white p-2 rounded-cut-md shadow-lg border border-gray-100 h-fit w-full lg:w-72">
           {visibleTabs.map(t => (
             <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`px-6 py-4 md:py-5 rounded-cut-sm font-black text-[11px] md:text-[13px] uppercase flex items-center gap-4 transition-all whitespace-nowrap lg:mb-2 ${activeTab === t.id ? 'gradient-primary text-white shadow-xl' : 'text-gray-400 hover:bg-gray-50'}`}>
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
              {filteredOrders.length === 0 ? (
                <div className="bg-white p-24 text-center rounded-cut-lg border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-black uppercase tracking-widest">
                    {currentUser.role === 'staff' ? 'No assigned restaurant orders.' : 'No orders in archive.'}
                  </p>
                </div>
              ) : (
                filteredOrders.map(o => (
                  <div key={o.id} className="bg-white p-8 md:p-10 rounded-cut-lg border border-gray-100 shadow-nova flex flex-col md:flex-row justify-between items-center gap-8 group hover:border-orange-200 transition-all">
                    <div className="flex-grow w-full md:w-auto">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="px-3 py-1 bg-gray-950 text-white rounded-lg text-[9px] font-black uppercase">#{o.id.toUpperCase()}</span>
                          <h3 className="font-black text-2xl text-gray-950">{o.customerName}</h3>
                        </div>
                        <p className="text-sm text-gray-400 font-bold truncate max-w-md">📍 {o.address}</p>
                        <div className="flex gap-4 mt-6">
                           <button onClick={() => handlePrintInvoice(o)} className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-all active:scale-95">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                             Invoice
                           </button>
                           {currentUser.role === 'admin' && (
                             <button onClick={() => handleRemoveOrder(o.id)} className="flex items-center gap-2 px-5 py-3 bg-rose-50 rounded-xl text-[10px] font-black uppercase text-rose-400 hover:bg-rose-500 hover:text-white transition-all active:scale-95">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                               Remove
                             </button>
                           )}
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                        {['Pending', 'Preparing', 'Out for Delivery', 'Delivered'].map(s => (
                          <button key={s} onClick={() => updateOrderStatus(o.id, s as OrderStatus)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${o.status === s ? 'gradient-primary text-white shadow-md' : 'bg-gray-50 text-gray-400'}`}>
                            {s}
                          </button>
                        ))}
                    </div>
                    <div className="text-right w-full md:w-auto">
                      <p className="text-3xl font-black text-gray-950">{settings.general.currencySymbol}{o.total}</p>
                      <p className="text-[9px] text-gray-400 font-black uppercase">{new Date(o.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'dispatch' && (
            <div className="space-y-8">
              <div className="bg-gray-950 p-10 md:p-14 rounded-cut-lg border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 gradient-primary opacity-10 blur-[100px] rounded-full"></div>
                <div className="relative z-10 text-center md:text-left">
                     <h2 className="text-4xl font-black text-white tracking-tighter uppercase mb-4">Messaging Dispatch</h2>
                     <p className="text-gray-400 font-bold max-w-lg leading-relaxed">Instantly relay order details to your delivery team via WhatsApp.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {notificationLogs.length === 0 ? (
                  <div className="bg-white p-24 text-center rounded-cut-lg border-2 border-dashed border-gray-100">
                    <p className="text-gray-300 font-black uppercase tracking-widest">No logs yet.</p>
                  </div>
                ) : (
                  notificationLogs.slice().reverse().map((log, idx) => (
                    <div key={idx} className="bg-white p-8 md:p-10 rounded-cut-lg border border-gray-100 shadow-nova flex flex-col lg:flex-row gap-8 items-center justify-between group">
                       <div className="flex-grow w-full">
                          <p className="text-gray-900 font-bold text-sm whitespace-pre-wrap bg-gray-50 p-6 rounded-2xl">{log.message}</p>
                       </div>
                       <button onClick={() => triggerWhatsApp(log.phone, log.message)} className="w-full lg:w-fit py-4 px-10 gradient-secondary text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg">📲 Send to {log.phone}</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-8">
                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">New Branch</h3>
                  <form onSubmit={handleAddRestaurant} className="space-y-4">
                    <input type="text" placeholder="Branch Name" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} required />
                    <input type="text" placeholder="Cuisine Category" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} required />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="Lat" className="px-4 py-3 rounded-xl bg-gray-50 font-black text-gray-950 text-xs" value={newRes.lat} onChange={e => setNewRes({...newRes, lat: e.target.value})} required />
                      <input type="text" placeholder="Lng" className="px-4 py-3 rounded-xl bg-gray-50 font-black text-gray-950 text-xs" value={newRes.lng} onChange={e => setNewRes({...newRes, lng: e.target.value})} required />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase">Radius (KM)</label>
                      <input type="number" className="flex-grow px-4 py-3 rounded-xl bg-gray-50 font-black text-gray-950 text-xs" value={newRes.radius} onChange={e => setNewRes({...newRes, radius: e.target.value})} required />
                    </div>
                    <textarea placeholder="Delivery Areas (e.g. Saddar, Clifton...)" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none h-20 text-xs" value={newRes.areas} onChange={e => setNewRes({...newRes, areas: e.target.value})} />
                    
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

                <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">{itemForm.id ? 'Edit Item' : 'New Menu Item'}</h3>
                  <select className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black mb-4 outline-none text-gray-900" value={selectedResId} onChange={e => setSelectedResId(e.target.value)}>
                    <option value="">Select Target Branch</option>
                    {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <form onSubmit={handleSaveItem} className="space-y-4">
                    <input type="text" placeholder="Item Label" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={itemForm.name} onChange={e => setItemForm({...itemForm, name: e.target.value})} required />
                    <input type="number" placeholder="Price (PKR)" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={itemForm.price} onChange={e => setItemForm({...itemForm, price: e.target.value})} required />
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                      <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={itemForm.isActive} onChange={e => setItemForm({...itemForm, isActive: e.target.checked})} />
                      <span className="text-[11px] font-black uppercase text-gray-500">Item is Active</span>
                    </div>
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
                  </form>
                </div>
              </div>

              <div className="lg:col-span-8 space-y-8">
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
                                 <p className="text-[9px] text-orange-500 font-bold uppercase mt-1">📍 {r.coordinates?.lat || '0.0000'}, {r.coordinates?.lng || '0.0000'}</p>
                               </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); deleteRestaurant(r.id); }} className="text-rose-500 p-2 rounded-lg">🗑️</button>
                         </div>
                       </div>
                     ))}
                   </div>
                </div>

                {selectedBranch && (
                  <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-2xl font-black text-gray-950 uppercase tracking-tighter">Menu: {selectedBranch.name}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedBranch.menu?.map(item => (
                        <div key={item.id} className="p-4 rounded-cut-sm bg-gray-50 border border-gray-100 flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <img src={item.image} className={`w-10 h-10 rounded-lg object-cover ${!item.isActive ? 'grayscale opacity-50' : ''}`} />
                            <div>
                               <h4 className={`font-black text-sm ${!item.isActive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{item.name}</h4>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => toggleItemActive(selectedBranch.id, item)} className={`p-2 rounded-lg ${item.isActive ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}>
                              {item.isActive ? '👁️' : '🙈'}
                            </button>
                            <button onClick={() => handleEditItem(item)} className="p-2 bg-white text-blue-500 rounded-lg">✏️</button>
                            <button onClick={() => deleteMenuItem(selectedBranch.id, item.id)} className="p-2 bg-white text-rose-500 rounded-lg">🗑️</button>
                          </div>
                        </div>
                      ))}
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
                  <form onSubmit={handleAddStaff} className="space-y-6">
                    <div className="flex bg-gray-50 p-1.5 rounded-2xl">
                      <button type="button" onClick={() => setNewStaff({...newStaff, role: 'staff'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newStaff.role === 'staff' ? 'bg-white shadow-md text-gray-950' : 'text-gray-400'}`}>Staff</button>
                      <button type="button" onClick={() => setNewStaff({...newStaff, role: 'admin'})} className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${newStaff.role === 'admin' ? 'bg-white shadow-md text-gray-950' : 'text-gray-400'}`}>Admin</button>
                    </div>

                    <div className="space-y-4">
                      <input type="text" placeholder="Username" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newStaff.username} onChange={e => setNewStaff({...newStaff, username: e.target.value})} required />
                      <input type="password" placeholder="Password" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black text-gray-950 outline-none" value={newStaff.password} onChange={e => setNewStaff({...newStaff, password: e.target.value})} required />
                    </div>

                    {newStaff.role === 'staff' && (
                      <div className="space-y-6">
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Customize Access Rights</label>
                            <div className="grid grid-cols-2 gap-2">
                            {AVAILABLE_RIGHTS.map(r => (
                                <button 
                                key={r.id} 
                                type="button"
                                onClick={() => toggleRight(r.id)}
                                className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-tighter border-2 transition-all text-left ${newStaff.rights.includes(r.id) ? 'bg-purple-50 border-purple-500 text-purple-600' : 'bg-white border-gray-50 text-gray-400'}`}
                                >
                                {newStaff.rights.includes(r.id) ? '✓ ' : '+ '} {r.label}
                                </button>
                            ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Assign Restricted Branches</label>
                            <p className="text-[9px] text-gray-400 italic px-2">Staff will only see orders from selected branches.</p>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto no-scrollbar p-1">
                                {restaurants.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => toggleAssignedRestaurant(r.id)}
                                        className={`px-4 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest border-2 transition-all text-left flex items-center justify-between ${newStaff.assignedRestaurants.includes(r.id) ? 'bg-teal-50 border-teal-500 text-teal-600' : 'bg-white border-gray-50 text-gray-400'}`}
                                    >
                                        <span>{r.name}</span>
                                        {newStaff.assignedRestaurants.includes(r.id) && <span>✓</span>}
                                    </button>
                                ))}
                            </div>
                        </div>
                      </div>
                    )}

                    <button type="submit" className="w-full py-5 gradient-accent text-white rounded-xl font-black text-xs uppercase shadow-xl tracking-widest mt-4">Grant Access</button>
                  </form>
               </div>
               <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
                  <h3 className="text-2xl font-black mb-8 text-gray-950 uppercase tracking-tighter">Operators</h3>
                  <div className="space-y-4">
                    {users.map(u => (
                      <div key={u.id} className="p-6 rounded-cut-sm bg-gray-50 flex items-center justify-between border border-gray-100 group">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 ${u.role === 'admin' ? 'gradient-primary' : 'gradient-accent'} rounded-lg flex items-center justify-center text-white font-black`}>
                              {u.identifier.charAt(0).toUpperCase()}
                            </div>
                            <div className="max-w-[150px] md:max-w-xs">
                              <p className="font-black text-gray-900">{u.identifier}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'}`}>
                                  {u.role}
                                </span>
                                {u.role === 'staff' && (
                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-teal-100 text-teal-600">
                                        {u.assignedRestaurants?.length || 0} Branches
                                    </span>
                                )}
                              </div>
                            </div>
                         </div>
                         {u.id !== 'admin-1' && <button onClick={() => deleteUser(u.id)} className="text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors">🗑️</button>}
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-10 rounded-cut-lg border border-gray-100 shadow-nova">
               <div className="flex gap-4 mb-8 overflow-x-auto no-scrollbar pb-2">
                 {['general', 'branding', 'financial', 'notifications'].map(st => (
                   <button key={st} onClick={() => setSettingsSubTab(st)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${settingsSubTab === st ? 'bg-gray-950 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>{st}</button>
                 ))}
               </div>

               {settingsSubTab === 'general' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-gray-950">
                   <div>
                     <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Brand Name</label>
                     <input type="text" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.general.platformName} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, platformName: e.target.value}})} />
                   </div>
                   <div className="flex items-center gap-4 p-6 bg-orange-50 rounded-cut-md border border-orange-100">
                      <input type="checkbox" className="w-6 h-6 rounded accent-orange-500" checked={tempSettings.general.maintenanceMode} onChange={e => setTempSettings({...tempSettings, general: {...tempSettings.general, maintenanceMode: e.target.checked}})} />
                      <span className="text-sm font-black text-orange-600 uppercase">Maintenance Mode</span>
                   </div>
                 </div>
               )}

               {settingsSubTab === 'branding' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {APP_THEMES.map(theme => (
                     <div key={theme.id} onClick={() => setTempSettings({...tempSettings, general: {...tempSettings.general, themeId: theme.id}})} className={`p-8 rounded-cut-md border-4 transition-all cursor-pointer ${tempSettings.general.themeId === theme.id ? 'border-orange-500 bg-orange-50 shadow-xl' : 'border-gray-50 bg-white'}`}>
                        <div className="flex gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.primary[0] }}></div>
                          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: theme.secondary[0] }}></div>
                        </div>
                        <h4 className="font-black text-xl text-gray-950">{theme.name}</h4>
                     </div>
                   ))}
                 </div>
               )}

               {settingsSubTab === 'financial' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-950">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Commission (%)</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.defaultCommission} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, defaultCommission: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Delivery Fee</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.deliveryFee} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, deliveryFee: Number(e.target.value)}})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Min Order Val</label>
                      <input type="number" className="w-full px-6 py-4 rounded-xl bg-gray-50 font-black outline-none" value={tempSettings.commissions.minOrderValue} onChange={e => setTempSettings({...tempSettings, commissions: {...tempSettings.commissions, minOrderValue: Number(e.target.value)}})} />
                    </div>
                 </div>
               )}

               {settingsSubTab === 'notifications' && (
                 <div className="space-y-10">
                   <div className="bg-gray-50 p-8 rounded-cut-md border border-gray-100">
                     <h4 className="text-xl font-black text-gray-950 mb-6 uppercase tracking-tighter">Broadcast Enrollees</h4>
                     <div className="flex flex-col sm:flex-row gap-4 mb-10">
                        <input type="tel" placeholder="03001234567" className="flex-grow px-8 py-4 rounded-xl bg-white border border-gray-200 font-black outline-none focus:border-orange-500" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                        <button onClick={() => { if(newPhone) { const n = {...tempSettings, notifications: {...tempSettings.notifications, notificationPhones: [...(tempSettings.notifications.notificationPhones || []), newPhone]}}; setTempSettings(n); setNewPhone(''); } }} className="px-10 py-4 gradient-secondary text-white rounded-xl font-black uppercase text-[10px] shadow-lg">Add Number</button>
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
                      <span className="text-sm font-black text-blue-600 uppercase">Automatic Broadcast Summaries</span>
                   </div>
                 </div>
               )}

               <div className="mt-12 pt-8 border-t border-gray-100 flex justify-end">
                  <button onClick={() => { updateSettings(tempSettings); alert("Settings Synchronized."); }} className="px-12 py-5 gradient-primary text-white rounded-cut-sm font-black text-sm uppercase shadow-2xl hover:scale-105 transition-transform active:scale-95">Sync Settings</button>
               </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

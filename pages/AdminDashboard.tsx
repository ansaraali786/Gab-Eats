
import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Restaurant, OrderStatus, MenuItem, User, UserRight, Order } from '../types';
import { APP_THEMES } from '../constants';

const AdminDashboard: React.FC = () => {
  const { 
    restaurants, orders, users, currentUser, settings,
    updateOrderStatus, addRestaurant, deleteRestaurant, addMenuItem, deleteMenuItem, 
    addUser, deleteUser, updateSettings, updateOrder
  } = useApp();

  const [activeTab, setActiveTab] = useState<UserRight>('orders');
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  
  // Forms State
  const [newRes, setNewRes] = useState({ name: '', cuisine: '', image: '' });
  const [selectedResId, setSelectedResId] = useState('');
  const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '', image: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', rights: [] as UserRight[] });

  // Filter tabs based on current user rights
  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'orders', label: 'Orders', icon: '🛒', right: 'orders' },
      { id: 'restaurants', label: 'Partners', icon: '🏢', right: 'restaurants' },
      { id: 'users', label: 'Staff Management', icon: '👥', right: 'users' },
      { id: 'settings', label: 'System Brain', icon: '🧠', right: 'settings' }
    ];
    return tabs.filter(t => currentUser?.rights.includes(t.right as UserRight));
  }, [currentUser]);

  const handleAddRes = (e: React.FormEvent) => {
    e.preventDefault();
    const res: Restaurant = {
      id: Math.random().toString(36).substr(2, 9),
      name: newRes.name, cuisine: newRes.cuisine, rating: 5.0,
      image: newRes.image || `https://picsum.photos/seed/${newRes.name}/600/400`,
      deliveryTime: '20-30 min', menu: []
    };
    addRestaurant(res);
    setNewRes({ name: '', cuisine: '', image: '' });
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResId) return alert("Select a restaurant first");
    const item: MenuItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItem.name, description: newItem.description,
      price: Number(newItem.price), category: newItem.category,
      image: newItem.image || `https://picsum.photos/seed/${newItem.name}/200/200`
    };
    addMenuItem(selectedResId, item);
    setNewItem({ name: '', description: '', price: '', category: '', image: '' });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.rights.length === 0) return alert("Please assign at least one right");
    const user: User = {
      id: `staff-${Date.now()}`,
      identifier: newUser.username,
      password: newUser.password,
      role: 'staff',
      rights: newUser.rights
    };
    addUser(user);
    setNewUser({ username: '', password: '', rights: [] });
  };

  const handleSaveOrderEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOrder) {
      const newTotal = editingOrder.items.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0) + settings.commissions.deliveryFee;
      updateOrder({ ...editingOrder, total: newTotal });
      setEditingOrder(null);
    }
  };

  const updateEditingItemQty = (itemId: string, delta: number) => {
    if (!editingOrder) return;
    const newItems = editingOrder.items.map(item => {
      if (item.id === itemId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    });
    setEditingOrder({ ...editingOrder, items: newItems });
  };

  const removeEditingItem = (itemId: string) => {
    if (!editingOrder) return;
    if (editingOrder.items.length <= 1) return alert("An order must have at least one item.");
    const newItems = editingOrder.items.filter(item => item.id !== itemId);
    setEditingOrder({ ...editingOrder, items: newItems });
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">System Control</h1>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
            Operator: <span className="text-purple-600 font-black">{currentUser.identifier}</span>
          </p>
        </div>
        <div className="flex bg-white shadow-xl rounded-2xl p-1.5 border border-gray-100 overflow-x-auto no-scrollbar max-w-full">
          {availableTabs.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'gradient-primary text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-8">
          {orders.map(order => (
            <div key={order.id} className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm overflow-hidden relative group">
              <div className="absolute top-0 right-0 w-32 h-32 gradient-primary opacity-5 rounded-bl-full"></div>
              <div className="flex flex-wrap justify-between items-start gap-6 mb-10 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-xs font-black uppercase tracking-widest">#{order.id.toUpperCase()}</span>
                    <h3 className="text-3xl font-black text-gray-900">{order.customerName}</h3>
                    {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                      <button 
                        onClick={() => setEditingOrder(order)}
                        className="ml-2 p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                        title="Edit Order Details"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 text-sm font-bold text-gray-400">
                    <div>📞 {order.contactNo}</div>
                    <div>📍 {order.address}</div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <span className={`px-6 py-2.5 rounded-full font-black text-xs uppercase tracking-widest ${statusColors[order.status]}`}>
                    {order.status}
                  </span>
                  <div className="flex bg-gray-50 p-1 rounded-xl border gap-1">
                    {(['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'] as OrderStatus[]).map(s => (
                      <button
                        key={s}
                        onClick={() => updateOrderStatus(order.id, s)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${order.status === s ? 'gradient-accent text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                        {s.charAt(0)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50/50 rounded-3xl p-8 border border-gray-50">
                {order.items.map(item => (
                  <div key={item.id} className="flex justify-between items-center mb-4 last:mb-0">
                    <span className="font-bold text-gray-700">{item.quantity}x {item.name}</span>
                    <span className="font-black text-gray-900">{settings.general.currencySymbol} {item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="pt-6 border-t mt-6 flex justify-between items-center">
                  <span className="font-black text-lg">Total</span>
                  <span className="text-3xl font-black text-orange-600">{settings.general.currencySymbol} {order.total}</span>
                </div>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="bg-white rounded-[3rem] p-20 text-center border-2 border-dashed border-gray-100">
              <div className="text-7xl mb-6">🏜️</div>
              <h3 className="text-2xl font-black text-gray-900">Quiet for now...</h3>
              <p className="text-gray-400 font-medium mt-2">No active orders in the pipe.</p>
            </div>
          )}

          {editingOrder && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
              <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                <div className="p-8 gradient-accent text-white flex justify-between items-center">
                  <h3 className="text-2xl font-black">Refine Order Details</h3>
                  <button onClick={() => setEditingOrder(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <form onSubmit={handleSaveOrderEdit} className="p-10 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Customer Name</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 focus:bg-white outline-none transition-all"
                        value={editingOrder.customerName}
                        onChange={e => setEditingOrder({...editingOrder, customerName: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Contact Number</label>
                      <input 
                        type="text" 
                        required
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 focus:bg-white outline-none transition-all"
                        value={editingOrder.contactNo}
                        onChange={e => setEditingOrder({...editingOrder, contactNo: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Delivery Address</label>
                    <textarea 
                      required
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold border-2 border-transparent focus:border-purple-500 focus:bg-white outline-none transition-all"
                      rows={3}
                      value={editingOrder.address}
                      onChange={e => setEditingOrder({...editingOrder, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Ordered Items</label>
                    <div className="space-y-4">
                      {editingOrder.items.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                          <div className="flex-grow">
                            <p className="font-black text-gray-800">{item.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{item.restaurantName}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center bg-white rounded-xl border p-1">
                              <button type="button" onClick={() => updateEditingItemQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center font-black hover:text-purple-600">-</button>
                              <span className="w-8 text-center font-black">{item.quantity}</span>
                              <button type="button" onClick={() => updateEditingItemQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center font-black hover:text-purple-600">+</button>
                            </div>
                            <button type="button" onClick={() => removeEditingItem(item.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-colors">
                               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-6 border-t flex justify-between items-center">
                    <button type="button" onClick={() => setEditingOrder(null)} className="px-8 py-4 font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">Discard Changes</button>
                    <button type="submit" className="px-10 py-4 gradient-accent text-white rounded-2xl font-black shadow-xl shadow-purple-100 hover:scale-105 transition-all">Save Adjustments</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'restaurants' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-black mb-6">Partner Registry</h2>
            <form onSubmit={handleAddRes} className="bg-white p-8 rounded-[2rem] shadow-xl space-y-4">
              <input type="text" required className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={newRes.name} onChange={e => setNewRes({...newRes, name: e.target.value})} placeholder="Restaurant Name" />
              <input type="text" required className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={newRes.cuisine} onChange={e => setNewRes({...newRes, cuisine: e.target.value})} placeholder="Cuisines" />
              <button type="submit" className="w-full py-4 gradient-primary text-white rounded-xl font-black">Register Partner</button>
            </form>
            <div className="mt-10 h-[1px] bg-gray-100"></div>
            <h2 className="text-2xl font-black mt-10 mb-6">Dish Repository</h2>
            <form onSubmit={handleAddItem} className="bg-white p-8 rounded-[2rem] shadow-xl space-y-4">
                <select className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={selectedResId} onChange={e => setSelectedResId(e.target.value)}>
                  <option value="">Target Partner</option>
                  {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <input type="text" required className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Dish Name" />
                <input type="number" required className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} placeholder={`Price (${settings.general.currencySymbol})`} />
                <button type="submit" className="w-full py-4 gradient-secondary text-white rounded-xl font-black">Infuse Item</button>
            </form>
          </div>
          <div className="lg:col-span-2 space-y-6">
            {restaurants.map(r => (
              <div key={r.id} className="bg-white p-6 rounded-[2.5rem] border-2 border-transparent hover:border-teal-400 flex items-center gap-6 group transition-all shadow-sm">
                <img src={r.image} className="w-20 h-20 rounded-2xl object-cover" alt={r.name} />
                <div className="flex-grow">
                  <h4 className="font-black text-xl">{r.name}</h4>
                  <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">{r.cuisine}</p>
                  <p className="text-xs text-teal-600 font-black mt-1">{r.menu.length} Items Available</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => deleteRestaurant(r.id)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-black mb-6">Recruit Staff</h2>
            <form onSubmit={handleAddUser} className="bg-white p-8 rounded-[2rem] shadow-xl space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Username</label>
                <input type="text" required className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Password</label>
                <input type="password" required className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase mb-4">Node Clearance</label>
                <div className="space-y-3">
                  {(['orders', 'restaurants', 'users', 'settings'] as UserRight[]).map(r => (
                    <button 
                      key={r} type="button" 
                      onClick={() => toggleRight(r)}
                      className={`w-full flex justify-between items-center px-4 py-3 rounded-xl border-2 transition-all font-bold text-sm ${newUser.rights.includes(r) ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-400'}`}
                    >
                      <span className="capitalize">{r} clearance</span>
                      {newUser.rights.includes(r) && <span>👁️</span>}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full py-5 gradient-accent text-white rounded-2xl font-black shadow-xl shadow-purple-100">Authorize Staff</button>
            </form>
          </div>
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-black mb-6">Active Operators</h2>
            {users.map(u => (
              <div key={u.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 flex items-center gap-6 group hover:shadow-lg transition-all">
                <div className="w-16 h-16 gradient-accent rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-purple-100">
                  {u.identifier.charAt(0).toUpperCase()}
                </div>
                <div className="flex-grow">
                  <h4 className="text-xl font-black">{u.identifier}</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {u.rights.map(r => (
                      <span key={r} className="px-3 py-1 bg-gray-50 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-gray-100">
                        {r}
                      </span>
                    ))}
                    {u.role === 'admin' && <span className="px-3 py-1 gradient-primary text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Super Admin</span>}
                  </div>
                </div>
                {u.id !== 'admin-1' && (
                  <button onClick={() => deleteUser(u.id)} className="w-12 h-12 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Settings Sidebar */}
          <div className="lg:w-72 flex flex-col gap-2">
            {[
              { id: 'general', label: 'General', icon: '⚙️' },
              { id: 'fees', label: 'Commissions & Fees', icon: '💰' },
              { id: 'payments', label: 'Payment Config', icon: '💳' },
              { id: 'marketing', label: 'Marketing & Ads', icon: '📢' },
              { id: 'features', label: 'Feature Toggles', icon: '🧠' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setSettingsSubTab(sub.id)}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${settingsSubTab === sub.id ? 'bg-white shadow-lg text-orange-600' : 'text-gray-400 hover:bg-white/50'}`}
              >
                <span>{sub.icon}</span>
                <span>{sub.label}</span>
              </button>
            ))}
          </div>

          {/* Settings Content Area */}
          <div className="flex-grow bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100 min-h-[600px]">
            {settingsSubTab === 'general' && (
              <div className="space-y-12 animate-in fade-in duration-500">
                <section>
                  <h3 className="text-2xl font-black border-b pb-4 mb-6">Global Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Platform Name</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                        value={settings.general.platformName} 
                        onChange={e => updateSettings({...settings, general: {...settings.general, platformName: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Currency Symbol</label>
                      <input 
                        type="text" 
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                        value={settings.general.currencySymbol} 
                        onChange={e => updateSettings({...settings, general: {...settings.general, currencySymbol: e.target.value}})}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Platform Status</label>
                      <div className="flex bg-gray-50 p-1 rounded-xl">
                        <button 
                          onClick={() => updateSettings({...settings, general: {...settings.general, platformStatus: 'Live'}})}
                          className={`flex-1 py-3 rounded-lg font-black text-xs uppercase ${settings.general.platformStatus === 'Live' ? 'bg-teal-500 text-white shadow-md' : 'text-gray-400'}`}
                        >Live</button>
                        <button 
                          onClick={() => updateSettings({...settings, general: {...settings.general, platformStatus: 'Paused'}})}
                          className={`flex-1 py-3 rounded-lg font-black text-xs uppercase ${settings.general.platformStatus === 'Paused' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-400'}`}
                        >Paused</button>
                      </div>
                    </div>
                  </div>
                </section>

                <section>
                   <h3 className="text-2xl font-black border-b pb-4 mb-6 flex items-center gap-3">
                     Occasion Theme Gallery <span className="text-xs bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase">15 Styles</span>
                   </h3>
                   <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
                     {APP_THEMES.map(theme => (
                       <button
                         key={theme.id}
                         onClick={() => updateSettings({...settings, general: {...settings.general, themeId: theme.id}})}
                         className={`p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden group ${settings.general.themeId === theme.id ? 'border-orange-500 shadow-lg shadow-orange-50 scale-105 z-10' : 'border-gray-50 bg-gray-50/50 hover:border-gray-200'}`}
                       >
                         <div 
                           className="h-12 w-full rounded-lg mb-3"
                           style={{ background: `linear-gradient(135deg, ${theme.primary[0]} 0%, ${theme.primary[1]} 100%)` }}
                         ></div>
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-900 leading-tight truncate">{theme.name}</h4>
                         <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{theme.occasion}</p>
                         {settings.general.themeId === theme.id && (
                           <div className="absolute top-2 right-2 bg-orange-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black">✓</div>
                         )}
                       </button>
                     ))}
                   </div>
                </section>

                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-amber-900">Maintenance Mode</h4>
                      <p className="text-xs text-amber-700 font-bold">Restrict all customer dashboard access instantly.</p>
                    </div>
                    <button 
                      onClick={() => updateSettings({...settings, general: {...settings.general, maintenanceMode: !settings.general.maintenanceMode}})}
                      className={`w-16 h-8 rounded-full transition-all relative ${settings.general.maintenanceMode ? 'bg-amber-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all ${settings.general.maintenanceMode ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'fees' && (
              <div className="space-y-8">
                <h3 className="text-2xl font-black border-b pb-4 mb-6">Financial Friction</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Default Commission (%)</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                      value={settings.commissions.defaultCommission} 
                      onChange={e => updateSettings({...settings, commissions: {...settings.commissions, defaultCommission: Number(e.target.value)}})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Fixed Delivery Fee ({settings.general.currencySymbol})</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                      value={settings.commissions.deliveryFee} 
                      onChange={e => updateSettings({...settings, commissions: {...settings.commissions, deliveryFee: Number(e.target.value)}})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Min Order Threshold ({settings.general.currencySymbol})</label>
                    <input 
                      type="number" 
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                      value={settings.commissions.minOrderValue} 
                      onChange={e => updateSettings({...settings, commissions: {...settings.commissions, minOrderValue: Number(e.target.value)}})}
                    />
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'payments' && (
              <div className="space-y-8">
                <h3 className="text-2xl font-black border-b pb-4 mb-6">Settlement Flow</h3>
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center font-black">💵</div>
                      <div>
                        <h4 className="font-black text-gray-900">Cash on Delivery</h4>
                        <p className="text-xs text-gray-400 font-bold">Recommended for local delivery</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSettings({...settings, payments: {...settings.payments, codEnabled: !settings.payments.codEnabled}})}
                      className={`w-14 h-7 rounded-full transition-all relative ${settings.payments.codEnabled ? 'bg-orange-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${settings.payments.codEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>
                  
                  <div className="flex items-center justify-between p-6 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center font-black">🏦</div>
                      <div>
                        <h4 className="font-black text-gray-900">Direct Bank Transfer</h4>
                        <p className="text-xs text-gray-400 font-bold">Enter account details below</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => updateSettings({...settings, payments: {...settings.payments, bankEnabled: !settings.payments.bankEnabled}})}
                      className={`w-14 h-7 rounded-full transition-all relative ${settings.payments.bankEnabled ? 'bg-teal-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white transition-all ${settings.payments.bankEnabled ? 'right-0.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>

                  {settings.payments.bankEnabled && (
                    <div className="animate-in slide-in-from-top duration-300">
                      <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Bank Settlement Details</label>
                      <textarea 
                        className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold min-h-[100px]" 
                        placeholder="IBAN, Bank Name, Account Title..."
                        value={settings.payments.bankDetails}
                        onChange={e => updateSettings({...settings, payments: {...settings.payments, bankDetails: e.target.value}})}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsSubTab === 'marketing' && (
              <div className="space-y-8">
                <h3 className="text-2xl font-black border-b pb-4 mb-6">Growth & UI Engine</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Hero Dashboard Title</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                      value={settings.marketing.heroTitle} 
                      onChange={e => updateSettings({...settings, marketing: {...settings.marketing, heroTitle: e.target.value}})}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2 tracking-widest">Hero Subtitle</label>
                    <input 
                      type="text" 
                      className="w-full px-5 py-4 rounded-xl bg-gray-50 font-bold" 
                      value={settings.marketing.heroSubtitle} 
                      onChange={e => updateSettings({...settings, marketing: {...settings.marketing, heroSubtitle: e.target.value}})}
                    />
                  </div>
                </div>

                <div className="pt-10">
                  <h4 className="text-xl font-black mb-6">Active Banners</h4>
                  <div className="space-y-4">
                    {settings.marketing.banners.map((b, idx) => (
                      <div key={b.id} className="p-6 bg-gray-50 rounded-2xl flex items-center gap-6 group">
                        <img src={b.image} className="w-24 h-16 rounded-lg object-cover" />
                        <div className="flex-grow">
                          <h5 className="font-black">{b.title}</h5>
                          <p className="text-xs font-bold text-gray-400">{b.subtitle}</p>
                        </div>
                        <button 
                          onClick={() => {
                            const newBanners = [...settings.marketing.banners];
                            newBanners[idx].isActive = !newBanners[idx].isActive;
                            updateSettings({...settings, marketing: {...settings.marketing, banners: newBanners}});
                          }}
                          className={`px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${b.isActive ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-500'}`}
                        >
                          {b.isActive ? 'Enabled' : 'Hidden'}
                        </button>
                      </div>
                    ))}
                    <button className="w-full py-4 border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 font-bold text-sm hover:border-orange-400 hover:text-orange-600 transition-all">
                      + Add New Advertisement
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsSubTab === 'features' && (
              <div className="space-y-8">
                <h3 className="text-2xl font-black border-b pb-4 mb-6">Logic Toggles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { key: 'ratingsEnabled', label: 'Ratings & Reviews', icon: '⭐' },
                    { key: 'promoCodesEnabled', label: 'Promo Code System', icon: '🏷️' },
                    { key: 'walletEnabled', label: 'Customer Wallet', icon: '💰' }
                  ].map(feat => (
                    <button 
                      key={feat.key}
                      onClick={() => updateSettings({...settings, features: {...settings.features, [feat.key]: !settings.features[feat.key as keyof typeof settings.features]}})}
                      className={`flex items-center justify-between p-6 rounded-3xl border-2 transition-all ${settings.features[feat.key as keyof typeof settings.features] ? 'border-purple-600 bg-purple-50' : 'border-gray-100 bg-gray-50 grayscale'}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">{feat.icon}</span>
                        <span className="font-black text-sm uppercase tracking-wider">{feat.label}</span>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${settings.features[feat.key as keyof typeof settings.features] ? 'bg-purple-600' : 'bg-gray-400'}`}></div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

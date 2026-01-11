import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, OrderStatus, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, NOVA_KEY } from '../constants';

const SHADOW_MASTER = `${NOVA_KEY}_master_state`;

interface MasterState {
  restaurants: Restaurant[];
  orders: Order[];
  users: User[];
  settings: GlobalSettings;
  _ts: number;
}

interface AppContextType {
  restaurants: Restaurant[];
  orders: Order[];
  cart: CartItem[];
  users: User[];
  currentUser: User | null;
  settings: GlobalSettings;
  syncStatus: 'online' | 'offline' | 'syncing';
  bootstrapping: boolean;
  peerCount: number;
  addRestaurant: (r: Restaurant) => void;
  updateRestaurant: (r: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  addMenuItem: (resId: string, item: MenuItem) => void;
  updateMenuItem: (resId: string, item: MenuItem) => void;
  deleteMenuItem: (resId: string, itemId: string) => void;
  addOrder: (o: Order) => void;
  updateOrder: (o: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addUser: (u: User) => void;
  deleteUser: (id: string) => void;
  updateSettings: (s: GlobalSettings) => void;
  loginCustomer: (phone: string) => void;
  loginStaff: (username: string, pass: string) => boolean;
  logout: () => void;
  resetLocalCache: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: GlobalSettings = {
  general: { platformName: 'GAB-EATS', currency: 'PKR', currencySymbol: 'Rs.', timezone: 'Asia/Karachi', maintenanceMode: false, platformStatus: 'Live', themeId: 'default' },
  commissions: { defaultCommission: 15, deliveryFee: 0, minOrderValue: 200 },
  payments: { codEnabled: true, easypaisaEnabled: false, bankEnabled: false, bankDetails: '' },
  notifications: { adminPhone: '03000000000', orderPlacedAlert: true },
  marketing: {
    banners: [{ id: 'b1', title: '50% Off First Order', subtitle: 'Use code GAB50', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000', link: '/', isActive: true }],
    heroTitle: 'Craving something extraordinary?',
    heroSubtitle: '#1 Food Delivery in Pakistan'
  },
  features: { ratingsEnabled: true, promoCodesEnabled: true, walletEnabled: false }
};

const DEFAULT_ADMIN: User = { id: 'admin-1', identifier: 'Ansar', password: 'Anudada@007', role: 'admin', rights: ['orders', 'restaurants', 'users', 'settings'] };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const channelRef = useRef<BroadcastChannel | null>(null);

  const [masterState, setMasterState] = useState<MasterState>(() => {
    try {
      const saved = localStorage.getItem(SHADOW_MASTER);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("V10 Boot: Local Storage reset required.");
    }
    return {
      restaurants: INITIAL_RESTAURANTS,
      orders: [],
      users: [DEFAULT_ADMIN],
      settings: DEFAULT_SETTINGS,
      _ts: Date.now()
    };
  });

  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [peerCount, setPeerCount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('logged_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });

  useEffect(() => {
    // Zero-Eval Synchronization Engine
    channelRef.current = new BroadcastChannel(NOVA_KEY);
    
    channelRef.current.onmessage = (event) => {
      const { type, payload } = event.data || {};
      if (type === 'PING') {
        channelRef.current?.postMessage({ type: 'PONG' });
        setPeerCount(p => Math.min(p + 1, 99));
      } else if (type === 'PONG') {
        setPeerCount(p => Math.min(p + 1, 99));
      } else if (event.data && event.data._ts > masterState._ts) {
        setMasterState(event.data);
        localStorage.setItem(SHADOW_MASTER, JSON.stringify(event.data));
      }
    };

    channelRef.current.postMessage({ type: 'PING' });
    const bootTimer = setTimeout(() => setBootstrapping(false), 400);

    return () => {
      clearTimeout(bootTimer);
      channelRef.current?.close();
    };
  }, [masterState._ts]);

  const pushState = useCallback((next: MasterState) => {
    const payload = { ...next, _ts: Date.now() };
    setMasterState(payload);
    localStorage.setItem(SHADOW_MASTER, JSON.stringify(payload));
    channelRef.current?.postMessage(payload);
  }, []);

  const resetLocalCache = () => { localStorage.clear(); window.location.reload(); };

  // Mutators
  const addRestaurant = (r: Restaurant) => pushState({ ...masterState, restaurants: [...masterState.restaurants, r] });
  const updateRestaurant = (r: Restaurant) => pushState({ ...masterState, restaurants: masterState.restaurants.map(x => x.id === r.id ? r : x) });
  const deleteRestaurant = (id: string) => pushState({ ...masterState, restaurants: masterState.restaurants.filter(r => r.id !== id) });
  
  const addMenuItem = (resId: string, item: MenuItem) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: [...res.menu, item] });
  };
  const updateMenuItem = (resId: string, item: MenuItem) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.map(m => m.id === item.id ? item : m) });
  };
  const deleteMenuItem = (resId: string, itemId: string) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.filter(m => m.id !== itemId) });
  };

  const addOrder = (o: Order) => pushState({ ...masterState, orders: [o, ...masterState.orders] });
  const updateOrder = (o: Order) => pushState({ ...masterState, orders: masterState.orders.map(x => x.id === o.id ? o : x) });
  const updateOrderStatus = (id: string, status: OrderStatus) => {
    const order = masterState.orders.find(o => o.id === id);
    if (order) updateOrder({ ...order, status });
  };

  const addUser = (u: User) => pushState({ ...masterState, users: [...masterState.users, u] });
  const deleteUser = (id: string) => pushState({ ...masterState, users: masterState.users.filter(u => u.id !== id) });
  const updateSettings = (s: GlobalSettings) => pushState({ ...masterState, settings: s });

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  const loginCustomer = (phone: string) => {
    const user: User = { id: `c-${Date.now()}`, identifier: phone, role: 'customer', rights: [] };
    setCurrentUser(user);
    localStorage.setItem('logged_user', JSON.stringify(user));
  };

  const loginStaff = (username: string, pass: string): boolean => {
    if (username.toLowerCase() === DEFAULT_ADMIN.identifier.toLowerCase() && pass === DEFAULT_ADMIN.password) {
      setCurrentUser(DEFAULT_ADMIN);
      localStorage.setItem('logged_user', JSON.stringify(DEFAULT_ADMIN));
      return true;
    }
    const found = masterState.users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('logged_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logout = () => { setCurrentUser(null); setCart([]); localStorage.removeItem('logged_user'); };

  return (
    <AppContext.Provider value={{
      restaurants: masterState.restaurants,
      orders: masterState.orders,
      users: masterState.users,
      settings: masterState.settings,
      cart, currentUser, syncStatus: 'online', bootstrapping, peerCount,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, resetLocalCache
    }}>
      {bootstrapping ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center' }}>
           <div style={{ width: '4rem', height: '4rem', border: '4px solid #f3f4f6', borderTopColor: '#FF5F1F', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
           <h2 style={{ fontSize: '1.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.05em', color: '#111827', marginTop: '1.5rem' }}>Nova V10 Stable</h2>
           <p style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', marginTop: '0.5rem' }}>Strict Security Handshake...</p>
        </div>
      ) : children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

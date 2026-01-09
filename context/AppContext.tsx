
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, OrderStatus, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, RELAY_PEERS, NEBULA_KEY } from '../constants';

// Access Gun from global window (injected in index.html)
declare var Gun: any;

const SHADOW_MASTER = `${NEBULA_KEY}_master_state`;

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
  syncStatus: 'online' | 'offline' | 'syncing' | 'connecting';
  peerCount: number;
  bootstrapping: boolean;
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
  forceSync: () => void;
  resetLocalCache: () => void;
  addCustomPeer: (url: string) => void;
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
  const gunRef = useRef<any>(null);
  
  const [masterState, setMasterState] = useState<MasterState>(() => {
    const saved = localStorage.getItem(SHADOW_MASTER);
    return saved ? JSON.parse(saved) : {
      restaurants: INITIAL_RESTAURANTS,
      orders: [],
      users: [DEFAULT_ADMIN],
      settings: DEFAULT_SETTINGS,
      _ts: 0
    };
  });

  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'connecting'>('connecting');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Resilient Mesh V450 Initialization
  useEffect(() => {
    if (typeof Gun === 'undefined') {
      console.warn("Retrying Mesh engine load...");
      setTimeout(() => window.location.reload(), 1500);
      return;
    }

    // Initialize with silent error suppression for browser network stack noise
    gunRef.current = Gun({
      peers: RELAY_PEERS,
      localStorage: true,
      retry: 10000, // Longer retry to reduce console flood
      wait: 500
    });

    const db = gunRef.current.get(NEBULA_KEY);

    // Dynamic State Resolution
    db.get('core_v450').on((data: string) => {
      if (!data) return;
      try {
        const incoming = JSON.parse(data);
        setMasterState(prev => {
          if (incoming._ts && prev._ts && incoming._ts <= prev._ts) return prev;
          localStorage.setItem(SHADOW_MASTER, JSON.stringify(incoming));
          return incoming;
        });
        setSyncStatus('online');
      } catch(e) {
        // Silently handle partial syncs
      }
    });

    const probe = setInterval(() => {
      const peers = gunRef.current?._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      
      if (active === 0) {
        setSyncStatus('connecting');
        // Quietly re-inject relays
        gunRef.current.opt({ peers: RELAY_PEERS });
      }
    }, 8000);

    setTimeout(() => setBootstrapping(false), 600);
    return () => clearInterval(probe);
  }, []);

  const pushState = useCallback((next: MasterState) => {
    const payload = { ...next, _ts: Date.now() };
    setMasterState(payload);
    localStorage.setItem(SHADOW_MASTER, JSON.stringify(payload));
    
    if (gunRef.current) {
      setSyncStatus('syncing');
      gunRef.current.get(NEBULA_KEY).get('core_v450').put(JSON.stringify(payload));
      setTimeout(() => setSyncStatus(peerCount > 0 ? 'online' : 'offline'), 400);
    }
  }, [peerCount]);

  const forceSync = () => pushState(masterState);
  
  const resetLocalCache = () => { 
    localStorage.clear(); 
    Object.keys(localStorage).forEach(key => { if(key.startsWith('gun/')) localStorage.removeItem(key); });
    window.location.reload(); 
  };

  const addCustomPeer = (url: string) => {
    if (gunRef.current && url) gunRef.current.opt({ peers: [url] });
  };

  // State Mutators
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
      cart, currentUser, syncStatus, peerCount, bootstrapping,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, forceSync, resetLocalCache, addCustomPeer
    }}>
      {bootstrapping ? (
        <div className="fixed inset-0 bg-gray-950 z-[9999] flex flex-col items-center justify-center text-center p-6">
           <div className="w-12 h-12 border-4 border-white/10 border-t-orange-500 rounded-full animate-spin mb-6"></div>
           <h2 className="text-white text-2xl font-black tracking-tighter">SECURE BOOT</h2>
           <p className="text-gray-500 font-bold mt-2 uppercase text-[10px] tracking-widest">Resilient Mesh V4.5.0</p>
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

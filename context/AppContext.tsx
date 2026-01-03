
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, OrderStatus, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES, RELAY_PEERS, NEBULA_KEY } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

const SHADOW_RES = `${NEBULA_KEY}_res_cache`;
const SHADOW_ORDERS = `${NEBULA_KEY}_orders_cache`;
const SHADOW_USERS = `${NEBULA_KEY}_users_cache`;
const SHADOW_SETTINGS = `${NEBULA_KEY}_settings_cache`;
const LOCAL_MESH_SIGNAL = `${NEBULA_KEY}_mesh_signal`;

// Initialize Gun with aggressive discovery
let gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: Infinity,
  wait: 0
});

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
  const db = gun.get(NEBULA_KEY);
  
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const saved = localStorage.getItem(SHADOW_RES);
    return saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(SHADOW_ORDERS);
    return saved ? JSON.parse(saved) : [];
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(SHADOW_USERS);
    return saved ? JSON.parse(saved) : [DEFAULT_ADMIN];
  });
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem(SHADOW_SETTINGS);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'connecting'>('connecting');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  // CROSS-TAB SYNC (Local Device Only)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_MESH_SIGNAL) {
        setRestaurants(JSON.parse(localStorage.getItem(SHADOW_RES) || '[]'));
        setOrders(JSON.parse(localStorage.getItem(SHADOW_ORDERS) || '[]'));
        setUsers(JSON.parse(localStorage.getItem(SHADOW_USERS) || '[]'));
        setSettings(JSON.parse(localStorage.getItem(SHADOW_SETTINGS) || JSON.stringify(DEFAULT_SETTINGS)));
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const signalLocalMesh = () => {
    localStorage.setItem(LOCAL_MESH_SIGNAL, Date.now().toString());
  };

  const titanPush = useCallback((path: string, id: string, data: any) => {
    if (!id) return;
    setSyncStatus('syncing');
    
    const payload = data === null ? null : { ...data, _ts: Date.now(), _v: 200 };
    const strPayload = payload ? JSON.stringify(payload) : null;

    // Direct Cloud Write
    db.get(`${path}_v200`).get(id).put(strPayload);

    // Update Local immediately
    const updateLocal = (prev: any[]) => {
      const next = data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data];
      if (path === 'orders') next.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      return next;
    };

    if (path === 'restaurants') {
      setRestaurants(prev => { const n = updateLocal(prev); localStorage.setItem(SHADOW_RES, JSON.stringify(n)); signalLocalMesh(); return n; });
    } else if (path === 'orders') {
      setOrders(prev => { const n = updateLocal(prev); localStorage.setItem(SHADOW_ORDERS, JSON.stringify(n)); signalLocalMesh(); return n; });
    } else if (path === 'users') {
      setUsers(prev => { const n = updateLocal(prev); localStorage.setItem(SHADOW_USERS, JSON.stringify(n)); signalLocalMesh(); return n; });
    }
    
    setTimeout(() => setSyncStatus(peerCount > 0 ? 'online' : 'offline'), 150);
  }, [db, peerCount]);

  const forceSync = useCallback(() => {
    setSyncStatus('syncing');
    restaurants.forEach(r => titanPush('restaurants', r.id, r));
    orders.forEach(o => titanPush('orders', o.id, o));
    users.forEach(u => titanPush('users', u.id, u));
    db.get('settings_v200').put(JSON.stringify(settings));
    signalLocalMesh();
  }, [restaurants, orders, users, settings, titanPush, db]);

  const addCustomPeer = (url: string) => {
    if (!url.startsWith('http') && !url.startsWith('ws')) return;
    gun.opt({ peers: [url] });
    console.log(`Hyper-Connect: Linking custom peer ${url}`);
  };

  // V200 Core Listener
  useEffect(() => {
    const timer = setTimeout(() => setBootstrapping(false), 300);

    const listen = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, shadowKey: string) => {
      db.get(`${path}_v200`).map().on((str: string | null, id: string) => {
        if (str === null) {
          setter(prev => { const next = prev.filter(i => i.id !== id); localStorage.setItem(shadowKey, JSON.stringify(next)); return next; });
          return;
        }
        try {
          const incoming = JSON.parse(str);
          setter(prev => {
            const existing = prev.find(i => i.id === id);
            if (existing && incoming._ts && existing._ts && incoming._ts <= existing._ts) return prev;
            if (existing && JSON.stringify(existing) === JSON.stringify(incoming)) return prev;
            const next = [...prev.filter(i => i.id !== id), incoming];
            if (path === 'orders') next.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
            localStorage.setItem(shadowKey, JSON.stringify(next));
            return next;
          });
        } catch(e) {}
      });
    };

    db.get('settings_v200').on((str) => { 
      if (str) try { 
        const s = JSON.parse(str);
        setSettings(s);
        localStorage.setItem(SHADOW_SETTINGS, JSON.stringify(s));
      } catch(e) {} 
    });

    listen('restaurants', setRestaurants, SHADOW_RES);
    listen('orders', setOrders, SHADOW_ORDERS);
    listen('users', setUsers, SHADOW_USERS);

    return () => clearTimeout(timer);
  }, [db]);

  // V200 Peer Watchdog
  useEffect(() => {
    const probe = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
      
      if (active === 0) {
        // Shuffle and re-probe peers
        gun.opt({ peers: RELAY_PEERS });
      }
    };
    const interval = setInterval(probe, 4000);
    return () => clearInterval(interval);
  }, []);

  const resetLocalCache = () => {
    if(confirm("DANGER: This will wipe local data. Continue?")) {
      localStorage.clear();
      if (window.indexedDB) window.indexedDB.deleteDatabase('gun');
      window.location.reload();
    }
  };

  const addRestaurant = (r: Restaurant) => titanPush('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => titanPush('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => titanPush('restaurants', id, null);
  const addMenuItem = (resId: string, item: MenuItem) => {
    const res = restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: [...res.menu, item] });
  };
  const updateMenuItem = (resId: string, item: MenuItem) => {
    const res = restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.map(m => m.id === item.id ? item : m) });
  };
  const deleteMenuItem = (resId: string, itemId: string) => {
    const res = restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.filter(m => m.id !== itemId) });
  };
  const addOrder = (o: Order) => titanPush('orders', o.id, o);
  const updateOrder = (o: Order) => titanPush('orders', o.id, o);
  const updateOrderStatus = (id: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if (order) updateOrder({ ...order, status });
  };
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  const addUser = (u: User) => titanPush('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') titanPush('users', id, null); };
  const updateSettings = (s: GlobalSettings) => {
    setSettings(s);
    localStorage.setItem(SHADOW_SETTINGS, JSON.stringify(s));
    db.get('settings_v200').put(JSON.stringify(s));
    signalLocalMesh();
  };
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
    const found = users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
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
      restaurants, orders, cart, users, currentUser, settings, syncStatus, peerCount, bootstrapping,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, forceSync, resetLocalCache, addCustomPeer
    }}>
      {bootstrapping ? (
        <div className="fixed inset-0 bg-gray-950 z-[9999] flex flex-col items-center justify-center text-center p-6">
           <div className="w-6 h-6 border-2 border-white/10 border-t-white rounded-full animate-spin mb-4"></div>
           <h2 className="text-white text-lg font-black tracking-tighter">V200 Hyper-Connect</h2>
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

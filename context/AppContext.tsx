
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, OrderStatus, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES, RELAY_PEERS, NEBULA_KEY } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

const SHADOW_RES = `${NEBULA_KEY}_res_cache`;
const SHADOW_ORDERS = `${NEBULA_KEY}_orders_cache`;
const SHADOW_USERS = `${NEBULA_KEY}_users_cache`;
const SHADOW_SETTINGS = `${NEBULA_KEY}_settings_cache`;

// Initialize Gun with aggressive discovery
const gun = Gun({
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
  
  // Local-First Persistence
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

  // Quantum V100 Push: Multi-Path Broadcast
  const titanPush = useCallback((path: string, id: string, data: any) => {
    if (!id) return;
    setSyncStatus('syncing');
    
    const payload = data === null ? null : { ...data, _ts: Date.now(), _v: 100 };
    const strPayload = payload ? JSON.stringify(payload) : null;

    // Direct and backup paths to prevent relay "stuck" nodes
    db.get(`${path}_v100`).get(id).put(strPayload);
    db.get(`${path}_v100_mirror`).get(id).put(strPayload);

    // Instant local state update
    const updateLocal = (prev: any[]) => {
      const next = data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data];
      if (path === 'orders') next.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
      else next.sort((a,b) => a.id.localeCompare(b.id));
      return next;
    };

    if (path === 'restaurants') {
      setRestaurants(prev => { const n = updateLocal(prev); localStorage.setItem(SHADOW_RES, JSON.stringify(n)); return n; });
    } else if (path === 'orders') {
      setOrders(prev => { const n = updateLocal(prev); localStorage.setItem(SHADOW_ORDERS, JSON.stringify(n)); return n; });
    } else if (path === 'users') {
      setUsers(prev => { const n = updateLocal(prev); localStorage.setItem(SHADOW_USERS, JSON.stringify(n)); return n; });
    }
    
    setTimeout(() => setSyncStatus(peerCount > 0 ? 'online' : 'offline'), 500);
  }, [db, peerCount]);

  const forceSync = useCallback(() => {
    console.log("V100 Quantum: Re-broadcasting all local data to cloud mesh...");
    setSyncStatus('syncing');
    restaurants.forEach(r => titanPush('restaurants', r.id, r));
    orders.forEach(o => titanPush('orders', o.id, o));
    users.forEach(u => titanPush('users', u.id, u));
    db.get('settings_v100').put(JSON.stringify(settings));
  }, [restaurants, orders, users, settings, titanPush, db]);

  // V100 Mesh Listener
  useEffect(() => {
    // Non-blocking boot
    const timer = setTimeout(() => setBootstrapping(false), 1500);

    const listen = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, shadowKey: string) => {
      // Primary and Mirror listeners for redundancy
      const handler = (str: string | null, id: string) => {
        if (str === null) {
          setter(prev => {
            const next = prev.filter(i => i.id !== id);
            localStorage.setItem(shadowKey, JSON.stringify(next));
            return next;
          });
          return;
        }
        try {
          const incoming = JSON.parse(str);
          setter(prev => {
            const existing = prev.find(i => i.id === id);
            // LWW (Last Write Wins) using our _ts field
            if (existing && incoming._ts && existing._ts && incoming._ts <= existing._ts) return prev;
            if (existing && JSON.stringify(existing) === JSON.stringify(incoming)) return prev;
            
            const next = [...prev.filter(i => i.id !== id), incoming];
            if (path === 'orders') next.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
            else next.sort((a,b) => a.id.localeCompare(b.id));
            localStorage.setItem(shadowKey, JSON.stringify(next));
            return next;
          });
        } catch(e) {}
      };

      db.get(`${path}_v100`).map().on(handler);
    };

    db.get('settings_v100').on((str) => { 
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

  // V100 Quantum Pulse: Active Connection Probing
  useEffect(() => {
    const probe = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');

      // If no peers found, force a relay handshake re-attempt
      if (active === 0) {
        console.log("Quantum Mesh: No peers. Re-probing relays...");
        gun.opt({ peers: RELAY_PEERS });
      }
    };
    const interval = setInterval(probe, 8000);
    return () => clearInterval(interval);
  }, []);

  const resetLocalCache = () => {
    if(confirm("QUANTUM RESET: Purge local database and re-link to Global Mesh?")) {
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
    db.get('settings_v100').put(JSON.stringify(s));
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

  useEffect(() => {
    const theme = APP_THEMES.find(t => t.id === settings.general.themeId) || APP_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--primary-start', theme.primary[0]);
    root.style.setProperty('--primary-end', theme.primary[1]);
  }, [settings.general.themeId]);

  return (
    <AppContext.Provider value={{
      restaurants, orders, cart, users, currentUser, settings, syncStatus, peerCount, bootstrapping,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, forceSync, resetLocalCache
    }}>
      {bootstrapping ? (
        <div className="fixed inset-0 bg-gray-950 z-[9999] flex flex-col items-center justify-center text-center p-6">
           <div className="w-14 h-14 border-[3px] border-orange-500/10 border-t-orange-500 rounded-full animate-spin mb-8"></div>
           <h2 className="text-white text-4xl font-black tracking-tighter mb-4">V100 Quantum</h2>
           <p className="text-orange-500/60 font-black uppercase text-[10px] tracking-[0.4em] max-w-xs leading-loose">
             Hyper-Discovery Mesh Protocol Active
           </p>
           <div className="mt-12 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${peerCount > 0 ? 'bg-emerald-500' : 'bg-gray-800 animate-pulse'}`}></span>
              <span className="text-gray-600 font-black text-[9px] uppercase tracking-widest">
                {peerCount > 0 ? `Quantum Connection: ${peerCount} Nodes` : 'Probing Mesh Authority...'}
              </span>
           </div>
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

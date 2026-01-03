
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES, RELAY_PEERS, NEBULA_KEY } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

const SHADOW_RES = `${NEBULA_KEY}_res_cache`;
const SHADOW_ORDERS = `${NEBULA_KEY}_orders_cache`;
const SHADOW_USERS = `${NEBULA_KEY}_users_cache`;
const SHADOW_SETTINGS = `${NEBULA_KEY}_settings_cache`;

// Initialize Gun with ultra-aggressive discovery
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: Infinity,
  wait: 10
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
  updateOrderStatus: (id: string, status: Order['status']) => void;
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
  const meshWarmed = useRef(false);
  
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

  // OMEGA PUSH: Strict authority write
  const titanPush = useCallback((path: string, id: string, data: any) => {
    if (!id) return;
    setSyncStatus('syncing');
    
    const node = db.get(`${path}_v60`).get(id);
    if (data === null) {
      node.put(null);
    } else {
      const payload = { ...data, _omega_ts: Date.now() };
      node.put(JSON.stringify(payload));
    }

    // Immediate state mirror
    if (path === 'restaurants') {
      setRestaurants(prev => {
        const next = data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data].sort((a,b) => a.id.localeCompare(b.id));
        localStorage.setItem(SHADOW_RES, JSON.stringify(next));
        return next;
      });
    } else if (path === 'orders') {
      setOrders(prev => {
        const next = data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        localStorage.setItem(SHADOW_ORDERS, JSON.stringify(next));
        return next;
      });
    } else if (path === 'users') {
      setUsers(prev => {
        const next = data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data];
        localStorage.setItem(SHADOW_USERS, JSON.stringify(next));
        return next;
      });
    }
  }, [db]);

  const forceSync = useCallback(() => {
    console.log("Omega Engine: Broadcasting current state to global mesh...");
    setSyncStatus('syncing');
    restaurants.forEach(r => titanPush('restaurants', r.id, r));
    orders.forEach(o => titanPush('orders', o.id, o));
    users.forEach(u => titanPush('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    setTimeout(() => setSyncStatus('online'), 800);
  }, [restaurants, orders, users, settings, titanPush, db]);

  // AUTHORITY INITIALIZATION
  useEffect(() => {
    const timer = setTimeout(() => {
      setBootstrapping(false);
      // Only seed if mesh is confirmed dead after 4 seconds
      db.get('omega_lock').once((val) => {
        if (!val) {
          console.log("Omega Engine: Mesh empty. Initializing seeds...");
          forceSync();
          db.get('omega_lock').put(true);
        }
      });
    }, 4000);

    const listen = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, shadowKey: string) => {
      db.get(`${path}_v60`).map().on((str, id) => {
        if (!str) {
          setter(prev => {
            const next = prev.filter(i => i.id !== id);
            localStorage.setItem(shadowKey, JSON.stringify(next));
            return next;
          });
          return;
        }
        try {
          const obj = JSON.parse(str);
          setter(prev => {
            const existing = prev.find(i => i.id === id);
            // Authority Rule: Cloud data wins if different
            if (existing && JSON.stringify(existing) === JSON.stringify(obj)) return prev;
            
            const next = [...prev.filter(i => i.id !== id), obj];
            if (path === 'orders') next.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
            else next.sort((a,b) => a.id.localeCompare(b.id));
            localStorage.setItem(shadowKey, JSON.stringify(next));
            return next;
          });
        } catch(e) {}
      });
    };

    db.get('settings').on((str) => { 
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
  }, [db, forceSync]);

  useEffect(() => {
    const hb = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      if (active > 0) {
        setSyncStatus('online');
        if (!meshWarmed.current) {
          meshWarmed.current = true;
          console.log("Omega Engine: Cloud Mesh Secured.");
        }
      } else {
        setSyncStatus('connecting');
      }
    };
    const interval = setInterval(hb, 5000);
    gun.on('hi', hb);
    return () => clearInterval(interval);
  }, []);

  const resetLocalCache = () => {
    if(confirm("OMEGA REBOOT: Clear browser memory and re-sync from Cloud Authority?")) {
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
  const updateOrderStatus = (id: string, status: Order['status']) => {
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
    db.get('settings').put(JSON.stringify(s));
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
    root.style.setProperty('--secondary-start', theme.secondary[0]);
    root.style.setProperty('--secondary-end', theme.secondary[1]);
    root.style.setProperty('--accent-start', theme.accent[0]);
    root.style.setProperty('--accent-end', theme.accent[1]);
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
           <div className="relative mb-12">
             <div className="w-24 h-24 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
             <div className="absolute inset-0 flex items-center justify-center text-orange-500 font-black text-xl">Ω</div>
           </div>
           <h2 className="text-white text-3xl font-black tracking-tighter mb-4">Omega Cloud Sync...</h2>
           <p className="text-orange-500/60 font-black uppercase text-[10px] tracking-widest max-w-xs leading-loose">
             Authenticating with global mesh authority. Device reconciliation in progress.
           </p>
           <div className="mt-12 flex items-center gap-3">
              <span className={`w-2 h-2 rounded-full ${peerCount > 0 ? 'bg-emerald-500 shadow-emerald-500 shadow-[0_0_10px_rgba(0,0,0,0.5)]' : 'bg-gray-800'}`}></span>
              <span className="text-gray-600 font-black text-[9px] uppercase tracking-widest">
                {peerCount > 0 ? `Connection Verified: ${peerCount} Nodes` : 'Searching for Peers...'}
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


import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES, RELAY_PEERS, NEBULA_KEY } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

const SHADOW_RES = `${NEBULA_KEY}_res_cache`;
const SHADOW_ORDERS = `${NEBULA_KEY}_orders_cache`;
const SHADOW_USERS = `${NEBULA_KEY}_users_cache`;
const SHADOW_SETTINGS = `${NEBULA_KEY}_settings_cache`;

// Initialize Gun with High-Performance options
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true, // Persist locally for PWA
  radisk: true,
  retry: Infinity, // Keep trying forever
  wait: 0 // Do not wait for server ack to update local graph
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
  
  // State initialization with shadow-cache priority
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

  // Aggressive Cloud Rejection Filter: prevents null/corrupt data from polluting state
  const titanPush = useCallback((path: string, id: string, data: any) => {
    if (!id) return;
    setSyncStatus('syncing');
    
    // Explicit Mesh Write
    const node = db.get(`${path}_data`).get(id);
    const index = db.get(`${path}_index`).get(id);

    if (data === null) {
      node.put(null);
      index.put(null);
    } else {
      // Add timestamp to ensure Ham-Logic (Highest Wins)
      const payload = { ...data, _last_sync: Date.now() };
      node.put(JSON.stringify(payload), (ack: any) => {
        if (!ack.err) {
          index.put(true);
          setSyncStatus('online');
        }
      });
    }

    // Direct Local Update for Instant UI
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
    console.log("V50 Engine: Force Re-broadcasting Sovereign State...");
    setSyncStatus('syncing');
    restaurants.forEach(r => titanPush('restaurants', r.id, r));
    orders.forEach(o => titanPush('orders', o.id, o));
    users.forEach(u => titanPush('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    setTimeout(() => setSyncStatus('online'), 1000);
  }, [restaurants, orders, users, settings, titanPush, db]);

  // ENGINE INITIALIZATION
  useEffect(() => {
    // 1. Give the Cloud 3 seconds to "speak" before we allow modifications
    const bootTimer = setTimeout(() => {
      setBootstrapping(false);
      db.get('system_lock_v50').once((val) => {
        if (!val) {
          console.log("V50 Sovereign Engine: Mesh is empty. Seeding Core Data...");
          forceSync();
          db.get('system_lock_v50').put(true);
        }
      });
    }, 3000);

    const listen = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, shadowKey: string) => {
      // Using .map() to listen to the index, ensuring we only fetch active items
      db.get(`${path}_index`).map().on((val, id) => {
        if (val === true) {
          db.get(`${path}_data`).get(id).on((str) => {
            if (!str) return;
            try {
              const obj = JSON.parse(str);
              setter(prev => {
                const existing = prev.find(i => i.id === id);
                // Ham Logic: Only update if the incoming data is newer or different
                if (existing && JSON.stringify(existing) === JSON.stringify(obj)) return prev;
                
                const next = [...prev.filter(i => i.id !== id), obj];
                if (path === 'orders') next.sort((a,b) => b.createdAt.localeCompare(a.createdAt));
                else next.sort((a,b) => a.id.localeCompare(b.id));
                localStorage.setItem(shadowKey, JSON.stringify(next));
                return next;
              });
            } catch(e) {}
          });
        } else if (val === null) {
          setter(prev => {
            const next = prev.filter(i => i.id !== id);
            localStorage.setItem(shadowKey, JSON.stringify(next));
            return next;
          });
        }
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

    return () => clearTimeout(bootTimer);
  }, [db, forceSync]);

  // Peer Connectivity Monitoring
  useEffect(() => {
    const monitor = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      if (active > 0) {
        setSyncStatus('online');
        // Keep-alive heartbeat: forces browsers to maintain WS connection
        db.get('heartbeat').put(Date.now());
      } else {
        setSyncStatus('connecting');
      }
    };
    
    const interval = setInterval(monitor, 5000);
    // Bind to Gun's internal events for faster response
    gun.on('hi', monitor);
    gun.on('bye', monitor);
    
    return () => {
      clearInterval(interval);
      gun.off('hi', monitor);
      gun.off('bye', monitor);
    };
  }, [db]);

  const resetLocalCache = () => {
    if(confirm("SOVEREIGN RESET: This will wipe your local browser memory and re-download everything from the Cloud. Continue?")) {
      localStorage.clear();
      // IndexedDB cleanup for Gun
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
        <div className="fixed inset-0 bg-gray-900 z-[9999] flex flex-col items-center justify-center text-center p-6">
           <div className="w-20 h-20 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-8"></div>
           <h2 className="text-white text-3xl font-black tracking-tighter mb-4">Establishing Sovereign Cloud...</h2>
           <p className="text-gray-400 font-bold max-w-sm uppercase text-[10px] tracking-widest">Reconciling Global Mesh State. Please wait.</p>
           <div className="mt-10 flex gap-2">
              {RELAY_PEERS.slice(0, 3).map((_, i) => (
                <div key={i} className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }}></div>
              ))}
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

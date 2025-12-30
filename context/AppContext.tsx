
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// V36 Pulsar Relay Cluster - Filtered for maximum stability
const RELAY_PEERS = [
  'https://p2p-relay.up.railway.app/gun',
  'https://relay.peer.ooo/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://gun-ams1.marda.io/gun',
  'https://dletta.com/gun',
  'https://gun.4321.it/gun',
  'https://gun-sjc1.marda.io/gun'
];

// Pulsar Config - Forced Handshake & Keep-Alive
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: false,
  indexedDB: true,     
  retry: 500,          // Hyper-aggressive retry
  wait: 100,           
  axe: true,           
  multicast: true      
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
  const PULSAR_KEY = 'gab_v36_pulsar';
  const db = gun.get(PULSAR_KEY);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const cached = localStorage.getItem('gab_settings_cache');
    return cached ? JSON.parse(cached) : DEFAULT_SETTINGS;
  });
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'connecting'>('connecting');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  // 1. PULSAR ATOMIC SHOUT
  const pulsarPush = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    const node = db.get(`${path}_data`).get(id);
    const registry = db.get(`${path}_index`).get(id);

    if (data === null) {
      node.put(null);
      registry.put(null, (ack: any) => {
         if (!ack.err) setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
      });
    } else {
      // PULSAR MODE: We put the data, then wait for the mesh to ack
      node.put(JSON.stringify(data), (ack: any) => {
        if (!ack.err) {
          registry.put(true);
          setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
        } else {
          // Failure means the peer connection is stale. We force a re-hop.
          forceSync();
        }
      });
    }
  };

  // 2. PULSAR STREAMING ENGINE
  useEffect(() => {
    const setupPulsarCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
      const dataNode = db.get(`${path}_data`);
      const indexNode = db.get(`${path}_index`);

      indexNode.map().on((val, id) => {
        if (val === true) {
          dataNode.get(id).on((dataString) => {
            if (!dataString) return;
            try {
              const data = JSON.parse(dataString);
              setter(prev => {
                const other = prev.filter(item => item.id !== id);
                return [...other, data].sort((a, b) => a.id.localeCompare(b.id));
              });
            } catch(e) {}
          });
        } else if (val === null) {
          setter(prev => prev.filter(i => i.id !== id));
        }
      });

      // Verification: Initial Seed only if mesh is truly empty
      indexNode.once((reg: any) => {
        if (!reg || Object.keys(reg).length <= 1) {
          initial.forEach(item => pulsarPush(path, item.id, item));
        }
      });
    };

    db.get('settings').on((data) => {
      if (data) {
        try { 
          const parsed = JSON.parse(data);
          setSettings(parsed);
          localStorage.setItem('gab_settings_cache', data);
        } catch(e) {}
      }
    });

    setupPulsarCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupPulsarCollection('orders', setOrders, []);
    setupPulsarCollection('users', setUsers, [DEFAULT_ADMIN]);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(p => {
        db.get(`${p}_index`).off();
        db.get(`${p}_data`).off();
      });
    };
  }, []);

  // 3. PULSAR LINK DIAGNOSTICS (Real-time updates to UI)
  useEffect(() => {
    const updateStats = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
    };

    const checker = setInterval(updateStats, 2000); // Check faster for V36
    gun.on('hi', updateStats);
    gun.on('bye', updateStats);
    return () => { 
      clearInterval(checker); 
      gun.off('hi', updateStats); 
      gun.off('bye', updateStats); 
    };
  }, []);

  const forceSync = () => {
    setSyncStatus('syncing');
    
    // ATOMIC RE-HANDSHAKE: Clear and re-add peers
    RELAY_PEERS.forEach(url => {
       try { 
         const p = (gun as any)._?.opt?.peers || {};
         if (p[url]) delete p[url]; 
         (gun as any).opt({ peers: [url] }); 
       } catch(e) {}
    });
    
    // Full state rebroadcast to force sync on slow peers
    db.get('pulse').put(Date.now());
    restaurants.forEach(r => pulsarPush('restaurants', r.id, r));
    orders.forEach(o => pulsarPush('orders', o.id, o));
    users.forEach(u => pulsarPush('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    
    setTimeout(() => {
       const p = (gun as any)._?.opt?.peers || {};
       const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
       setPeerCount(active);
       if (active > 0) {
         setSyncStatus('online');
         console.log("PULSAR: Sync link verified.");
       } else {
         setSyncStatus('connecting');
         console.warn("PULSAR: Mesh isolated.");
       }
    }, 3000);
  };

  const resetLocalCache = () => { 
    if(confirm("REBOOT MESH: This clears local IndexedDB to fix sync loops. OK?")) {
      localStorage.clear(); 
      if (window.indexedDB) window.indexedDB.deleteDatabase('gun');
      window.location.reload(); 
    }
  };

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

  const addRestaurant = (r: Restaurant) => pulsarPush('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => pulsarPush('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => pulsarPush('restaurants', id, null);
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
  const addOrder = (o: Order) => pulsarPush('orders', o.id, o);
  const updateOrder = (o: Order) => pulsarPush('orders', o.id, o);
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
  const addUser = (u: User) => pulsarPush('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') pulsarPush('users', id, null); };
  const updateSettings = (s: GlobalSettings) => db.get('settings').put(JSON.stringify(s));
  const loginCustomer = (phone: string) => { setCurrentUser({ id: `c-${Date.now()}`, identifier: phone, role: 'customer', rights: [] }); };
  const loginStaff = (username: string, pass: string): boolean => {
    if (username.toLowerCase() === DEFAULT_ADMIN.identifier.toLowerCase() && pass === DEFAULT_ADMIN.password) {
      setCurrentUser(DEFAULT_ADMIN); return true;
    }
    const found = users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (found) { setCurrentUser(found); return true; }
    return false;
  };
  const logout = () => { setCurrentUser(null); setCart([]); };

  return (
    <AppContext.Provider value={{
      restaurants, orders, cart, users, currentUser, settings, syncStatus, peerCount,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, forceSync, resetLocalCache
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

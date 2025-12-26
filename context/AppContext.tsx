
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// V35 Supernova Relay Cluster - Diversified to bypass regional blocks
const RELAY_PEERS = [
  'https://p2p-relay.up.railway.app/gun',
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://gun-ams1.marda.io/gun',
  'https://dletta.com/gun',
  'https://gun.4321.it/gun',
  'https://gun-sjc1.marda.io/gun',
  'https://gun-sydney.herokuapp.com/gun',
  'https://gun-capetown.herokuapp.com/gun',
  'https://gun-tokyo.herokuapp.com/gun'
];

// Supernova Config - Optimized for maximum P2P reachability
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: false,
  indexedDB: true,     // Persist data locally so it survives reloads
  retry: 1000,         // Rapid retry to catch fluctuating links
  wait: 200,           // Fast response for handshake
  axe: true,           // Enable AXE for better routing between devices
  multicast: true      // Allow direct LAN discovery if on same Wi-Fi
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
  const SUPERNOVA_KEY = 'gab_v35_supernova';
  const db = gun.get(SUPERNOVA_KEY);

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

  // 1. SUPERNOVA ATOMIC PUSH
  const supernovaPush = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    const node = db.get(`${path}_data`).get(id);
    const registry = db.get(`${path}_index`).get(id);

    if (data === null) {
      node.put(null);
      registry.put(null, (ack: any) => {
         if (!ack.err) setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
      });
    } else {
      // Force immediate broadcast with acknowledgment check
      node.put(JSON.stringify(data), (ack: any) => {
        if (!ack.err) {
          registry.put(true);
          setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
        } else {
          console.warn("Retrying Supernova Push...");
          setTimeout(() => supernovaPush(path, id, data), 1500);
        }
      });
    }
  };

  // 2. SUPERNOVA DISCOVERY (Linked Device Sync)
  useEffect(() => {
    const setupSupernovaCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
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

      // Verification: Initial Seed
      indexNode.once((reg: any) => {
        if (!reg || Object.keys(reg).length <= 1) {
          initial.forEach(item => supernovaPush(path, item.id, item));
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

    setupSupernovaCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupSupernovaCollection('orders', setOrders, []);
    setupSupernovaCollection('users', setUsers, [DEFAULT_ADMIN]);

    // Mesh-Heartbeat: Keeps the WebSocket tunnel from closing
    const heartbeat = setInterval(() => {
      if (peerCount > 0) db.get('heartbeat').put(Date.now());
    }, 5000);

    return () => {
      clearInterval(heartbeat);
      ['restaurants', 'orders', 'users', 'settings'].forEach(p => {
        db.get(`${p}_index`).off();
        db.get(`${p}_data`).off();
      });
    };
  }, []);

  // 3. HYPER-LINK DIAGNOSTICS
  useEffect(() => {
    let timer: any;
    const updateStats = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      
      clearTimeout(timer);
      timer = setTimeout(() => {
        setPeerCount(active);
        setSyncStatus(active > 0 ? 'online' : 'connecting');
      }, 1500);
    };

    const checker = setInterval(updateStats, 4000);
    gun.on('hi', updateStats);
    gun.on('bye', updateStats);
    return () => { 
      clearInterval(checker); 
      clearTimeout(timer);
      gun.off('hi', updateStats); 
      gun.off('bye', updateStats); 
    };
  }, []);

  const forceSync = () => {
    setSyncStatus('syncing');
    // Rotate peers manually to force new handshakes
    RELAY_PEERS.forEach(url => {
       try { (gun as any).opt({ peers: [url] }); } catch(e) {}
    });
    
    // Broadcast local "Source of Truth" to all listening peers
    restaurants.forEach(r => supernovaPush('restaurants', r.id, r));
    orders.forEach(o => supernovaPush('orders', o.id, o));
    users.forEach(u => supernovaPush('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    
    setTimeout(() => {
       const p = (gun as any)._?.opt?.peers || {};
       const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
       setPeerCount(active);
       if (active > 0) {
         setSyncStatus('online');
         alert(`SUPERNOVA LINK: Successfully connected to ${active} global relays. Your devices are now syncing!`);
       } else {
         setSyncStatus('connecting');
         alert("LINK FAILED: Your current network is blocking the P2P relays. Please try using a mobile hotspot or a different browser for 1 minute to 'jump-start' the mesh.");
       }
    }, 5000);
  };

  const resetLocalCache = () => { 
    if(confirm("DANGER: This will delete your local database. Use only if sync is permanently broken. Proceed?")) {
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

  // App logic wrappers
  const addRestaurant = (r: Restaurant) => supernovaPush('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => supernovaPush('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => supernovaPush('restaurants', id, null);
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
  const addOrder = (o: Order) => supernovaPush('orders', o.id, o);
  const updateOrder = (o: Order) => supernovaPush('orders', o.id, o);
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
  const addUser = (u: User) => supernovaPush('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') supernovaPush('users', id, null); };
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

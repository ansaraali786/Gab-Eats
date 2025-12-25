
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// HIGH-STABILITY RELAY LIST
const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://p2p-relay.up.railway.app/gun'
];

// GUN INITIALIZATION (V21 - Optimized for Mesh persistence)
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: 500,
  wait: 100
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
  // CLUSTER V21 - GRANULAR NAMESPACE
  const MESH_KEY = 'gab_v21_hyper_pulse';
  const db = gun.get(MESH_KEY);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'connecting'>('connecting');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const lastPulseTime = useRef(Date.now());

  // 1. GRANULAR SYNC ENGINE (Mapping)
  useEffect(() => {
    const syncCollection = (path: string, setter: Function, initial: any[]) => {
      const node = db.get(path);
      
      // V21 Logic: Use map() to listen for individual node changes
      // This is 100x more reliable in Gun than syncing one big JSON string
      node.map().on((data, id) => {
        if (data) {
          setter((prev: any[]) => {
            const filtered = prev.filter(item => item.id !== id);
            try {
              return [...filtered, JSON.parse(data)];
            } catch(e) { return prev; }
          });
          lastPulseTime.current = Date.now();
          setSyncStatus('online');
        }
      });

      // Cold Start check
      node.once((data) => {
        if (!data && initial.length > 0) {
          initial.forEach(item => node.get(item.id).put(JSON.stringify(item)));
        }
      });
    };

    // Singleton Sync (Settings)
    db.get('settings').on((data) => {
      if (data) try { setSettings(JSON.parse(data)); } catch(e) {}
    });

    syncCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    syncCollection('orders', setOrders, []);
    syncCollection('users', setUsers, [DEFAULT_ADMIN]);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(k => db.get(k).off());
    };
  }, []);

  // 2. CONNECTION WATCHDOG
  useEffect(() => {
    const checkPeers = () => {
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
    };

    gun.on('hi', checkPeers);
    gun.on('bye', checkPeers);

    const watchdog = setInterval(() => {
      // If we are "Live" but haven't received a pulse in 20 seconds, force-reconnect
      const silence = Date.now() - lastPulseTime.current;
      if (peerCount === 0 || silence > 20000) {
        console.log("Hyper-Pulse: Rotating Relays...");
        gun.opt({ peers: RELAY_PEERS });
      }
      db.get('pulse').put(Date.now());
    }, 5000);

    return () => {
      clearInterval(watchdog);
      gun.off('hi', checkPeers);
      gun.off('bye', checkPeers);
    };
  }, [peerCount]);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // 3. BROADCAST LOGIC
  const broadcast = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    db.get(path).get(id).put(JSON.stringify(data), (ack: any) => {
      if (!ack.err) setSyncStatus('online');
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    restaurants.forEach(r => broadcast('restaurants', r.id, r));
    orders.forEach(o => broadcast('orders', o.id, o));
    users.forEach(u => broadcast('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    alert("Hyper-Pulse hard-relink triggered.");
  };

  const resetLocalCache = () => { localStorage.clear(); window.location.reload(); };

  // Theme Logic
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

  // Mutators (Updated for Granular V21 Nodes)
  const addRestaurant = (r: Restaurant) => broadcast('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => broadcast('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => {
    db.get('restaurants').get(id).put(null);
    setRestaurants(prev => prev.filter(r => r.id !== id));
  };
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
  const addOrder = (o: Order) => broadcast('orders', o.id, o);
  const updateOrder = (o: Order) => broadcast('orders', o.id, o);
  const updateOrderStatus = (id: string, status: Order['status']) => {
    const order = orders.find(o => o.id === id);
    if (order) broadcast('orders', id, { ...order, status });
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
  const addUser = (u: User) => broadcast('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') { db.get('users').get(id).put(null); setUsers(u => u.filter(x => x.id !== id)); } };
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

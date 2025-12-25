
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://p2p-relay.up.railway.app/gun'
];

const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: 1000,
  wait: 50
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
  const NEUTRON_KEY = 'gab_v24_neutron';
  const db = gun.get(NEUTRON_KEY);

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

  const lastSignalRef = useRef(0);

  // 1. NEUTRON SIGNAL BUS
  useEffect(() => {
    const setupCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
      const dataNode = db.get(path);

      // Listener for Surgical Updates
      const updateHandler = (data: any, id: string) => {
        setter(prev => {
          if (data === null) return prev.filter(item => item.id !== id);
          try {
            const parsed = JSON.parse(data);
            const filtered = prev.filter(item => item.id !== id);
            return [...filtered, parsed];
          } catch(e) { return prev; }
        });
      };

      // Map is still used for bulk initial load
      dataNode.map().on(updateHandler);

      // V24 GLOBAL SIGNAL LISTENER
      // When a signal comes for this path, we force-fetch the specific node
      db.get(`signal_${path}`).on((signal) => {
        if (!signal) return;
        try {
          const { id, ts } = JSON.parse(signal);
          if (ts > lastSignalRef.current) {
            dataNode.get(id).once((data) => updateHandler(data, id));
          }
        } catch(e) {}
      });

      // Bootstrap
      dataNode.once((data) => {
        if (!data) initial.forEach(item => dataNode.get(item.id).put(JSON.stringify(item)));
      });
    };

    db.get('settings').on((data) => {
      if (data) try { setSettings(JSON.parse(data)); } catch(e) {}
    });

    setupCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupCollection('orders', setOrders, []);
    setupCollection('users', setUsers, [DEFAULT_ADMIN]);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
        db.get(k).off();
        db.get(`signal_${k}`).off();
      });
    };
  }, []);

  // 2. NEUTRON WATCHDOG
  useEffect(() => {
    const checkPeers = () => {
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
    };
    gun.on('hi', checkPeers);
    gun.on('bye', checkPeers);
    return () => { gun.off('hi', checkPeers); gun.off('bye', checkPeers); };
  }, [peerCount]);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // 3. NEUTRON BROADCAST (WITH SIGNAL)
  const neutronBroadcast = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    const node = db.get(path).get(id);
    
    const putData = data === null ? null : JSON.stringify(data);
    
    node.put(putData, (ack: any) => {
      if (!ack.err) {
        // TRIGGER THE GLOBAL SIGNAL AFTER DATA IS WRITTEN
        const signal = JSON.stringify({ id, ts: Date.now() });
        db.get(`signal_${path}`).put(signal);
        setSyncStatus('online');
      }
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    restaurants.forEach(r => neutronBroadcast('restaurants', r.id, r));
    orders.forEach(o => neutronBroadcast('orders', o.id, o));
    users.forEach(u => neutronBroadcast('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    alert("Neutron Surgical Resync Dispatched.");
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

  // Mutators
  const addRestaurant = (r: Restaurant) => neutronBroadcast('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => neutronBroadcast('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => neutronBroadcast('restaurants', id, null);
  
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

  const addOrder = (o: Order) => neutronBroadcast('orders', o.id, o);
  const updateOrder = (o: Order) => neutronBroadcast('orders', o.id, o);
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
  const addUser = (u: User) => neutronBroadcast('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') neutronBroadcast('users', id, null); };
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

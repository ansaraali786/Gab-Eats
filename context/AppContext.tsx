
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// V37 Quasar Relays - Hand-picked for maximum bypass potential
const RELAY_PEERS = [
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://dletta.com/gun',
  'https://gun.4321.it/gun',
  'https://gun-ams1.marda.io/gun',
  'https://p2p-relay.up.railway.app/gun'
];

const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: false,
  indexedDB: true,
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
  const QUASAR_NAMESPACE = 'gab_v37_quasar';
  const db = gun.get(QUASAR_NAMESPACE);

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

  // OPTIMISTIC SYNC ENGINE
  const quasarPush = useCallback((path: string, id: string, data: any) => {
    // 1. Immediate React State Update (Optimistic)
    if (path === 'restaurants') {
      setRestaurants(prev => data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data].sort((a,b) => a.id.localeCompare(b.id)));
    } else if (path === 'orders') {
      setOrders(prev => data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data].sort((a,b) => b.createdAt.localeCompare(a.createdAt)));
    } else if (path === 'users') {
      setUsers(prev => data === null ? prev.filter(i => i.id !== id) : [...prev.filter(i => i.id !== id), data]);
    }

    // 2. Background Sync to Cloud Mesh
    setSyncStatus('syncing');
    const node = db.get(`${path}_data`).get(id);
    const registry = db.get(`${path}_index`).get(id);

    if (data === null) {
      node.put(null);
      registry.put(null);
    } else {
      node.put(JSON.stringify(data), (ack: any) => {
        if (!ack.err) {
          registry.put(true);
          setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
        }
      });
    }
  }, [db, peerCount]);

  // INITIALIZATION & DISCOVERY
  useEffect(() => {
    const setupCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
      const index = db.get(`${path}_index`);
      const data = db.get(`${path}_data`);

      index.map().on((val, id) => {
        if (val === true) {
          data.get(id).on((str) => {
            if (!str) return;
            try {
              const obj = JSON.parse(str);
              setter(prev => [...prev.filter(i => i.id !== id), obj].sort((a,b) => a.id.localeCompare(b.id)));
            } catch(e) {}
          });
        } else if (val === null) {
          setter(prev => prev.filter(i => i.id !== id));
        }
      });

      // Seed if Mesh is empty
      index.once((reg: any) => {
        if (!reg || Object.keys(reg).length <= 1) {
          initial.forEach(item => quasarPush(path, item.id, item));
        }
      });
    };

    db.get('settings').on((str) => {
      if (str) {
        try { setSettings(JSON.parse(str)); } catch(e) {}
      }
    });

    setupCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupCollection('orders', setOrders, []);
    setupCollection('users', setUsers, [DEFAULT_ADMIN]);
  }, []);

  // PEER MONITORING
  useEffect(() => {
    const update = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
    };
    const interval = setInterval(update, 2000);
    gun.on('hi', update);
    return () => { clearInterval(interval); gun.off('hi', update); };
  }, []);

  const forceSync = () => {
    setSyncStatus('syncing');
    RELAY_PEERS.forEach(p => (gun as any).opt({ peers: [p] }));
    db.get('pulse').put(Date.now());
    setTimeout(() => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
    }, 2000);
  };

  const resetLocalCache = () => {
    if(confirm("Factory Reset: This clears local database to fix sync loops. OK?")) {
      localStorage.clear();
      if (window.indexedDB) window.indexedDB.deleteDatabase('gun');
      window.location.reload();
    }
  };

  // State Management Wrappers
  const addRestaurant = (r: Restaurant) => quasarPush('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => quasarPush('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => quasarPush('restaurants', id, null);
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
  const addOrder = (o: Order) => quasarPush('orders', o.id, o);
  const updateOrder = (o: Order) => quasarPush('orders', o.id, o);
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
  const addUser = (u: User) => quasarPush('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') quasarPush('users', id, null); };
  const updateSettings = (s: GlobalSettings) => {
    setSettings(s);
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

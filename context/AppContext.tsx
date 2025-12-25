
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// HYPER-RELAY LIST - Maximum Redundancy
const RELAY_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://dletta.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gun-server.herokuapp.com/gun',
  'https://gun-sydney.herokuapp.com/gun',
  'https://gun-luna.herokuapp.com/gun'
];

// Initialize Gun with optimized settings for mobile/shared environments
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  retry: 1000,
  radisk: true
});

interface AppContextType {
  restaurants: Restaurant[];
  orders: Order[];
  cart: CartItem[];
  users: User[];
  currentUser: User | null;
  settings: GlobalSettings;
  syncStatus: 'online' | 'offline' | 'syncing';
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
  general: {
    platformName: 'GAB-EATS',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    timezone: 'Asia/Karachi',
    maintenanceMode: false,
    platformStatus: 'Live',
    themeId: 'default'
  },
  commissions: { defaultCommission: 15, deliveryFee: 0, minOrderValue: 200 },
  payments: { codEnabled: true, easypaisaEnabled: false, bankEnabled: false, bankDetails: '' },
  notifications: { adminPhone: '03000000000', orderPlacedAlert: true },
  marketing: {
    banners: [
      { id: 'b1', title: '50% Off First Order', subtitle: 'Use code GAB50', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000', link: '/', isActive: true }
    ],
    heroTitle: 'Craving something extraordinary?',
    heroSubtitle: '#1 Food Delivery in Pakistan'
  },
  features: { ratingsEnabled: true, promoCodesEnabled: true, walletEnabled: false }
};

const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  identifier: 'Ansar',
  password: 'Anudada@007',
  role: 'admin',
  rights: ['orders', 'restaurants', 'users', 'settings']
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // GLOBAL CLUSTER KEY - Ensure all shared devices use THIS EXACT KEY
  const CLUSTER_ID = 'gab_eats_universal_v4_stable';
  const db = gun.get(CLUSTER_ID);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('syncing');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Mesh Heartbeat and Peer Monitoring
  useEffect(() => {
    const monitor = setInterval(() => {
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      if (active > 0) setSyncStatus('online');
      
      // Auto-reconnect pulse if peerless
      if (active === 0) {
        db.get('pulse').put(Date.now());
      }
    }, 5000);

    return () => clearInterval(monitor);
  }, []);

  // Aggressive Data Subscription with Error Fallbacks
  useEffect(() => {
    const subscribe = (key: string, setter: Function, fallback?: any) => {
      const node = db.get(key);
      
      node.once((data) => {
        if (data) {
          try { setter(JSON.parse(data)); } catch (e) { console.error(`Mesh Parse Error [${key}]:`, e); }
        } else if (fallback) {
          node.put(JSON.stringify(fallback));
        }
      });

      node.on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
          } catch (e) { console.error(`Sync stream error [${key}]:`, e); }
        }
      });
    };

    subscribe('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    subscribe('orders', setOrders, []);
    subscribe('users', setUsers, [DEFAULT_ADMIN]);
    subscribe('settings', setSettings, DEFAULT_SETTINGS);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(k => db.get(k).off());
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

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

  const pushUpdate = (key: string, data: any) => {
    setSyncStatus('syncing');
    db.get(key).put(JSON.stringify(data), (ack: any) => {
      if (!ack.err) {
        setSyncStatus('online');
        db.get('pulse').put(Date.now()); // Wake up all mesh nodes
      }
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
      db.get(k).once((data) => { if (data) pushUpdate(k, JSON.parse(data)); });
    });
  };

  const resetLocalCache = () => {
    if (confirm("Clear local cache and re-download global mesh data?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const addRestaurant = (r: Restaurant) => pushUpdate('restaurants', [...restaurants, r]);
  const updateRestaurant = (r: Restaurant) => pushUpdate('restaurants', restaurants.map(i => i.id === r.id ? r : i));
  const deleteRestaurant = (id: string) => pushUpdate('restaurants', restaurants.filter(r => r.id !== id));
  const addMenuItem = (resId: string, item: MenuItem) => 
    pushUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r));
  const updateMenuItem = (resId: string, item: MenuItem) => 
    pushUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.map(m => m.id === item.id ? item : m) } : r));
  const deleteMenuItem = (resId: string, itemId: string) => 
    pushUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r));
  const addOrder = (o: Order) => pushUpdate('orders', [o, ...orders]);
  const updateOrder = (o: Order) => pushUpdate('orders', orders.map(or => or.id === o.id ? o : or));
  const updateOrderStatus = (id: string, status: Order['status']) => 
    pushUpdate('orders', orders.map(o => o.id === id ? { ...o, status } : o));
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  const addUser = (u: User) => pushUpdate('users', [...users, u]);
  const deleteUser = (id: string) => { if (id !== 'admin-1') pushUpdate('users', users.filter(u => u.id !== id)); };
  const updateSettings = (s: GlobalSettings) => pushUpdate('settings', s);
  const loginCustomer = (phone: string) => setCurrentUser({ id: `c-${Date.now()}`, identifier: phone, role: 'customer', rights: [] });
  const loginStaff = (username: string, pass: string): boolean => {
    if (username.toLowerCase() === DEFAULT_ADMIN.identifier.toLowerCase() && pass === DEFAULT_ADMIN.password) {
      setCurrentUser(DEFAULT_ADMIN);
      return true;
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


import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// Redundant relay peers for high-availability synchronization
const RELAY_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://dletta.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun'
];

const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true, // Keep local cache for offline/instant load
  retry: 1000
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
  const SYNC_KEY = 'gab-eats-v1-global-cluster-master';
  const db = gun.get(SYNC_KEY);

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

  // Track Peer Connections
  useEffect(() => {
    const interval = setInterval(() => {
      // Gun internal peer tracking
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      if (active > 0) setSyncStatus('online');
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate Data from Mesh
  useEffect(() => {
    const handleData = (key: string, setter: Function, fallback?: any) => {
      db.get(key).on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
            setSyncStatus('online');
          } catch (e) { console.error(`Sync error on ${key}:`, e); }
        } else if (fallback) {
          db.get(key).put(JSON.stringify(fallback));
        }
      });
    };

    handleData('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    handleData('orders', setOrders, []);
    handleData('users', setUsers, [DEFAULT_ADMIN]);
    handleData('settings', setSettings, DEFAULT_SETTINGS);

    // Heartbeat to keep mesh alive
    const heartbeat = setInterval(() => {
      db.get('heartbeat').put(Date.now());
    }, 20000);

    return () => {
      clearInterval(heartbeat);
      db.get('restaurants').off();
      db.get('orders').off();
      db.get('users').off();
      db.get('settings').off();
    };
  }, []);

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

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  const pushUpdate = (key: string, data: any) => {
    setSyncStatus('syncing');
    db.get(key).put(JSON.stringify(data), (ack: any) => {
      if (ack.err) {
        console.error("Sync Put Error:", ack.err);
        setSyncStatus('offline');
      } else {
        setSyncStatus('online');
      }
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    // Poke the mesh for every key
    ['restaurants', 'orders', 'users', 'settings'].forEach(key => {
      db.get(key).once((data) => {
        if (data) pushUpdate(key, JSON.parse(data));
      });
    });
  };

  const addRestaurant = (r: Restaurant) => pushUpdate('restaurants', [...restaurants, r]);
  const updateRestaurant = (r: Restaurant) => pushUpdate('restaurants', restaurants.map(item => item.id === r.id ? r : item));
  const deleteRestaurant = (id: string) => pushUpdate('restaurants', restaurants.filter(r => r.id !== id));
  
  const addMenuItem = (resId: string, item: MenuItem) => 
    pushUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r));
  
  const updateMenuItem = (resId: string, item: MenuItem) => 
    pushUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.map(m => m.id === item.id ? item : m) } : r));

  const deleteMenuItem = (resId: string, itemId: string) => 
    pushUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r));

  const addOrder = (o: Order) => pushUpdate('orders', [o, ...orders]);
  const updateOrder = (o: Order) => pushUpdate('orders', orders.map(order => order.id === o.id ? o : order));
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
  const deleteUser = (id: string) => {
    if (id === 'admin-1') return alert("Protected User.");
    pushUpdate('users', users.filter(u => u.id !== id));
  };
  const updateSettings = (s: GlobalSettings) => pushUpdate('settings', s);

  const loginCustomer = (phone: string) => {
    setCurrentUser({ id: `cust-${Date.now()}`, identifier: phone, role: 'customer', rights: [] });
  };

  const loginStaff = (username: string, pass: string): boolean => {
    let found = users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (!found && username.toLowerCase() === DEFAULT_ADMIN.identifier.toLowerCase() && pass === DEFAULT_ADMIN.password) {
      found = DEFAULT_ADMIN;
    }
    if (found) {
      setCurrentUser(found);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setCart([]);
  };

  return (
    <AppContext.Provider value={{
      restaurants, orders, cart, users, currentUser, settings, syncStatus, peerCount,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, forceSync
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp context missing');
  return context;
};

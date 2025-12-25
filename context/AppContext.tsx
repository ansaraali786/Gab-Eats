
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// Redundant and High-Uptime Peers
const RELAY_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://dletta.herokuapp.com/gun',
  'https://gun-server.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun'
];

// Initialize Gun with explicit peers and optimized settings
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true // Enable advanced storage indexing
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
  // UNIQUE CLUSTER KEY: Prevents data clashing with other Gun users
  const CLUSTER_ID = 'gab_eats_v1_production_final_resilient';
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

  // Peer Monitoring
  useEffect(() => {
    const peerCheck = setInterval(() => {
      const peers = (gun as any)._?.opt?.peers || {};
      const activePeers = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(activePeers);
      if (activePeers > 0) setSyncStatus('online');
    }, 2000);

    // Initial Discovery Pulse
    db.get('pulse').put(Date.now());

    return () => clearInterval(peerCheck);
  }, []);

  // Aggressive Data Hydration
  useEffect(() => {
    const syncNode = (key: string, setter: Function, fallback?: any) => {
      const node = db.get(key);
      
      // 1. Immediate fetch
      node.once((data) => {
        if (data) {
          try { setter(JSON.parse(data)); } catch (e) { console.error("Parse Error", e); }
        } else if (fallback) {
          node.put(JSON.stringify(fallback));
        }
      });

      // 2. Real-time subscription
      node.on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
          } catch (e) { console.error("Sync Stream Error", e); }
        }
      });
    };

    syncNode('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    syncNode('orders', setOrders, []);
    syncNode('users', setUsers, [DEFAULT_ADMIN]);
    syncNode('settings', setSettings, DEFAULT_SETTINGS);

    return () => {
      db.get('restaurants').off();
      db.get('orders').off();
      db.get('users').off();
      db.get('settings').off();
    };
  }, []);

  // Local Storage persistence for user session
  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Dynamic Theme Application
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
      if (!ack.err) setSyncStatus('online');
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    ['restaurants', 'orders', 'users', 'settings'].forEach(key => {
      db.get(key).once((data) => {
        if (data) pushUpdate(key, JSON.parse(data));
      });
    });
    // Trigger a pulse to notify other devices
    db.get('pulse').put(Date.now());
  };

  // State Management Actions
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
    // 1. Local Fallback for Master Admin
    if (username.toLowerCase() === DEFAULT_ADMIN.identifier.toLowerCase() && pass === DEFAULT_ADMIN.password) {
      setCurrentUser(DEFAULT_ADMIN);
      return true;
    }
    
    // 2. Check synced staff list
    const found = users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
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
  if (!context) throw new Error('App context missing');
  return context;
};

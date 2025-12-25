
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// Expanded list of public relay peers for high-reliability synchronization
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun',
    'https://gunjs.herokuapp.com/gun',
    'https://dletta.herokuapp.com/gun'
  ]
});

interface AppContextType {
  restaurants: Restaurant[];
  orders: Order[];
  cart: CartItem[];
  users: User[];
  currentUser: User | null;
  settings: GlobalSettings;
  syncStatus: 'online' | 'offline' | 'syncing';
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
  commissions: {
    defaultCommission: 15,
    deliveryFee: 0,
    minOrderValue: 200
  },
  payments: {
    codEnabled: true,
    easypaisaEnabled: false,
    bankEnabled: false,
    bankDetails: ''
  },
  notifications: {
    adminPhone: '03000000000',
    orderPlacedAlert: true
  },
  marketing: {
    banners: [
      { id: 'b1', title: '50% Off First Order', subtitle: 'Use code GAB50', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000', link: '/', isActive: true }
    ],
    heroTitle: 'Craving something extraordinary?',
    heroSubtitle: '#1 Food Delivery in Pakistan'
  },
  features: {
    ratingsEnabled: true,
    promoCodesEnabled: true,
    walletEnabled: false
  }
};

const DEFAULT_ADMIN: User = {
  id: 'admin-1',
  identifier: 'Ansar',
  password: 'Anudada@007',
  role: 'admin',
  rights: ['orders', 'restaurants', 'users', 'settings']
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Global Sync Key - ensures all installations talk to the same cloud room
  const SYNC_KEY = 'gab-eats-v1-global-cluster';
  const db = gun.get(SYNC_KEY);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing'>('syncing');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    // Sync Restaurants
    db.get('restaurants').on((data) => {
      if (data) {
        setRestaurants(JSON.parse(data));
        setSyncStatus('online');
      } else {
        db.get('restaurants').put(JSON.stringify(INITIAL_RESTAURANTS));
      }
    });

    // Sync Orders
    db.get('orders').on((data) => {
      if (data) setOrders(JSON.parse(data));
    });

    // Sync Users
    db.get('users').on((data) => {
      if (data) {
        setUsers(JSON.parse(data));
      } else {
        db.get('users').put(JSON.stringify([DEFAULT_ADMIN]));
      }
    });

    // Sync Settings
    db.get('settings').on((data) => {
      if (data) setSettings(JSON.parse(data));
    });
  }, []);

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
    db.get(key).put(JSON.stringify(data), (ack) => {
      if (ack.err) setSyncStatus('offline');
      else setSyncStatus('online');
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
    if (id === 'admin-1') return alert("Main admin is protected.");
    pushUpdate('users', users.filter(u => u.id !== id));
  };

  const updateSettings = (s: GlobalSettings) => pushUpdate('settings', s);

  const loginCustomer = (phone: string) => {
    setCurrentUser({ id: `cust-${Date.now()}`, identifier: phone, role: 'customer', rights: [] });
  };

  const loginStaff = (username: string, pass: string): boolean => {
    // First, check the synced users list
    let found = users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
    
    // Fallback: Check hardcoded master admin if sync hasn't finished or user list is empty
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
      restaurants, orders, cart, users, currentUser, settings, syncStatus,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout
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

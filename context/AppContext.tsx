
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// Public relay peers for Gun.js synchronization
const gun = Gun({
  peers: [
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun'
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
  // Sync Key defines the "Room" for real-time updates
  const SYNC_KEY = 'gab-eats-v1-production-cluster';
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

  // 1. Initial Data Load & Real-Time Listeners
  useEffect(() => {
    // Listen for Restaurants
    db.get('restaurants').on((data) => {
      if (data) {
        const parsed = JSON.parse(data);
        setRestaurants(parsed);
        setSyncStatus('online');
      } else {
        // Fallback for first run
        db.get('restaurants').put(JSON.stringify(INITIAL_RESTAURANTS));
      }
    });

    // Listen for Orders
    db.get('orders').on((data) => {
      if (data) {
        setOrders(JSON.parse(data));
      }
    });

    // Listen for Users
    db.get('users').on((data) => {
      if (data) {
        setUsers(JSON.parse(data));
      } else {
        db.get('users').put(JSON.stringify([DEFAULT_ADMIN]));
      }
    });

    // Listen for Settings
    db.get('settings').on((data) => {
      if (data) {
        setSettings(JSON.parse(data));
      }
    });
  }, []);

  // 2. Theme Management
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

  // 3. Local Storage fallback for user session
  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // Helper to update Gun.js
  const pushUpdate = (key: string, data: any) => {
    setSyncStatus('syncing');
    db.get(key).put(JSON.stringify(data), (ack) => {
      if (ack.err) setSyncStatus('offline');
      else setSyncStatus('online');
    });
  };

  const addRestaurant = (r: Restaurant) => {
    const newList = [...restaurants, r];
    pushUpdate('restaurants', newList);
  };

  const updateRestaurant = (r: Restaurant) => {
    const newList = restaurants.map(item => item.id === r.id ? r : item);
    pushUpdate('restaurants', newList);
  };

  const deleteRestaurant = (id: string) => {
    const newList = restaurants.filter(r => r.id !== id);
    pushUpdate('restaurants', newList);
  };

  const addMenuItem = (resId: string, item: MenuItem) => {
    const newList = restaurants.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r);
    pushUpdate('restaurants', newList);
  };

  const updateMenuItem = (resId: string, item: MenuItem) => {
    const newList = restaurants.map(r => r.id === resId ? { 
      ...r, 
      menu: r.menu.map(m => m.id === item.id ? item : m) 
    } : r);
    pushUpdate('restaurants', newList);
  };

  const deleteMenuItem = (resId: string, itemId: string) => {
    const newList = restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r);
    pushUpdate('restaurants', newList);
  };

  const addOrder = (o: Order) => {
    const newList = [o, ...orders];
    pushUpdate('orders', newList);
  };
  
  const updateOrder = (o: Order) => {
    const newList = orders.map(order => order.id === o.id ? o : order);
    pushUpdate('orders', newList);
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    const newList = orders.map(o => o.id === id ? { ...o, status } : o);
    pushUpdate('orders', newList);
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

  const addUser = (u: User) => {
    const newList = [...users, u];
    pushUpdate('users', newList);
  };

  const deleteUser = (id: string) => {
    if (id === 'admin-1') return alert("Cannot delete main admin");
    const newList = users.filter(u => u.id !== id);
    pushUpdate('users', newList);
  };

  const updateSettings = (s: GlobalSettings) => {
    pushUpdate('settings', s);
  };

  const loginCustomer = (phone: string) => {
    const user: User = { id: `cust-${Date.now()}`, identifier: phone, role: 'customer', rights: [] };
    setCurrentUser(user);
  };

  const loginStaff = (username: string, pass: string): boolean => {
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

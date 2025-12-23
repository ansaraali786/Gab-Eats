
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings, AdOffer } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';

interface AppContextType {
  restaurants: Restaurant[];
  orders: Order[];
  cart: CartItem[];
  users: User[];
  currentUser: User | null;
  settings: GlobalSettings;
  addRestaurant: (r: Restaurant) => void;
  updateRestaurant: (r: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  addMenuItem: (resId: string, item: MenuItem) => void;
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    const saved = localStorage.getItem('restaurants');
    return saved ? JSON.parse(saved) : INITIAL_RESTAURANTS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('orders_v4');
    return saved ? JSON.parse(saved) : [];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('users_list');
    return saved ? JSON.parse(saved) : [DEFAULT_ADMIN];
  });

  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem('global_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Theme Injection Effect
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
    localStorage.setItem('restaurants', JSON.stringify(restaurants));
    localStorage.setItem('orders_v4', JSON.stringify(orders));
    localStorage.setItem('users_list', JSON.stringify(users));
    localStorage.setItem('global_settings', JSON.stringify(settings));
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [restaurants, orders, users, settings, currentUser]);

  const addRestaurant = (r: Restaurant) => setRestaurants(prev => [...prev, r]);
  const updateRestaurant = (r: Restaurant) => setRestaurants(prev => prev.map(item => item.id === r.id ? r : item));
  const deleteRestaurant = (id: string) => setRestaurants(prev => prev.filter(r => r.id !== id));

  const addMenuItem = (resId: string, item: MenuItem) => {
    setRestaurants(prev => prev.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r));
  };

  const deleteMenuItem = (resId: string, itemId: string) => {
    setRestaurants(prev => prev.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r));
  };

  const addOrder = (o: Order) => setOrders(prev => [o, ...prev]);
  
  const updateOrder = (o: Order) => {
    setOrders(prev => prev.map(order => order.id === o.id ? o : order));
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
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

  const addUser = (u: User) => setUsers(prev => [...prev, u]);
  const deleteUser = (id: string) => {
    if (id === 'admin-1') return alert("Cannot delete main admin");
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const updateSettings = (s: GlobalSettings) => setSettings(s);

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
      restaurants, orders, cart, users, currentUser, settings,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, deleteMenuItem,
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

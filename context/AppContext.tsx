

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, OrderStatus, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, NOVA_KEY } from '../constants';
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js';
import { getDatabase, ref, onValue, set, off, remove } from 'https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js';

const getEnv = (key: string) => ((import.meta as any).env && (import.meta as any).env[key]) || (process.env as any)[key];

export const FIREBASE_CONFIG = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || "PASTE_YOUR_API_KEY_HERE",
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || "gab-eats.firebaseapp.com",
  databaseURL: getEnv('VITE_FIREBASE_DB_URL') || "https://gab-eats-default-rtdb.firebaseio.com",
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || "gab-eats",
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || "gab-eats.appspot.com",
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_ID') || "000000000000",
  appId: getEnv('VITE_FIREBASE_APP_ID') || "1:000000000000:web:000000000000",
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || "G-P1RWNF3QJK"
};

const IS_FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== "PASTE_YOUR_API_KEY_HERE";
const SHADOW_MASTER = `${NOVA_KEY}_global_state`;
const ORDERS_CACHE = `${NOVA_KEY}_orders_cache`;

interface MasterState {
  restaurants: Restaurant[];
  users: User[];
  settings: GlobalSettings;
  _ts: number;
}

interface AppContextType {
  restaurants: Restaurant[];
  orders: Order[];
  cart: CartItem[];
  users: User[];
  currentUser: User | null;
  settings: GlobalSettings;
  syncStatus: 'local' | 'connecting' | 'cloud-active' | 'error';
  bootstrapping: boolean;
  addRestaurant: (r: Restaurant) => void;
  updateRestaurant: (r: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  addMenuItem: (resId: string, item: MenuItem) => void;
  updateMenuItem: (resId: string, item: MenuItem) => void;
  deleteMenuItem: (resId: string, itemId: string) => void;
  addOrder: (o: Order) => void;
  updateOrder: (o: Order) => void;
  deleteOrder: (id: string) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  addUser: (u: User) => void;
  deleteUser: (id: string) => void;
  updateSettings: (s: GlobalSettings) => void;
  loginCustomer: (phone: string) => void;
  loginStaff: (username: string, pass: string) => boolean;
  logout: () => void;
  resetLocalCache: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: GlobalSettings = {
  general: { platformName: 'GAB-EATS', currency: 'PKR', currencySymbol: 'Rs.', timezone: 'Asia/Karachi', maintenanceMode: false, platformStatus: 'Live', themeId: 'default' },
  commissions: { defaultCommission: 15, deliveryFee: 0, minOrderValue: 200 },
  payments: { codEnabled: true, easypaisaEnabled: false, bankEnabled: false, bankDetails: '' },
  notifications: { adminPhone: '03000000000', notificationPhones: ['03000000000'], orderPlacedAlert: true },
  marketing: {
    banners: [{ id: 'b1', title: '50% Off First Order', subtitle: 'Use code GAB50', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1000', link: '/', isActive: true }],
    heroTitle: 'Craving something extraordinary?',
    heroSubtitle: '#1 Food Delivery in Pakistan'
  },
  features: { ratingsEnabled: true, promoCodesEnabled: true, walletEnabled: false }
};

// Fix: added missing 'assignedRestaurants' property to DEFAULT_ADMIN to match User interface
const DEFAULT_ADMIN: User = { id: 'admin-1', identifier: 'Ansar', password: 'Anudada@007', role: 'admin', rights: ['orders', 'restaurants', 'users', 'settings'], assignedRestaurants: [] };

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const latestTs = useRef<number>(0);
  const dbRef = useRef<any>(null);
  
  const [masterState, setMasterState] = useState<MasterState>(() => {
    try {
      const saved = localStorage.getItem(SHADOW_MASTER);
      if (saved) {
        const parsed = JSON.parse(saved);
        latestTs.current = parsed._ts || 0;
        return {
          restaurants: Array.isArray(parsed.restaurants) ? parsed.restaurants : INITIAL_RESTAURANTS,
          users: Array.isArray(parsed.users) ? parsed.users : [DEFAULT_ADMIN],
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          _ts: parsed._ts || Date.now()
        };
      }
    } catch (e) {}
    return { restaurants: INITIAL_RESTAURANTS, users: [DEFAULT_ADMIN], settings: DEFAULT_SETTINGS, _ts: Date.now() };
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const saved = localStorage.getItem(ORDERS_CACHE);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'local' | 'connecting' | 'cloud-active' | 'error'>(IS_FIREBASE_ENABLED ? 'connecting' : 'local');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const getFirebaseDB = useCallback(() => {
    if (dbRef.current) return dbRef.current;
    try {
      const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();
      dbRef.current = getDatabase(app);
      return dbRef.current;
    } catch (e) {
      console.error("Firebase init failed:", e);
      return null;
    }
  }, []);

  const pushState = useCallback(async (next: Partial<MasterState>) => {
    setMasterState(prev => {
      const newState: MasterState = {
        restaurants: next.restaurants !== undefined ? next.restaurants : prev.restaurants,
        users: next.users !== undefined ? next.users : prev.users,
        settings: next.settings !== undefined ? next.settings : prev.settings,
        _ts: Date.now()
      };
      
      latestTs.current = newState._ts;
      localStorage.setItem(SHADOW_MASTER, JSON.stringify(newState));

      if (IS_FIREBASE_ENABLED) {
        const db = getFirebaseDB();
        if (db) {
          const stateRef = ref(db, 'system/master_state');
          set(stateRef, newState).catch(e => console.error("Cloud Sync Failed:", e));
        }
      }
      return newState;
    });
  }, [getFirebaseDB]);

  useEffect(() => {
    if (!IS_FIREBASE_ENABLED) {
      setBootstrapping(false);
      return;
    }

    const db = getFirebaseDB();
    if (!db) {
      setSyncStatus('error');
      setBootstrapping(false);
      return;
    }
    
    const masterRef = ref(db, 'system/master_state');
    const unsubscribeMaster = onValue(masterRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data._ts > latestTs.current) {
        latestTs.current = data._ts;
        setMasterState({
          restaurants: Array.isArray(data.restaurants) ? data.restaurants : INITIAL_RESTAURANTS,
          users: Array.isArray(data.users) ? data.users : [DEFAULT_ADMIN],
          settings: { 
            ...DEFAULT_SETTINGS, 
            ...data.settings,
            notifications: {
              ...DEFAULT_SETTINGS.notifications,
              ...(data.settings?.notifications || {})
            }
          },
          _ts: data._ts
        });
      }
    });

    const ordersRef = ref(db, 'system/orders');
    const unsubscribeOrders = onValue(ordersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const orderList: Order[] = Object.values(data);
        orderList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(orderList);
        localStorage.setItem(ORDERS_CACHE, JSON.stringify(orderList));
        setSyncStatus('cloud-active');
      } else {
        setOrders([]);
      }
      setBootstrapping(false);
    });

    return () => {
      off(masterRef);
      off(ordersRef);
    };
  }, [getFirebaseDB]);

  const resetLocalCache = () => { localStorage.clear(); window.location.reload(); };

  const addRestaurant = (r: Restaurant) => pushState({ restaurants: [...masterState.restaurants, r] });
  const updateRestaurant = (r: Restaurant) => pushState({ restaurants: masterState.restaurants.map(x => x.id === r.id ? r : x) });
  const deleteRestaurant = (id: string) => pushState({ restaurants: masterState.restaurants.filter(r => r.id !== id) });
  
  const addMenuItem = (resId: string, item: MenuItem) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: [...(res.menu || []), item] });
  };
  
  const updateMenuItem = (resId: string, item: MenuItem) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: (res.menu || []).map(m => m.id === item.id ? item : m) });
  };
  
  const deleteMenuItem = (resId: string, itemId: string) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: (res.menu || []).filter(m => m.id !== itemId) });
  };
  
  const addOrder = (o: Order) => {
    const cleanOrder = JSON.parse(JSON.stringify(o));
    setOrders(prev => {
      const newList = [cleanOrder, ...prev];
      localStorage.setItem(ORDERS_CACHE, JSON.stringify(newList));
      return newList;
    });

    if (IS_FIREBASE_ENABLED) {
      const db = getFirebaseDB();
      if (db) {
        set(ref(db, `system/orders/${cleanOrder.id}`), cleanOrder).catch(e => console.error("Cloud Order Failed:", e));
      }
    }

    const currentSettings = masterState.settings;
    if (currentSettings?.notifications?.orderPlacedAlert) {
      const targets = currentSettings.notifications.notificationPhones || [];
      const itemSummary = o.items.map(i => `${i.quantity}x ${i.name}`).join(', ');
      const message = `🚨 NEW ORDER RECEIVED!\n\nOrder ID: #${o.id.toUpperCase()}\nCustomer: ${o.customerName}\nContact: ${o.contactNo}\nTotal: ${currentSettings.general.currencySymbol}${o.total}\nItems: ${itemSummary}\nAddress: ${o.address}\n\nDispatching GAB-EATS Logistics...`;
      
      targets.forEach(phone => {
        const log = JSON.parse(localStorage.getItem('notification_logs') || '[]');
        log.push({ 
          phone, 
          orderId: cleanOrder.id, 
          message,
          time: new Date().toISOString(), 
          status: 'Pending Dispatch' 
        });
        localStorage.setItem('notification_logs', JSON.stringify(log.slice(-30)));
      });
    }
  };

  const updateOrder = (o: Order) => {
    const cleanOrder = JSON.parse(JSON.stringify(o));
    setOrders(prev => {
      const newList = prev.map(x => x.id === cleanOrder.id ? cleanOrder : x);
      localStorage.setItem(ORDERS_CACHE, JSON.stringify(newList));
      return newList;
    });
    if (IS_FIREBASE_ENABLED) {
      const db = getFirebaseDB();
      if (db) set(ref(db, `system/orders/${cleanOrder.id}`), cleanOrder);
    }
  };

  const deleteOrder = (id: string) => {
    setOrders(prev => {
      const newList = prev.filter(o => o.id !== id);
      localStorage.setItem(ORDERS_CACHE, JSON.stringify(newList));
      return newList;
    });
    if (IS_FIREBASE_ENABLED) {
      const db = getFirebaseDB();
      if (db) remove(ref(db, `system/orders/${id}`)).catch(e => console.error("Cloud Delete Order Failed:", e));
    }
  };
  
  const updateOrderStatus = (id: string, status: OrderStatus) => {
    const order = orders.find(o => o.id === id);
    if (order) updateOrder({ ...order, status });
  };
  
  const addUser = (u: User) => pushState({ users: [...masterState.users, u] });
  const deleteUser = (id: string) => pushState({ users: masterState.users.filter(u => u.id !== id) });
  const updateSettings = (s: GlobalSettings) => pushState({ settings: s });
  
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  
  const loginCustomer = (phone: string) => {
    // Fix: added missing 'assignedRestaurants' property to meet User interface requirements
    const user: User = { id: `c-${Date.now()}`, identifier: phone, role: 'customer', rights: [], assignedRestaurants: [] };
    setCurrentUser(user);
    localStorage.setItem('logged_user', JSON.stringify(user));
  };
  
  const loginStaff = (username: string, pass: string): boolean => {
    if (username.toLowerCase() === DEFAULT_ADMIN.identifier.toLowerCase() && pass === DEFAULT_ADMIN.password) {
      setCurrentUser(DEFAULT_ADMIN);
      localStorage.setItem('logged_user', JSON.stringify(DEFAULT_ADMIN));
      return true;
    }
    const found = masterState.users.find(u => u.identifier.toLowerCase() === username.toLowerCase() && u.password === pass);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('logged_user', JSON.stringify(found));
      return true;
    }
    return false;
  };
  
  const logout = () => { setCurrentUser(null); setCart([]); localStorage.removeItem('logged_user'); };

  return (
    <AppContext.Provider value={{
      restaurants: masterState.restaurants,
      orders,
      users: masterState.users,
      settings: masterState.settings,
      cart, currentUser, syncStatus, bootstrapping,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, deleteOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, resetLocalCache
    }}>
      {bootstrapping ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
           <div style={{ width: '3.5rem', height: '3.5rem', border: '3.5px solid #f3f4f6', borderTopColor: '#FF5F1F', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></div>
           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
           <h2 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#111827', marginTop: '1.5rem' }}>GAB-EATS GLOBAL</h2>
           <p style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '0.5rem' }}>
             Syncing Secure Relays...
           </p>
        </div>
      ) : children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp context missing');
  return context;
};

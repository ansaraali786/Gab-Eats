import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, OrderStatus, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, NOVA_KEY } from '../constants';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';

/**
 * FIREBASE CONFIGURATION - PASTE YOUR KEYS HERE
 * Link your project at: https://console.firebase.google.com/
 */
const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "gab-eats.firebaseapp.com",
  projectId: "gab-eats",
  storageBucket: "gab-eats.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

const IS_FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== "PASTE_YOUR_API_KEY_HERE";
const SHADOW_MASTER = `${NOVA_KEY}_global_state`;

interface MasterState {
  restaurants: Restaurant[];
  orders: Order[];
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
  syncStatus: 'online' | 'offline' | 'firebase';
  bootstrapping: boolean;
  addRestaurant: (r: Restaurant) => void;
  updateRestaurant: (r: Restaurant) => void;
  deleteRestaurant: (id: string) => void;
  addMenuItem: (resId: string, item: MenuItem) => void;
  updateMenuItem: (resId: string, item: MenuItem) => void;
  deleteMenuItem: (resId: string, itemId: string) => void;
  addOrder: (o: Order) => void;
  updateOrder: (o: Order) => void;
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
  const [masterState, setMasterState] = useState<MasterState>(() => {
    try {
      const saved = localStorage.getItem(SHADOW_MASTER);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      restaurants: INITIAL_RESTAURANTS,
      orders: [],
      users: [DEFAULT_ADMIN],
      settings: DEFAULT_SETTINGS,
      _ts: Date.now()
    };
  });

  const [bootstrapping, setBootstrapping] = useState<boolean>(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  // NOVA V13 GLOBAL FIREBASE SYNC
  useEffect(() => {
    if (!IS_FIREBASE_ENABLED) {
      console.warn("Nova V13: Firebase not linked. Operating in Enhanced Local Mode.");
      setBootstrapping(false);
      return;
    }

    try {
      const app = initializeApp(FIREBASE_CONFIG);
      const db = getFirestore(app);
      const docRef = doc(db, "system", "master_state");

      // Listen for global changes
      const unsubscribe = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const cloudState = snap.data() as MasterState;
          if (cloudState._ts > masterState._ts) {
            setMasterState(cloudState);
            localStorage.setItem(SHADOW_MASTER, JSON.stringify(cloudState));
          }
        } else {
          // Initialize DB if empty
          setDoc(docRef, masterState);
        }
        setBootstrapping(false);
      }, (error) => {
        console.error("Firebase Sync Error:", error);
        setBootstrapping(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.error("Firebase Initialization Failed", e);
      setBootstrapping(false);
    }
  }, [masterState._ts]);

  const pushState = useCallback(async (next: MasterState) => {
    const payload = { ...next, _ts: Date.now() };
    setMasterState(payload);
    localStorage.setItem(SHADOW_MASTER, JSON.stringify(payload));

    if (IS_FIREBASE_ENABLED) {
      try {
        const app = initializeApp(FIREBASE_CONFIG);
        const db = getFirestore(app);
        await setDoc(doc(db, "system", "master_state"), payload);
      } catch (e) { console.error("Cloud push failed", e); }
    }
  }, []);

  const resetLocalCache = () => { localStorage.clear(); window.location.reload(); };

  // Mutators
  const addRestaurant = (r: Restaurant) => pushState({ ...masterState, restaurants: [...masterState.restaurants, r] });
  const updateRestaurant = (r: Restaurant) => pushState({ ...masterState, restaurants: masterState.restaurants.map(x => x.id === r.id ? r : x) });
  const deleteRestaurant = (id: string) => pushState({ ...masterState, restaurants: masterState.restaurants.filter(r => r.id !== id) });
  
  const addMenuItem = (resId: string, item: MenuItem) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: [...res.menu, item] });
  };
  const updateMenuItem = (resId: string, item: MenuItem) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.map(m => m.id === item.id ? item : m) });
  };
  const deleteMenuItem = (resId: string, itemId: string) => {
    const res = masterState.restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.filter(m => m.id !== itemId) });
  };

  const addOrder = (o: Order) => pushState({ ...masterState, orders: [o, ...masterState.orders] });
  const updateOrder = (o: Order) => pushState({ ...masterState, orders: masterState.orders.map(x => x.id === o.id ? o : x) });
  const updateOrderStatus = (id: string, status: OrderStatus) => {
    const order = masterState.orders.find(o => o.id === id);
    if (order) updateOrder({ ...order, status });
  };

  const addUser = (u: User) => pushState({ ...masterState, users: [...masterState.users, u] });
  const deleteUser = (id: string) => pushState({ ...masterState, users: masterState.users.filter(u => u.id !== id) });
  const updateSettings = (s: GlobalSettings) => pushState({ ...masterState, settings: s });

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
      orders: masterState.orders,
      users: masterState.users,
      settings: masterState.settings,
      cart, currentUser, syncStatus: IS_FIREBASE_ENABLED ? 'firebase' : 'online', bootstrapping,
      addRestaurant, updateRestaurant, deleteRestaurant, addMenuItem, updateMenuItem, deleteMenuItem,
      addOrder, updateOrder, updateOrderStatus, addToCart, removeFromCart, clearCart,
      addUser, deleteUser, updateSettings, loginCustomer, loginStaff, logout, resetLocalCache
    }}>
      {bootstrapping ? (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'white', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
           <div style={{ width: '3.5rem', height: '3.5rem', border: '3.5px solid #f3f4f6', borderTopColor: '#FF5F1F', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></div>
           <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
           <h2 style={{ fontSize: '1.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#111827', marginTop: '1.5rem' }}>GAB-EATS GLOBAL V13</h2>
           <p style={{ fontSize: '0.65rem', color: '#9ca3af', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', marginTop: '0.5rem' }}>
             {IS_FIREBASE_ENABLED ? 'Synchronizing Cloud Mesh...' : 'Establishing Enhanced Local Node...'}
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

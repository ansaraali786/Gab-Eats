
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

/**
 * PRODUCTION-GRADE RELAY MESH (V9)
 * Optimized list including dedicated and community-driven relays.
 */
const RELAY_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://dletta.herokuapp.com/gun',
  'https://gun-server.herokuapp.com/gun',
  'https://gun-sydney.herokuapp.com/gun',
  'https://gun-luna.herokuapp.com/gun',
  'https://p2p-relay.up.railway.app/gun',
  'https://gun-ams.herokuapp.com/gun',
  'https://gun-tokyo.herokuapp.com/gun',
  'https://gun-singapore.herokuapp.com/gun',
  'https://gun-london.herokuapp.com/gun',
  'https://gun-relays.m-p-p.xyz/gun',
  'https://gun-relay.phi.host/gun',
  'https://gun-box.herokuapp.com/gun'
];

// Initialize Gun with high-reliability discovery
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  retry: 200, // Very aggressive retry for immediate reconnection
  radisk: true,
  wait: 10 // Start looking for peers immediately
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
  // UNIQUE ISOLATED NAMESPACE - V9 STABLE
  const CLUSTER_ID = 'gab_eats_v9_ultra_stable_final';
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

  const lastRemoteUpdateRef = useRef<number>(0);

  // 1. Connection Watchdog & Keep-Alive Pulse
  useEffect(() => {
    const watchdog = setInterval(() => {
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      
      if (active > 0) {
        setSyncStatus(prev => prev === 'syncing' ? 'syncing' : 'online');
        // SEND HEARTBEAT: Prevents relay timeout/sleep
        db.get('heartbeat').put(Date.now());
      } else {
        setSyncStatus('offline');
        // RECONNECT TRIGGER: If offline, force re-discovery
        gun.opt({ peers: RELAY_PEERS });
      }
    }, 5000);

    return () => clearInterval(watchdog);
  }, []);

  // 2. Cloud-Priority Rehydration Sync
  useEffect(() => {
    const subscribeModule = (key: string, setter: Function, fallback?: any) => {
      const node = db.get(key);
      
      // Listen for the absolute latest version from any peer
      node.on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
            setSyncStatus('online');
            lastRemoteUpdateRef.current = Date.now();
          } catch (e) {
            console.error(`Sync stream error [${key}]:`, e);
          }
        } else if (fallback && lastRemoteUpdateRef.current === 0) {
          // Only seed mock data if the mesh has never seen this key
          node.put(JSON.stringify(fallback));
        }
      });

      // Force-load from wire immediately
      node.once((data) => {
        if (data) {
          try { setter(JSON.parse(data)); } catch (e) {}
        }
      });
    };

    // Initialize core collections
    subscribeModule('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    subscribeModule('orders', setOrders, []);
    subscribeModule('users', setUsers, [DEFAULT_ADMIN]);
    subscribeModule('settings', setSettings, DEFAULT_SETTINGS);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(k => db.get(k).off());
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // 3. System Aesthetics (Themes)
  useEffect(() => {
    const themeId = settings?.general?.themeId || 'default';
    const theme = APP_THEMES.find(t => t.id === themeId) || APP_THEMES[0];
    const root = document.documentElement;
    root.style.setProperty('--primary-start', theme.primary[0]);
    root.style.setProperty('--primary-end', theme.primary[1]);
    root.style.setProperty('--secondary-start', theme.secondary[0]);
    root.style.setProperty('--secondary-end', theme.secondary[1]);
    root.style.setProperty('--accent-start', theme.accent[0]);
    root.style.setProperty('--accent-end', theme.accent[1]);
  }, [settings?.general?.themeId]);

  /**
   * PUSH STATE TO MESH
   * Forces immediate broadcast to all listening peers.
   */
  const broadcast = (key: string, data: any) => {
    setSyncStatus('syncing');
    const payload = JSON.stringify(data);
    db.get(key).put(payload, (ack: any) => {
      if (!ack.err) {
        setSyncStatus('online');
        // Force a global mesh pulse
        db.get('pulse').put(Date.now());
      }
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
      db.get(k).once((data) => {
        if (data) broadcast(k, JSON.parse(data));
      });
    });
  };

  const resetLocalCache = () => {
    if (confirm("This will clear local cache and re-download all data from the cloud mesh. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // State Mutators (Wired to Broadcast)
  const addRestaurant = (r: Restaurant) => broadcast('restaurants', [...restaurants, r]);
  const updateRestaurant = (r: Restaurant) => broadcast('restaurants', restaurants.map(i => i.id === r.id ? r : i));
  const deleteRestaurant = (id: string) => broadcast('restaurants', restaurants.filter(r => r.id !== id));
  const addMenuItem = (resId: string, item: MenuItem) => 
    broadcast('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r));
  const updateMenuItem = (resId: string, item: MenuItem) => 
    broadcast('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.map(m => m.id === item.id ? item : m) } : r));
  const deleteMenuItem = (resId: string, itemId: string) => 
    broadcast('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r));
  const addOrder = (o: Order) => broadcast('orders', [o, ...orders]);
  const updateOrder = (o: Order) => broadcast('orders', orders.map(or => or.id === o.id ? o : or));
  const updateOrderStatus = (id: string, status: Order['status']) => 
    broadcast('orders', orders.map(o => o.id === id ? { ...o, status } : o));
  
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  
  const addUser = (u: User) => broadcast('users', [...users, u]);
  const deleteUser = (id: string) => { if (id !== 'admin-1') broadcast('users', users.filter(u => u.id !== id)); };
  const updateSettings = (s: GlobalSettings) => broadcast('settings', s);
  
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

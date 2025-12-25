
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

/**
 * ULTRA-RESILIENT GLOBAL RELAY NETWORK
 * Includes non-Heroku community relays to bypass free-tier sleep issues.
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
  'https://gun-us-east.herokuapp.com/gun',
  'https://gun-ca.herokuapp.com/gun',
  'https://gun-box.herokuapp.com/gun'
];

// Initialize Gun with optimized discovery and high-speed retry
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  retry: 300, // Faster handshake attempts
  radisk: true,
  wait: 50 // Minimal discovery wait
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
  // CLUSTER NAMESPACE V8 - Version isolated to fix crosstalk and stale peer routes
  const CLUSTER_ID = 'gab_eats_ultra_v8_stable_mesh';
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

  const lastUpdateRef = useRef<number>(Date.now());

  // 1. Mesh Heartbeat & Aggressive Discovery
  useEffect(() => {
    const monitor = setInterval(() => {
      // Access internal Gun peers list
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      
      setPeerCount(active);
      
      if (active > 0) {
        setSyncStatus(prev => (prev === 'syncing' ? 'syncing' : 'online'));
      } else {
        setSyncStatus('offline');
        // Poke the graph to trigger peer re-handshake
        db.get('discovery_pulse').put(Date.now());
      }
    }, 1500);

    return () => clearInterval(monitor);
  }, []);

  // 2. Mesh Synchronization Protocol
  useEffect(() => {
    const syncCollection = (key: string, setter: Function, fallback?: any) => {
      const node = db.get(key);
      
      // Load current mesh state (Prioritize Cloud)
      node.once((data) => {
        if (data) {
          try { 
            const parsed = JSON.parse(data);
            setter(parsed);
          } catch (e) { console.error(`Sync Parse Error [${key}]:`, e); }
        } else if (fallback) {
          // Only seed if absolutely no data exists on the mesh
          node.put(JSON.stringify(fallback));
        }
      });

      // Continuous Stream Listener
      node.on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
            setSyncStatus('online');
          } catch (e) { console.error(`Stream Parse Error [${key}]:`, e); }
        }
      });
    };

    // Synchronize core modules
    syncCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    syncCollection('orders', setOrders, []);
    syncCollection('users', setUsers, [DEFAULT_ADMIN]);
    syncCollection('settings', setSettings, DEFAULT_SETTINGS);

    // Global Pulse Listener - Overrides local state if a remote broadcast is received
    db.get('mesh_pulse').on((timestamp) => {
      if (timestamp && timestamp > lastUpdateRef.current) {
        lastUpdateRef.current = timestamp;
        // Re-hydrate all nodes on pulse
        ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
          db.get(k).once((d) => {
            if (d) {
              try {
                const p = JSON.parse(d);
                if (k === 'restaurants') setRestaurants(p);
                if (k === 'orders') setOrders(p);
                if (k === 'users') setUsers(p);
                if (k === 'settings') setSettings(p);
              } catch (e) {}
            }
          });
        });
      }
    });

    return () => {
      ['restaurants', 'orders', 'users', 'settings', 'mesh_pulse'].forEach(k => db.get(k).off());
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // 3. System Theme Engine
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
   * BROADCAST UPDATE TO MESH
   * Forces immediate synchronization across all connected peers.
   */
  const broadcastUpdate = (key: string, data: any) => {
    setSyncStatus('syncing');
    const payload = JSON.stringify(data);
    
    db.get(key).put(payload, (ack: any) => {
      if (!ack.err) {
        setSyncStatus('online');
        // Emit high-priority mesh pulse to wake up listeners
        const now = Date.now();
        lastUpdateRef.current = now;
        db.get('mesh_pulse').put(now);
      } else {
        console.warn("Mesh Transmission Delayed:", ack.err);
      }
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
      db.get(k).once((data) => {
        if (data) broadcastUpdate(k, JSON.parse(data));
      });
    });
  };

  const resetLocalCache = () => {
    if (confirm("CRITICAL: This will wipe local Gun storage and force a total re-discovery of the mesh. Use only if sync is broken.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // State Logic & API Wrappers
  const addRestaurant = (r: Restaurant) => broadcastUpdate('restaurants', [...restaurants, r]);
  const updateRestaurant = (r: Restaurant) => broadcastUpdate('restaurants', restaurants.map(i => i.id === r.id ? r : i));
  const deleteRestaurant = (id: string) => broadcastUpdate('restaurants', restaurants.filter(r => r.id !== id));
  const addMenuItem = (resId: string, item: MenuItem) => 
    broadcastUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r));
  const updateMenuItem = (resId: string, item: MenuItem) => 
    broadcastUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.map(m => m.id === item.id ? item : m) } : r));
  const deleteMenuItem = (resId: string, itemId: string) => 
    broadcastUpdate('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r));
  const addOrder = (o: Order) => broadcastUpdate('orders', [o, ...orders]);
  const updateOrder = (o: Order) => broadcastUpdate('orders', orders.map(or => or.id === o.id ? o : or));
  const updateOrderStatus = (id: string, status: Order['status']) => 
    broadcastUpdate('orders', orders.map(o => o.id === id ? { ...o, status } : o));
  
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  
  const addUser = (u: User) => broadcastUpdate('users', [...users, u]);
  const deleteUser = (id: string) => { if (id !== 'admin-1') broadcastUpdate('users', users.filter(u => u.id !== id)); };
  const updateSettings = (s: GlobalSettings) => broadcastUpdate('settings', s);
  
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


import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

/**
 * V13 HYPER-RESILIENT MESH RELAYS
 * A curated list of high-uptime relays with active peer discovery.
 */
const RELAY_PEERS = [
  'https://gun-manhattan.herokuapp.com/gun',
  'https://relay.peer.ooo/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://peer.wall.org/gun',
  'https://gunjs.herokuapp.com/gun',
  'https://p2p-relay.up.railway.app/gun',
  'https://gun-relay.phi.host/gun',
  'https://gun-us-east.herokuapp.com/gun',
  'https://gun-ca.herokuapp.com/gun',
  'https://gun-nodes.herokuapp.com/gun'
];

// Initialize Gun with High-Performance Mesh Config
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: 100,
  wait: 50 // Balanced wait for relay handshake
});

interface AppContextType {
  restaurants: Restaurant[];
  orders: Order[];
  cart: CartItem[];
  users: User[];
  currentUser: User | null;
  settings: GlobalSettings;
  syncStatus: 'online' | 'offline' | 'syncing' | 'connecting';
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
  // CLUSTER V13 - Final Stable Namespace
  const CLUSTER_ID = 'gab_eats_v13_stable_mesh';
  const db = gun.get(CLUSTER_ID);

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [syncStatus, setSyncStatus] = useState<'online' | 'offline' | 'syncing' | 'connecting'>('connecting');
  const [peerCount, setPeerCount] = useState<number>(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('logged_user');
    return saved ? JSON.parse(saved) : null;
  });

  const meshInitiated = useRef(false);

  // 1. ACTIVE MESH VALIDATOR
  useEffect(() => {
    // Listen for high-level peer events
    gun.on('hi', (peer) => {
      console.log('Mesh Relay Connected:', peer.url);
      setSyncStatus('online');
      // Immediate handshake packet to announce our presence to the relay
      db.get('handshake').put({ peer: peer.url, time: Date.now() });
      updatePeerCount();
    });

    gun.on('bye', (peer) => {
      console.log('Mesh Relay Disconnected:', peer.url);
      updatePeerCount();
    });

    const updatePeerCount = () => {
      const peers = (gun as any)._?.opt?.peers || {};
      const active = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1).length;
      setPeerCount(active);
      if (active === 0) setSyncStatus('offline');
      else if (syncStatus === 'offline') setSyncStatus('online');
    };

    // ACTIVE RECOVERY LOOP
    const watchdog = setInterval(() => {
      if (peerCount === 0) {
        setSyncStatus('connecting');
        // Re-inject peers to force a new discovery cycle
        gun.opt({ peers: RELAY_PEERS });
      } else {
        // Heartbeat to keep the relay routing entry alive
        db.get('heartbeat').put({ id: 'system', pulse: Date.now() });
      }
    }, 5000);

    return () => clearInterval(watchdog);
  }, [peerCount]);

  // 2. DATA SYNCHRONIZATION (REACTIVE)
  useEffect(() => {
    const subscribe = (key: string, setter: Function, initial?: any) => {
      const node = db.get(key);
      
      node.on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
            meshInitiated.current = true;
          } catch (e) {
            console.error(`Sync Parse Error [${key}]:`, e);
          }
        } else if (initial && !meshInitiated.current) {
          // Fallback to local only if mesh is totally blank
          node.put(JSON.stringify(initial));
        }
      });

      // Quick-load from local/mesh immediately
      node.once((data) => {
        if (data) try { setter(JSON.parse(data)); } catch (e) {}
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

  // 3. THEME ENGINE
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

  /**
   * MESH BROADCAST
   * Ensures data is propagated to the cloud and other listening peers.
   */
  const broadcast = (key: string, data: any) => {
    setSyncStatus('syncing');
    const payload = JSON.stringify(data);
    
    db.get(key).put(payload, (ack: any) => {
      if (!ack.err) {
        setSyncStatus('online');
        // Critical: Update a global pulse node to force remote peers to re-fetch
        db.get('global_pulse').put(Date.now());
      } else {
        console.warn('Broadcast Ack Failure:', ack.err);
        setSyncStatus('offline');
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
    if (confirm("Resetting local cache will wipe persistent storage and force a total re-sync from the Mesh. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // State Mutators
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

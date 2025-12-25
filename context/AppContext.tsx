
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// HYPER-REDUNDANT UNIVERSAL RELAY NETWORK
// We use a massive list to ensure at least 2-3 connections are always established
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
  'https://gun-ca.herokuapp.com/gun'
];

// Initialize Gun with optimized discovery settings
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  retry: 500, // Very aggressive retry
  radisk: true,
  wait: 100 // Short wait for peer discovery
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
  // CLUSTER NAMESPACE - Unique V7 to bypass cached dead routes on relays
  const CLUSTER_ID = 'gab_eats_ultra_sync_v7_resilient';
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

  const lastPulseRef = useRef<number>(Date.now());

  // 1. Mesh Heartbeat & Peer Monitoring
  useEffect(() => {
    const monitor = setInterval(() => {
      // Access private Gun internal peers object
      const peers = (gun as any)._?.opt?.peers || {};
      const activePeers = Object.values(peers).filter((p: any) => p.wire && p.wire.readyState === 1);
      
      setPeerCount(activePeers.length);
      
      if (activePeers.length > 0) {
        setSyncStatus(prev => prev === 'syncing' ? 'syncing' : 'online');
      } else {
        setSyncStatus('offline');
        // If offline, try a hard re-discovery pulse
        db.get('discovery_pulse').put(Date.now());
      }
    }, 2000);

    return () => clearInterval(monitor);
  }, []);

  // 2. Aggressive State Synchronization Engine
  useEffect(() => {
    const syncNode = (key: string, setter: Function, initialData?: any) => {
      const node = db.get(key);
      
      // Load initial state
      node.once((data) => {
        if (data) {
          try { setter(JSON.parse(data)); } catch (e) { console.error(`Sync Parse Error [${key}]:`, e); }
        } else if (initialData) {
          node.put(JSON.stringify(initialData));
        }
      });

      // Listen for all mesh updates
      node.on((data) => {
        if (data) {
          try {
            const parsed = JSON.parse(data);
            setter(parsed);
            setSyncStatus('online');
          } catch (e) { console.error(`Mesh Stream Error [${key}]:`, e); }
        }
      });
    };

    // Subscribing to core data modules
    syncNode('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    syncNode('orders', setOrders, []);
    syncNode('users', setUsers, [DEFAULT_ADMIN]);
    syncNode('settings', setSettings, DEFAULT_SETTINGS);

    // Global Pulse Listener - Forces all clients to re-fetch if someone broadcasts a change
    db.get('global_pulse').on((p) => {
      if (p && p > lastPulseRef.current) {
        lastPulseRef.current = p;
        // Re-read once to ensure state is absolutely current
        ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
          db.get(k).once((d) => { if(d) try { 
            const parsed = JSON.parse(d);
            if (k === 'restaurants') setRestaurants(parsed);
            if (k === 'orders') setOrders(parsed);
            if (k === 'users') setUsers(parsed);
            if (k === 'settings') setSettings(parsed);
          } catch(e){} });
        });
      }
    });

    return () => {
      ['restaurants', 'orders', 'users', 'settings', 'global_pulse'].forEach(k => db.get(k).off());
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // 3. Platform Theme Manager
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

  // 4. Mesh Broadcaster
  const pushToMesh = (key: string, data: any) => {
    setSyncStatus('syncing');
    const payload = JSON.stringify(data);
    
    db.get(key).put(payload, (ack: any) => {
      if (!ack.err) {
        setSyncStatus('online');
        // Wake up every node in the mesh to invalidate their cache
        const pulse = Date.now();
        lastPulseRef.current = pulse;
        db.get('global_pulse').put(pulse);
      } else {
        console.error("Mesh Push Failed:", ack.err);
      }
    });
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    ['restaurants', 'orders', 'users', 'settings'].forEach(k => {
      db.get(k).once((data) => {
        if (data) pushToMesh(k, JSON.parse(data));
      });
    });
  };

  const resetLocalCache = () => {
    if (confirm("Resetting local cache will wipe all offline data and force a total re-sync from the cloud mesh. Proceed?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // State Logic
  const addRestaurant = (r: Restaurant) => pushToMesh('restaurants', [...restaurants, r]);
  const updateRestaurant = (r: Restaurant) => pushToMesh('restaurants', restaurants.map(i => i.id === r.id ? r : i));
  const deleteRestaurant = (id: string) => pushToMesh('restaurants', restaurants.filter(r => r.id !== id));
  const addMenuItem = (resId: string, item: MenuItem) => 
    pushToMesh('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: [...r.menu, item] } : r));
  const updateMenuItem = (resId: string, item: MenuItem) => 
    pushToMesh('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.map(m => m.id === item.id ? item : m) } : r));
  const deleteMenuItem = (resId: string, itemId: string) => 
    pushToMesh('restaurants', restaurants.map(r => r.id === resId ? { ...r, menu: r.menu.filter(m => m.id !== itemId) } : r));
  const addOrder = (o: Order) => pushToMesh('orders', [o, ...orders]);
  const updateOrder = (o: Order) => pushToMesh('orders', orders.map(or => or.id === o.id ? o : or));
  const updateOrderStatus = (id: string, status: Order['status']) => 
    pushToMesh('orders', orders.map(o => o.id === id ? { ...o, status } : o));
  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };
  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);
  const addUser = (u: User) => pushToMesh('users', [...users, u]);
  const deleteUser = (id: string) => { if (id !== 'admin-1') pushToMesh('users', users.filter(u => u.id !== id)); };
  const updateSettings = (s: GlobalSettings) => pushToMesh('settings', s);
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

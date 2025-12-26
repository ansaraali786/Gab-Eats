
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// V33 Quantum Relay Cluster - Diverse IP space to bypass regional blocks
const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://gun-ams1.marda.io/gun',
  'https://gun-sjc1.marda.io/gun',
  'https://dletta.com/gun',
  'https://gun.4321.it/gun'
];

// Initialize Gun with Quantum Stability Config
const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: 3000, 
  wait: 1000,   
  axe: false,   // Disable advanced peer routing (often blocked by firewalls)
  multicast: false // Disable local network discovery (prevents Ghost Peer loops)
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
  const QUANTUM_KEY = 'gab_v33_quantum';
  const db = gun.get(QUANTUM_KEY);

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

  const activeDiscoveryIds = useRef<Set<string>>(new Set());

  // 1. QUANTUM BROADCAST VERIFIER
  const quantumWrite = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    
    const metaNode = db.get(`${path}_meta`).get(id);
    const registryNode = db.get(`${path}_registry`).get(id);
    const mediaNode = db.get(`${path}_media`).get(id);

    if (data === null) {
      metaNode.put(null);
      registryNode.put(null);
      mediaNode.put(null, (ack: any) => {
        if (!ack.err) setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
      });
    } else {
      const { image, ...meta } = data;
      // Step 1: Write Meta and verify ACK
      metaNode.put(JSON.stringify(meta), (ack: any) => {
        if (ack.err) {
          console.warn("Write conflict: Retrying broadcast...");
          setTimeout(() => quantumWrite(path, id, data), 1000);
          return;
        }
        // Step 2: Update Registry
        registryNode.put(true);
        // Step 3: Write Media if exists
        if (image) mediaNode.put(image);
        setSyncStatus(peerCount > 0 ? 'online' : 'connecting');
      });
    }
  };

  // 2. QUANTUM DISCOVERY ENGINE (Forces cloud sync)
  useEffect(() => {
    const setupQuantumCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
      const metaNode = db.get(`${path}_meta`);
      const mediaNode = db.get(`${path}_media`);
      const registryNode = db.get(`${path}_registry`);

      const fetchNode = (id: string) => {
        if (!id || id === '_') return;
        metaNode.get(id).on((data) => {
          if (!data) return;
          try {
            const meta = JSON.parse(data);
            setter(prev => {
              const other = prev.filter(item => item.id !== id);
              const existing = prev.find(item => item.id === id);
              const merged = [...other, { ...meta, image: existing?.image || meta.image }];
              // Keep sorted by ID to prevent UI jumps
              return merged.sort((a, b) => a.id.localeCompare(b.id));
            });
            // Fetch media in background
            mediaNode.get(id).once((img) => {
              if (img) setter(prev => prev.map(item => item.id === id ? { ...item, image: img } : item));
            });
          } catch(e) {}
        });
      };

      registryNode.map().on((val, id) => {
        if (val === true) fetchNode(id);
        else if (val === null) setter(prev => prev.filter(i => i.id !== id));
      });

      // Verification Heartbeat: ensure registry matches local
      const heartbeat = setInterval(() => {
        registryNode.once((reg: any) => {
           if (!reg) {
              initial.forEach(i => quantumWrite(path, i.id, i));
           }
        });
      }, 15000);

      return () => clearInterval(heartbeat);
    };

    db.get('settings').on((data) => {
      if (data) try { setSettings(JSON.parse(data)); } catch(e) {}
    });

    setupQuantumCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupQuantumCollection('orders', setOrders, []);
    setupQuantumCollection('users', setUsers, [DEFAULT_ADMIN]);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(p => {
        db.get(`${p}_registry`).off();
        db.get(`${p}_meta`).off();
        db.get(`${p}_media`).off();
      });
    };
  }, []);

  // 3. PEER STABILITY (Quantum Shield)
  useEffect(() => {
    let debounceTimer: any;
    const updateStats = () => {
      const p = (gun as any)._?.opt?.peers || {};
      // Filter for ACTUALLY active cloud peers (WSS state 1)
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setPeerCount(active);
        setSyncStatus(active > 0 ? 'online' : 'connecting');
      }, 1000);
    };

    const timer = setInterval(updateStats, 4000);
    gun.on('hi', updateStats);
    gun.on('bye', updateStats);
    return () => { 
      clearInterval(timer); 
      clearTimeout(debounceTimer);
      gun.off('hi', updateStats); 
      gun.off('bye', updateStats); 
    };
  }, []);

  const forceSync = () => {
    setSyncStatus('syncing');
    RELAY_PEERS.forEach((url) => {
       try { (gun as any).opt({ peers: [url] }); } catch(e) {}
    });

    // Re-verify all local data against the mesh
    restaurants.forEach(r => quantumWrite('restaurants', r.id, r));
    orders.forEach(o => quantumWrite('orders', o.id, o));
    users.forEach(u => quantumWrite('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    
    setTimeout(() => {
       const p = (gun as any)._?.opt?.peers || {};
       const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
       if (active > 0) alert(`QUANTUM LINK ESTABLISHED: ${active} cloud nodes synced.`);
       setSyncStatus(active > 0 ? 'online' : 'connecting');
       setPeerCount(active);
    }, 5000);
  };

  const resetLocalCache = () => { 
    if(confirm("QUANTUM RESET: Purge local graph and re-fetch from cloud?")) {
      localStorage.clear(); 
      window.location.reload(); 
    }
  };

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

  // Context Wrappers
  const addRestaurant = (r: Restaurant) => quantumWrite('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => quantumWrite('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => quantumWrite('restaurants', id, null);
  const addMenuItem = (resId: string, item: MenuItem) => {
    const res = restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: [...res.menu, item] });
  };
  const updateMenuItem = (resId: string, item: MenuItem) => {
    const res = restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.map(m => m.id === item.id ? item : m) });
  };
  const deleteMenuItem = (resId: string, itemId: string) => {
    const res = restaurants.find(r => r.id === resId);
    if (res) updateRestaurant({ ...res, menu: res.menu.filter(m => m.id !== itemId) });
  };
  const addOrder = (o: Order) => quantumWrite('orders', o.id, o);
  const updateOrder = (o: Order) => quantumWrite('orders', o.id, o);
  const updateOrderStatus = (id: string, status: Order['status']) => {
    const order = orders.find(o => o.id === id);
    if (order) updateOrder({ ...order, status });
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
  const addUser = (u: User) => quantumWrite('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') quantumWrite('users', id, null); };
  const updateSettings = (s: GlobalSettings) => db.get('settings').put(JSON.stringify(s));
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

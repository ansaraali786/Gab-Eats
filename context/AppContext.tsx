
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://p2p-relay.up.railway.app/gun'
];

const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: 1000,
  wait: 100
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
  const MESH_VERSION = 'v25_hyper';
  const db = gun.get(`gab_mesh_${MESH_VERSION}`);

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

  const activeListeners = useRef<Set<string>>(new Set());

  // 1. HYPER-MESH DISCOVERY ENGINE
  useEffect(() => {
    const setupMeshCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
      const registryNode = db.get(`${path}_registry`);
      const dataNode = db.get(`${path}_data`);

      const attachListener = (id: string) => {
        if (activeListeners.current.has(`${path}_${id}`)) return;
        activeListeners.current.add(`${path}_${id}`);

        dataNode.get(id).on((data) => {
          setter(prev => {
            if (data === null) return prev.filter(item => item.id !== id);
            try {
              const parsed = JSON.parse(data);
              const filtered = prev.filter(item => item.id !== id);
              return [...filtered, parsed];
            } catch(e) { return prev; }
          });
        });
      };

      // Discovery via Registry Map
      registryNode.map().on((val, id) => {
        if (val === true) attachListener(id);
        else if (val === null) {
          setter(prev => prev.filter(item => item.id !== id));
          activeListeners.current.delete(`${path}_${id}`);
        }
      });

      // Discovery via Event Log (Pushes new nodes to peers)
      db.get(`${path}_events`).map().on((eventStr) => {
        if (!eventStr) return;
        try {
          const { id } = JSON.parse(eventStr);
          attachListener(id);
        } catch(e) {}
      });

      // Bootstrap check
      registryNode.once((data) => {
        if (!data) {
          initial.forEach(item => {
            dataNode.get(item.id).put(JSON.stringify(item));
            registryNode.get(item.id).put(true);
          });
        }
      });
    };

    // Singleton Settings listener
    db.get('settings').on((data) => {
      if (data) try { setSettings(JSON.parse(data)); } catch(e) {}
    });

    setupMeshCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupMeshCollection('orders', setOrders, []);
    setupMeshCollection('users', setUsers, [DEFAULT_ADMIN]);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(p => {
        db.get(`${p}_registry`).off();
        db.get(`${p}_data`).off();
        db.get(`${p}_events`).off();
      });
    };
  }, []);

  // 2. MESH WATCHDOG
  useEffect(() => {
    const checkPeers = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      setPeerCount(active);
      setSyncStatus(active > 0 ? 'online' : 'connecting');
    };
    gun.on('hi', checkPeers);
    gun.on('bye', checkPeers);
    return () => { gun.off('hi', checkPeers); gun.off('bye', checkPeers); };
  }, [peerCount]);

  useEffect(() => {
    localStorage.setItem('logged_user', JSON.stringify(currentUser));
  }, [currentUser]);

  // 3. HYPER-MESH ATOMIC WRITE
  const hyperWrite = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    const dataNode = db.get(`${path}_data`).get(id);
    const registryNode = db.get(`${path}_registry`).get(id);
    const eventLog = db.get(`${path}_events`);

    if (data === null) {
      // Deletion
      registryNode.put(null);
      dataNode.put(null, (ack: any) => { if (!ack.err) setSyncStatus('online'); });
    } else {
      // Upsert
      dataNode.put(JSON.stringify(data), (ack: any) => {
        if (!ack.err) {
          registryNode.put(true);
          // Emit discovery event to force propagation to lazy peers
          eventLog.set(JSON.stringify({ id, ts: Date.now() }));
          setSyncStatus('online');
        }
      });
    }
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    restaurants.forEach(r => hyperWrite('restaurants', r.id, r));
    orders.forEach(o => hyperWrite('orders', o.id, o));
    users.forEach(u => hyperWrite('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    alert("Hyper-Mesh Discovery Scan Dispatched.");
  };

  const resetLocalCache = () => { localStorage.clear(); window.location.reload(); };

  // Theme Logic
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

  // Mutators
  const addRestaurant = (r: Restaurant) => hyperWrite('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => hyperWrite('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => hyperWrite('restaurants', id, null);
  
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

  const addOrder = (o: Order) => hyperWrite('orders', o.id, o);
  const updateOrder = (o: Order) => hyperWrite('orders', o.id, o);
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
  const addUser = (u: User) => hyperWrite('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') hyperWrite('users', id, null); };
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

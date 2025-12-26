
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Restaurant, Order, CartItem, User, MenuItem, UserRight, GlobalSettings } from '../types';
import { INITIAL_RESTAURANTS, APP_THEMES } from '../constants';
import Gun from 'https://esm.sh/gun@0.2020.1239';

// V28 Super-Relay Cluster - Selection of highly available global nodes
const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://p2p-relay.up.railway.app/gun',
  'https://gun-ams1.marda.io/gun',
  'https://gun-sjc1.marda.io/gun',
  'https://dletta.com/gun'
];

const gun = Gun({
  peers: RELAY_PEERS,
  localStorage: true,
  radisk: true,
  retry: 1000,
  wait: 100,
  axe: false 
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
  const STABLE_KEY = 'gab_v28_stable';
  const db = gun.get(STABLE_KEY);

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

  // 1. STABLE DISCOVERY ENGINE
  useEffect(() => {
    const setupStableCollection = (path: string, setter: React.Dispatch<React.SetStateAction<any[]>>, initial: any[]) => {
      const metaNode = db.get(`${path}_meta`);
      const mediaNode = db.get(`${path}_media`);
      const registryNode = db.get(`${path}_registry`);

      const fetchNode = (id: string) => {
        if (!id || id === '_') return;
        
        metaNode.get(id).once((data) => {
          if (!data) return;
          try {
            const meta = JSON.parse(data);
            setter(prev => {
              const other = prev.filter(item => item.id !== id);
              const existing = prev.find(item => item.id === id);
              return [...other, { ...meta, image: existing?.image || meta.image }];
            });

            mediaNode.get(id).once((img) => {
              if (img) {
                setter(prev => prev.map(item => item.id === id ? { ...item, image: img } : item));
              }
            });
          } catch(e) {}
        });
      };

      registryNode.map().on((val, id) => {
        if (val === true) fetchNode(id);
        else if (val === null) setter(prev => prev.filter(i => i.id !== id));
      });

      const heartbeat = setInterval(() => {
        registryNode.once((reg: any) => {
          if (reg) Object.keys(reg).forEach(id => {
            if (id !== '_' && !activeDiscoveryIds.current.has(`${path}_${id}`)) {
              fetchNode(id);
            }
          });
        });
      }, 10000); // 10s heartbeat for stability

      registryNode.once((data) => {
        if (!data) initial.forEach(item => stableWrite(path, item.id, item));
      });

      return () => clearInterval(heartbeat);
    };

    const stableWrite = (path: string, id: string, data: any) => {
      if (data === null) {
        db.get(`${path}_registry`).get(id).put(null);
        db.get(`${path}_meta`).get(id).put(null);
        db.get(`${path}_media`).get(id).put(null);
        return;
      }
      const { image, ...meta } = data;
      db.get(`${path}_meta`).get(id).put(JSON.stringify(meta), (ack: any) => {
        if (!ack.err) {
          db.get(`${path}_registry`).get(id).put(true);
          if (image) db.get(`${path}_media`).get(id).put(image);
        }
      });
    };

    db.get('settings').on((data) => {
      if (data) try { setSettings(JSON.parse(data)); } catch(e) {}
    });

    setupStableCollection('restaurants', setRestaurants, INITIAL_RESTAURANTS);
    setupStableCollection('orders', setOrders, []);
    setupStableCollection('users', setUsers, [DEFAULT_ADMIN]);

    return () => {
      ['restaurants', 'orders', 'users', 'settings'].forEach(p => {
        db.get(`${p}_registry`).off();
        db.get(`${p}_meta`).off();
        db.get(`${p}_media`).off();
      });
    };
  }, []);

  // 2. STABILITY WATCHDOG
  useEffect(() => {
    let debounceTimer: any;
    const updateStats = () => {
      const p = (gun as any)._?.opt?.peers || {};
      const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
      
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        setPeerCount(active);
        setSyncStatus(active > 0 ? 'online' : 'connecting');
      }, 500); // Debounce status changes to prevent blinking
    };

    const timer = setInterval(updateStats, 3000);
    gun.on('hi', updateStats);
    gun.on('bye', updateStats);
    return () => { 
      clearInterval(timer); 
      clearTimeout(debounceTimer);
      gun.off('hi', updateStats); 
      gun.off('bye', updateStats); 
    };
  }, []);

  // 3. BROADCAST
  const broadcast = (path: string, id: string, data: any) => {
    setSyncStatus('syncing');
    const registry = db.get(`${path}_registry`).get(id);
    const metaNode = db.get(`${path}_meta`).get(id);
    const mediaNode = db.get(`${path}_media`).get(id);

    if (data === null) {
      registry.put(null);
      metaNode.put(null);
      mediaNode.put(null, (ack: any) => { if (!ack.err) setSyncStatus('online'); });
    } else {
      const { image, ...meta } = data;
      metaNode.put(JSON.stringify(meta), (ack: any) => {
        if (!ack.err) {
          registry.put(true);
          if (image) mediaNode.put(image);
          setSyncStatus('online');
        }
      });
    }
  };

  const forceSync = () => {
    setSyncStatus('syncing');
    
    // Aggressive Peer Re-shout
    RELAY_PEERS.forEach(url => {
       try { (gun as any).opt({ peers: [url] }); } catch(e) {}
    });

    restaurants.forEach(r => broadcast('restaurants', r.id, r));
    orders.forEach(o => broadcast('orders', o.id, o));
    users.forEach(u => broadcast('users', u.id, u));
    db.get('settings').put(JSON.stringify(settings));
    db.get('ping').put(Date.now());
    
    setTimeout(() => {
       const p = (gun as any)._?.opt?.peers || {};
       const active = Object.values(p).filter((x: any) => x.wire && x.wire.readyState === 1).length;
       if (active === 0) alert("Mesh Relay Status: UNAVAILABLE. Check your internet connection or firewall.");
       else alert(`Mesh Probe Success: ${active} Active Relay(s).`);
       setSyncStatus(active > 0 ? 'online' : 'connecting');
    }, 2000);
  };

  const resetLocalCache = () => { localStorage.clear(); window.location.reload(); };

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

  const addRestaurant = (r: Restaurant) => broadcast('restaurants', r.id, r);
  const updateRestaurant = (r: Restaurant) => broadcast('restaurants', r.id, r);
  const deleteRestaurant = (id: string) => broadcast('restaurants', id, null);
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
  const addOrder = (o: Order) => broadcast('orders', o.id, o);
  const updateOrder = (o: Order) => broadcast('orders', o.id, o);
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
  const addUser = (u: User) => broadcast('users', u.id, u);
  const deleteUser = (id: string) => { if (id !== 'admin-1') broadcast('users', id, null); };
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

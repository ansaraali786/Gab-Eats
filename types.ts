
export type OrderStatus = 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export type UserRight = 'orders' | 'restaurants' | 'users' | 'settings';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  image: string;
  deliveryTime: string;
  menu: MenuItem[];
}

export interface CartItem extends MenuItem {
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

export interface Order {
  id: string;
  customerName: string;
  contactNo: string;
  address: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface User {
  id: string;
  identifier: string; // Phone for customer, Username for staff
  password?: string;
  role: 'customer' | 'admin' | 'staff';
  rights: UserRight[];
}

export interface AdOffer {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  isActive: boolean;
}

export interface AppTheme {
  id: string;
  name: string;
  occasion: string;
  primary: [string, string];
  secondary: [string, string];
  accent: [string, string];
}

export interface GlobalSettings {
  general: {
    platformName: string;
    currency: string;
    currencySymbol: string;
    timezone: string;
    maintenanceMode: boolean;
    platformStatus: 'Live' | 'Paused';
    themeId: string;
  };
  commissions: {
    defaultCommission: number;
    deliveryFee: number;
    minOrderValue: number;
  };
  payments: {
    codEnabled: boolean;
    easypaisaEnabled: boolean;
    bankEnabled: boolean;
    bankDetails: string;
  };
  notifications: {
    adminPhone: string;
    orderPlacedAlert: boolean;
  };
  marketing: {
    banners: AdOffer[];
    heroTitle: string;
    heroSubtitle: string;
  };
  features: {
    ratingsEnabled: boolean;
    promoCodesEnabled: boolean;
    walletEnabled: boolean;
  };
}

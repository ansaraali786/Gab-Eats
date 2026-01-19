import { Restaurant, AppTheme } from './types';

export const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Karachi Biryani House',
    cuisine: 'Desi, Rice',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=800',
    deliveryTime: '25-35 min',
    coordinates: { lat: 24.8607, lng: 67.0011 }, 
    deliveryRadius: 10,
    deliveryAreas: 'Saddar, Clifton, Defence',
    menu: [
      { id: 'm1', name: 'Chicken Biryani Full', description: 'Special Sindhi Biryani with spice and aroma.', price: 450, category: 'Main', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400', isActive: true },
      { id: 'm2', name: 'Raita', description: 'Fresh yogurt with vegetables.', price: 50, category: 'Sides', image: 'https://images.unsplash.com/photo-1596797038558-95a0a16e7353?q=80&w=400', isActive: true },
    ]
  }
];

export const APP_THEMES: AppTheme[] = [
  {
    id: 'default',
    name: 'GAB Classic',
    occasion: 'Standard',
    primary: ['#FF5F1F', '#FF2E63'],
    secondary: ['#00B5B5', '#00D2D2'],
    accent: ['#7C3AED', '#C026D3']
  },
  {
    id: 'midnight',
    name: 'Nova Midnight',
    occasion: 'Premium',
    primary: ['#111827', '#374151'],
    secondary: ['#4F46E5', '#818CF8'],
    accent: ['#EC4899', '#F472B6']
  },
  {
    id: 'emerald',
    name: 'Pure Emerald',
    occasion: 'Nature',
    primary: ['#059669', '#10B981'],
    secondary: ['#0891B2', '#22D3EE'],
    accent: ['#D97706', '#FBBF24']
  },
  {
    id: 'sunset',
    name: 'Ocean Sunset',
    occasion: 'Summer',
    primary: ['#F43F5E', '#FB7185'],
    secondary: ['#F59E0B', '#FBBF24'],
    accent: ['#8B5CF6', '#A78BFA']
  },
  {
    id: 'nebula',
    name: 'Deep Nebula',
    occasion: 'Sci-Fi',
    primary: ['#4C1D95', '#6D28D9'],
    secondary: ['#BE185D', '#DB2777'],
    accent: ['#0369A1', '#0EA5E9']
  }
];

export const CURRENCY_SYMBOL = 'Rs.';
export const NOVA_KEY = 'gab_eats_v1300_global';

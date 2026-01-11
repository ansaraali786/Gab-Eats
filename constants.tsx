import { Restaurant, AppTheme } from './types';

export const INITIAL_RESTAURANTS: Restaurant[] = [
  {
    id: '1',
    name: 'Karachi Biryani House',
    cuisine: 'Desi, Rice',
    rating: 4.8,
    image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=800',
    deliveryTime: '25-35 min',
    menu: [
      { id: 'm1', name: 'Chicken Biryani Full', description: 'Special Sindhi Biryani with spice and aroma.', price: 450, category: 'Main', image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=400' },
      { id: 'm2', name: 'Raita', description: 'Fresh yogurt with vegetables.', price: 50, category: 'Sides', image: 'https://images.unsplash.com/photo-1596797038558-95a0a16e7353?q=80&w=400' },
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
  }
];

export const CURRENCY_SYMBOL = 'Rs.';

/** 
 * GAB-EATS NOVA CORE V11
 * Clean state key to clear V10 layout breakage.
 */
export const NOVA_KEY = 'gab_eats_v1100_final';

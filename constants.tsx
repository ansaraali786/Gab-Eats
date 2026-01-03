
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
  },
  {
    id: '2',
    name: 'Lahori Chargha Center',
    cuisine: 'BBQ, Traditional',
    rating: 4.5,
    image: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?q=80&w=800',
    deliveryTime: '40-50 min',
    menu: [
      { id: 'm3', name: 'Full Chargha', description: 'Steamed and fried whole chicken.', price: 1200, category: 'Main', image: 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?q=80&w=400' },
      { id: 'm4', name: 'Seekh Kabab (4 pcs)', description: 'Juicy beef seekh kababs.', price: 600, category: 'BBQ', image: 'https://images.unsplash.com/photo-1524331102485-f6c0233c16b2?q=80&w=400' },
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
    id: 'ramadan',
    name: 'Ramadan Kareem',
    occasion: 'Ramadan',
    primary: ['#065F46', '#F59E0B'],
    secondary: ['#047857', '#34D399'],
    accent: ['#92400E', '#FBBF24']
  }
];

export const CURRENCY_SYMBOL = 'Rs.';

/** 
 * V60 OMEGA NAMESPACE 
 * The final definitive key for Gab-Eats Enterprise.
 */
export const NEBULA_KEY = 'gab_eats_omega_v60_final_authority';

/**
 * 2025 VERIFIED PEERS
 * Updated to exclude unstable nodes and include dedicated Gun.js relays.
 */
export const RELAY_PEERS = [
  'https://relay.peer.ooo/gun',
  'https://gun-ams1.marda.io/gun',
  'https://gun-us.herokuapp.com/gun',
  'https://gun-eu.herokuapp.com/gun',
  'https://dletta.com/gun',
  'https://gun-manhattan.herokuapp.com/gun',
  'https://gunjs.herokuapp.com/gun'
];

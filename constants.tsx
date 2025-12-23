
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
  },
  {
    id: '3',
    name: 'Burger Lab Clone',
    cuisine: 'Fast Food, Burgers',
    rating: 4.2,
    image: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?q=80&w=800',
    deliveryTime: '15-25 min',
    menu: [
      { id: 'm5', name: 'Zinger Burger', description: 'Crispy fried chicken thigh with mayo.', price: 550, category: 'Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=400' },
      { id: 'm6', name: 'Fries Large', description: 'Salted crinkle cut fries.', price: 250, category: 'Sides', image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?q=80&w=400' },
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
  },
  {
    id: 'eid-f',
    name: 'Eid-ul-Fitr Joy',
    occasion: 'Eid-ul-Fitr',
    primary: ['#0284C7', '#7DD3FC'],
    secondary: ['#0369A1', '#0EA5E9'],
    accent: ['#6366F1', '#A5B4FC']
  },
  {
    id: 'eid-a',
    name: 'Sacrifice & Devotion',
    occasion: 'Eid-ul-Adha',
    primary: ['#78350F', '#B45309'],
    secondary: ['#166534', '#22C55E'],
    accent: ['#451A03', '#92400E']
  },
  {
    id: 'mawlid',
    name: 'Mawlid Celebration',
    occasion: 'Mawlid-un-Nabi',
    primary: ['#047857', '#ECFDF5'],
    secondary: ['#064E3B', '#10B981'],
    accent: ['#15803D', '#4ADE80']
  },
  {
    id: 'ashura',
    name: 'Legacy of Valor',
    occasion: 'Ashura',
    primary: ['#111827', '#991B1B'],
    secondary: ['#1F2937', '#374151'],
    accent: ['#7F1D1D', '#B91C1C']
  },
  {
    id: 'laylat',
    name: 'Night of Power',
    occasion: 'Laylat al-Qadr',
    primary: ['#312E81', '#4F46E5'],
    secondary: ['#1E1B4B', '#3730A3'],
    accent: ['#5B21B6', '#8B5CF6']
  },
  {
    id: 'newyear',
    name: 'Hijri Dawn',
    occasion: 'Islamic New Year',
    primary: ['#0D9488', '#CCFBF1'],
    secondary: ['#0F766E', '#14B8A6'],
    accent: ['#064E3B', '#059669']
  },
  {
    id: 'rajab',
    name: 'Rajab Royal',
    occasion: 'Month of Rajab',
    primary: ['#581C87', '#D8B4FE'],
    secondary: ['#3B0764', '#7E22CE'],
    accent: ['#701A75', '#D946EF']
  },
  {
    id: 'shaban',
    name: 'Spring Blessing',
    occasion: 'Sha\'ban',
    primary: ['#BE185D', '#FCE7F3'],
    secondary: ['#9D174D', '#DB2777'],
    accent: ['#831843', '#EC4899']
  },
  {
    id: 'rabi-awwal',
    name: 'Pure Mint',
    occasion: 'Rabi al-Awwal',
    primary: ['#15803D', '#DCFCE7'],
    secondary: ['#166534', '#22C55E'],
    accent: ['#064E3B', '#10B981']
  },
  {
    id: 'hajj',
    name: 'Sacred Journey',
    occasion: 'Dhul-Hijjah',
    primary: ['#111111', '#D4AF37'],
    secondary: ['#1A1A1A', '#333333'],
    accent: ['#B8860B', '#FFD700']
  },
  {
    id: 'ramadan-night',
    name: 'Starry Ramadan',
    occasion: 'Ramadan Nights',
    primary: ['#1E3A8A', '#FDE047'],
    secondary: ['#172554', '#1E40AF'],
    accent: ['#1E3A8A', '#60A5FA']
  },
  {
    id: 'friday',
    name: 'Blessed Friday',
    occasion: 'Jummah',
    primary: ['#0F766E', '#F0FDFA'],
    secondary: ['#115E59', '#2DD4BF'],
    accent: ['#134E4A', '#14B8A6']
  },
  {
    id: 'safari',
    name: 'Autumn Dusk',
    occasion: 'Safar',
    primary: ['#451A03', '#FB923C'],
    secondary: ['#78350F', '#EA580C'],
    accent: ['#9A3412', '#F97316']
  }
];

export const CURRENCY = 'PKR';
export const CURRENCY_SYMBOL = 'Rs.';

export type PoiCategory = 
  | 'healthcare'
  | 'police'
  | 'fire'
  | 'civic'
  | 'education'
  | 'transit'
  | 'landmarks';

export interface PoiItem {
  id: string;
  osmId: number;
  name: string;
  category: PoiCategory;
  categoryLabel: string;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  website?: string;
  openingHours?: string;
  emergency?: boolean;
  operator?: string;
  tags?: Record<string, string>;
}

export interface PoiCategoryMeta {
  id: PoiCategory;
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconName: string;
  description: string;
}

export const POI_CATEGORIES: Record<PoiCategory, PoiCategoryMeta> = {
  healthcare: {
    id: 'healthcare',
    label: 'Hospitals & Healthcare',
    shortLabel: 'Healthcare',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    textColor: 'text-rose-400',
    iconName: 'Cross',
    description: 'Hospitals, emergency clinics, pharmacies',
  },
  police: {
    id: 'police',
    label: 'Police Stations',
    shortLabel: 'Police',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: '#3b82f6',
    textColor: 'text-blue-400',
    iconName: 'Shield',
    description: 'Police stations and law enforcement posts',
  },
  fire: {
    id: 'fire',
    label: 'Fire & Emergency',
    shortLabel: 'Fire & Rescue',
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: '#f97316',
    textColor: 'text-orange-400',
    iconName: 'Flame',
    description: 'Fire stations and emergency rescue posts',
  },
  civic: {
    id: 'civic',
    label: 'Civic & Public Services',
    shortLabel: 'Civic Services',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#a855f7',
    textColor: 'text-purple-400',
    iconName: 'Landmark',
    description: 'Townhalls, government offices, post offices, courts',
  },
  education: {
    id: 'education',
    label: 'Education & Universities',
    shortLabel: 'Education',
    color: '#eab308',
    bgColor: 'rgba(234, 179, 8, 0.15)',
    borderColor: '#eab308',
    textColor: 'text-yellow-400',
    iconName: 'GraduationCap',
    description: 'Universities, colleges, and major educational hubs',
  },
  transit: {
    id: 'transit',
    label: 'Transit Hubs',
    shortLabel: 'Transit',
    color: '#06b6d4',
    bgColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
    textColor: 'text-cyan-400',
    iconName: 'Train',
    description: 'Railway stations, metro stations, bus terminals',
  },
  landmarks: {
    id: 'landmarks',
    label: 'Landmarks & Public Places',
    shortLabel: 'Landmarks',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
    textColor: 'text-emerald-400',
    iconName: 'MapPin',
    description: 'Historic monuments, museums, cultural landmarks',
  },
};

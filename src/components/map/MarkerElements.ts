import type { Map } from 'maplibre-gl';
import type { PoiCategory } from '../../types/poi';
import { POI_CATEGORIES } from '../../types/poi';

export const CATEGORY_ICON_PATHS: Record<PoiCategory, string> = {
  healthcare: `
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    <path d="M12 5v14"/><path d="M5 12h14"/>`,
  police: `
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>`,
  fire: `
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>`,
  civic: `
    <line x1="3" x2="21" y1="22" y2="22"/>
    <line x1="6" x2="6" y1="18"/><line x1="10" x2="10" y1="18"/><line x1="14" x2="14" y1="18"/><line x1="18" x2="18" y1="18"/>
    <polygon points="12 2 20 7 4 7"/>`,
  education: `
    <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/>
    <path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>`,
  transit: `
    <rect width="16" height="16" x="4" y="3" rx="2"/>
    <path d="M4 11h16"/><path d="M12 3v8"/><path d="m8 19-2 3"/><path d="m18 22-2-3"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/>`,
  landmarks: `
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
};

/**
 * Registers high-DPI category marker images into MapLibre GL for WebGL SymbolLayer rendering.
 * Each marker is an SVG badge containing a dark circular pill, category color outline,
 * and high-contrast vector icon.
 */
export function registerPoiMapImages(mapInstance: Map): Promise<void> {
  const categories = Object.keys(POI_CATEGORIES) as PoiCategory[];

  return Promise.all(
    categories.map((cat) => {
      const imageId = `poi-marker-${cat}`;
      if (mapInstance.hasImage(imageId)) return Promise.resolve();

      const meta = POI_CATEGORIES[cat];
      const iconPath = CATEGORY_ICON_PATHS[cat];
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="17" fill="#080d1a" stroke="${meta.color}" stroke-width="2.5"/>
          <g transform="translate(8, 8)" stroke="${meta.color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
            ${iconPath}
          </g>
        </svg>
      `.trim();

      return new Promise<void>((resolve) => {
        const img = new Image(40, 40);
        img.onload = () => {
          if (!mapInstance.hasImage(imageId)) {
            mapInstance.addImage(imageId, img, { pixelRatio: 2 });
          }
          resolve();
        };
        img.onerror = () => resolve();
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      });
    })
  ).then(() => {});
}

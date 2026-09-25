import type { SelectedLocation } from '../../types/location';

/**
 * Creates a custom DOM element for the MapLibre GL Marker.
 * Features a small cyan location point with a subtle pulsing ring
 * and an elegant floating label (e.g. JAIPUR / Rajasthan, India).
 */
export function createCityPulseMarkerElement(location: SelectedLocation): HTMLDivElement {
  const container = document.createElement('div');
  container.className = 'citypulse-city-marker group relative flex items-center justify-center cursor-pointer pointer-events-auto select-none';
  container.style.width = '24px';
  container.style.height = '24px';

  // Subtle outer pulse ring
  const pulseRing = document.createElement('div');
  pulseRing.className = 'absolute -inset-1 rounded-full bg-cyan-400/25 animate-ping pointer-events-none';
  pulseRing.style.animationDuration = '2.5s';

  // Soft ambient glow
  const glowRing = document.createElement('div');
  glowRing.className = 'absolute w-4 h-4 rounded-full bg-cyan-500/20 pointer-events-none';

  // Small, sharp high-contrast cyan center core
  const coreDot = document.createElement('div');
  coreDot.className = 'relative w-2.5 h-2.5 rounded-full bg-cyan-400 ring-2 ring-white shadow-[0_0_10px_rgba(6,182,212,0.9)]';

  // Small elegant floating label above
  const labelCard = document.createElement('div');
  labelCard.className = 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col items-center pointer-events-none transition-all duration-200';

  const innerBadge = document.createElement('div');
  innerBadge.className = 'bg-[#0b0f19]/90 dark:bg-[#07090e]/95 backdrop-blur-md border border-cyan-500/40 rounded-lg px-2.5 py-1 shadow-lg text-center whitespace-nowrap';

  const nameEl = document.createElement('div');
  nameEl.className = 'text-[11px] font-bold font-mono tracking-wider text-white uppercase leading-tight';
  nameEl.textContent = location.name;

  const subEl = document.createElement('div');
  subEl.className = 'text-[9px] font-mono text-cyan-300/80 font-medium tracking-tight mt-0.5 leading-tight';
  const region = [location.state, location.country].filter(Boolean).join(', ');
  subEl.textContent = region || 'City Center';

  innerBadge.appendChild(nameEl);
  innerBadge.appendChild(subEl);

  // Tiny pointer triangle
  const pointer = document.createElement('div');
  pointer.className = 'w-1.5 h-1.5 rotate-45 bg-[#0b0f19]/90 dark:bg-[#07090e]/95 border-r border-b border-cyan-500/40 -mt-1';

  labelCard.appendChild(innerBadge);
  labelCard.appendChild(pointer);

  container.appendChild(pulseRing);
  container.appendChild(glowRing);
  container.appendChild(coreDot);
  container.appendChild(labelCard);

  return container;
}

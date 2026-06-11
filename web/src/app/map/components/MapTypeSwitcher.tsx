'use client';

import { useState, useRef, useEffect } from 'react';

interface MapTypeSwitcherProps {
  provider: string;
  activeType: string;
  onSwitch: (type: string) => void;
}

const TYPE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  google: [
    { value: 'roadmap', label: 'Road' },
    { value: 'satellite', label: 'Satellite' },
    { value: 'terrain', label: 'Terrain' },
    { value: 'hybrid', label: 'Hybrid' },
  ],
  mapbox: [
    { value: 'streets-v12', label: 'Streets' },
    { value: 'satellite-v9', label: 'Satellite' },
    { value: 'satellite-streets-v12', label: 'Sat+Streets' },
    { value: 'outdoors-v12', label: 'Outdoors' },
    { value: 'light-v11', label: 'Light' },
    { value: 'dark-v11', label: 'Dark' },
  ],
};

export default function MapTypeSwitcher({
  provider,
  activeType,
  onSwitch,
}: MapTypeSwitcherProps) {
  const options = TYPE_OPTIONS[provider];
  if (!options) return null;

  // Google: inline button group
  if (provider === 'google') {
    return (
      <div className="absolute bottom-4 right-4 z-[700] flex rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSwitch(opt.value)}
            className={[
              'px-3 py-1.5 text-xs transition-colors border-r border-neutral-200 last:border-r-0',
              activeType === opt.value
                ? 'bg-primary-100 text-primary-700 font-semibold'
                : 'text-neutral-600 hover:bg-neutral-50',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  // Mapbox: dropdown
  return <MapboxDropdown options={options} activeType={activeType} onSwitch={onSwitch} />;
}

function MapboxDropdown({
  options,
  activeType,
  onSwitch,
}: {
  options: { value: string; label: string }[];
  activeType: string;
  onSwitch: (type: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeLabel = options.find((o) => o.value === activeType)?.label ?? 'Map Style';

  return (
    <div ref={ref} className="absolute bottom-4 right-4 z-[700]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 shadow-lg hover:bg-neutral-50 transition-colors"
      >
        {activeLabel}
        <svg
          className={`w-3 h-3 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 rounded-lg border border-neutral-200 bg-white shadow-lg overflow-hidden min-w-[120px]">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onSwitch(opt.value); setOpen(false); }}
              className={[
                'block w-full text-left px-3 py-1.5 text-xs transition-colors',
                activeType === opt.value
                  ? 'bg-primary-100 text-primary-700 font-semibold'
                  : 'text-neutral-600 hover:bg-neutral-50',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

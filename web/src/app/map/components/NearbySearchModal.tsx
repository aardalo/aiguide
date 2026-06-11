'use client';

import { useEffect, useState } from 'react';

const PLACE_TYPES = [
  { value: 'tourist_attraction', label: 'Tourist attraction', emoji: '🏛️' },
  { value: 'park',               label: 'Park',               emoji: '🌳' },
  { value: 'rv_park',            label: 'RV park',            emoji: '🚐' },
  { value: 'campground',         label: 'Campground',         emoji: '⛺' },
  { value: 'mobile_home_park',   label: 'Mobile home park',   emoji: '🏕️' },
  { value: 'rest_stop',          label: 'Rest stop',          emoji: '🛑' },
  { value: 'parking',            label: 'Parking',            emoji: '🅿️' },
] as const;

interface Props {
  onSelect: (types: string[]) => void;
  onClose: () => void;
}

export default function NearbySearchModal({ onSelect, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-xl sm:rounded-lg shadow-xl p-5 sm:p-6 w-full sm:w-80 max-w-full mx-0 sm:mx-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Search Nearby</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-4">Select one or more place types:</p>
        <div className="grid grid-cols-2 gap-2">
          {PLACE_TYPES.map(({ value, label, emoji }) => {
            const isSelected = selected.has(value);
            return (
              <button
                key={value}
                onClick={() => toggle(value)}
                className={`flex flex-col items-center gap-1 px-3 py-3 rounded-md border text-sm transition-all ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500'
                    : 'border-neutral-200 hover:border-primary-400 hover:bg-primary-50 text-neutral-700'
                }`}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
        <button
          onClick={() => {
            if (selected.size > 0) onSelect([...selected]);
          }}
          disabled={selected.size === 0}
          className="mt-4 w-full rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Search{selected.size > 0 ? ` (${selected.size})` : ''}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';

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
  onSelect: (type: string) => void;
  onClose: () => void;
}

export default function NearbySearchModal({ onSelect, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-80 max-w-full mx-4"
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
        <p className="text-sm text-neutral-500 mb-4">Select a place type to search for:</p>
        <div className="grid grid-cols-2 gap-2">
          {PLACE_TYPES.map(({ value, label, emoji }) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className="flex flex-col items-center gap-1 px-3 py-3 rounded-md border border-neutral-200 hover:border-primary-400 hover:bg-primary-50 text-sm text-neutral-700 transition-all"
            >
              <span className="text-2xl">{emoji}</span>
              <span className="text-center leading-tight">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

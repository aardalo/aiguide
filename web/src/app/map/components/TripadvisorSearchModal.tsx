'use client';

import { useEffect } from 'react';

const CATEGORIES = [
  { value: 'hotels',       label: 'Hotels',       icon: 'H' },
  { value: 'restaurants',  label: 'Restaurants',  icon: 'R' },
  { value: 'attractions',  label: 'Attractions',  icon: 'A' },
] as const;

interface Props {
  onSelect: (category?: string) => void;
  onClose: () => void;
}

export default function TripadvisorSearchModal({ onSelect, onClose }: Props) {
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
        className="bg-white rounded-lg shadow-xl p-6 w-72 max-w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-neutral-900">Search Tripadvisor</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 text-xl leading-none"
            aria-label="Close"
          >
            x
          </button>
        </div>
        <p className="text-sm text-neutral-500 mb-4">Select a category:</p>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map(({ value, label, icon }) => (
            <button
              key={value}
              onClick={() => onSelect(value)}
              className="flex items-center gap-3 px-3 py-3 rounded-md border border-neutral-200 hover:border-primary-400 hover:bg-primary-50 text-sm text-neutral-700 transition-all"
            >
              <span className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                {icon}
              </span>
              <span>{label}</span>
            </button>
          ))}
          <button
            onClick={() => onSelect(undefined)}
            className="flex items-center gap-3 px-3 py-3 rounded-md border border-neutral-200 hover:border-primary-400 hover:bg-primary-50 text-sm text-neutral-700 transition-all"
          >
            <span className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-600">
              *
            </span>
            <span>All categories</span>
          </button>
        </div>
      </div>
    </div>
  );
}

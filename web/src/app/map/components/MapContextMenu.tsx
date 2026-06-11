'use client';

import { useEffect, useRef } from 'react';

interface Props {
  x: number;
  y: number;
  onSearchNearby: () => void;
  onSearchPark4Night: () => void;
  onSearchTripadvisor?: () => void;
  tripadvisorEnabled?: boolean;
  onSearchFoursquare?: () => void;
  foursquareEnabled?: boolean;
  onAiResearch?: () => void;
  onAddPoi: () => void;
  /** "Day 1", "Day 2", etc. when a day is pre-selected; null means user must pick. */
  selectedDayLabel: string | null;
  onClose: () => void;
  touchMode?: boolean;
}

export default function MapContextMenu({ x, y, onSearchNearby, onSearchPark4Night, onSearchTripadvisor, tripadvisorEnabled, onSearchFoursquare, foursquareEnabled, onAiResearch, onAddPoi, selectedDayLabel, onClose, touchMode = false }: Props) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close on any click outside the menu
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture phase so this fires before map handlers
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const buttonClass = 'w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100 flex items-center gap-2';

  if (touchMode) {
    return (
      <div className="fixed inset-0 z-[920] bg-black/25" onClick={onClose}>
        <div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-3 right-3 bottom-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white rounded-xl shadow-xl border border-neutral-200 py-2"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSearchNearby();
            }}
            className={buttonClass}
          >
            <span>🔍</span>
            <span>Search Nearby</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSearchPark4Night();
            }}
            className={buttonClass}
          >
            <span>🚐</span>
            <span>Search Park4Night</span>
          </button>
          {tripadvisorEnabled && onSearchTripadvisor && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchTripadvisor();
              }}
              className={buttonClass}
            >
              <span className="inline-flex items-center justify-center w-[1em] text-center font-bold text-emerald-600 text-xs">TA</span>
              <span>Search Tripadvisor</span>
            </button>
          )}
          {foursquareEnabled && onSearchFoursquare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSearchFoursquare();
              }}
              className={buttonClass}
            >
              <span className="inline-flex items-center justify-center w-[1em] text-center font-bold text-blue-600 text-xs">FS</span>
              <span>Search Foursquare</span>
            </button>
          )}
          {onAiResearch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAiResearch();
              }}
              className={buttonClass}
            >
              <span className="inline-flex items-center justify-center w-[1em] text-center font-bold text-amber-600 text-xs">AI</span>
              <span>AI Research (visible area)</span>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddPoi();
            }}
            className={buttonClass}
          >
            <span>📌</span>
            <span>{selectedDayLabel ? `Add POI to ${selectedDayLabel}` : 'Add POI...'}</span>
          </button>
          <hr className="border-neutral-100 my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full text-left px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      style={{ position: 'absolute', left: x, top: y, zIndex: 900 }}
      className="bg-white rounded-md shadow-lg border border-neutral-200 py-1 min-w-44"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSearchNearby();
        }}
        className={buttonClass}
      >
        <span>🔍</span>
        <span>Search Nearby</span>
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSearchPark4Night();
        }}
        className={buttonClass}
      >
        <span>🚐</span>
        <span>Search Park4Night</span>
      </button>
      {tripadvisorEnabled && onSearchTripadvisor && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSearchTripadvisor();
          }}
          className={buttonClass}
        >
          <span className="inline-flex items-center justify-center w-[1em] text-center font-bold text-emerald-600 text-xs">TA</span>
          <span>Search Tripadvisor</span>
        </button>
      )}
      {foursquareEnabled && onSearchFoursquare && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSearchFoursquare();
          }}
          className={buttonClass}
        >
          <span className="inline-flex items-center justify-center w-[1em] text-center font-bold text-blue-600 text-xs">FS</span>
          <span>Search Foursquare</span>
        </button>
      )}
      {onAiResearch && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAiResearch();
          }}
          className={buttonClass}
        >
          <span className="inline-flex items-center justify-center w-[1em] text-center font-bold text-amber-600 text-xs">AI</span>
          <span>AI Research (visible area)</span>
        </button>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAddPoi();
        }}
        className={buttonClass}
      >
        <span>📌</span>
        <span>{selectedDayLabel ? `Add POI to ${selectedDayLabel}` : 'Add POI\u2026'}</span>
      </button>
      <hr className="border-neutral-100 my-1" />
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="w-full text-left px-4 py-2 text-sm text-neutral-400 hover:bg-neutral-100"
      >
        Cancel
      </button>
    </div>
  );
}

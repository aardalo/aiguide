'use client';

import { useState } from 'react';

export interface MarkerFilterGroup {
  key: string;
  label: string;
  items: MarkerFilterItem[];
}

export interface MarkerFilterItem {
  key: string;
  label: string;
  count: number;
  iconHtml: string;
}

/** Record of groupKey → Set of hidden item keys */
export type MarkerVisibility = Record<string, Set<string>>;

interface MarkerFilterPaneProps {
  groups: MarkerFilterGroup[];
  hidden: MarkerVisibility;
  onToggleItem: (groupKey: string, itemKey: string) => void;
  onToggleGroup: (groupKey: string) => void;
  onClose: () => void;
}

export default function MarkerFilterPane({
  groups,
  hidden,
  onToggleItem,
  onToggleGroup,
  onClose,
}: MarkerFilterPaneProps) {
  const [collapsed, setCollapsed] = useState(false);

  const isGroupFullyHidden = (g: MarkerFilterGroup) =>
    g.items.length > 0 && g.items.every((i) => hidden[g.key]?.has(i.key));
  const isGroupPartiallyHidden = (g: MarkerFilterGroup) =>
    g.items.some((i) => hidden[g.key]?.has(i.key)) && !isGroupFullyHidden(g);
  const isItemHidden = (groupKey: string, itemKey: string) =>
    hidden[groupKey]?.has(itemKey) ?? false;

  const totalVisible = groups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + (isItemHidden(g.key, i.key) ? 0 : i.count), 0),
    0,
  );
  const totalAll = groups.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.count, 0), 0);

  // Don't render if there's nothing to filter
  if (groups.length === 0 || totalAll === 0) return null;

  return (
    <div className="absolute top-3 left-3 z-[700] select-none">
      {/* Header bar — always visible */}
      <div
        className="flex items-center gap-2 bg-white rounded-lg shadow-lg border border-neutral-200 px-3 py-2 cursor-pointer"
        onClick={() => setCollapsed((c) => !c)}
      >
        <svg
          className={`w-3.5 h-3.5 text-neutral-500 transition-transform ${collapsed ? '-rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        <span className="text-xs font-semibold text-neutral-700">
          Markers
        </span>
        <span className="text-[10px] text-neutral-400">
          {totalVisible}/{totalAll}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="ml-1 text-neutral-400 hover:text-neutral-600 text-sm leading-none"
          aria-label="Close filter"
        >
          ×
        </button>
      </div>

      {/* Expandable body */}
      {!collapsed && (
        <div className="mt-1 bg-white rounded-lg shadow-lg border border-neutral-200 max-h-[60vh] overflow-y-auto w-56">
          {groups.map((group) => (
            <div key={group.key} className="border-b border-neutral-100 last:border-b-0">
              {/* Group header */}
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isGroupFullyHidden(group)}
                  ref={(el) => { if (el) el.indeterminate = isGroupPartiallyHidden(group); }}
                  onChange={() => onToggleGroup(group.key)}
                  className="accent-primary-600 w-3.5 h-3.5"
                />
                <span className="text-xs font-semibold text-neutral-700 flex-1">{group.label}</span>
                <span className="text-[10px] text-neutral-400">
                  {group.items.reduce((s, i) => s + i.count, 0)}
                </span>
              </label>

              {/* Items */}
              {group.items.map((item) => (
                <label
                  key={item.key}
                  className="flex items-center gap-2 pl-7 pr-3 py-1.5 hover:bg-neutral-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={!isItemHidden(group.key, item.key)}
                    onChange={() => onToggleItem(group.key, item.key)}
                    className="accent-primary-600 w-3 h-3"
                  />
                  <span
                    className="shrink-0 flex items-center justify-center overflow-hidden"
                    style={{ width: 20, height: 20, transform: 'scale(0.75)', transformOrigin: 'center' }}
                    dangerouslySetInnerHTML={{ __html: item.iconHtml }}
                  />
                  <span className="text-[11px] text-neutral-600 flex-1 truncate">{item.label}</span>
                  <span className="text-[10px] text-neutral-400">{item.count}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

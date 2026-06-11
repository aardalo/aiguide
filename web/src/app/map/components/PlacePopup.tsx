import type { ReactNode } from 'react';

interface PlacePopupProps {
  onClose: () => void;
  badge?: ReactNode;
  name: string;
  subtitle?: string;
  children?: ReactNode;
  links?: ReactNode;
  actions?: ReactNode;
  touchMode?: boolean;
}

export default function PlacePopup({
  onClose,
  badge,
  name,
  subtitle,
  children,
  links,
  actions,
  touchMode = false,
}: PlacePopupProps) {
  const containerClass = touchMode
    ? 'fixed left-3 right-3 bottom-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white rounded-xl shadow-xl border border-neutral-200 p-4 z-[950] max-h-[62vh] overflow-y-auto'
    : 'absolute bottom-4 left-4 bg-white rounded-lg shadow-xl border border-neutral-200 p-4 z-[800] w-80 max-w-[calc(100%-2rem)]';

  return (
    <div className={containerClass}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          {badge}
          <p className="font-semibold text-neutral-900 text-sm leading-tight">
            {name}
          </p>
          {subtitle && (
            <p className="text-xs text-neutral-500 mt-0.5 capitalize">
              {subtitle}
            </p>
          )}
          {links && (
            <div className="flex flex-col gap-0.5 mt-1">
              {links}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-neutral-600 text-lg leading-none shrink-0"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {children}

        {actions}
      </div>
    </div>
  );
}

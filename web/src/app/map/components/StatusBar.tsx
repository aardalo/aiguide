'use client';

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface StatusMessage {
  id: string;
  text: string;
  detail?: string;
  timestamp: Date;
}

export interface StatusBarHandle {
  pushStatus: (text: string, detail?: string) => void;
}

const DEFAULT_SUBTITLE = 'Plan your road trip with dates and destinations';
const STATUS_DURATION_MS = 10_000;
const FADE_MS = 500;
const MAX_HISTORY = 50;

const StatusBar = forwardRef<StatusBarHandle>(function StatusBar(_, ref) {
  const [history, setHistory] = useState<StatusMessage[]>([]);
  const [active, setActive] = useState<StatusMessage | null>(null);
  const [fading, setFading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailMsg, setDetailMsg] = useState<StatusMessage | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const fadeRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);
  }, []);

  const pushStatus = useCallback((text: string, detail?: string) => {
    const msg: StatusMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      text,
      detail,
      timestamp: new Date(),
    };
    setHistory(prev => [msg, ...prev].slice(0, MAX_HISTORY));
    setActive(msg);
    setFading(false);
    clearTimers();

    timerRef.current = setTimeout(() => {
      setFading(true);
      fadeRef.current = setTimeout(() => {
        setActive(null);
        setFading(false);
      }, FADE_MS);
    }, STATUS_DURATION_MS);
  }, [clearTimers]);

  useImperativeHandle(ref, () => ({ pushStatus }), [pushStatus]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!historyOpen) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handle, true);
    return () => document.removeEventListener('mousedown', handle, true);
  }, [historyOpen]);

  // Escape key closes dropdown / detail popup
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (detailMsg) { setDetailMsg(null); return; }
      if (historyOpen) { setHistoryOpen(false); }
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [historyOpen, detailMsg]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const showingStatus = active && !fading;

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => { if (history.length > 0) setHistoryOpen(v => !v); }}
        className={`text-sm text-left relative block w-full ${
          history.length > 0 ? 'cursor-pointer hover:text-neutral-800' : 'cursor-default'
        }`}
      >
        <span
          className="text-neutral-600 transition-opacity"
          style={{
            opacity: showingStatus ? 0 : 1,
            transitionDuration: `${FADE_MS}ms`,
          }}
        >
          {DEFAULT_SUBTITLE}
        </span>
        {active && (
          <span
            className="absolute inset-0 text-primary-700 font-medium truncate transition-opacity"
            style={{
              opacity: fading ? 0 : 1,
              transitionDuration: `${FADE_MS}ms`,
            }}
          >
            {active.text}
          </span>
        )}
      </button>

      {historyOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-1 bg-white border border-neutral-200 rounded-lg shadow-xl z-50 w-96 max-h-64 overflow-y-auto"
        >
          {history.map(msg => (
            <button
              key={msg.id}
              type="button"
              onClick={() => {
                setDetailMsg(msg);
                setHistoryOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 border-b border-neutral-100 last:border-b-0 flex items-start gap-3"
            >
              <span className="text-[10px] text-neutral-400 font-mono whitespace-nowrap mt-0.5">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="text-sm text-neutral-700 line-clamp-2 text-left">
                {msg.text}
              </span>
            </button>
          ))}
        </div>
      )}

      {detailMsg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[28rem] max-w-[90vw] max-h-[80vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-xs text-neutral-400 font-mono">
                {detailMsg.timestamp.toLocaleString()}
              </p>
              <button
                type="button"
                onClick={() => setDetailMsg(null)}
                className="text-neutral-400 hover:text-neutral-600 text-lg leading-none shrink-0"
              >
                &times;
              </button>
            </div>
            <p className="text-sm text-neutral-900 font-medium mb-2">{detailMsg.text}</p>
            {detailMsg.detail && (
              <pre className="text-xs text-neutral-600 whitespace-pre-wrap font-sans bg-neutral-50 rounded-md p-3 border border-neutral-100">
                {detailMsg.detail}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default StatusBar;

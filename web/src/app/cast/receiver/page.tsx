'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

const CAST_NAMESPACE = 'urn:x-cast:com.aardest.map';
const DEFAULT_CENTER: [number, number] = [15, 54];
const DEFAULT_ZOOM = 4;

declare global {
  interface Window {
    cast?: any;
  }
}

interface MapCastViewState {
  lat: number;
  lng: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  ts?: number;
}

function isMapCastViewState(value: unknown): value is MapCastViewState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.lat === 'number' &&
    typeof candidate.lng === 'number' &&
    typeof candidate.zoom === 'number'
  );
}

export default function CastReceiverPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [statusText, setStatusText] = useState('Starting receiver...');

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
    mapRef.current = map;

    const applyViewState = (view: MapCastViewState) => {
      const zoom = Math.round(view.zoom);
      map.jumpTo({
        center: [view.lng, view.lat],
        zoom,
        bearing: view.bearing ?? map.getBearing(),
        pitch: view.pitch ?? map.getPitch(),
      });
      setStatusText(`Receiving map state at zoom ${zoom}`);
    };

    let cleanupCastListener: (() => void) | undefined;

    const initCastReceiver = () => {
      if (!window.cast?.framework) {
        return false;
      }

      const context = window.cast.framework.CastReceiverContext.getInstance();
      const handleMessage = (event: { data?: unknown }) => {
        if (!isMapCastViewState(event.data)) return;
        applyViewState(event.data);
      };

      context.addCustomMessageListener(CAST_NAMESPACE, handleMessage);
      context.start({ statusText: 'Ready for map casting' });
      setStatusText('Ready for map casting');

      cleanupCastListener = () => {
        context.removeCustomMessageListener(CAST_NAMESPACE, handleMessage);
      };

      return true;
    };

    if (!initCastReceiver()) {
      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
      script.async = true;
      script.onload = () => {
        if (!initCastReceiver()) {
          setStatusText('Cast receiver framework unavailable');
        }
      };
      script.onerror = () => {
        setStatusText('Failed to load Cast receiver framework');
      };
      document.head.appendChild(script);
    }

    return () => {
      if (cleanupCastListener) cleanupCastListener();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <main className="relative h-screen w-screen bg-neutral-950 text-white">
      <div ref={mapContainerRef} className="absolute inset-0" />
      <div className="absolute left-4 top-4 rounded-md bg-black/60 px-3 py-2 text-sm tracking-wide">
        {statusText}
      </div>
    </main>
  );
}

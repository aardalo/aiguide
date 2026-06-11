'use client';

/**
 * ImportTripModal Component
 * Lets the user import a trip from a versioned JSON export file.
 * - "Create new trip" imports the file as a brand-new trip.
 * - "Merge into existing trip" merges the file's days into a selected trip,
 *   skipping duplicate destinations/places and out-of-range days.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { TripResponse } from '@/lib/schemas/trip';

type ImportMode = 'new' | 'merge';

interface ImportReport {
  tripId: string;
  mode: ImportMode;
  created: {
    branches: number;
    destinations: number;
    pois: number;
    segments: number;
    waypoints: number;
  };
  skipped: {
    branches: number;
    destinations: number;
    pois: number;
    segments: number;
    outOfRangeDays: number;
  };
  warnings: string[];
  appliedVersions?: number[];
}

interface ImportTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful import so the parent can refresh / open the trip. */
  onImported: (report: ImportReport) => void;
}

export default function ImportTripModal({
  isOpen,
  onClose,
  onImported,
}: ImportTripModalProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [document, setDocument] = useState<unknown>(null);
  const [mode, setMode] = useState<ImportMode>('new');
  const [targetTripId, setTargetTripId] = useState<string>('');
  const [trips, setTrips] = useState<TripResponse[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state each time the modal is opened, and load trips for merge target.
  useEffect(() => {
    if (!isOpen) return;
    setFileName(null);
    setDocument(null);
    setMode('new');
    setTargetTripId('');
    setError(null);
    setReport(null);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    fetch('/api/trips')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setTrips(data);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setDocument(null);
    setFileName(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        setDocument(parsed);
      } catch {
        setError('That file is not valid JSON.');
        setDocument(null);
      }
    };
    reader.onerror = () => {
      setError('Could not read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!document) {
      setError('Please choose a trip export file first.');
      return;
    }
    if (mode === 'merge' && !targetTripId) {
      setError('Please choose a trip to merge into.');
      return;
    }

    setIsImporting(true);
    setError(null);
    try {
      const response = await fetch('/api/trips/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document,
          mode,
          ...(mode === 'merge' ? { targetTripId } : {}),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data?.error ?? 'Import failed.');
        return;
      }

      setReport(data as ImportReport);
      onImported(data as ImportReport);
    } catch {
      setError('Import failed due to a network error.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          Import Trip
        </h3>

        {report ? (
          <div>
            <p className="text-sm text-neutral-700 mb-3">
              Import complete{' '}
              {report.mode === 'new' ? '(created new trip).' : '(merged into trip).'}
            </p>
            <ul className="text-sm text-neutral-600 space-y-1 mb-3">
              <li>Branches created: {report.created.branches}</li>
              <li>Destinations created: {report.created.destinations}</li>
              <li>Places created: {report.created.pois}</li>
              <li>Route segments created: {report.created.segments}</li>
              {(report.skipped.destinations > 0 ||
                report.skipped.pois > 0 ||
                report.skipped.segments > 0 ||
                report.skipped.outOfRangeDays > 0) && (
                <li className="pt-1 text-neutral-500">
                  Skipped — destinations: {report.skipped.destinations}, places:{' '}
                  {report.skipped.pois}, segments: {report.skipped.segments},
                  out-of-range days: {report.skipped.outOfRangeDays}
                </li>
              )}
            </ul>
            {report.warnings.length > 0 && (
              <div className="text-xs text-warning-700 bg-warning-50 rounded-md p-2 mb-3 max-h-32 overflow-y-auto">
                {report.warnings.map((w, i) => (
                  <div key={i}>{w}</div>
                ))}
              </div>
            )}
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-all"
            >
              Done
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-600 mb-4">
              Choose a trip export file (.json). It can come from a different
              version of the app — it will be upgraded automatically.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="block w-full text-sm text-neutral-700 mb-1 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
            />
            {fileName && (
              <p className="text-xs text-neutral-500 mb-3">Selected: {fileName}</p>
            )}

            <fieldset className="mt-3 mb-4">
              <legend className="text-sm font-medium text-neutral-800 mb-2">
                Import as
              </legend>
              <label className="flex items-center gap-2 text-sm text-neutral-700 mb-2">
                <input
                  type="radio"
                  name="import-mode"
                  value="new"
                  checked={mode === 'new'}
                  onChange={() => setMode('new')}
                />
                Create a new trip
              </label>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="radio"
                  name="import-mode"
                  value="merge"
                  checked={mode === 'merge'}
                  onChange={() => setMode('merge')}
                />
                Merge into an existing trip
              </label>
            </fieldset>

            {mode === 'merge' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-800 mb-1">
                  Target trip
                </label>
                <select
                  value={targetTripId}
                  onChange={(e) => setTargetTripId(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-800"
                >
                  <option value="">Select a trip…</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-neutral-500">
                  Days outside the target trip&apos;s date range are skipped, and
                  duplicate destinations/places are not added again.
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-error-600 mb-3">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isImporting}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 rounded-md hover:bg-neutral-200 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || !document}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-all"
              >
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

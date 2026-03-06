'use client';

/**
 * Trip Form Component
 * Location: src/app/map/components/TripForm.tsx
 * Task: TASK-004
 * 
 * Features:
 * - Create new trip with title, description, start/stop dates
 * - Client-side validation with Zod (tripCreateSchema)
 * - Submit to POST /api/trips
 * - Success/error state handling
 * - Loading states
 */

import { useState } from 'react';
import { tripCreateSchema, type TripCreate } from '@/lib/schemas/trip';
import type { TripResponse, RoutingPreferences } from '@/lib/schemas/trip';

interface TripFormProps {
  mode?: 'create' | 'edit';
  tripId?: string;
  initialData?: Partial<TripCreate> & { routingPreferences?: RoutingPreferences };
  onSuccess?: (trip: TripResponse) => void;
  onCancel?: () => void;
}

const AVOID_OPTIONS = [
  { value: 'ferries',      label: 'Ferries' },
  { value: 'motorways',    label: 'Motorways / Highways' },
  { value: 'tolls',        label: 'Toll roads' },
  { value: 'unpavedRoads', label: 'Unpaved / gravel roads' },
] as const;

const emptyFormData: TripCreate = {
  title: '',
  description: '',
  startDate: '',
  stopDate: '',
};

const normalizeDateForInput = (value?: string) => {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
};

export default function TripForm({
  mode = 'create',
  tripId,
  initialData,
  onSuccess,
  onCancel,
}: TripFormProps) {
  const initialFormData: TripCreate = {
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    startDate: normalizeDateForInput(initialData?.startDate),
    stopDate: normalizeDateForInput(initialData?.stopDate),
  };

  const [formData, setFormData] = useState<TripCreate>({
    ...initialFormData,
  });

  const [avoid, setAvoid] = useState<string[]>(
    initialData?.routingPreferences?.avoid ?? []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const toggleAvoid = (value: string) => {
    setAvoid((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const isEditMode = mode === 'edit';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);

    // Client-side validation with Zod
    const validation = tripCreateSchema.safeParse(formData);
    
    if (!validation.success) {
      // Extract field errors from Zod
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    // Submit to API
    setIsSubmitting(true);

    try {
      const endpoint = isEditMode && tripId ? `/api/trips/${tripId}` : '/api/trips';
      const method = isEditMode ? 'PATCH' : 'POST';

      const payload = {
        ...validation.data,
        routingPreferences: avoid.length > 0 ? { avoid } : undefined,
      };
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle API validation errors
        if (response.status === 400 && data.issues) {
          const fieldErrors: Record<string, string> = {};
          if (data.issues.fieldErrors) {
            Object.entries(data.issues.fieldErrors).forEach(([field, errors]) => {
              fieldErrors[field] = (errors as string[])[0];
            });
          }
          setErrors(fieldErrors);
          setSubmitError(data.error || 'Validation failed');
        } else {
          setSubmitError(data.error || `Failed to ${isEditMode ? 'update' : 'create'} trip`);
        }
        return;
      }

      // Success!
      setSubmitSuccess(true);

      if (!isEditMode) {
        setFormData({ ...emptyFormData });
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(data as TripResponse);
      }

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setSubmitSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('[TripForm] Submit error:', error);
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData(isEditMode ? { ...initialFormData } : { ...emptyFormData });
    setAvoid(isEditMode ? (initialData?.routingPreferences?.avoid ?? []) : []);
    setErrors({});
    setSubmitError(null);
    setSubmitSuccess(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Success Message */}
      {submitSuccess && (
        <div className="bg-success-50 border border-success-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-success-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="text-sm font-semibold text-success-800">
                {isEditMode ? 'Trip updated successfully!' : 'Trip created successfully!'}
              </h3>
              <p className="text-sm text-success-700 mt-1.5">
                Your trip has been saved.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="bg-error-50 border border-error-200 rounded-lg p-4">
          <div className="flex items-start">
            <span className="text-error-600 text-xl mr-3">✕</span>
            <div>
              <h3 className="text-sm font-semibold text-error-800">
                {isEditMode ? 'Failed to update trip' : 'Failed to create trip'}
              </h3>
              <p className="text-sm text-error-700 mt-1">{submitError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Title Field */}
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Trip Title <span className="text-error-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          className={`w-full px-3 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus:ring-2 transition-all ${
            errors.title
              ? 'border-error-300 focus:ring-error-500'
              : 'border-neutral-300 focus:ring-primary-500'
          }`}
          placeholder="e.g., Summer Road Trip"
          disabled={isSubmitting}
          maxLength={200}
        />
        {errors.title && (
          <p className="text-sm text-error-600 mt-1.5">{errors.title}</p>
        )}
      </div>

      {/* Description Field */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-neutral-700 mb-1.5"
        >
          Description <span className="text-neutral-500 text-xs">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className={`w-full px-3 py-2.5 border rounded-lg text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus:ring-2 transition-colors ${
            errors.description
              ? 'border-error-300 focus:ring-error-500 bg-error-50'
              : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'
          }`}
          placeholder="Describe your trip..."
          disabled={isSubmitting}
          maxLength={1000}
        />
        {errors.description && (
          <p className="text-sm text-error-600 mt-1.5">{errors.description}</p>
        )}
        <p className="text-xs text-neutral-500 mt-1.5">
          {formData.description?.length || 0} / 1000 characters
        </p>
      </div>

      {/* Date Fields */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Date */}
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            Start Date <span className="text-error-500">*</span>
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            className={`w-full px-3 py-2.5 border rounded-lg text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
              errors.startDate
                ? 'border-error-300 focus:ring-error-500 bg-error-50'
                : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'
            }`}
            disabled={isSubmitting}
          />
          {errors.startDate && (
            <p className="text-sm text-error-600 mt-1.5">{errors.startDate}</p>
          )}
        </div>

        {/* Stop Date */}
        <div>
          <label
            htmlFor="stopDate"
            className="block text-sm font-medium text-neutral-700 mb-1.5"
          >
            End Date <span className="text-error-500">*</span>
          </label>
          <input
            type="date"
            id="stopDate"
            name="stopDate"
            value={formData.stopDate}
            onChange={handleChange}
            className={`w-full px-3 py-2.5 border rounded-lg text-neutral-900 focus:outline-none focus:ring-2 transition-colors ${
              errors.stopDate
                ? 'border-error-300 focus:ring-error-500 bg-error-50'
                : 'border-neutral-300 focus:ring-primary-500 focus:border-primary-500'
            }`}
            disabled={isSubmitting}
          />
          {errors.stopDate && (
            <p className="text-sm text-error-600 mt-1.5">{errors.stopDate}</p>
          )}
        </div>
      </div>

      {/* Routing Preferences */}
      <details className="group border border-neutral-200 rounded-lg">
        <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none text-sm font-medium text-neutral-700 hover:bg-neutral-50 rounded-lg">
          <span>Routing preferences</span>
          <span className="text-neutral-400 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-2">
          <p className="text-xs text-neutral-500 mb-3">Select features to avoid when generating routes.</p>
          {AVOID_OPTIONS.map(({ value, label }) => (
            <label key={value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={avoid.includes(value)}
                onChange={() => toggleAvoid(value)}
                disabled={isSubmitting}
                className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </details>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary-600 text-white py-2.5 px-4 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75 text-primary-600"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              {isEditMode ? 'Saving...' : 'Creating...'}
            </span>
          ) : (
            isEditMode ? 'Save Changes' : 'Create Trip'
          )}
        </button>
        <button
          type="button"
          onClick={onCancel || handleReset}
          disabled={isSubmitting}
          className="px-4 py-2.5 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
        >
          {onCancel ? 'Cancel' : 'Reset'}
        </button>
      </div>
    </form>
  );
}

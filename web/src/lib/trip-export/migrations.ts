/**
 * Trip Export Migration Framework
 * Location: src/lib/trip-export/migrations.ts
 *
 * Upgrades an imported export document from an older `formatVersion` to the
 * current one by running an ordered chain of migration steps, then validates
 * the result against the current strict envelope schema.
 *
 * To introduce a new format version:
 *  1. Bump CURRENT_EXPORT_VERSION in format.ts.
 *  2. Update the entity schemas + schema descriptor in format.ts.
 *  3. Append a migration step here from the previous version to the new one.
 */

import {
  CURRENT_EXPORT_VERSION,
  EXPORT_KIND,
  buildSchemaDescriptor,
  exportEnvelopeSchema,
  rawEnvelopeSchema,
  type ExportEnvelope,
} from './format';

/** A document at an arbitrary (possibly old) version, before migration. */
export type AnyExportDocument = Record<string, unknown>;

export interface MigrationStep {
  from: number;
  to: number;
  /** Pure transform from a `from`-version document to a `to`-version document. */
  migrate: (doc: AnyExportDocument) => AnyExportDocument;
}

/**
 * Ordered registry of migration steps. Each step bumps the version by one.
 * Currently empty because v1 is the first version; add steps as the format
 * evolves (e.g. { from: 1, to: 2, migrate: ... }).
 */
export const MIGRATION_STEPS: MigrationStep[] = [];

export interface MigrationResult {
  envelope: ExportEnvelope;
  /** Versions traversed, e.g. [1, 2, 3]. */
  appliedVersions: number[];
  /** Non-fatal notes (e.g. fields dropped, defaults applied). */
  warnings: string[];
}

export class ImportFormatError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'not_an_export'
      | 'unsupported_version'
      | 'no_migration_path'
      | 'validation_failed',
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ImportFormatError';
  }
}

/**
 * Validate, migrate, and normalize a raw import document to the current
 * envelope version.
 *
 * @throws ImportFormatError if the document is not a recognizable export,
 *         comes from a newer app version, has no migration path, or fails
 *         strict validation after migration.
 */
export function migrateToCurrent(input: unknown): MigrationResult {
  const warnings: string[] = [];

  // 1. Confirm this is one of our export files and read its version.
  const rawParse = rawEnvelopeSchema.safeParse(input);
  if (!rawParse.success) {
    throw new ImportFormatError(
      'File is not a recognizable trip export.',
      'not_an_export',
      rawParse.error.flatten(),
    );
  }

  const raw = rawParse.data;
  let version = raw.formatVersion;

  if (version > CURRENT_EXPORT_VERSION) {
    throw new ImportFormatError(
      `This file was created by a newer version of the app ` +
        `(format v${version}). The current app supports up to v${CURRENT_EXPORT_VERSION}. ` +
        `Please update the app to import this trip.`,
      'unsupported_version',
    );
  }

  // 2. Run the migration chain until we reach the current version.
  let doc: AnyExportDocument = input as AnyExportDocument;
  const appliedVersions: number[] = [version];

  while (version < CURRENT_EXPORT_VERSION) {
    const step = MIGRATION_STEPS.find((s) => s.from === version);
    if (!step) {
      throw new ImportFormatError(
        `No migration path from format v${version} to v${CURRENT_EXPORT_VERSION}.`,
        'no_migration_path',
      );
    }
    doc = step.migrate(doc);
    version = step.to;
    appliedVersions.push(version);
    warnings.push(`Migrated export format v${step.from} → v${step.to}.`);
  }

  // 3. Normalize envelope metadata that may be missing/outdated after migration.
  const normalized: AnyExportDocument = {
    ...doc,
    formatVersion: CURRENT_EXPORT_VERSION,
    kind: EXPORT_KIND,
    exportedAt:
      typeof doc.exportedAt === 'string' && doc.exportedAt
        ? doc.exportedAt
        : new Date().toISOString(),
    // Always refresh the descriptor to the current shape; the embedded one is
    // documentation and may be stale after migration.
    schema: buildSchemaDescriptor(),
  };

  // 4. Strictly validate the migrated document. Zod strips unknown keys and
  //    applies defaults, so any extra legacy fields are dropped here.
  const finalParse = exportEnvelopeSchema.safeParse(normalized);
  if (!finalParse.success) {
    throw new ImportFormatError(
      'The trip file could not be validated against the current schema.',
      'validation_failed',
      finalParse.error.flatten(),
    );
  }

  return {
    envelope: finalParse.data,
    appliedVersions,
    warnings,
  };
}

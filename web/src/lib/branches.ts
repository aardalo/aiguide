/**
 * Branch color palette and helpers.
 */

export const BRANCH_COLORS = [
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#059669', // emerald-600
  '#d97706', // amber-600
  '#dc2626', // red-600
  '#0891b2', // cyan-600
  '#c026d3', // fuchsia-600
  '#4f46e5', // indigo-600
] as const;

export const MAIN_BRANCH_COLOR = '#e06319'; // primary-600

export function getBranchColor(branch: { color: string } | null | undefined): string {
  return branch?.color ?? MAIN_BRANCH_COLOR;
}

export function nextBranchColor(existingCount: number): string {
  return BRANCH_COLORS[existingCount % BRANCH_COLORS.length];
}

/**
 * Escapes user-supplied text so it can safely be used inside a RegExp pattern.
 * This prevents regex metacharacters from altering query semantics or causing
 * ReDoS-like CPU spikes in MongoDB $regex queries.
 */
export function escapeRegex(input: string): string {
  if (!input) return '';
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a case-insensitive "contains" regex from user input.
 */
export function buildSearchRegex(input: string): RegExp {
  return new RegExp(escapeRegex(input), 'i');
}

/**
 * ID Generation Utility
 * 
 * Generates unique identifiers for various entities
 */

/**
 * Generate a unique ID
 * Uses timestamp + random string for uniqueness
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 9);
  return `${timestamp}-${randomPart}`;
}

/**
 * Generate a prefixed ID
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}-${generateId()}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate a short ID (6 characters)
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

/**
 * Generate a numeric ID
 */
export function generateNumericId(): number {
  return Date.now() + Math.floor(Math.random() * 1000);
}

/**
 * Check if a string is a valid ID format
 */
export function isValidId(id: string): boolean {
  // Basic validation - contains timestamp and random part
  return /^[a-z0-9]+-[a-z0-9]+$/.test(id);
}

/**
 * Extract timestamp from ID
 */
export function getTimestampFromId(id: string): Date | null {
  const parts = id.split('-');
  if (parts.length < 1) return null;
  
  try {
    const timestamp = parseInt(parts[0], 36);
    return new Date(timestamp);
  } catch {
    return null;
  }
}
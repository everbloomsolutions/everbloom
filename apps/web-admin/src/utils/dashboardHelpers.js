/**
 * Dashboard Helper Utilities
 * Shared helper functions and constants for dashboard components
 */

// Constants for display limits
export const DISPLAY_LIMITS = {
  TIMELINE_COLLECTIONS: 10,
  SUMMARY_COLLECTIONS: 5,
  RECENT_COLLECTIONS: 8,
  RECENT_USERS: 9,
  ASSIGNED_LOCATIONS: 6,
  ACTIVE_LOCATIONS: 9,
};

/**
 * Safely get collections array from recent data
 * @param {Object} recentData - Recent data object
 * @returns {Array} Collections array
 */
export const getCollections = (recentData) => {
  return recentData?.recentCollections || [];
};

/**
 * Check if collections exist and have items
 * @param {Object} recentData - Recent data object
 * @returns {boolean} True if collections exist and have items
 */
export const hasCollections = (recentData) => {
  const collections = getCollections(recentData);
  return collections && collections.length > 0;
};

/**
 * Get change indicator props for displaying growth/decline
 * Components should use this to get the icon name and styling
 * @param {number} change - Percentage change value
 * @returns {Object|null} Change indicator props or null
 */
export const getChangeIndicatorProps = (change) => {
  if (!change && change !== 0) return null;
  const isPositive = change >= 0;
  return {
    iconName: isPositive ? 'ArrowUp' : 'ArrowDown',
    color: isPositive ? 'text-green-600' : 'text-red-600',
    value: Math.abs(change).toFixed(1),
  };
};

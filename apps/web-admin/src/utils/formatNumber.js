/**
 * Format number with locale-specific formatting
 * @param {number} value - The number to format
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 2) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  return Number(value).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

export default formatNumber;

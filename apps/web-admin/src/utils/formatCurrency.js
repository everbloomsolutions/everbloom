/**
 * Format currency amount to Indian Rupee format
 * @param {number} amount - The amount to format
 * @param {object} options - Formatting options
 * @param {number} options.maximumFractionDigits - Maximum decimal places (default: 0)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, options = {}) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0';
  }
  
  const { maximumFractionDigits = 0 } = options;
  return `₹${Number(amount).toLocaleString('en-IN', { maximumFractionDigits })}`;
};

export default formatCurrency;

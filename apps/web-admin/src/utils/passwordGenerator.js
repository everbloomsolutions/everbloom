/**
 * Generate a secure random password
 * @param {Object} options - Password generation options
 * @param {number} options.length - Password length (default: 12)
 * @param {boolean} options.includeUppercase - Include uppercase letters
 * @param {boolean} options.includeLowercase - Include lowercase letters
 * @param {boolean} options.includeNumbers - Include numbers
 * @param {boolean} options.includeSymbols - Include special characters
 * @returns {string} Generated password
 */
export const generatePassword = (options = {}) => {
  const {
    length = 12,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';

  let charset = '';
  if (includeUppercase) charset += uppercase;
  if (includeLowercase) charset += lowercase;
  if (includeNumbers) charset += numbers;
  if (includeSymbols) charset += symbols;

  if (!charset) {
    throw new Error('At least one character type must be included');
  }

  let password = '';
  
  // Ensure at least one character from each selected type
  if (includeUppercase) {
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
  }
  if (includeLowercase) {
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
  }
  if (includeNumbers) {
    password += numbers[Math.floor(Math.random() * numbers.length)];
  }
  if (includeSymbols) {
    password += symbols[Math.floor(Math.random() * symbols.length)];
  }

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Calculate password strength score
 * @param {string} password - Password to evaluate
 * @returns {Object} Strength score and feedback
 */
export const getPasswordStrength = (password) => {
  if (!password) {
    return { score: 0, strength: 'Very Weak', feedback: [] };
  }

  let score = 0;
  const feedback = [];

  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');

  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Add lowercase letters');

  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Add uppercase letters');

  if (/\d/.test(password)) score += 1;
  else feedback.push('Add numbers');

  if (/[!@#$%&*]/.test(password)) score += 1;
  else feedback.push('Add special characters');

  const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'][score];

  return { score, strength, feedback };
};


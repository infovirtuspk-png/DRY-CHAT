const crypto = require('crypto');

/**
 * Generate a cryptographically secure 13-digit candidate User ID.
 * First digit is 1-9, remaining 12 digits are 0-9.
 * Format: 1038472916502 (exactly 13 digits).
 */
function generate13DigitIdCandidate() {
  // First digit: 1 to 9
  const firstDigit = (crypto.randomInt(1, 10)).toString();
  
  // Remaining 12 digits
  let remainingDigits = '';
  for (let i = 0; i < 12; i++) {
    remainingDigits += (crypto.randomInt(0, 10)).toString();
  }
  
  return firstDigit + remainingDigits;
}

/**
 * Validate 13-digit Dry Chat User ID format.
 */
function isValid13DigitId(id) {
  if (typeof id !== 'string') return false;
  return /^[1-9]\d{12}$/.test(id);
}

/**
 * Generate unique 13-digit ID with collision check against local SQLite and Firebase.
 * @param {Function} checkCollisionFn - async (id) => boolean (true if exists/collision)
 * @param {number} maxRetries - Maximum retry attempts
 */
async function generateUnique13DigitId(checkCollisionFn, maxRetries = 10) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const candidate = generate13DigitIdCandidate();
    
    // Check if ID collision function is provided
    if (typeof checkCollisionFn === 'function') {
      const isTaken = await checkCollisionFn(candidate);
      if (!isTaken) {
        return candidate;
      }
    } else {
      return candidate;
    }
  }
  
  throw new Error('Failed to generate unique 13-digit User ID after maximum retry attempts.');
}

module.exports = {
  generate13DigitIdCandidate,
  isValid13DigitId,
  generateUnique13DigitId
};

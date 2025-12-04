const { customAlphabet } = require('nanoid');

// Generate a 6-digit numeric code
const generateSessionCode = customAlphabet('1234567890', 6);

// Generate a unique PRN (Permanent Registration Number)
const generatePRN = () => {
  const prefix = 'PRN';
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${year}${random}`;
};

module.exports = {
  generateSessionCode,
  generatePRN
}; 
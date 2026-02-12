/**
 * Currency utility functions
 */

// Cache for exchange rate (valid for 1 hour)
let exchangeRateCache = {
  rate: null,
  timestamp: null,
  expiry: 60 * 60 * 1000 // 1 hour in milliseconds
};

/**
 * Detect user's country from IP address
 * @returns {Promise<string>} Country code (e.g., 'IN' for India, 'US' for USA)
 */
export const detectUserCountry = async () => {
  try {
    // Using ipapi.co free API (no API key needed for basic usage)
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data && data.country_code) {
      return data.country_code.toUpperCase();
    }
    
    // Fallback to ip-api.com if first fails
    const fallbackResponse = await fetch('http://ip-api.com/json/');
    const fallbackData = await fallbackResponse.json();
    
    if (fallbackData && fallbackData.countryCode) {
      return fallbackData.countryCode.toUpperCase();
    }
    
    return null;
  } catch (error) {
    console.error('Error detecting user country:', error);
    return null;
  }
};

/**
 * Fetch USD to INR exchange rate
 * @returns {Promise<number>} Exchange rate (1 USD = X INR)
 */
export const fetchUSDToINR = async () => {
  // Check cache first
  const now = Date.now();
  if (exchangeRateCache.rate && exchangeRateCache.timestamp) {
    const age = now - exchangeRateCache.timestamp;
    if (age < exchangeRateCache.expiry) {
      return exchangeRateCache.rate;
    }
  }

  try {
    // Using exchangerate-api.com free API (no API key needed)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    
    if (data && data.rates && data.rates.INR) {
      const rate = data.rates.INR;
      // Update cache
      exchangeRateCache.rate = rate;
      exchangeRateCache.timestamp = now;
      return rate;
    }
    
    // Fallback rate if API fails
    const fallbackRate = 83; // Approximate fallback rate
    exchangeRateCache.rate = fallbackRate;
    exchangeRateCache.timestamp = now;
    return fallbackRate;
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    // Return cached rate if available, otherwise fallback
    if (exchangeRateCache.rate) {
      return exchangeRateCache.rate;
    }
    return 83; // Approximate fallback rate
  }
};

/**
 * Format price based on currency
 * @param {number} price - Price in USD
 * @param {string} currency - Currency code ('INR' or 'USD')
 * @param {number} exchangeRate - USD to INR exchange rate
 * @returns {string} Formatted price string
 */
export const formatPrice = (price, currency, exchangeRate = 83) => {
  if (!price && price !== 0) return '';
  
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return '';
  
  if (currency === 'INR') {
    const inrPrice = numPrice * exchangeRate;
    // Round up to nearest integer
    const roundedPrice = Math.ceil(inrPrice);
    return `₹${roundedPrice}`;
  }
  
  // Round up to nearest integer
  const roundedPrice = Math.ceil(numPrice);
  return `$${roundedPrice}`;
};

/**
 * Format price range based on currency
 * @param {number} min - Minimum price in USD
 * @param {number} max - Maximum price in USD
 * @param {string} currency - Currency code ('INR' or 'USD')
 * @param {number} exchangeRate - USD to INR exchange rate
 * @returns {string} Formatted price range string
 */
export const formatPriceRange = (min, max, currency, exchangeRate = 83) => {
  if (min === max) {
    return formatPrice(min, currency, exchangeRate);
  }
  
  if (currency === 'INR') {
    const inrMin = min * exchangeRate;
    const inrMax = max * exchangeRate;
    // Round up to nearest integer
    const roundedMin = Math.ceil(inrMin);
    const roundedMax = Math.ceil(inrMax);
    return `₹${roundedMin} - ₹${roundedMax}`;
  }
  
  // Round up to nearest integer
  const roundedMin = Math.ceil(min);
  const roundedMax = Math.ceil(max);
  return `$${roundedMin} - $${roundedMax}`;
};

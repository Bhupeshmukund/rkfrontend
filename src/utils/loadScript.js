/**
 * Utility function to dynamically load external scripts
 * Prevents duplicate loading and handles errors gracefully
 * 
 * @param {string} src - The script source URL
 * @param {Object} options - Optional configuration
 * @param {string} options.id - Unique ID for the script tag (prevents duplicates)
 * @param {boolean} options.async - Load script asynchronously
 * @param {boolean} options.defer - Defer script execution
 * @param {string} options.referrerPolicy - Referrer policy for the script
 * @returns {Promise<void>} - Resolves when script is loaded, rejects on error
 */
export const loadScript = (src, options = {}) => {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    const scriptId = options.id || `script-${src.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const existingScript = document.getElementById(scriptId);
    
    if (existingScript) {
      // Script already exists, check if it's loaded
      if (existingScript.dataset.loaded === 'true') {
        resolve();
        return;
      }
      // Script is loading, wait for it
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)));
      return;
    }

    // Create new script element
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = src;
    script.async = options.async !== false; // Default to async
    script.defer = options.defer || false;
    
    if (options.referrerPolicy) {
      script.referrerPolicy = options.referrerPolicy;
    }

    // Handle script load
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };

    // Handle script error
    script.onerror = () => {
      script.remove();
      reject(new Error(`Failed to load script: ${src}`));
    };

    // Append to head
    document.head.appendChild(script);
  });
};

/**
 * Check if a script is already loaded by checking for a global variable
 * 
 * @param {string} globalVar - The global variable name to check (e.g., 'Razorpay', 'tinymce')
 * @returns {boolean} - True if the global variable exists
 */
export const isScriptLoaded = (globalVar) => {
  return typeof window[globalVar] !== 'undefined';
};

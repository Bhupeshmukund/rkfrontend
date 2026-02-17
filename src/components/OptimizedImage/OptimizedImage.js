import React from 'react';

/**
 * OptimizedImage component for responsive images with WebP support and lazy loading
 * 
 * @param {string} src - Source image path (will be converted to .webp)
 * @param {string} alt - Alt text for accessibility
 * @param {string} className - CSS class name
 * @param {boolean} eager - If true, loads image immediately (for LCP images)
 * @param {string} sizes - Sizes attribute for responsive images
 * @param {Object} srcSet - Object with breakpoints and widths for srcSet
 * @param {number} width - Image width (for aspect ratio)
 * @param {number} height - Image height (for aspect ratio)
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  eager = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  srcSet = null,
  width = null,
  height = null,
  ...props 
}) => {
  // Convert source to WebP
  const getWebPSrc = (originalSrc) => {
    if (!originalSrc) return '';
    // If it's already a URL or data URI, return as is
    if (originalSrc.startsWith('http') || originalSrc.startsWith('data:')) {
      return originalSrc;
    }
    // Convert to WebP
    return originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  };

  // Get fallback (original format)
  const getFallbackSrc = (originalSrc) => {
    if (!originalSrc) return '';
    if (originalSrc.startsWith('http') || originalSrc.startsWith('data:')) {
      return originalSrc;
    }
    return originalSrc;
  };

  const webpSrc = getWebPSrc(src);
  const fallbackSrc = getFallbackSrc(src);

  // Generate srcSet if provided
  const generateSrcSet = () => {
    if (srcSet) {
      return Object.entries(srcSet)
        .map(([width, src]) => `${getWebPSrc(src)} ${width}w`)
        .join(', ');
    }
    return undefined;
  };

  const webpSrcSet = generateSrcSet();
  const fallbackSrcSet = srcSet 
    ? Object.entries(srcSet)
        .map(([width, src]) => `${getFallbackSrc(src)} ${width}w`)
        .join(', ')
    : undefined;

  return (
    <picture>
      {/* WebP source with srcSet if provided */}
      {webpSrcSet ? (
        <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />
      ) : (
        <source srcSet={webpSrc} type="image/webp" />
      )}
      
      {/* Fallback for older browsers */}
      {fallbackSrcSet ? (
        <source srcSet={fallbackSrcSet} sizes={sizes} />
      ) : null}
      
      {/* Fallback img tag */}
      <img
        src={fallbackSrc}
        alt={alt}
        className={className}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={width}
        height={height}
        {...props}
      />
    </picture>
  );
};

export default OptimizedImage;

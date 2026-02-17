import React, { Suspense, lazy, useEffect, useState } from 'react';
import { loadScript, isScriptLoaded } from '../../utils/loadScript';

// TinyMCE CDN URL - loaded dynamically to prevent render-blocking
const TINYMCE_CDN_URL = 'https://cdn.tiny.cloud/1/aum1fhvek0kzlq6qt5j8je4qoc355t3pas1yjl4n20smdsfj/tinymce/6/tinymce.min.js';

// Lazy load TinyMCE Editor React component to reduce initial bundle size
const Editor = lazy(() => import('@tinymce/tinymce-react').then(module => ({ default: module.Editor })));

const LazyTinyMCE = (props) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState(null);

  useEffect(() => {
    // Check if TinyMCE is already loaded
    if (isScriptLoaded('tinymce')) {
      setScriptLoaded(true);
      return;
    }

    // Load TinyMCE CDN script dynamically
    loadScript(TINYMCE_CDN_URL, {
      id: 'tinymce-script',
      async: true,
      referrerPolicy: 'origin'
    })
      .then(() => {
        setScriptLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load TinyMCE script:', error);
        setScriptError(error.message);
      });
  }, []);

  // Show loading state while script is loading
  if (!scriptLoaded) {
    return (
      <div style={{ 
        minHeight: '220px', 
        border: '1px solid #d1d5db', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#666',
        backgroundColor: '#f9fafb'
      }}>
        {scriptError ? (
          <div style={{ textAlign: 'center', color: '#dc3545' }}>
            <p>Failed to load editor</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>{scriptError}</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '8px' }}>Loading editor...</div>
            <div style={{ fontSize: '12px', color: '#999' }}>Please wait</div>
          </div>
        )}
      </div>
    );
  }

  // Once script is loaded, render the editor component
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '220px', 
        border: '1px solid #d1d5db', 
        borderRadius: '8px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#666',
        backgroundColor: '#f9fafb'
      }}>
        Initializing editor...
      </div>
    }>
      <Editor {...props} />
    </Suspense>
  );
};

export default LazyTinyMCE;

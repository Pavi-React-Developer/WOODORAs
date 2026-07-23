import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export default function DeviceViewport({ children, mode }) {
  const iframeRef = useRef(null);
  const [mountNode, setMountNode] = useState(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    const setupIframe = () => {
      const head = doc.head || doc.querySelector('head') || doc.appendChild(doc.createElement('head'));
      const body = doc.body || doc.querySelector('body') || doc.appendChild(doc.createElement('body'));

      // Clear existing content to prevent duplication
      head.innerHTML = '';
      body.innerHTML = '';

      // Copy all styles from parent to iframe
      const parentHead = document.head || document.querySelector('head');
      if (parentHead && typeof parentHead.querySelectorAll === 'function') {
        const styles = parentHead.querySelectorAll('style, link[rel="stylesheet"]');
        styles.forEach(style => {
          head.appendChild(style.cloneNode(true));
        });
      }

      // Basic resets for iframe body
      const reset = doc.createElement('style');
      reset.innerHTML = `
        body { margin: 0; padding: 0; overflow-x: hidden; background: transparent; }
        /* Hide scrollbar for mobile/tablet inside the device frame, but keep it for desktop if needed */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `;
      head.appendChild(reset);

      // Create a mount point
      const root = doc.createElement('div');
      root.id = 'preview-root';
      body.appendChild(root);
      setMountNode(root);
    };

    if (doc.readyState === 'complete' && (doc.head || doc.body)) {
      setupIframe();
    } else {
      iframe.addEventListener('load', setupIframe);
    }

    // Observe parent head for dynamically injected styles (e.g. Vite HMR)
    const parentHead = document.head || document.querySelector('head');
    let observer = null;
    if (parentHead) {
      observer = new MutationObserver((mutations) => {
          mutations.forEach(mutation => {
              mutation.addedNodes.forEach(node => {
                  if (node.tagName === 'STYLE' || (node.tagName === 'LINK' && node.rel === 'stylesheet')) {
                      if (iframeRef.current?.contentDocument) {
                          const targetHead = iframeRef.current.contentDocument.head || iframeRef.current.contentDocument.querySelector('head');
                          if (targetHead) targetHead.appendChild(node.cloneNode(true));
                      }
                  }
              });
          });
      });
      observer.observe(parentHead, { childList: true });
    }

    return () => {
        iframe.removeEventListener('load', setupIframe);
        if (observer) observer.disconnect();
    };
  }, []);

  const width = mode === 'desktop' ? '1200px' : mode === 'tablet' ? '768px' : '390px';
  const height = mode === 'desktop' ? '100%' : '100%';

  return (
    <iframe
      ref={iframeRef}
      style={{
        width,
        height,
        border: 'none',
        display: 'block',
        backgroundColor: '#fff',
      }}
      title="Preview Viewport"
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export const normalizeImageValue = (image) => {
  if (!image) return null;

  if (typeof image === 'string') return image;

  if (typeof image === 'object') {
    if (typeof image.url === 'string') return image.url;
    if (typeof image.path === 'string') return image.path;
    if (Array.isArray(image)) {
      for (const entry of image) {
        const normalized = normalizeImageValue(entry);
        if (normalized) return normalized;
      }
    }
  }

  return null;
};

export const getImageSrc = (image, fallback = '') => {
  const normalized = normalizeImageValue(image);

  if (!normalized) return fallback;
  if (normalized.startsWith('http') || normalized.startsWith('data:')) return normalized;
  if (normalized.startsWith('/uploads') || normalized.startsWith('uploads/')) {
    return `${API_BASE_URL}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  }

  return normalized;
};

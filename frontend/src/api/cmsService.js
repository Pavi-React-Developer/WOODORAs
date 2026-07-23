const BASE = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/cms`;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
};

const request = async (url, options = {}) => {
  const res = await fetch(url, { ...options, headers: { ...getAuthHeaders(), ...(options.headers || {}) } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// Multipart (image upload) request
const requestForm = async (url, formData, method = 'POST') => {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(url, { method, headers, body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Upload failed');
  return data;
};

export const cmsService = {
  // Navbar
  getNavbar: () => request(`${BASE}/navbar`),
  updateNavbar: (body) => request(`${BASE}/navbar`, { method: 'PUT', body: JSON.stringify(body) }),

  // Hero Banner
  getHeroBanners: () => request(`${BASE}/hero`),
  createHeroBanner: (body) => request(`${BASE}/hero`, { method: 'POST', body: JSON.stringify(body) }),
  updateHeroBanner: (id, body) => request(`${BASE}/hero/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteHeroBanner: (id) => request(`${BASE}/hero/${id}`, { method: 'DELETE' }),

  // Third Banner
  getThirdBanners: () => request(`${BASE}/third-banner`),
  createThirdBanner: (body) => request(`${BASE}/third-banner`, { method: 'POST', body: JSON.stringify(body) }),
  updateThirdBanner: (id, body) => request(`${BASE}/third-banner/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteThirdBanner: (id) => request(`${BASE}/third-banner/${id}`, { method: 'DELETE' }),

  // Product Grid
  getProductGrids: () => request(`${BASE}/product-grid`),
  createProductGrid: (body) => request(`${BASE}/product-grid`, { method: 'POST', body: JSON.stringify(body) }),
  updateProductGrid: (id, body) => request(`${BASE}/product-grid/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProductGrid: (id) => request(`${BASE}/product-grid/${id}`, { method: 'DELETE' }),

  // Category Grid
  getCategoryGrids: () => request(`${BASE}/category-grid`),
  createCategoryGrid: (body) => request(`${BASE}/category-grid`, { method: 'POST', body: JSON.stringify(body) }),
  updateCategoryGrid: (id, body) => request(`${BASE}/category-grid/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteCategoryGrid: (id) => request(`${BASE}/category-grid/${id}`, { method: 'DELETE' }),

  // Footer
  getFooter: () => request(`${BASE}/footer`),
  updateFooter: (body) => request(`${BASE}/footer`, { method: 'PUT', body: JSON.stringify(body) }),

  // Layout
  getLayout: () => request(`${BASE}/layout`),


  // Image Upload (uses existing catalog upload endpoint)
  uploadImages: (files) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('images', f));
    const uploadUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/catalog/upload`;
    return requestForm(uploadUrl, formData);
  },
};

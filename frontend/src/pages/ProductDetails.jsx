import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productV2API, subCategoryV2API } from '../api/catalogV2Service';
import ProductReviewSection from '../components/ProductReviewSection';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import { IoLeaf } from 'react-icons/io5';
import { FaWhatsapp } from 'react-icons/fa';

const finishOptions = ['Natural Maple', 'Oak Tint'];
const featureBullets = [
  '100% solid maple FSC-certified wood',
  'Water-based, non-toxic sealant',
  'Hand-finished for safe smooth edges',
  'Designed for lasting open-ended play',
];

const ProductImageZoom = ({ src, alt }) => {
  const [showZoom, setShowZoom] = useState(false);
  const [lensState, setLensState] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [bgState, setBgState] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const imgRef = useRef(null);

  const ZOOM_LEVEL = 2.5;

  const handleMouseMove = (e) => {
    if (!imgRef.current) return;
    const { left, top, width, height } = imgRef.current.getBoundingClientRect();
    
    const zoomWinW = 500;
    const zoomWinH = 500;

    const bgW = width * ZOOM_LEVEL;
    const bgH = height * ZOOM_LEVEL;

    const lensW = Math.min(zoomWinW / ZOOM_LEVEL, width);
    const lensH = Math.min(zoomWinH / ZOOM_LEVEL, height);

    let x = e.clientX - left;
    let y = e.clientY - top;

    let lensX = x - lensW / 2;
    let lensY = y - lensH / 2;

    if (lensX < 0) lensX = 0;
    if (lensY < 0) lensY = 0;
    if (lensX > width - lensW) lensX = width - lensW;
    if (lensY > height - lensH) lensY = height - lensH;

    setLensState({ x: lensX, y: lensY, w: lensW, h: lensH });
    setBgState({ 
      x: -(lensX * ZOOM_LEVEL), 
      y: -(lensY * ZOOM_LEVEL), 
      w: bgW, 
      h: bgH
    });
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-white rounded-[2rem]">
      {/* Mobile view (no zoom) */}
      <img src={src} alt={alt} className="w-full h-auto max-h-[460px] object-cover md:hidden rounded-[2rem]" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />

      {/* Desktop view (with zoom) */}
      <div 
        className="hidden md:block relative w-full h-full cursor-crosshair group rounded-[2rem] overflow-hidden"
        onMouseEnter={() => setShowZoom(true)}
        onMouseLeave={() => setShowZoom(false)}
        onMouseMove={handleMouseMove}
      >
        <img ref={imgRef} src={src} alt={alt} className="w-full h-auto max-h-[460px] object-cover rounded-[2rem]" onError={(e) => { e.target.src = '/wood-placeholder.png'; }} />
        
        {showZoom && (
          <div 
            className="absolute bg-white/30 border border-[#AA7327]/50 pointer-events-none"
            style={{
              left: lensState.x,
              top: lensState.y,
              width: lensState.w,
              height: lensState.h,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.15)'
            }}
          />
        )}
      </div>

      {/* Zoomed Result Window */}
      {showZoom && (
        <div 
          className="hidden lg:block absolute top-0 left-[calc(100%+40px)] w-[500px] h-[500px] bg-white z-[9999] border border-gray-200 shadow-2xl overflow-hidden rounded-2xl pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundPosition: `${bgState.x}px ${bgState.y}px`,
            backgroundSize: `${bgState.w}px ${bgState.h}px`,
            backgroundRepeat: 'no-repeat'
          }}
        />
      )}
    </div>
  );
};
const certifications = ['EN71 Certified', 'ASTM F963', 'CPSC Compliant'];
const relatedProducts = [
  { title: 'Building Blocks', price: '₹42.00' },
  { title: 'Pull Along Friend', price: '₹28.00' },
  { title: 'Earth Play Silks', price: '₹18.00' },
  { title: 'Modern Shape Sorter', price: '₹48.00' },
];

const formatFieldLabel = (key) => {
  if (key === '_id') return 'ID';
  if (key === 'sku') return 'SKU';
  if (key === 'hsnCode') return 'HSN Code';
  if (key === 'shortDescription') return 'Short Description';
  if (key === 'createdAt') return 'Created At';
  if (key === 'updatedAt') return 'Updated At';
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (str) => str.toUpperCase());
};

const formatFieldValue = (value, key) => {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';

  if (key === 'price' || key === 'compareAtPrice' || key === 'costPrice') {
    return typeof value === 'number' ? `₹${value.toFixed(2)}` : value.toString();
  }

  if ((key === 'createdAt' || key === 'updatedAt') && typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  if (key === 'dimensions' && typeof value === 'object' && value !== null) {
    const { length, width, height } = value;
    if ([length, width, height].every((dim) => dim !== undefined && dim !== null)) {
      return `${length} x ${width} x ${height}`;
    }
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '-';
    const primitive = value.every((v) => typeof v !== 'object' || v === null);
    if (primitive) return value.join(', ');

    const names = value
      .map((v) => {
        if (!v || typeof v !== 'object') return v;
        if (v.name) return v.name;
        if (v.value) return v.value;
        if (v.slug) return v.slug;
        if (v._id) return v._id;
        return JSON.stringify(v);
      })
      .filter(Boolean);
    return names.join(', ') || JSON.stringify(value);
  }

  if (typeof value === 'object') {
    if (key === 'category' && value.name) return value.name;
    if (key === 'subCategory' && value.name) return value.name;
    if (value.name) return value.name;
    if (value.slug) return value.slug;
    if (value._id) return value._id;
    return JSON.stringify(value);
  }

  return value.toString();
};

const formatAttributeValue = (attributeValue) => {
  if (!attributeValue) return ['-'];
  if (Array.isArray(attributeValue.values) && attributeValue.values.length > 0) {
    return attributeValue.values.map((value) => value?.toString?.() ?? String(value));
  }
  if (attributeValue.value !== undefined && attributeValue.value !== null && attributeValue.value !== '') {
    return [attributeValue.value.toString()];
  }
  if (attributeValue.numericValue !== undefined && attributeValue.numericValue !== null) {
    return [attributeValue.numericValue.toString()];
  }
  if (attributeValue.dateValue) {
    const date = new Date(attributeValue.dateValue);
    return [Number.isNaN(date.getTime()) ? attributeValue.dateValue.toString() : date.toLocaleDateString()];
  }
  if (attributeValue.booleanValue !== undefined && attributeValue.booleanValue !== null) {
    return [attributeValue.booleanValue ? 'Yes' : 'No'];
  }

  if (Array.isArray(attributeValue)) {
    return attributeValue.map((item) => item?.toString?.() ?? String(item));
  }

  if (attributeValue?.value) {
    return [attributeValue.value.toString()];
  }

  return ['-'];
};

const getAttributeValues = (attribute) => {
  if (!attribute) return ['-'];
  if (Array.isArray(attribute.values) && attribute.values.length > 0) {
    return attribute.values.map((value) => value?.toString?.() ?? String(value));
  }
  if (attribute.value !== undefined && attribute.value !== null && attribute.value !== '') {
    return [attribute.value.toString()];
  }
  if (attribute.numericValue !== undefined && attribute.numericValue !== null) {
    return [attribute.numericValue.toString()];
  }
  if (attribute.dateValue) {
    const date = new Date(attribute.dateValue);
    return [Number.isNaN(date.getTime()) ? attribute.dateValue.toString() : date.toLocaleDateString()];
  }
  if (attribute.booleanValue !== undefined && attribute.booleanValue !== null) {
    return [attribute.booleanValue ? 'Yes' : 'No'];
  }
  return ['-'];
};

const buildProductFieldKeys = (product) => {
  if (!product || typeof product !== 'object') return [];

  const displayOrder = [
    '_id',
    'sku',
    'category',
    'subCategory',
    'shortDescription',
    'description',
    'price',
    'compareAtPrice',
    'ageGroup',
    'toyType',
    'woodType',
    'materialType',
    'skillDevelopment',
    'theme',
    'warranty',
    'returnPolicy',
    'additionalInfo',
    'barcode',
    'costPrice',
    'taxPercent',
    'hsnCode',
    'shippingWeight',
    'shippingClass',
    'dimensions',
    'minOrderQty',
    'maxOrderQty',
    'lowStockAlert',
    'isFeatured',
    'isBestSeller',
    'isNewArrival',
    'isRecommended',
    'metaKeywords',
    'tags',
    'relatedProducts',
    'crossSellProducts',
    'upSellProducts',
    'variants',
    'inventory',
    'attributes',
    'createdBy',
    'updatedBy',
    'createdAt',
    'updatedAt',
    'isActive',
    'isArchived',
    'isDeleted',
    'deletedAt',
  ];

  const excludedFields = new Set(['images', 'image', '__v']);
  const rawKeys = Object.keys(product).filter((key) => !excludedFields.has(key));

  return [
    ...displayOrder.filter((key) => rawKeys.includes(key)),
    ...rawKeys.filter((key) => !displayOrder.includes(key)),
  ];
};

// Get custom additional fields (excluding predefined tab fields)
const getCustomAdditionalInfo = (product) => {
  if (!Array.isArray(product?.additionalInfo)) return [];

  const predefinedKeys = new Set([
    'why play',
    'how play',
    'details',
    'description',
  ].map(k => k.toLowerCase()));

  return product.additionalInfo.filter(
    info => info.key && !predefinedKeys.has(info.key.toLowerCase())
  );
};

const getPricingInfo = (product = {}, variant = null) => {
  const source = variant || product;
  const listPrice = Number(
    source.compareAtPrice ?? source.basePrice ?? source.effectivePrice ?? source.price ?? product.compareAtPrice ?? product.price ?? 0
  );
  const salePriceCandidate = source.discountPrice !== null && source.discountPrice !== undefined && source.discountPrice !== ''
    ? Number(source.discountPrice)
    : NaN;
  const salePrice = Number.isFinite(salePriceCandidate) && salePriceCandidate > 0
    ? salePriceCandidate
    : Number(source.basePrice ?? source.effectivePrice ?? source.price ?? product.price ?? 0);
  const effectiveListPrice = listPrice > 0 ? listPrice : salePrice;
  const hasDiscount = salePrice > 0 && effectiveListPrice > 0 && salePrice < effectiveListPrice;
  const discountPercent = hasDiscount ? Math.round((1 - salePrice / effectiveListPrice) * 100) : 0;

  return {
    salePrice,
    listPrice: effectiveListPrice,
    hasDiscount,
    discountPercent,
  };
};

const getRecommendationProducts = (productData, fallbackProducts = []) => {
  if (!productData) return Array.isArray(fallbackProducts) ? fallbackProducts.slice(0, 4) : [];

  const related = [
    ...(Array.isArray(productData.relatedProducts) ? productData.relatedProducts : []),
    ...(Array.isArray(productData.crossSellProducts) ? productData.crossSellProducts : []),
    ...(Array.isArray(productData.upSellProducts) ? productData.upSellProducts : []),
  ];

  const uniqueMap = new Map();
  for (const item of related) {
    if (item && item._id) {
      uniqueMap.set(String(item._id), item);
    }
  }

  const uniqueRelated = [...uniqueMap.values()];
  if (uniqueRelated.length > 0) {
    return uniqueRelated.slice(0, 4);
  }

  if (!Array.isArray(fallbackProducts)) return [];
  return fallbackProducts.filter((p) => p?._id !== productData._id).slice(0, 4);
};

// Build attribute options map from variant options (source of truth)
// Returns: { [attributeName]: Set<value> }
const buildAttributeOptionsFromVariants = (product) => {
  const map = {};
  if (!product?.variants) return map;
  for (const variant of product.variants) {
    if (!Array.isArray(variant.options)) continue;
    for (const opt of variant.options) {
      // Try both attribute.name and attributeName for compatibility
      let attrName = opt.attribute?.name || opt.attributeName;
      if (!attrName || opt.value == null) continue;
      attrName = String(attrName).trim(); // Normalize key
      if (!map[attrName]) map[attrName] = new Set();
      map[attrName].add(String(opt.value).trim());
    }
  }
  return map;
};

// Utility function to find matching variant based on selected attributes
// selectedAttributes: { [attributeName]: string (single value) }
const findMatchingVariant = (product, selectedAttributes) => {
  if (!product?.variants || product.variants.length === 0) return null;
  if (!selectedAttributes || Object.keys(selectedAttributes).length === 0) return null;

  const selectedEntries = Object.entries(selectedAttributes).filter(([, v]) => v != null && v !== '');
  if (selectedEntries.length === 0) return null;

  for (const variant of product.variants) {
    if (!variant?.options || !Array.isArray(variant.options)) continue;

    let isMatch = true;
    for (const [attributeLabel, selectedValue] of selectedEntries) {
      const normalizedLabel = String(attributeLabel).trim().toLowerCase();

      const variantOption = variant.options.find((opt) => {
        const attrName = String(opt.attribute?.name || opt.attributeName || '').trim().toLowerCase();
        return attrName === normalizedLabel;
      });

      if (!variantOption || String(variantOption.value).trim().toLowerCase() !== String(selectedValue).trim().toLowerCase()) {
        isMatch = false;
        break;
      }
    }

    if (isMatch) return variant;
  }

  return null;
};

export default function ProductDetails({ product: initialProduct, user, onNavigate, onAddToCart, onBuyNow, onAddToWishlist, onRemoveFromWishlist, wishlistItems = [] }) {
  const { id: routeId } = useParams();
  const productId = initialProduct?._id || initialProduct?.id || routeId;

  const [selectedFinish, setSelectedFinish] = useState(finishOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [zipCode, setZipCode] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);
  const [product, setProduct] = useState(initialProduct || null);
  const [activeTab, setActiveTab] = useState('Description');
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [expandedFields, setExpandedFields] = useState({});
  const [loadingProduct, setLoadingProduct] = useState(!initialProduct && !!productId);
  const [recPrevEl, setRecPrevEl] = useState(null);
  const [recNextEl, setRecNextEl] = useState(null);
  const [recPaginationEl, setRecPaginationEl] = useState(null);
  const LIVE_REFRESH_MS = 8000;

  const isWishlisted = (wishlistItems || []).some((w) => {
    const pId = w.product?._id || w.product || w._id || w;
    const currentPId = product?._id || product?.id;
    return pId && currentPId && String(pId) === String(currentPId);
  }) || product?.isWishlisted;

  useEffect(() => {
    if (!productId) {
      setProduct(initialProduct || null);
      setLoadingProduct(false);
      return;
    }

    let active = true;
    const loadProductData = async ({ showLoader = false } = {}) => {
      if (showLoader) {
        setLoadingProduct(true);
      }

      try {
        const [productResponse, recommendationsResponse] = await Promise.all([
          productV2API.getById(productId),
          productV2API.getAll({ limit: 4, isActive: 'true' })
        ]);

        if (!active) return;

        const productData = productResponse?.product || productResponse;
        if (productData && typeof productData === 'object') {
          setProduct(productData);

          try {
            const recent = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
            const filtered = recent.filter(item => item._id !== productData._id);
            filtered.unshift({
              _id: productData._id,
              name: productData.name,
              price: productData.price,
              basePrice: productData.basePrice,
              salePrice: productData.salePrice,
              discountPrice: productData.discountPrice,
              hasVariants: productData.hasVariants,
              variants: productData.variants,
              averageRating: productData.averageRating,
              reviewCount: productData.reviewCount,
              image: productData.image || (productData.images && productData.images.length > 0 ? productData.images[0] : null)
            });
            localStorage.setItem('recentlyViewed', JSON.stringify(filtered.slice(0, 10)));
          } catch (e) {
            console.error('Failed to save recently viewed', e);
          }
        }

        const fallbackRecommendations = recommendationsResponse?.products || recommendationsResponse?.data || [];
        const recommendationItems = getRecommendationProducts(productData, fallbackRecommendations);
        if (active) {
          setRecommendedProducts(recommendationItems.filter(p => p._id !== productData?._id).slice(0, 4));
        }
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        if (active && showLoader) setLoadingProduct(false);
      }
    };

    loadProductData({ showLoader: true });

    const intervalId = window.setInterval(() => {
      loadProductData();
    }, LIVE_REFRESH_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [productId]);

  const images = useMemo(() => {
    if (!product || typeof product !== 'object') return [];
    const imgs = [];
    const pushImage = (img) => {
      if (!img || (typeof img === 'string' && img.trim() === '')) return;
      if (typeof img === 'string') {
        imgs.push(img);
      } else if (typeof img === 'object' && img.url && img.url.trim() !== '') {
        imgs.push(img.url);
      }
    };

    // Prioritize variant images if variant is selected
    if (selectedVariant?.images && Array.isArray(selectedVariant.images) && selectedVariant.images.length > 0) {
      selectedVariant.images.forEach(pushImage);
    } else {
      // Fall back to product images
      if (Array.isArray(product?.images) && product.images.length) {
        product.images.forEach(pushImage);
      }
      pushImage(product?.image);
    }

    return imgs;
  }, [product, selectedVariant]);

  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    setSelectedImage(images[0] || null);
  }, [images]);

  const categoryName = typeof product?.category === 'object' && product.category !== null
    ? product.category.name
    : product?.category;

  // Build attribute options from variant options (the canonical source of truth)
  // { [attributeName]: string[] }
  const variantAttributeOptions = useMemo(() => {
    const map = buildAttributeOptionsFromVariants(product);
    // Convert Sets to sorted arrays
    return Object.fromEntries(
      Object.entries(map).map(([k, s]) => [k, Array.from(s)])
    );
  }, [product]);

  // Determine attribute names to show. Prefer variant-derived options; fall back to
  // product-level attributeValues if no variants exist.
  const productAttributes = useMemo(() => {
    if (!product || typeof product !== 'object') return [];

    // If we have variant-derived options, use them
    const attrNames = Object.keys(variantAttributeOptions);
    if (attrNames.length > 0) {
      // Return a simplified list compatible with the render loop
      return attrNames.map((name) => ({
        _id: name,
        _isVariantDerived: true,
        attributeName: name,
        values: variantAttributeOptions[name],
      }));
    }

    // Fall back to product-level attributeValues
    if (Array.isArray(product.attributeValues)) return product.attributeValues;
    if (Array.isArray(product.attributes)) return product.attributes;
    return [];
  }, [product, variantAttributeOptions]);

  const [selectedAttributeValues, setSelectedAttributeValues] = useState({});
  const [hasInitializedVariant, setHasInitializedVariant] = useState(false);

  const [subCategoryAttributes, setSubCategoryAttributes] = useState([]);

  useEffect(() => {
    if (!product?.subCategory) return;
    const subCatId = typeof product.subCategory === 'object' ? product.subCategory._id : product.subCategory;
    if (subCatId) {
      subCategoryV2API.getMappedAttributes(subCatId)
        .then(res => {
          const raw = res.mappings || res.data || res || [];
          setSubCategoryAttributes(Array.isArray(raw) ? raw : []);
        })
        .catch(console.error);
    }
  }, [product?.subCategory]);

  const colorMap = useMemo(() => {
    const map = {};
    subCategoryAttributes.forEach(attrMap => {
      const attr = attrMap.attribute || attrMap;
      if (attr?.name?.toLowerCase() === 'color' || attr?.name?.toLowerCase() === 'colour') {
        (attr.values || []).forEach(val => {
          const valName = (val.name || val.value || '').toLowerCase();
          if (val.colorCode) {
            map[valName] = val.colorCode;
          }
        });
      }
    });
    return map;
  }, [subCategoryAttributes]);

  // Reset when product ID changes
  useEffect(() => {
    setHasInitializedVariant(false);
    setSelectedAttributeValues({});
    setSelectedVariant(null);
  }, [product?._id]);

  // Set default variant once product data with variants is loaded
  useEffect(() => {
    if (hasInitializedVariant || loadingProduct) return;
    if (product && typeof product === 'object') {
      // If we don't have variants array but hasVariants is true, we might still be loading.
      // Wait for variants to arrive.
      if (product.hasVariants && (!product.variants || product.variants.length === 0)) {
        return; // wait for full load
      }

      let initialAttributes = {};
      let initialVariant = null;

      if (product.hasVariants && product.variants?.length > 0) {
        initialVariant = product.variants.find(v => v.isActive !== false) || product.variants[0];
        
        if (initialVariant?.options && Array.isArray(initialVariant.options)) {
          initialVariant.options.forEach(opt => {
            const attrName = String(opt.attribute?.name || opt.attributeName || '').trim();
            if (attrName && opt.value != null) {
              initialAttributes[attrName] = String(opt.value).trim();
            }
          });
        }
      }

      // If initialAttributes is still empty (e.g. simple products with product-level attributeValues)
      if (Object.keys(initialAttributes).length === 0) {
        const fallbackAttributes = Array.isArray(product.attributeValues) ? product.attributeValues : (Array.isArray(product.attributes) ? product.attributes : []);
        fallbackAttributes.forEach(attr => {
          const attrName = String(attr.attribute?.name || attr.attributeName || '').trim();
          const values = Array.isArray(attr.values) ? attr.values : (attr.value ? [attr.value] : []);
          if (attrName && values.length > 0) {
            initialAttributes[attrName] = String(values[0]).trim();
          }
        });
      }

      setSelectedAttributeValues(initialAttributes);
      setSelectedVariant(initialVariant);
      setHasInitializedVariant(true);
    }
  }, [product, hasInitializedVariant, loadingProduct]);

  // Single-select per attribute (radio-like). Clicking the same value deselects it.
  const handleToggleAttributeValue = (attributeLabel, value) => {
    setSelectedAttributeValues((prev) => {
      const current = prev[attributeLabel];
      // Deselect if already selected, otherwise select
      const next = current === value ? undefined : value;
      if (next === undefined) {
        const { [attributeLabel]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [attributeLabel]: next };
    });
  };

  // Find matching variant whenever attributes selection changes
  useEffect(() => {
    if (!product) {
      setSelectedVariant(null);
      return;
    }
    const totalAttributes = Object.keys(variantAttributeOptions).length;
    const selectedCount = Object.keys(selectedAttributeValues).length;

    // Only attempt match when all attribute dimensions are selected
    if (totalAttributes > 0 && selectedCount < totalAttributes) {
      setSelectedVariant(null);
      return;
    }

    const matchedVariant = findMatchingVariant(product, selectedAttributeValues);
    setSelectedVariant(matchedVariant || null);

    if (matchedVariant) {
      const variantQty = Math.max(0, (matchedVariant.inventory || 0) - (matchedVariant.reserveStock || 0));
      if (variantQty === 0) {
        toast.error('Out of stock');
      }
    }
  }, [selectedAttributeValues, product, variantAttributeOptions]);

  const descriptionText = useMemo(() => {
    // Use variant-specific description if available, otherwise use product description
    let text;
    if (selectedVariant?.description) {
      text = selectedVariant.description;
    } else if (typeof product?.description === 'string') {
      text = product.description;
    } else if (typeof product?.shortDescription === 'string') {
      text = product.shortDescription;
    } else {
      text = 'Handcrafted wooden toy designed for mindful play, beautiful display, and everyday use.';
    }

    return text;
  }, [product, selectedVariant]);

  const productFieldKeys = useMemo(() => buildProductFieldKeys(product), [product]);

  const handleAction = (type) => {

    // Warn user if attributes are required but not selected
    const totalAttributes = Object.keys(variantAttributeOptions).length;
    if (totalAttributes > 0 && !selectedVariant) {
      toast.error('Please select all required attributes (variant) to continue.');
      return;
    }

    const item = {
      ...product,
      selectedFinish,
      quantity,
      selectedAttributeValues,
      ...(selectedVariant && { selectedVariant })
    };
    if (type === 'Cart') {
      onAddToCart?.(item, quantity, selectedVariant);
    } else if (type === 'Buy') {
      onBuyNow?.(item, quantity, selectedVariant);
    } else {
      onAddToWishlist?.(product, selectedVariant, quantity);
    }
  };

  useEffect(() => {
    // If the component mounted but there's no product at all, and it's not currently loading one, redirect to home.
    if (!product && !initialProduct && !productId && !loadingProduct) {
      onNavigate('/');
    }
  }, [product, initialProduct, productId, loadingProduct, onNavigate]);

  if (loadingProduct) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading product...</div>;
  }

  if (!product) {
    return (
      <section className="min-h-screen bg-slate-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Product not found</h1>
          <p className="mt-4 text-slate-600">The product you requested is no longer available in the catalog.</p>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-slate-800"
          >
            Back to Home
          </button>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-6 px-4 sm:px-6 lg:px-8 bg-[#FDF9F1] min-h-screen font-sans">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <button
              onClick={() => onNavigate('/')}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.35fr_0.9fr] items-start">

            {/* LEFT COLUMN: IMAGES */}
            <div className="space-y-6 min-w-0 w-full relative">
              <div className="rounded-[2rem] bg-white shadow-sm flex items-center justify-center">
                {selectedImage && selectedImage.trim() !== '' ? (
                  <ProductImageZoom src={selectedImage} alt={product.name} />
                ) : (
                  <div className="h-[460px] flex items-center justify-center text-slate-500 overflow-hidden rounded-[2rem]">No image available</div>
                )}
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide snap-x">
                {images.slice(0, 4).map((src, index) => {
                  const isSelected = selectedImage === src;
                  return (
                    <button
                      key={`${src}-${index}`}
                      type="button"
                      onClick={() => setSelectedImage(src)}
                      className={`cursor-pointer overflow-hidden rounded-[1.5rem] border-[3px] transition shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-white snap-start ${isSelected ? 'border-[#AA7327]' : 'border-transparent hover:border-[#AA7327] shadow-sm'
                        }`}
                    >
                      <img
                        src={src}
                        alt={`${product.name} view ${index + 1}`}
                        className="w-full h-full object-cover rounded-[1.2rem]"
                        onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: CONTENT */}
            <div className="relative h-fit min-w-0 w-full sm:pt-2">

              {/* Wishlist and Share absolute top right */}
              <div className="absolute top-0 right-0 flex gap-2 sm:gap-3 z-10">
                <button
                  type="button"
                  onClick={() => {
                    if (isWishlisted) {
                      const index = wishlistItems.findIndex(w => {
                        const pId = w.product?._id || w.product || w._id || w;
                        const currentPId = product?._id || product?.id;
                        return pId && currentPId && String(pId) === String(currentPId);
                      });
                      if (index !== -1 && onRemoveFromWishlist) {
                        onRemoveFromWishlist(index);
                      }
                    } else {
                      handleAction('Wishlist');
                    }
                  }}
                  className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border bg-transparent transition ${isWishlisted
                      ? 'border-red-500 text-red-500'
                      : 'border-[#AA7327] text-[#AA7327] hover:text-[#AA7327] hover:border-[#AA7327]'
                    }`}
                  aria-label="Add to Wishlist"
                  title="Add to Wishlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill={isWishlisted ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSharePopup(true)}
                  className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full border border-[#AA7327] bg-transparent text-[#AA7327] transition hover:text-[#AA7327] hover:border-[#AA7327]"
                  aria-label="Share Product"
                  title="Share"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              {/* Title & Starting From */}
              <div className="pr-24 sm:pr-32">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">{product.category?.name || 'EDUCATIONAL TOYS'}</p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-[#141225] mb-4 leading-tight">{product.name}</h1>

                {/* Reviews */}
                <div className="flex items-center gap-2 text-sm text-[#141225] font-medium mb-6">
                  <div className="flex text-[#F5C518]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`w-4 h-4 ${star <= (product.averageRating || 0) ? 'text-[#F5C518]' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span>({product.reviewCount || 0} Reviews)</span>
                  <span className="text-slate-300">|</span>
                  <span>{product.soldCount > 1000 ? (product.soldCount / 1000).toFixed(1) + 'k+' : (product.soldCount || 0)} Sold</span>
                </div>

                <div className="flex flex-col gap-2 mb-8">
                  {(() => {
                    const priceSource = selectedVariant || (Array.isArray(product?.variants) && product.variants.length === 1 ? product.variants[0] : null) || product;
                    const pricing = getPricingInfo(priceSource);

                    return (
                      <>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-1">
                          {pricing.hasDiscount && (
                            <span className="text-2xl sm:text-3xl text-[#5C2E0E] line-through shrink-0 font-medium tracking-tight opacity-70">
                              ₹{(pricing.listPrice * quantity).toFixed(0)}
                            </span>
                          )}
                          <p className="text-[2.5rem] sm:text-[3rem] font-medium tracking-tight text-[#141225] leading-none">
                            ₹{(pricing.salePrice * quantity).toFixed(0)}
                          </p>
                          {pricing.hasDiscount && (
                            <span className="inline-flex items-center rounded-full bg-[#9B4136] px-3 py-1 text-xs font-bold text-white shrink-0 whitespace-nowrap ml-2">
                              {pricing.discountPercent}% OFF
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#141225] mt-1 font-medium">Inclusive of all taxes</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-6">
                {/* Attributes */}
                {productAttributes.length > 0 && (
                  <div>
                    <div className="grid gap-6">
                      {productAttributes.map((attribute) => {
                        const label = attribute._isVariantDerived
                          ? attribute.attributeName
                          : (attribute.attribute?.name || attribute.attributeName || 'Attribute');
                        const values = attribute._isVariantDerived
                          ? attribute.values
                          : getAttributeValues(attribute);
                        const selectedValue = selectedAttributeValues[label];
                        const isColorAttribute = label.toLowerCase() === 'color' || label.toLowerCase() === 'colour';

                        return (
                          <div key={attribute._id || label}>
                            <p className="text-sm font-semibold text-[#141225] mb-4">Choose {label}</p>
                            <div className="flex flex-wrap gap-4">
                              {values.map((value) => {
                                const isSelected = selectedValue === value;

                                if (isColorAttribute) {
                                  const valKey = value.toLowerCase();
                                  let bgStyle = colorMap[valKey] || valKey.replace(/\s+/g, '');
                                  if (bgStyle === 'natural' && !colorMap[valKey]) bgStyle = '#A67B5B';
                                  if (bgStyle === 'sagegreen' && !colorMap[valKey]) bgStyle = '#839773';
                                  if (bgStyle === 'oceanblue' && !colorMap[valKey]) bgStyle = '#4A7596';
                                  if (bgStyle === 'pastelpink' && !colorMap[valKey]) bgStyle = '#D78B85';
                                  if (bgStyle === 'mustardyellow' && !colorMap[valKey]) bgStyle = '#D49B42';

                                  return (
                                    <div
                                      key={`${label}-${value}`}
                                      className="flex flex-col items-center gap-2 cursor-pointer group w-16"
                                      onClick={() => handleToggleAttributeValue(label, value)}
                                    >
                                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition p-1 ${isSelected
                                          ? 'border-2 border-[#AA7327]'
                                          : 'border-2 border-transparent group-hover:border-[#AA7327]'
                                        }`}>
                                        <div
                                          className="w-full h-full rounded-full border border-black/10"
                                          style={{ backgroundColor: bgStyle }}
                                        />
                                      </div>
                                      <span className="text-[11px] font-medium text-slate-700 text-center leading-tight">{value}</span>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    type="button"
                                    key={`${label}-${value}`}
                                    onClick={() => handleToggleAttributeValue(label, value)}
                                    className={`inline-flex items-center rounded-full px-6 py-2.5 text-sm transition border ${isSelected
                                      ? 'border-[#AA7327] bg-transparent text-[#AA7327] font-medium shadow-sm'
                                      : 'border-slate-300 bg-transparent text-slate-700 hover:border-[#AA7327] hover:text-[#AA7327]'
                                      }`}
                                  >
                                    {value}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Age Group fallback */}
                {productAttributes.length === 0 && product.ageGroup && (
                  <div>
                    <p className="text-sm font-semibold text-[#141225] mb-4">Choose Age Group</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center rounded-full border border-slate-300 bg-transparent px-6 py-2.5 text-sm text-slate-700">
                        {product.ageGroup}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions & Quantity */}
                <div className="pt-2">
                  {(() => {
                    const productVariants = product?.variants || [];
                    const maxAllowedQty = selectedVariant
                      ? Math.max(0, (selectedVariant.inventory || 0) - (selectedVariant.reserveStock || 0))
                      : productVariants.length > 0
                        ? productVariants.reduce((sum, v) => sum + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
                        : (product?.inventory?.stockQuantity || product?.stock || 0);

                    const isOutOfStock = maxAllowedQty === 0;
                    const isVariantRequiredButNotSelected = productAttributes.length > 0 && !selectedVariant;
                    const isDisabled = isOutOfStock || isVariantRequiredButNotSelected;

                    return (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
                          <div className="flex flex-col gap-3">
                            <p className="text-sm font-semibold text-[#141225]">Quantity</p>
                            <div className="inline-flex h-[3.5rem] items-center justify-between rounded-full border border-slate-300 bg-transparent px-2 w-[120px]">
                              <button
                                type="button"
                                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                                disabled={maxAllowedQty === 0}
                                className="flex items-center justify-center w-10 h-full text-slate-500 hover:text-slate-900 disabled:opacity-50"
                              >
                                -
                              </button>
                              <span className="text-[15px] font-medium text-slate-900 w-6 text-center">{maxAllowedQty === 0 ? 0 : quantity}</span>
                              <button
                                type="button"
                                onClick={() => setQuantity((value) => Math.min(maxAllowedQty, value + 1))}
                                disabled={quantity >= maxAllowedQty || maxAllowedQty === 0}
                                className="flex items-center justify-center w-10 h-full text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              if (isOutOfStock) toast.error('Product is out of stock!');
                              else handleAction('Cart');
                            }}
                            disabled={isVariantRequiredButNotSelected}
                            className={`inline-flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-medium transition ${isDisabled
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-[#6D3D14] text-white hover:bg-[#522c0e]'
                              }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (isOutOfStock) toast.error('Product is out of stock!');
                            else handleAction('Buy');
                          }}
                          disabled={isVariantRequiredButNotSelected}
                          className={`inline-flex h-[3.5rem] w-full items-center justify-center rounded-full px-6 text-[15px] font-medium transition border ${isDisabled
                            ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                            : 'bg-transparent text-[#141225] border-slate-300 hover:border-[#141225]'
                            }`}
                        >
                          Buy Now
                        </button>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* --- TABS MOVED TO BOTTOM --- */}
          {(() => {
            const customFields = getCustomAdditionalInfo(product);
            const displayFields = [...customFields];
            if (product.materialType) {
              displayFields.unshift({ key: 'Materials', value: product.materialType });
            }

            const extraTabNames = displayFields.map(f => f.key);
            const tabsArray = ['Description', ...extraTabNames];

            return (
              <div className="mt-16 bg-[#F6F1E5] rounded-3xl p-6 md:p-8">
                <div className="flex flex-wrap gap-4 justify-around border-b border-[#EADFCB] pb-4">
                  {tabsArray.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex items-center gap-2 px-6 py-3 text-[15px] font-semibold transition-colors ${isActive
                          ? 'text-[#141225] border-b-2 border-[#141225]'
                          : 'text-[#666666] hover:text-[#141225]'
                          }`}
                      >
                        {/* We use a generic icon since we don't have the specific SVGs for all dynamic tabs */}
                        <svg className="w-5 h-5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <div className="pt-8 pb-4 text-sm md:text-base leading-relaxed text-slate-700 max-w-5xl mx-auto">
                  {activeTab === 'Description' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-[#A97225] mb-4 text-lg md:text-xl md:text-left">About {product.name}</h3>
                      <p className="text-slate-600 leading-relaxed">{descriptionText}</p>
                    </div>
                  )}

                  {/* Dynamic Custom Tabs Content */}
                  {displayFields.map((field) => (
                    activeTab === field.key && (
                      <div key={field.key} className="whitespace-pre-line">
                        <h3 className="font-bold text-[#A97225] mb-4 text-lg md:text-xl md:text-left">{field.key}</h3>
                        <p className="text-slate-600 leading-relaxed">{field.value}</p>
                      </div>
                    )
                  ))}
                  {activeTab === 'Why Play' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-[#A97225] mb-4 text-lg md:text-xl md:text-left">Why {product.name}?</h3>
                      {product.additionalInfo?.find(info => info.key.toLowerCase() === 'why play')?.value ||
                        "• Engages children and aids in their developmental milestones.\n• Made with non-toxic, child-safe materials.\n• Encourages open-ended, imaginative play."}
                    </div>
                  )}
                  {activeTab === 'How Play' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-[#A97225] mb-4 text-lg md:text-xl md:text-left">How to Play</h3>
                      {product.additionalInfo?.find(info => info.key.toLowerCase() === 'how play')?.value ||
                        "• Let your child explore the textures and shapes.\n• Demonstrate once, then step back and let their imagination take over.\n• Perfect for independent play or guided activities."}
                    </div>
                  )}
                  {activeTab === 'Details' && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-[#A97225] mb-4 text-lg md:text-xl md:text-left">Product Details</h3>
                      {product.dimensions && (product.dimensions.length || product.dimensions.width || product.dimensions.height) && (
                        <p><strong>Dimensions:</strong> {product.dimensions.length || 0} x {product.dimensions.width || 0} x {product.dimensions.height || 0} cm</p>
                      )}
                      {product.shippingWeight && <p><strong>Weight:</strong> {product.shippingWeight} kg</p>}
                      {product.additionalInfo?.find(info => info.key.toLowerCase() === 'details')?.value && (
                        <p className="mt-5 whitespace-pre-line">{product.additionalInfo.find(info => info.key.toLowerCase() === 'details').value}</p>
                      )}
                      {(!product.materialType && !product.shippingWeight && !product.additionalInfo?.find(info => info.key.toLowerCase() === 'details')) && (
                        <p>Handcrafted wooden toy designed for mindful play and everyday use.</p>
                      )}
                    </div>
                  )}
                  {activeTab === 'Return & Exchange' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-[#B0611C] mb-4 text-lg md:text-xl md:text-left">Return & Exchange Policy</h3>
                      {product.returnPolicy || "• 7-day easy returns on unused items in original packaging.\n• Exchanges available for defective or damaged products.\n• Please contact our support team to initiate a request."}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>

        {/* SHARE MODAL */}
        {showSharePopup && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setShowSharePopup(false)}>
            <div className="w-full max-w-md rounded-[2rem] bg-white p-6 md:p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#B0611C] font-serif">Share this product</h3>
                <button onClick={() => setShowSharePopup(false)} className="text-slate-400 hover:text-slate-900 p-2 rounded-full hover:bg-slate-100 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={window.location.href}
                  className="flex-1 bg-transparent px-3 py-1 text-sm text-slate-600 outline-none truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                    setShowSharePopup(false);
                  }}
                  className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-colors shrink-0"
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="bg-[#FDF9F1]">
        <ProductReviewSection product={product} user={user} />
      </div>

      {recommendedProducts.length > 0 && (
        <div className="bg-[#FDF9F1] px-4 py-10 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="relative flex flex-col md:flex-row items-center justify-center mb-8 min-h-[40px]">
              <div className="flex justify-center items-center gap-3 sm:gap-4">
                <IoLeaf className="text-[#B0611C] w-6 h-6 sm:w-8 sm:h-8" />
                <h2 className="text-2xl md:text-3xl font-serif text-[#B0611C] tracking-widest uppercase text-center">You May Also Like</h2>
                <IoLeaf className="text-[#B0611C] transform scale-x-[-1] w-6 h-6 sm:w-8 sm:h-8" />
              </div>
            </div>
            
            <div className="relative px-2 md:px-14">
              <style>{`
                .custom-pagination-related { position: relative; margin-top: 2rem; display: flex; justify-content: center; gap: 12px; }
                .custom-pagination-related .swiper-pagination-bullet { width: 16px; height: 16px; background: #fff; border: 1px solid #999; opacity: 1; transition: all 0.2s; border-radius: 50%; cursor: pointer; }
                .custom-pagination-related .swiper-pagination-bullet-active { background: #8b7355; border: 4px solid #fff; box-shadow: 0 0 0 1px #8b7355; }
                
                .rec-prev, .rec-next {
                  position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
                  width: 44px; height: 44px; border-radius: 50%; border: 1px solid #E6DFD4;
                  background: white; color: #333; display: flex; align-items: center; justify-content: center;
                  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.08); transition: all 0.2s;
                }
                .rec-prev:hover, .rec-next:hover { background: #F7F3EE; }
                .rec-prev.swiper-button-disabled, .rec-next.swiper-button-disabled { opacity: 0.3; cursor: not-allowed; }
                .rec-prev { left: -12px; }
                .rec-next { right: -12px; }
                @media (min-width: 768px) {
                  .rec-prev { left: -10px; }
                  .rec-next { right: -10px; }
                }
              `}</style>

              <button type="button" ref={setRecPrevEl} className="rec-prev"><ChevronLeft className="w-5 h-5" /></button>
              <button type="button" ref={setRecNextEl} className="rec-next"><ChevronRight className="w-5 h-5" /></button>

              <Swiper
                modules={[Navigation, Pagination]}
                navigation={{ prevEl: recPrevEl, nextEl: recNextEl }}
                pagination={{ clickable: true, el: recPaginationEl }}
                spaceBetween={16}
                slidesPerView={1}
                breakpoints={{
                  480: { slidesPerView: 2 },
                  768: { slidesPerView: 3 },
                  1024: { slidesPerView: 4 }
                }}
                className="w-full pb-4"
              >
                {recommendedProducts.map((p) => (
                  <SwiperSlide key={p._id} className="h-auto">
                    <div className="h-full py-2">
                      <ProductCard 
                        product={p} 
                        user={user} 
                        onNavigate={onNavigate} 
                        onAddToCart={onAddToCart} 
                        onAddToWishlist={onAddToWishlist} 
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
              <div ref={setRecPaginationEl} className="custom-pagination-related" />
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Enquiry Button */}
      {product && (
        <a 
          href={`https://wa.me/919789660115?text=${encodeURIComponent(`Hi, I'm inquiring about ${product.name}: ${window.location.href}`)}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-[60] bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-lg hover:scale-110 transition-transform duration-300 flex items-center justify-center cursor-pointer"
          aria-label="WhatsApp Enquiry"
        >
          <FaWhatsapp className="w-6 h-6 md:w-8 md:h-8" />
        </a>
      )}
    </>
  );
}

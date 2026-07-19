import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { productV2API } from '../api/catalogV2Service';
import ProductReviewSection from '../components/ProductReviewSection';

const finishOptions = ['Natural Maple', 'Oak Tint'];
const featureBullets = [
  '100% solid maple FSC-certified wood',
  'Water-based, non-toxic sealant',
  'Hand-finished for safe smooth edges',
  'Designed for lasting open-ended play',
];
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

const getPricingInfo = (source = {}) => {
  const listPrice = Number(
    source.compareAtPrice ?? source.basePrice ?? source.effectivePrice ?? source.price ?? 0
  );
  const salePriceCandidate = source.discountPrice !== null && source.discountPrice !== undefined && source.discountPrice !== ''
    ? Number(source.discountPrice)
    : NaN;
  const salePrice = Number.isFinite(salePriceCandidate) && salePriceCandidate > 0
    ? salePriceCandidate
    : Number(source.basePrice ?? source.effectivePrice ?? source.price ?? 0);
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

export default function ProductDetails({ product: initialProduct, user, onNavigate, onAddToCart, onBuyNow, onAddToWishlist }) {
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
  const LIVE_REFRESH_MS = 8000;

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
    const result = Object.fromEntries(
      Object.entries(map).map(([k, s]) => [k, Array.from(s)])
    );
    console.log('🔍 Variant Attribute Options:', {
      hasVariants: !!product?.variants,
      variantCount: product?.variants?.length,
      result
    });
    return result;
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

  // selectedAttributeValues: { [attributeName]: string } — single value per attribute
  const [selectedAttributeValues, setSelectedAttributeValues] = useState({});

  // Reset when product/attributes change
  useEffect(() => {
    setSelectedAttributeValues({});
    setSelectedVariant(null);
  }, [product?._id]);

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

    console.log('🔍 Variant Matching:', {
      totalAttributes,
      selectedCount,
      selectedAttributeValues,
      allSelected: totalAttributes > 0 && selectedCount >= totalAttributes
    });

    // Only attempt match when all attribute dimensions are selected
    if (totalAttributes > 0 && selectedCount < totalAttributes) {
      console.log('⏸️ Not all attributes selected yet');
      setSelectedVariant(null);
      return;
    }

    const matchedVariant = findMatchingVariant(product, selectedAttributeValues);
    console.log('✨ Matched Variant:', matchedVariant);
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

    console.log('📝 Description text set:', {
      selectedVariant: !!selectedVariant,
      hasDescription: !!product?.description,
      text: text.substring(0, 100),
    });

    return text;
  }, [product, selectedVariant]);

  const productFieldKeys = useMemo(() => buildProductFieldKeys(product), [product]);

  const handleAction = (type) => {
    if (!user) {
      alert(`Please sign in to add to ${type.toLowerCase()}.`);
      onNavigate('/login');
      return;
    }

    // Warn user if attributes are required but not selected
    const totalAttributes = Object.keys(variantAttributeOptions).length;
    if (totalAttributes > 0 && !selectedVariant) {
      alert('Please select all required attributes (variant) to continue.');
      return;
    }

    const item = {
      ...product,
      selectedFinish,
      quantity,
      ...(selectedVariant && { selectedVariant })
    };
    if (type === 'Cart') {
      onAddToCart?.(item);
    } else if (type === 'Buy') {
      onBuyNow?.(item);
    } else {
      onAddToWishlist?.(item);
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
      <section className="py-12 px-4 sm:px-6 lg:px-8 bg-[#FDF9F1] min-h-screen font-sans">
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
            <div className="space-y-6 min-w-0 w-full">
              <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm flex items-center justify-center">
                {selectedImage && selectedImage.trim() !== '' ? (
                  <img
                    src={selectedImage}
                    alt={product.name}
                    className="w-full h-auto max-h-[600px] object-cover"
                    onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                  />
                ) : (
                  <div className="h-[600px] flex items-center justify-center text-slate-500">No image available</div>
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
                      className={`overflow-hidden rounded-[1.5rem] border-[3px] transition shrink-0 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-white snap-start ${isSelected ? 'border-slate-800' : 'border-transparent hover:border-slate-300 shadow-sm'
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
            <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 md:p-10 shadow-sm border border-slate-100 relative h-fit min-w-0 w-full">

              {/* Wishlist and Share absolute top right */}
              <div className="absolute top-10 right-10 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleAction('Wishlist')}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:bg-[#FDF9F1] hover:text-[#8B5E3C] hover:border-[#8B5E3C]"
                  aria-label="Add to Wishlist"
                  title="Add to Wishlist"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSharePopup(true)}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 transition hover:bg-[#FDF9F1] hover:text-[#8B5E3C] hover:border-[#8B5E3C]"
                  aria-label="Share Product"
                  title="Share"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </button>
              </div>

              {/* Title & Starting From */}
              <div className="pr-32">
                <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-slate-500 mb-4">{product.name}</p>

                <div className="flex flex-col gap-2 mb-8">
                  {(() => {
                    const priceSource = selectedVariant || (Array.isArray(product?.variants) && product.variants.length === 1 ? product.variants[0] : null) || product;
                    const pricing = getPricingInfo(priceSource);
                    const showStartingFrom = !selectedVariant && Array.isArray(product?.variants) && product.variants.length > 1;

                    return (
                      <>
                        {showStartingFrom && (
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">STARTING FROM</p>
                        )}
                        {!showStartingFrom && (
                          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">PRICE</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-[2.5rem] font-medium tracking-tight text-slate-900 leading-none">
                            ₹{(pricing.salePrice * quantity).toFixed(2)}
                          </p>
                          {pricing.hasDiscount && (
                            <span className="text-xl text-slate-400 line-through">
                              ₹{(pricing.listPrice * quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-8">
                {/* Attributes */}
                {productAttributes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-5">ATTRIBUTES</p>
                    <div className="grid gap-6">
                      {productAttributes.map((attribute) => {
                        const label = attribute._isVariantDerived
                          ? attribute.attributeName
                          : (attribute.attribute?.name || attribute.attributeName || 'Attribute');
                        const values = attribute._isVariantDerived
                          ? attribute.values
                          : getAttributeValues(attribute);
                        const selectedValue = selectedAttributeValues[label];
                        return (
                          <div key={attribute._id || label}>
                            <p className="text-[15px] font-semibold text-slate-800 mb-3 capitalize">{label}</p>
                            <div className="flex flex-wrap gap-3">
                              {values.map((value) => {
                                const isSelected = selectedValue === value;
                                return (
                                  <button
                                    type="button"
                                    key={`${label}-${value}`}
                                    onClick={() => handleToggleAttributeValue(label, value)}
                                    className={`inline-flex items-center rounded-full px-6 py-2.5 text-sm transition ${isSelected
                                        ? 'bg-[#8B5E3C] text-white font-medium shadow-md shadow-[#8B5E3C]/20'
                                        : 'bg-[#F1F5F9] text-slate-600 hover:bg-[#FDF9F1] hover:text-[#8B5E3C]'
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
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-5">ATTRIBUTES</p>
                    <p className="text-[15px] font-semibold text-slate-800 mb-3">Age Group</p>
                    <div className="flex flex-wrap gap-3">
                      <span className="inline-flex items-center rounded-full bg-[#F1F5F9] px-6 py-2.5 text-sm text-slate-600">
                        {product.ageGroup}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-5">QUANTITY</p>
                  {(() => {
                    const productVariants = product?.variants || [];
                    const maxAllowedQty = selectedVariant
                      ? Math.max(0, (selectedVariant.inventory || 0) - (selectedVariant.reserveStock || 0))
                      : productVariants.length > 0
                        ? productVariants.reduce((sum, v) => sum + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
                        : (product?.inventory?.stockQuantity || product?.stock || 0);

                    if (maxAllowedQty > 0 && quantity > maxAllowedQty) {
                      setTimeout(() => setQuantity(maxAllowedQty), 0);
                    }

                    return (
                      <div className="inline-flex items-center justify-between rounded-full border border-slate-200 bg-white shadow-sm w-40 h-[3.25rem]">
                        <button
                          type="button"
                          onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                          disabled={maxAllowedQty === 0}
                          className="flex items-center justify-center w-14 h-full text-slate-500 hover:text-slate-900 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="text-[15px] font-medium text-slate-900">{maxAllowedQty === 0 ? 0 : quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity((value) => Math.min(maxAllowedQty, value + 1))}
                          disabled={quantity >= maxAllowedQty || maxAllowedQty === 0}
                          className="flex items-center justify-center w-14 h-full text-slate-500 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Actions */}
                <div className="grid gap-4 sm:grid-cols-2 pt-4">
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
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOutOfStock) toast.error('Product is out of stock!');
                            else handleAction('Cart');
                          }}
                          disabled={isVariantRequiredButNotSelected}
                          className={`inline-flex h-[3.5rem] w-full items-center justify-center rounded-full px-6 text-sm font-semibold uppercase tracking-[0.15em] transition shadow-lg ${isDisabled
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                              : 'bg-[#8B5E3C] text-white shadow-[#8B5E3C]/20 hover:bg-[#724a2e] hover:shadow-[#8B5E3C]/40'
                            }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : 'ADD TO CART'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isOutOfStock) toast.error('Product is out of stock!');
                            else handleAction('Buy');
                          }}
                          disabled={isVariantRequiredButNotSelected}
                          className={`inline-flex h-[3.5rem] w-full items-center justify-center rounded-full px-6 text-sm font-semibold uppercase tracking-[0.15em] transition border-2 ${isDisabled
                              ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                              : 'bg-white text-[#8B5E3C] border-[#8B5E3C] hover:bg-[#FDF9F1]'
                            }`}
                        >
                          BUY NOW
                        </button>
                      </>
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
              <div className="mt-16 bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-slate-200">
                <div className="flex flex-wrap gap-3 justify-center border-b border-slate-100 pb-6">
                  {tabsArray.map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 text-sm font-medium rounded-full border transition-colors ${isActive
                            ? 'bg-[#8B5E3C] border-[#8B5E3C] text-white shadow-md shadow-[#8B5E3C]/20'
                            : 'bg-white border-slate-300 text-slate-600 hover:border-slate-400'
                          }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                <div className="py-8 text-sm md:text-base leading-relaxed text-slate-600 max-w-4xl mx-auto">
                  {activeTab === 'Description' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-slate-900 mb-4 text-lg md:text-xl md:text-left">About {product.name}</h3>
                      <p className="text-slate-600 leading-relaxed">{descriptionText}</p>
                    </div>
                  )}

                  {/* Dynamic Custom Tabs Content */}
                  {displayFields.map((field) => (
                    activeTab === field.key && (
                      <div key={field.key} className="whitespace-pre-line">
                        <h3 className="font-bold text-slate-900 mb-4 text-lg md:text-xl md:text-left">{field.key}</h3>
                        <p className="text-slate-600 leading-relaxed">{field.value}</p>
                      </div>
                    )
                  ))}
                  {activeTab === 'Why Play' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-slate-900 mb-4 text-lg md:text-xl md:text-left">Why {product.name}?</h3>
                      {product.additionalInfo?.find(info => info.key.toLowerCase() === 'why play')?.value ||
                        "• Engages children and aids in their developmental milestones.\n• Made with non-toxic, child-safe materials.\n• Encourages open-ended, imaginative play."}
                    </div>
                  )}
                  {activeTab === 'How Play' && (
                    <div className="whitespace-pre-line">
                      <h3 className="font-bold text-slate-900 mb-4 text-lg md:text-xl md:text-left">How to Play</h3>
                      {product.additionalInfo?.find(info => info.key.toLowerCase() === 'how play')?.value ||
                        "• Let your child explore the textures and shapes.\n• Demonstrate once, then step back and let their imagination take over.\n• Perfect for independent play or guided activities."}
                    </div>
                  )}
                  {activeTab === 'Details' && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-slate-900 mb-4 text-lg md:text-xl md:text-left">Product Details</h3>
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
                      <h3 className="font-bold text-slate-900 mb-4 text-lg md:text-xl md:text-left">Return & Exchange Policy</h3>
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
                <h3 className="text-xl font-bold text-slate-900 font-serif">Share this product</h3>
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
            <div className="flex items-center justify-center gap-4 mb-12">
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3] shrink-0">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
              </svg>
              <h2 className="text-3xl font-serif text-[#4A5441] tracking-wide text-center">You May Also Like</h2>
              <svg width="40" height="20" viewBox="0 0 40 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#D4C3A3] transform scale-x-[-1] shrink-0">
                <path d="M2 10C10 10 18 5 28 10C32 12 36 12 38 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 8C11 2 5 2 5 10C11 10 14 8 14 8Z" fill="currentColor" opacity="0.8"/>
                <path d="M24 8C21 2 15 2 15 10C21 10 24 8 24 8Z" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {recommendedProducts.map((p) => {
                const recPricing = getPricingInfo(p);
                return (
                  <div key={p._id} className="group cursor-pointer" onClick={() => onNavigate(`/product/${p._id}`)}>
                    <div className="aspect-square bg-slate-100 rounded-2xl overflow-hidden mb-4 border border-slate-200">
                      <img
                        src={p.images?.find(img => img.isThumbnail)?.url || p.images?.[0]?.url || (p.image && p.image.trim() !== '' ? p.image : '/wood-placeholder.png') || '/wood-placeholder.png'}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => { e.target.src = '/wood-placeholder.png'; }}
                      />
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate">{p.name}</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <p className="text-slate-600 text-sm font-bold">₹{recPricing.salePrice.toFixed(2)}</p>
                        {recPricing.hasDiscount && (
                          <p className="text-[10px] text-slate-500 line-through">₹{recPricing.listPrice.toFixed(2)}</p>
                        )}
                      </div>
                      {recPricing.hasDiscount && (
                        <span className="inline-flex items-center w-fit rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                          -{recPricing.discountPercent}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

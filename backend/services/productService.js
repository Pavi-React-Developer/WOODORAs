const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Attribute = require('../models/Attribute');
const ProductAttributeValue = require('../models/ProductAttributeValue');
const ProductVariant = require('../models/ProductVariant');
const ProductVariantOption = require('../models/ProductVariantOption');
const Inventory = require('../models/Inventory');
const ProductImage = require('../models/catalog/ProductImage');
const CategoryAttributeMapping = require('../models/catalog/CategoryAttributeMapping');
const auditService = require('./auditService');
const Review = require('../models/Review');

const hasAttributeValue = (payload = {}) => {
    if (payload.value !== undefined && payload.value !== null && String(payload.value).trim() !== '') return true;
    if (Array.isArray(payload.values) && payload.values.length > 0) return true;
    if (payload.numericValue !== undefined && payload.numericValue !== null && payload.numericValue !== '') return true;
    if (payload.dateValue !== undefined && payload.dateValue !== null && payload.dateValue !== '') return true;
    if (payload.booleanValue !== undefined && payload.booleanValue !== null) return true;
    return false;
};

const normalizeAttributeValue = (av) => ({
    attributeId: av.attributeId || av.attribute,
    value: av.value,
    values: Array.isArray(av.values) ? av.values : [],
    numericValue: av.numericValue,
    dateValue: av.dateValue,
    booleanValue: av.booleanValue,
});

const validateAndNormalizeAttributeValues = async ({ category, subCategory, attributeValues = [] }) => {
    if (!subCategory) return [];

    const mappings = await CategoryAttributeMapping.find({
        category,
        subCategory,
        isActive: true,
    }).populate('attribute');

    const mappingByAttribute = new Map(
        mappings
            .filter(mapping => mapping.attribute && mapping.attribute.isDeleted !== true)
            .map(mapping => [mapping.attribute._id.toString(), mapping])
    );

    const normalized = attributeValues
        .map(normalizeAttributeValue)
        .filter(av => av.attributeId && mappingByAttribute.has(av.attributeId.toString()) && hasAttributeValue(av));

    const normalizedByAttribute = new Map(
        normalized.map(av => [av.attributeId.toString(), av])
    );

    const missingRequired = mappings
        .filter(mapping => mapping.isRequired || mapping.attribute?.isRequired)
        .filter(mapping => !hasAttributeValue(normalizedByAttribute.get(mapping.attribute._id.toString())))
        .map(mapping => mapping.attribute.name);

    if (missingRequired.length > 0) {
        throw new Error(`Missing required attributes: ${missingRequired.join(', ')}`);
    }

    return normalized;
};

const slugify = (value = '') => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

const toFiniteNumber = (value, fallback = 0) => {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
};

const getPrimaryVariantPrice = (variants = []) => {
    if (!Array.isArray(variants) || variants.length === 0) return null;

    const primary = variants.find(v => v.isPrimary) || variants[0];
    const normalized = Number(primary?.basePrice);
    return Number.isFinite(normalized) ? normalized : null;
};

const buildProductPricing = (product = {}, variants = [], images = [], inventory = null) => {
    const normalizeNumber = (value, fallback = 0) => {
        const numeric = Number(value);
        return Number.isFinite(numeric) ? numeric : fallback;
    };

    let basePrice = normalizeNumber(product.price, 0);
    let effectivePrice = normalizeNumber(product.price, 0);
    let discountPrice = undefined;
    const rawDiscount = product.discountPrice;
    if (rawDiscount !== undefined && rawDiscount !== null && rawDiscount !== '') {
        const parsed = normalizeNumber(rawDiscount, 0);
        if (parsed > 0) discountPrice = parsed;
    }
    let compareAtPrice = normalizeNumber(product.compareAtPrice, 0);
    let effectiveImages = Array.isArray(images)
        ? images.map(img => (img && typeof img.toObject === 'function' ? img.toObject() : img))
        : [];

    if (Array.isArray(variants) && variants.length > 0) {
        const primary = variants.find(v => v.isPrimary) || variants[0];
        const primaryBase = primary?.basePrice ?? primary?.price ?? basePrice;
        const normalizedBase = normalizeNumber(primaryBase, basePrice);

        effectivePrice = normalizedBase;
        basePrice = normalizedBase;

        if (primary?.discountPrice !== '' && primary?.discountPrice !== undefined) {
            const parsed = normalizeNumber(primary.discountPrice, 0);
            if (parsed > 0) discountPrice = parsed;
        }

        compareAtPrice = (compareAtPrice > 0 ? compareAtPrice : normalizedBase);

        if (effectiveImages.length === 0 && Array.isArray(primary.images) && primary.images.length > 0) {
            effectiveImages = primary.images.map((img, idx) => ({ url: typeof img === 'object' ? img.url || img : img, displayOrder: idx + 1 }));
        }
    } else {
        compareAtPrice = (compareAtPrice > 0 ? compareAtPrice : basePrice);
    }

    const totalStock = Array.isArray(variants) && variants.length > 0
        ? variants.reduce((sum, v) => sum + Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)), 0)
        : (inventory ? (inventory.stockQuantity || 0) : 0);

    let isLowStock = false;
    if (Array.isArray(variants) && variants.length > 0) {
        isLowStock = variants.some(v => Math.max(0, (v.inventory || 0) - (v.reserveStock || 0)) <= (v.lowStockAlert !== undefined ? v.lowStockAlert : 5));
    } else {
        isLowStock = totalStock <= (product.lowStockAlert !== undefined ? product.lowStockAlert : 5);
    }

    return {
        effectivePrice,
        basePrice,
        discountPrice,
        compareAtPrice,
        images: effectiveImages,
        totalStock,
        isLowStock,
    };
};

const ensureUniqueProductSku = async (requestedSku, fallbackBase) => {
    const baseSku = String(requestedSku || fallbackBase || 'SKU').trim().toUpperCase().replace(/\s+/g, '-');
    if (!baseSku) {
        return 'SKU';
    }

    let candidate = baseSku;
    let counter = 2;
    while (await Product.exists({ sku: candidate })) {
        candidate = `${baseSku}-${counter}`;
        counter += 1;
    }

    return candidate;
};

const ensureUniqueVariantSku = async (requestedSku, fallbackBase) => {
    const baseSku = String(requestedSku || fallbackBase || 'SKU').trim().toUpperCase().replace(/\s+/g, '-');
    if (!baseSku) {
        return 'SKU';
    }

    let candidate = baseSku;
    let counter = 2;
    while (await ProductVariant.exists({ sku: candidate })) {
        candidate = `${baseSku}-${counter}`;
        counter += 1;
    }

    return candidate;
};

/**
 * Get all products with filters, search, pagination, and populate references
 */
const getProducts = async (query = {}) => {
    const {
        search,
        category,
        subCategory,
        isActive,
        isArchived,
        isFeatured,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...rawFilters
    } = query;

    const filter = { isDeleted: false };

    if (category) filter.category = category;
    if (subCategory) filter.subCategory = subCategory;

    if (isActive !== undefined && isActive !== '') {
        filter.isActive = isActive === 'true';
    }
    if (isArchived !== undefined && isArchived !== '') {
        filter.isArchived = isArchived === 'true';
    } else {
        filter.isArchived = false;
    }
    if (isFeatured !== undefined && isFeatured !== '') {
        filter.isFeatured = isFeatured === 'true';
    }

    const attributeFilters = Object.entries(rawFilters)
        .filter(([key, value]) => key.startsWith('attr_') && value !== undefined && value !== '')
        .map(([key, value]) => ({
            attribute: key.replace(/^attr_/, ''),
            value: Array.isArray(value) ? value : String(value),
        }));

    if (attributeFilters.length > 0) {
        const matchingSets = await Promise.all(attributeFilters.map(attrFilter =>
            ProductAttributeValue.find({
                attribute: attrFilter.attribute,
                $or: [
                    { value: attrFilter.value },
                    { values: attrFilter.value },
                    { numericValue: Number(attrFilter.value) },
                ],
            }).select('product')
        ));

        const productIdSets = matchingSets.map(rows => new Set(rows.map(row => row.product.toString())));
        const [firstSet, ...otherSets] = productIdSets;
        const matchingProductIds = [...(firstSet || new Set())]
            .filter(id => otherSets.every(set => set.has(id)));

        filter._id = { $in: matchingProductIds };
    }

    if (search) {
        const matchingAttributeRows = await ProductAttributeValue.find({
            $or: [
                { value: { $regex: search, $options: 'i' } },
                { values: { $elemMatch: { $regex: search, $options: 'i' } } },
            ],
        }).select('product');
        const productIdsFromAttributes = matchingAttributeRows.map(row => row.product);

        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { _id: { $in: productIdsFromAttributes } },
        ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    const products = await Product.find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

    const total = await Product.countDocuments(filter);

    // Fetch extra details for each product (variants, images, attribute values)
    const result = [];
    for (const prod of products) {
        const variants = await ProductVariant.find({ product: prod._id });
        const images = await ProductImage.find({ product: prod._id }).sort({ displayOrder: 1 });
        const inventory = await Inventory.findOne({ product: prod._id });
        const pricing = buildProductPricing(prod.toObject(), variants, images.map(img => img.toObject()), inventory);

        const ratingAgg = await Review.aggregate([
            { $match: { product: prod._id, status: 'approved' } },
            { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
        ]);
        const averageRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;
        const reviewCount = ratingAgg[0]?.count || 0;

        result.push({
            ...prod.toObject(),
            ...pricing,
            variants: variants.map(v => v.toObject()),
            variantsCount: variants.length,
            totalStock: pricing.totalStock,
            inventory: inventory ? { sku: inventory.sku, stockQuantity: inventory.stockQuantity } : null,
            averageRating,
            reviewCount,
        });
    }

    return {
        products: result,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get full details of a single product
 */
const getProductById = async (id) => {
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(id);
    const query = isObjectId ? { _id: id } : { slug: id };
    const product = await Product.findOne({ ...query, isDeleted: false })
        .populate('category', 'name slug')
        .populate('subCategory', 'name slug category')
        .populate('relatedProducts', 'name slug price')
        .populate('crossSellProducts', 'name slug price')
        .populate('upSellProducts', 'name slug price');

    if (!product) {
        throw new Error('Product not found');
    }

    const productId = product._id;

    const variants = await ProductVariant.find({ product: productId });
    const variantOptions = await ProductVariantOption.find({ variant: { $in: variants.map(v => v._id) } }).populate('attribute', 'name slug');
    const images = await ProductImage.find({ product: productId }).sort({ displayOrder: 1 });
    const attributeValues = await ProductAttributeValue.find({ product: productId }).populate('attribute');

    const mappedVariants = variants.map(v => {
        const vObj = v.toObject();
        // Map variant options and explicitly extract attribute name
        vObj.options = variantOptions
            .filter(vo => vo.variant.toString() === v._id.toString())
            .map(vo => {
                const voObj = vo.toObject();
                // Explicitly set attributeName for frontend compatibility
                voObj.attributeName = typeof vo.attribute === 'object' && vo.attribute?.name 
                    ? vo.attribute.name 
                    : voObj.attribute?.name || voObj.attributeName;
                return voObj;
            });
        return vObj;
    });

    let effectivePrice = product.price;
    let effectiveImages = images.map(img => img.toObject());
    if (variants.length > 0) {
        const primary = variants.find(v => v.isPrimary) || variants[0];
        effectivePrice = primary.basePrice || primary.price || product.price;
        if (effectiveImages.length === 0 && primary.images && primary.images.length > 0) {
            effectiveImages = primary.images.map((img, idx) => ({ url: typeof img === 'object' ? img.url || img : img, displayOrder: idx + 1 }));
        }
    }

    const inventory = await Inventory.findOne({ product: productId });
    const pricing = buildProductPricing(product.toObject(), variants, images.map(img => img.toObject()), inventory);
    const relatedProducts = await enrichRelatedProducts(product.relatedProducts);
    const crossSellProducts = await enrichRelatedProducts(product.crossSellProducts);
    const upSellProducts = await enrichRelatedProducts(product.upSellProducts);

    const ratingAgg = await Review.aggregate([
        { $match: { product: productId, status: 'approved' } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const averageRating = ratingAgg[0]?.avg ? Math.round(ratingAgg[0].avg * 10) / 10 : 0;
    const reviewCount = ratingAgg[0]?.count || 0;

    return {
        ...product.toObject(),
        ...pricing,
        effectivePrice,
        variants: mappedVariants,
        images: effectiveImages,
        attributeValues: attributeValues.map(av => av.toObject()),
        relatedProducts,
        crossSellProducts,
        upSellProducts,
        inventory: inventory ? { sku: inventory.sku, stockQuantity: inventory.stockQuantity } : null,
        averageRating,
        reviewCount,
    };
};

const enrichRelatedProducts = async (relatedProductRefs) => {
    if (!Array.isArray(relatedProductRefs) || relatedProductRefs.length === 0) return [];

    const ids = relatedProductRefs
        .map((ref) => (ref && ref._id ? String(ref._id) : String(ref)))
        .filter((id, index, self) => id && self.indexOf(id) === index);

    if (ids.length === 0) return [];

    const products = await Product.find({ _id: { $in: ids } })
        .populate('category', 'name slug');

    const enriched = [];
    for (const prod of products) {
        const variants = await ProductVariant.find({ product: prod._id });
        const images = await ProductImage.find({ product: prod._id }).sort({ displayOrder: 1 });
        const pricing = buildProductPricing(prod.toObject(), variants, images.map(img => img.toObject()));
        enriched.push({ ...prod.toObject(), ...pricing });
    }

    return ids.map((id) => enriched.find((item) => String(item._id) === id)).filter(Boolean);
};

/**
 * Create a new product with attribute values, images, and variants
 */
const createProduct = async (data, auditContext) => {
    const {
        name, description, category, subCategory, price, compareAtPrice, sku,
        barcode, shortDescription, costPrice, taxPercent, hsnCode,
        shippingWeight, shippingClass, dimensions, minOrderQty, maxOrderQty,
        lowStockAlert, isFeatured, isBestSeller, isNewArrival, isRecommended,
        warranty, returnPolicy, additionalInfo, seoTitle, seoDescription,
        metaKeywords, tags, relatedProducts, crossSellProducts, upSellProducts,
        isActive,
        
        // Relational details
        attributeValues, // Array of { attributeId, value, values, numericValue, dateValue }
        images,          // Array of { url, altText, displayOrder, isThumbnail }
        variants,        // Array of { variantAttributes: [{attribute, value}], sku, barcode, price, compareAtPrice, costPrice, stock, images }
    } = data;

    const generatedSlug = slugify(name);
    const existing = await Product.findOne({ slug: generatedSlug });
    let slug = generatedSlug;
    if (existing) {
        let counter = 2;
        while (await Product.exists({ slug, isDeleted: false })) {
            slug = `${generatedSlug}-${counter}`;
            counter += 1;
        }
    } else {
        slug = generatedSlug;
    }

    const normalizedAttributeValues = await validateAndNormalizeAttributeValues({
        category,
        subCategory,
        attributeValues,
    });

    const primaryVariantPrice = getPrimaryVariantPrice(variants);
    const normalizedPrice = Number(primaryVariantPrice !== null ? primaryVariantPrice : price);
    const normalizedCompareAtPrice = Number(compareAtPrice);
    const uniqueSku = await ensureUniqueProductSku(sku, generatedSlug);

    // Create Base Product
    const product = await Product.create({
        name,
        description,
        slug,
        category,
        subCategory,
        price: Number.isFinite(normalizedPrice) ? normalizedPrice : 0,
        compareAtPrice: Number.isFinite(normalizedCompareAtPrice) ? normalizedCompareAtPrice : 0,
        sku: uniqueSku,
        barcode,
        shortDescription,
        costPrice,
        taxPercent: taxPercent || 0,
        hsnCode,
        shippingWeight,
        shippingClass,
        dimensions,
        minOrderQty: minOrderQty || 1,
        maxOrderQty,
        lowStockAlert: lowStockAlert || 5,
        isFeatured: isFeatured || false,
        isBestSeller: isBestSeller || false,
        isNewArrival: isNewArrival || false,
        isRecommended: isRecommended || false,
        warranty,
        returnPolicy,
        additionalInfo,
        seoTitle,
        seoDescription,
        metaKeywords: metaKeywords || [],
        tags: tags || [],
        relatedProducts: relatedProducts || [],
        crossSellProducts: crossSellProducts || [],
        upSellProducts: upSellProducts || [],
        isActive: isActive !== undefined ? isActive : true,
        createdBy: auditContext.userId,
    });

    // 1. Add Attribute Values
    if (normalizedAttributeValues.length > 0) {
        const avDocs = normalizedAttributeValues
            .map(av => ({
                product: product._id,
                attribute: av.attributeId,
                value: av.value,
                values: av.values || [],
                numericValue: av.numericValue,
                dateValue: av.dateValue,
                booleanValue: av.booleanValue,
            }));
        if (avDocs.length > 0) {
            await ProductAttributeValue.insertMany(avDocs);
        }
    }

    // 2. Add Images
    let createdImages = [];
    if (images && Array.isArray(images)) {
        const imageDocs = images.map((img, idx) => ({
            product: product._id,
            url: img.url,
            altText: img.altText || '',
            displayOrder: img.displayOrder || (idx + 1),
            isThumbnail: img.isThumbnail || false,
        }));
        if (imageDocs.length > 0) {
            createdImages = await ProductImage.insertMany(imageDocs);
        }
    }

    // 3. Add Variants
    if (variants && Array.isArray(variants)) {
        for (let idx = 0; idx < variants.length; idx++) {
            const v = variants[idx];
            const variantSku = await ensureUniqueVariantSku(v.sku, `${uniqueSku}-V${idx + 1}`);
            const variantDoc = await ProductVariant.create({
                product: product._id,
                sku: variantSku,
                barcode: v.barcode,
                basePrice: toFiniteNumber(v.basePrice, product.price),
                discountPrice: v.discountPrice === '' || v.discountPrice === undefined ? undefined : toFiniteNumber(v.discountPrice),
                costPrice: v.costPrice === '' || v.costPrice === undefined ? undefined : toFiniteNumber(v.costPrice),
                inventory: toFiniteNumber(v.inventory, 0),
                reserveStock: toFiniteNumber(v.reserveStock, 0),
                currentStock: Math.max(0, toFiniteNumber(v.inventory, 0) - toFiniteNumber(v.reserveStock, 0)),
                weight: v.weight === '' || v.weight === undefined ? undefined : toFiniteNumber(v.weight),
                length: v.length === '' || v.length === undefined ? undefined : toFiniteNumber(v.length),
                width: v.width === '' || v.width === undefined ? undefined : toFiniteNumber(v.width),
                height: v.height === '' || v.height === undefined ? undefined : toFiniteNumber(v.height),
                volume: v.volume === '' || v.volume === undefined ? undefined : toFiniteNumber(v.volume),
                lowStockAlert: v.lowStockAlert === '' || v.lowStockAlert === undefined ? 5 : toFiniteNumber(v.lowStockAlert),
                images: v.images || [],
                isActive: v.isActive !== undefined ? v.isActive : true,
                isPrimary: v.isPrimary || false,
                variantCombination: v.variantCombination,
                createdBy: auditContext.userId,
            });
            
            if (v.options && Array.isArray(v.options)) {
                const optionDocs = v.options.map(opt => ({
                    variant: variantDoc._id,
                    attribute: opt.attribute,
                    value: opt.value,
                    attributeValue: opt.attributeValue,
                }));
                if (optionDocs.length > 0) {
                    await ProductVariantOption.insertMany(optionDocs);
                }
            }
        }
    }

    const fullProduct = await getProductById(product._id);

    await auditService.logAction(auditContext, {
        entityType: 'Product',
        entityId: product._id,
        action: 'CREATE',
        after: fullProduct,
    });

    return fullProduct;
};

/**
 * Update an existing product, updating attribute values, images, and variants safely
 */
const updateProduct = async (id, data, auditContext) => {
    const product = await Product.findOne({ _id: id, isDeleted: false });
    if (!product) {
        throw new Error('Product not found');
    }

    const beforeState = await getProductById(id);

    const fields = [
        'name', 'description', 'slug', 'category', 'subCategory', 'price', 'compareAtPrice', 'sku',
        'barcode', 'shortDescription', 'costPrice', 'taxPercent', 'hsnCode',
        'shippingWeight', 'shippingClass', 'dimensions', 'minOrderQty', 'maxOrderQty',
        'lowStockAlert', 'isFeatured', 'isBestSeller', 'isNewArrival', 'isRecommended',
        'warranty', 'returnPolicy', 'additionalInfo', 'seoTitle', 'seoDescription',
        'metaKeywords', 'tags', 'relatedProducts', 'crossSellProducts', 'upSellProducts',
        'isActive', 'isArchived'
    ];

    fields.forEach(field => {
        if (data[field] !== undefined) {
            if (field === 'price' || field === 'compareAtPrice') {
                product[field] = toFiniteNumber(data[field], product[field]);
            } else {
                product[field] = data[field];
            }
        }
    });

    const primaryVariantPrice = getPrimaryVariantPrice(data.variants);
    if (primaryVariantPrice !== null) {
        product.price = primaryVariantPrice;
    }

    product.updatedBy = auditContext.userId;
    const nextCategory = data.category || product.category;
    const nextSubCategory = data.subCategory || product.subCategory;
    const normalizedAttributeValues = Array.isArray(data.attributeValues)
        ? await validateAndNormalizeAttributeValues({
            category: nextCategory,
            subCategory: nextSubCategory,
            attributeValues: data.attributeValues,
        })
        : null;

    await product.save();

    // 1. Sync Attribute Values
    if (normalizedAttributeValues) {
        await ProductAttributeValue.deleteMany({ product: id });
        const avDocs = normalizedAttributeValues
            .map(av => ({
                product: id,
                attribute: av.attributeId,
                value: av.value,
                values: av.values || [],
                numericValue: av.numericValue,
                dateValue: av.dateValue,
                booleanValue: av.booleanValue,
            }));
        if (avDocs.length > 0) {
            await ProductAttributeValue.insertMany(avDocs);
        }
    }

    // 2. Sync Images
    if (data.images && Array.isArray(data.images)) {
        await ProductImage.deleteMany({ product: id });
        const imageDocs = data.images.map((img, idx) => ({
            product: id,
            url: img.url,
            altText: img.altText || '',
            displayOrder: img.displayOrder || (idx + 1),
            isThumbnail: img.isThumbnail || false,
        }));
        if (imageDocs.length > 0) {
            await ProductImage.insertMany(imageDocs);
        }
    }

    // 3. Sync Variants
    if (data.variants && Array.isArray(data.variants)) {
        const oldVariants = await ProductVariant.find({ product: id });
        await ProductVariantOption.deleteMany({ variant: { $in: oldVariants.map(v => v._id) } });
        await ProductVariant.deleteMany({ product: id });
        
        for (let idx = 0; idx < data.variants.length; idx++) {
            const v = data.variants[idx];
            const variantDoc = await ProductVariant.create({
                product: id,
                sku: v.sku ? v.sku.toUpperCase() : `${product.sku}-V${idx + 1}`.toUpperCase(),
                barcode: v.barcode,
                basePrice: toFiniteNumber(v.basePrice, product.price),
                discountPrice: v.discountPrice === '' || v.discountPrice === undefined ? undefined : toFiniteNumber(v.discountPrice),
                costPrice: v.costPrice === '' || v.costPrice === undefined ? undefined : toFiniteNumber(v.costPrice),
                inventory: toFiniteNumber(v.inventory, 0),
                reserveStock: toFiniteNumber(v.reserveStock, 0),
                currentStock: Math.max(0, toFiniteNumber(v.inventory, 0) - toFiniteNumber(v.reserveStock, 0)),
                weight: v.weight === '' || v.weight === undefined ? undefined : toFiniteNumber(v.weight),
                length: v.length === '' || v.length === undefined ? undefined : toFiniteNumber(v.length),
                width: v.width === '' || v.width === undefined ? undefined : toFiniteNumber(v.width),
                height: v.height === '' || v.height === undefined ? undefined : toFiniteNumber(v.height),
                volume: v.volume === '' || v.volume === undefined ? undefined : toFiniteNumber(v.volume),
                lowStockAlert: v.lowStockAlert === '' || v.lowStockAlert === undefined ? 5 : toFiniteNumber(v.lowStockAlert),
                images: v.images || [],
                isActive: v.isActive !== undefined ? v.isActive : true,
                isPrimary: v.isPrimary || false,
                variantCombination: v.variantCombination,
                createdBy: auditContext.userId,
            });
            
            if (v.options && Array.isArray(v.options)) {
                const optionDocs = v.options.map(opt => ({
                    variant: variantDoc._id,
                    attribute: opt.attribute,
                    value: opt.value,
                    attributeValue: opt.attributeValue,
                }));
                if (optionDocs.length > 0) {
                    await ProductVariantOption.insertMany(optionDocs);
                }
            }
        }
    }

    const afterState = await getProductById(id);

    await auditService.logAction(auditContext, {
        entityType: 'Product',
        entityId: id,
        action: 'UPDATE',
        before: beforeState,
        after: afterState,
    });

    return afterState;
};

/**
 * Permanently delete product and its dependent catalog records.
 */
const deleteProduct = async (id, auditContext) => {
    const product = await Product.findById(id);
    if (!product) {
        throw new Error('Product not found');
    }

    const beforeState = product.isDeleted ? product.toObject() : await getProductById(id);
    const variants = await ProductVariant.find({ product: id }).select('_id');
    const variantIds = variants.map(v => v._id);

    await Promise.all([
        ProductVariantOption.deleteMany({ variant: { $in: variantIds } }),
        ProductVariant.deleteMany({ product: id }),
        ProductImage.deleteMany({ product: id }),
        ProductAttributeValue.deleteMany({ product: id }),
        Inventory.deleteMany({ product: id }),
    ]);
    await Product.deleteOne({ _id: id });

    await auditService.logAction(auditContext, {
        entityType: 'Product',
        entityId: id,
        action: 'DELETE',
        before: beforeState,
        after: null,
    });

    return { deletedId: id };
};

/**
 * Bulk operations
 */
const bulkUpdateStatus = async (ids, isActive, auditContext) => {
    const productsBefore = await Product.find({ _id: { $in: ids }, isDeleted: false });

    await Product.updateMany(
        { _id: { $in: ids }, isDeleted: false },
        { $set: { isActive, updatedBy: auditContext.userId } }
    );

    const productsAfter = await Product.find({ _id: { $in: ids }, isDeleted: false });

    for (const prod of productsAfter) {
        const before = productsBefore.find(p => p._id.toString() === prod._id.toString());
        await auditService.logAction(auditContext, {
            entityType: 'Product',
            entityId: prod._id,
            action: 'STATUS_CHANGE',
            before: before ? before.toObject() : null,
            after: prod.toObject(),
        });
    }

    return { updatedCount: productsAfter.length };
};

const bulkDelete = async (ids, auditContext) => {
    const productsBefore = await Product.find({ _id: { $in: ids } });
    const productIds = productsBefore.map(product => product._id);
    const variants = await ProductVariant.find({ product: { $in: productIds } }).select('_id');
    const variantIds = variants.map(v => v._id);

    await Promise.all([
        ProductVariantOption.deleteMany({ variant: { $in: variantIds } }),
        ProductVariant.deleteMany({ product: { $in: productIds } }),
        ProductImage.deleteMany({ product: { $in: productIds } }),
        ProductAttributeValue.deleteMany({ product: { $in: productIds } }),
        Inventory.deleteMany({ product: { $in: productIds } }),
    ]);
    await Product.deleteMany({ _id: { $in: productIds } });

    for (const prod of productsBefore) {
        await auditService.logAction(auditContext, {
            entityType: 'Product',
            entityId: prod._id,
            action: 'DELETE',
            before: prod.toObject(),
            after: null,
        });
    }

    return { deletedCount: productsBefore.length };
};

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    bulkUpdateStatus,
    bulkDelete,
    buildProductPricing,
};

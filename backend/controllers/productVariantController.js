const ProductVariant = require('../models/ProductVariant');
const ProductVariantOption = require('../models/ProductVariantOption');
const Product = require('../models/Product');
const Attribute = require('../models/Attribute');
const AttributeValue = require('../models/AttributeValue');
const {
    generateCartesianProduct,
    generateVariantCombination,
    generateVariantSKU,
    findMissingCombinations,
    detectVariantChanges,
} = require('../utils/variantGenerator');

// ==========================================
// PRODUCT VARIANT CONTROLLERS
// ==========================================

/**
 * Generate variants from selected attribute values
 * @route   POST /api/catalog/products/:productId/variants/generate
 * @access  Private/Admin
 */
const generateVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const { variantAttributeOptions } = req.body;

        // Validate product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (!variantAttributeOptions || variantAttributeOptions.length === 0) {
            return res.status(400).json({ success: false, message: 'No variant attributes provided' });
        }

        // Generate Cartesian product combinations
        const combinations = generateCartesianProduct(variantAttributeOptions);

        if (combinations.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid combinations generated' });
        }

        // Get existing variants for this product
        const existingVariants = await ProductVariant.find({ product: productId });
        const existingCombinations = existingVariants.map(v => v.variantCombination);

        // Find only new combinations
        const newCombinationStrings = combinations.map(combo => 
            generateVariantCombination(combo)
        );
        const missingCombinations = findMissingCombinations(
            existingCombinations,
            newCombinationStrings
        );

        // Get sorted attribute IDs for consistent option ordering
        const attributeIds = variantAttributeOptions.map(opt => opt.attributeId);

        // Prepare variant data for insertion
        const variantsToCreate = [];
        const combinationIndexes = combinations
            .map((combo, idx) => ({
                combo,
                combinationStr: generateVariantCombination(combo),
            }))
            .filter(item => missingCombinations.includes(item.combinationStr));

        for (const item of combinationIndexes) {
            const variantSKU = generateVariantSKU(product.slug, item.combo);

            const variantData = {
                product: productId,
                variantCombination: item.combinationStr,
                basePrice: product.price || 0,
                inventory: 0,
                images: [],
                isActive: true,
                isPrimary: existingVariants.length === 0, // First variant is primary
                sku: variantSKU,
            };

            variantsToCreate.push(variantData);
        }

        if (variantsToCreate.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'All combinations already exist',
                data: {
                    created: 0,
                    total: existingVariants.length,
                },
            });
        }

        // Create variants and their options
        const createdVariants = [];
        for (const variantData of variantsToCreate) {
            const variant = await ProductVariant.create(variantData);
            createdVariants.push(variant);

            // Create variant options
            const combinationIndex = combinations.findIndex(
                combo => generateVariantCombination(combo) === variant.variantCombination
            );

            if (combinationIndex !== -1) {
                const options = combinations[combinationIndex];
                const variantOptions = options.map((option, idx) => ({
                    variant: variant._id,
                    attribute: attributeIds[idx],
                    value: option.value,
                }));

                await ProductVariantOption.insertMany(variantOptions);
            }
        }

        res.status(201).json({
            success: true,
            message: `${createdVariants.length} variant(s) created successfully`,
            data: {
                created: createdVariants.length,
                total: existingVariants.length + createdVariants.length,
                variants: createdVariants,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get all variants for a product with options
 * @route   GET /api/catalog/products/:productId/variants
 * @access  Private
 */
const getProductVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 20, search = '' } = req.query;

        // Validate product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Build filter
        let filter = { product: productId };
        if (search) {
            filter.$or = [
                { sku: { $regex: search, $options: 'i' } },
                { variantCombination: { $regex: search, $options: 'i' } },
                { barcode: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await ProductVariant.countDocuments(filter);
        const variants = await ProductVariant.find(filter)
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        // Get options for each variant
        const variantsWithOptions = await Promise.all(
            variants.map(async (variant) => {
                const options = await ProductVariantOption.find({ variant: variant._id })
                    .populate('attribute', 'name slug type')
                    .lean();

                return {
                    ...variant.toObject(),
                    options: options.map(opt => ({
                        attributeId: opt.attribute._id,
                        attributeName: opt.attribute.name,
                        attributeSlug: opt.attribute.slug,
                        value: opt.value,
                    })),
                };
            })
        );

        res.status(200).json({
            success: true,
            message: 'Variants retrieved successfully',
            data: variantsWithOptions,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get variant configuration for dynamic form generation
 * @route   GET /api/catalog/products/:productId/variants/config
 * @access  Private
 */
const getVariantConfig = async (req, res) => {
    try {
        const { productId } = req.params;

        // Validate product exists
        const product = await Product.findById(productId).populate('subCategory');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Get variant attributes from subcategory
        let variantAttributes = [];
        if (product.subCategory) {
            variantAttributes = await Attribute.find({
                _id: { $in: product.subCategory.attributes || [] },
                isVariant: true,
                isActive: true,
            })
                .select('_id name slug type')
                .sort({ displayOrder: 1 })
                .lean();

            // Get values for each attribute
            for (const attr of variantAttributes) {
                const values = await AttributeValue.find({ attribute: attr._id, isActive: true })
                    .select('_id value slug')
                    .sort({ displayOrder: 1 })
                    .lean();

                attr.values = values;
            }
        }

        res.status(200).json({
            success: true,
            message: 'Variant configuration retrieved',
            data: {
                productId,
                variantAttributes,
                dynamicColumns: variantAttributes.map(attr => ({
                    attributeId: attr._id,
                    name: attr.name,
                    slug: attr.slug,
                })),
                staticColumns: [
                    'inventory',
                    'basePrice',
                    'discountPrice',
                    'costPrice',
                    'sku',
                    'barcode',
                    'weight',
                    'length',
                    'width',
                    'height',
                    'status',
                    'isPrimary',
                    'images',
                ],
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update a single variant
 * @route   PUT /api/catalog/variants/:variantId
 * @access  Private/Admin
 */
const updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;
        const {
            basePrice,
            discountPrice,
            costPrice,
            inventory,
            currentStock,
            reserveStock,
            sku,
            barcode,
            weight,
            length,
            width,
            height,
            isActive,
            isPrimary,
            images,
        } = req.body;

        let variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        // Update fields
        if (basePrice !== undefined) variant.basePrice = basePrice;
        if (discountPrice !== undefined) variant.discountPrice = discountPrice;
        if (costPrice !== undefined) variant.costPrice = costPrice;
        if (inventory !== undefined) variant.inventory = inventory;
        if (reserveStock !== undefined) variant.reserveStock = reserveStock;
        
        // Dynamically compute currentStock
        variant.currentStock = Math.max(0, variant.inventory - variant.reserveStock);
        if (sku) variant.sku = sku;
        if (barcode) variant.barcode = barcode;
        if (weight !== undefined) variant.weight = weight;
        if (length !== undefined) variant.length = length;
        if (width !== undefined) variant.width = width;
        if (height !== undefined) variant.height = height;
        if (req.body.volume !== undefined) {
            variant.volume = req.body.volume;
        } else if (length !== undefined || width !== undefined || height !== undefined) {
            variant.volume = (variant.length || 0) * (variant.width || 0) * (variant.height || 0);
        }
        if (isActive !== undefined) variant.isActive = isActive;
        if (isPrimary !== undefined) variant.isPrimary = isPrimary;
        if (images) variant.images = images;

        variant = await variant.save();

        res.status(200).json({
            success: true,
            message: 'Variant updated successfully',
            data: variant,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Bulk update variants
 * @route   PUT /api/catalog/products/:productId/variants/bulk-update
 * @access  Private/Admin
 */
const bulkUpdateVariants = async (req, res) => {
    try {
        const { productId } = req.params;
        const { updates } = req.body; // Array of { variantId, data }

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({ success: false, message: 'No updates provided' });
        }

        const results = [];
        for (const update of updates) {
            const variant = await ProductVariant.findByIdAndUpdate(
                update.variantId,
                update.data,
                { returnDocument: 'after' }
            );

            if (variant) {
                results.push(variant);
            }
        }

        res.status(200).json({
            success: true,
            message: `${results.length} variant(s) updated successfully`,
            data: results,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete a variant
 * @route   DELETE /api/catalog/variants/:variantId
 * @access  Private/Admin
 */
const deleteVariant = async (req, res) => {
    try {
        const { variantId } = req.params;

        const variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        // Delete associated options
        await ProductVariantOption.deleteMany({ variant: variantId });

        // Delete variant
        await ProductVariant.findByIdAndDelete(variantId);

        res.status(200).json({
            success: true,
            message: 'Variant deleted successfully',
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete multiple variants
 * @route   DELETE /api/catalog/products/:productId/variants/bulk-delete
 * @access  Private/Admin
 */
const bulkDeleteVariants = async (req, res) => {
    try {
        const { variantIds } = req.body;

        if (!Array.isArray(variantIds) || variantIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No variant IDs provided' });
        }

        // Delete all associated options
        await ProductVariantOption.deleteMany({ variant: { $in: variantIds } });

        // Delete variants
        const result = await ProductVariant.deleteMany({ _id: { $in: variantIds } });

        res.status(200).json({
            success: true,
            message: `${result.deletedCount} variant(s) deleted successfully`,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Add images to a variant
 * @route   POST /api/catalog/variants/:variantId/images
 * @access  Private/Admin
 */
const addVariantImages = async (req, res) => {
    try {
        const { variantId } = req.params;
        const { images } = req.body; // Array of image URLs

        if (!Array.isArray(images) || images.length === 0) {
            return res.status(400).json({ success: false, message: 'No images provided' });
        }

        const variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        // Add images (avoid duplicates)
        const existingImages = new Set(variant.images);
        images.forEach(img => existingImages.add(img));
        variant.images = Array.from(existingImages);

        await variant.save();

        res.status(200).json({
            success: true,
            message: 'Images added successfully',
            data: variant.images,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Remove image from variant
 * @route   DELETE /api/catalog/variants/:variantId/images/:imageIndex
 * @access  Private/Admin
 */
const removeVariantImage = async (req, res) => {
    try {
        const { variantId, imageIndex } = req.params;

        const variant = await ProductVariant.findById(variantId);
        if (!variant) {
            return res.status(404).json({ success: false, message: 'Variant not found' });
        }

        const index = parseInt(imageIndex);
        if (index < 0 || index >= variant.images.length) {
            return res.status(400).json({ success: false, message: 'Invalid image index' });
        }

        variant.images.splice(index, 1);
        await variant.save();

        res.status(200).json({
            success: true,
            message: 'Image removed successfully',
            data: variant.images,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    generateVariants,
    getProductVariants,
    getVariantConfig,
    updateVariant,
    bulkUpdateVariants,
    deleteVariant,
    bulkDeleteVariants,
    addVariantImages,
    removeVariantImage,
};

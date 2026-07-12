import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings, ToggleLeft, ToggleRight, List, Columns, ShieldAlert, Download, RefreshCw, Sparkles, Layers, Globe } from 'lucide-react';
import { productV2API, categoryV2API, subCategoryV2API } from '../../../api/catalogV2Service';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { SearchBar, Button, Badge, Card } from '../../../components/admin/CommonComponents';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import BulkActions from '../../../components/admin/BulkActions';
import ImageUploader from '../../../components/admin/ImageUploader';
import DynamicFormBuilder from '../../../components/admin/DynamicFormBuilder';
import VariantManagement from '../../../components/admin/VariantManagement';

export const ProductsPage = ({ canCreate = true, canEdit = true, canDelete = true }) => {
    // List/Table state
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [subCategoryFilter, setSubCategoryFilter] = useState('');
    const [attributeFilters, setAttributeFilters] = useState({});
    const [filterAttributes, setFilterAttributes] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Form/Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        subCategory: '',
        price: 0,
        compareAtPrice: 0,
        sku: '',
        barcode: '',
        shortDescription: '',
        costPrice: 0,
        taxPercent: 0,
        hsnCode: '',
        shippingWeight: 0,
        shippingClass: '',
        dimensions: { length: 0, width: 0, height: 0 },
        lowStockAlert: 5,
        isActive: true,
        seoTitle: '',
        seoDescription: '',
        metaKeywords: '',
        tags: '',
        additionalInfo: [], // Custom dynamic fields
        
        // Relational fields
        images: [],
        variants: [],
        attributeValues: {}, // Keyed by attributeId: payload
    });
    
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [formSubCategories, setFormSubCategories] = useState([]); // Subcategories for the parent category in the form
    const [mappedAttributes, setMappedAttributes] = useState([]);  // Mapped attributes for the subcategory selected in the form
    const [formLoading, setFormLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Selection/Bulk state
    const [selectedIds, setSelectedIds] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchCategories();
        fetchSubCategories();
    }, [search, categoryFilter, subCategoryFilter, attributeFilters, page]);

    // Auto-refresh every 30 seconds so MongoDB changes are reflected dynamically
    useEffect(() => {
        const interval = setInterval(() => {
            fetchProducts();
        }, 30000);
        return () => clearInterval(interval);
    }, [search, categoryFilter, subCategoryFilter, attributeFilters, page]);

    useEffect(() => {
        if (subCategoryFilter) {
            subCategoryV2API.getMappedAttributes(subCategoryFilter)
                .then(res => {
                    if (res.success) {
                        setFilterAttributes((res.mappings || []).filter(mapping => mapping.attribute?.isFilterable));
                    }
                })
                .catch(err => console.error(err));
        } else {
            setFilterAttributes([]);
            setAttributeFilters({});
        }
    }, [subCategoryFilter]);

    // Handle form category change (cascade to subcategories)
    useEffect(() => {
        if (formData.category) {
            const filtered = subCategories.filter(s => (s.category?._id || s.category) === formData.category);
            setFormSubCategories(filtered);
            if (!filtered.some(s => s._id === formData.subCategory)) {
                setFormData(prev => ({ ...prev, subCategory: '', attributeValues: {} }));
                setMappedAttributes([]);
            }
        } else {
            setFormSubCategories([]);
            setMappedAttributes([]);
        }
    }, [formData.category, subCategories]);

    // Handle form subcategory change (cascade to custom attributes)
    useEffect(() => {
        if (formData.subCategory) {
            fetchMappedAttributes(formData.subCategory);
        } else {
            setMappedAttributes([]);
        }
    }, [formData.subCategory]);


    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await productV2API.getAll({
                search,
                category: categoryFilter,
                subCategory: subCategoryFilter,
                ...Object.fromEntries(
                    Object.entries(attributeFilters)
                        .filter(([, value]) => value !== '')
                        .map(([attributeId, value]) => [`attr_${attributeId}`, value])
                ),
                page,
                limit: 10,
            });
            if (res.success) {
                setProducts(res.products || []);
                setTotalPages(res.pagination?.pages || 1);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await categoryV2API.getAll({ limit: 100, isActive: 'true' });
            if (res.success) setCategories(res.categories || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSubCategories = async () => {
        try {
            const res = await subCategoryV2API.getAll({ limit: 100, isActive: 'true' });
            if (res.success) setSubCategories(res.subCategories || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchMappedAttributes = async (subId) => {
        try {
            const res = await subCategoryV2API.getMappedAttributes(subId);
            if (res.success) {
                setMappedAttributes(res.mappings || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const exportProductsExcel = () => {
        const header = ['Name', 'SKU', 'Category', 'Sub-Category', 'Price', 'Compare At Price', 'Status', 'Low Stock Alert'];
        const rows = products.map((product) => [
            product.name || '',
            product.sku || '',
            product.category?.name || '',
            product.subCategory?.name || product.subCategory || '',
            product.price ?? 0,
            product.compareAtPrice ?? 0,
            product.isActive ? 'Active' : 'Inactive',
            product.lowStockAlert ?? '',
        ]);
        downloadExcelFile('products', header, rows);
    };

    const handleSelectRow = (id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(products.map(p => p._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleOpenForm = async (product = null) => {
        if (product) {
            setEditId(product._id);
            setFormLoading(true);
            setIsFormOpen(true);
            try {
                const res = await productV2API.getById(product._id);
                if (res.success) {
                    const prod = res.product;
                    
                    // Map attribute values back into key-value shape for form builder
                    const attrVals = {};
                    if (prod.attributeValues) {
                        prod.attributeValues.forEach(av => {
                            attrVals[av.attribute?._id || av.attribute] = {
                                value: av.value,
                                values: av.values,
                                numericValue: av.numericValue,
                                dateValue: av.dateValue,
                                booleanValue: av.booleanValue,
                            };
                        });
                    }

                    setFormData({
                        name: prod.name || '',
                        description: prod.description || '',
                        category: prod.category?._id || prod.category || '',
                        subCategory: prod.subCategory?._id || prod.subCategory || '',
                        // Use basePrice = authoritative MongoDB stored price
                        price: prod.basePrice !== undefined ? prod.basePrice : (prod.price || 0),
                        compareAtPrice: prod.compareAtPrice || 0,
                        sku: prod.sku || '',
                        barcode: prod.barcode || '',
                        shortDescription: prod.shortDescription || '',
                        costPrice: prod.costPrice || 0,
                        taxPercent: prod.taxPercent || 0,
                        hsnCode: prod.hsnCode || '',
                        shippingWeight: prod.shippingWeight || 0,
                        shippingClass: prod.shippingClass || '',
                        dimensions: prod.dimensions || { length: 0, width: 0, height: 0 },
                        lowStockAlert: prod.lowStockAlert || 5,
                        isActive: prod.isActive !== undefined ? prod.isActive : true,
                        seoTitle: prod.seoTitle || '',
                        seoDescription: prod.seoDescription || '',
                        metaKeywords: Array.isArray(prod.metaKeywords) ? prod.metaKeywords.join(', ') : '',
                        tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
                        additionalInfo: prod.additionalInfo || [],
                        images: prod.images || [],
                        variants: (prod.variants || []).map(v => ({
                            ...v,
                            images: Array.isArray(v.images) ? v.images.map((imgStr, idx) => ({
                                url: imgStr,
                                altText: `Variant Image ${idx + 1}`,
                                isThumbnail: idx === 0,
                                displayOrder: idx + 1
                            })) : []
                        })),
                        attributeValues: attrVals,
                    });
                }
            } catch (err) {
                console.error(err);
                setIsFormOpen(false);
            } finally {
                setFormLoading(false);
            }
        } else {
            setEditId(null);
            setFormData({
                name: '',
                description: '',
                category: categories[0]?._id || '',
                subCategory: '',
                price: 0,
                compareAtPrice: 0,
                sku: '',
                barcode: '',
                shortDescription: '',
                costPrice: 0,
                taxPercent: 0,
                hsnCode: '',
                shippingWeight: 0,
                shippingClass: '',
                dimensions: { length: 0, width: 0, height: 0 },
                lowStockAlert: 5,
                isActive: true,
                seoTitle: '',
                seoDescription: '',
                metaKeywords: '',
                tags: '',
                additionalInfo: [],
                images: [],
                variants: [],
                attributeValues: {},
            });
            setIsFormOpen(true);
        }
        setErrorMsg('');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setErrorMsg('');

        // Transform attribute values format back into Mongoose array format
        const avArray = Object.entries(formData.attributeValues).map(([attrId, payload]) => ({
            attributeId: attrId,
            ...payload
        }));

        const payload = {
            ...formData,
            metaKeywords: formData.metaKeywords.split(',').map(s => s.trim()).filter(Boolean),
            tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
            price: Number(formData.price),
            compareAtPrice: Number(formData.compareAtPrice),
            costPrice: Number(formData.costPrice),
            taxPercent: Number(formData.taxPercent),
            shippingWeight: Number(formData.shippingWeight),
            lowStockAlert: Number(formData.lowStockAlert),
            dimensions: {
                length: Number(formData.dimensions.length),
                width: Number(formData.dimensions.width),
                height: Number(formData.dimensions.height),
            },
            attributeValues: avArray,
            additionalInfo: formData.additionalInfo.filter(info => info.key.trim() !== ''),
        };

        try {
            let result;
            if (editId) {
                result = await productV2API.update(editId, payload);
            } else {
                result = await productV2API.create(payload);
            }

            const createdProduct = result?.product || result?.data || result;
            if (createdProduct?.sku && !editId) {
                setFormData(prev => ({ ...prev, sku: createdProduct.sku }));
            }
            setIsFormOpen(false);
            fetchProducts();
        } catch (err) {
            setErrorMsg(err.message || 'Failed to save product');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setConfirmAction(() => async () => {
            await productV2API.delete(id);
            fetchProducts();
            setIsConfirmOpen(false);
        });
        setConfirmMessage('Are you sure you want to permanently delete this product?');
        setIsConfirmOpen(true);
    };

    const handleBulkDelete = () => {
        setConfirmAction(() => async () => {
            await productV2API.bulkDelete(selectedIds);
            setSelectedIds([]);
            fetchProducts();
            setIsConfirmOpen(false);
        });
        setConfirmMessage(`Are you sure you want to delete the ${selectedIds.length} selected products?`);
        setIsConfirmOpen(true);
    };

    const handleBulkStatus = async (isActive) => {
        setLoading(true);
        try {
            await productV2API.bulkStatus(selectedIds, isActive);
            setSelectedIds([]);
            fetchProducts();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleStatus = async (prod) => {
        try {
            await productV2API.update(prod._id, { isActive: !prod.isActive });
            fetchProducts();
        } catch (err) {
            console.error(err);
        }
    };

    const handleAttributeValChange = (attrId, payload) => {
        setFormData(prev => ({
            ...prev,
            attributeValues: {
                ...prev.attributeValues,
                [attrId]: payload
            }
        }));
    };

    const handleVariantChange = (index, field, value) => {
        setFormData(prev => {
            const updated = [...prev.variants];
            updated[index] = { ...updated[index], [field]: value };
            return { ...prev, variants: updated };
        });
    };

    // Auto-generate unique SKU from category + sub-category initials
    const generateSKU = async (categoryId, subCategoryId) => {
        if (!categoryId || !subCategoryId || editId) return; // only for new products
        const cat = categories.find(c => c._id === categoryId);
        const sub = [...subCategories, ...formSubCategories].find(s => s._id === subCategoryId);
        if (!cat || !sub) return;

        const catInitial = cat.name.trim()[0].toUpperCase();
        const subInitial = sub.name.trim()[0].toUpperCase();
        const prefix = `${catInitial}${subInitial}`;

        try {
            // Fetch all products with this prefix to find the next unique number
            const res = await productV2API.getAll({ search: prefix, limit: 1000 });
            const existing = (res.products || []).map(p => p.sku || '');
            let counter = 1;
            let candidate = `${prefix}${String(counter).padStart(3, '0')}`;
            while (existing.some(sku => sku.toUpperCase() === candidate)) {
                counter++;
                candidate = `${prefix}${String(counter).padStart(3, '0')}`;
            }
            setFormData(prev => ({ ...prev, sku: candidate }));
        } catch (err) {
            console.error('SKU generation failed', err);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Products</h1>
                    <p className="text-gray-500 mt-1">Manage catalog inventory, customizable variables, and attributes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchProducts} className="admin-secondary-btn">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={exportProductsExcel} className="admin-export-btn">
                        <Download size={16} /> Export Excel
                    </button>
                    <Button onClick={() => handleOpenForm()} className="shadow-lg hover:shadow-xl transition-all">
                        <Plus size={20} />
                        Add Product
                    </Button>
                </div>
            </div>

            {/* Filter Panel */}
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search products SKU, name..."
                    className="w-full md:max-w-xs"
                />
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <select
                        value={categoryFilter}
                        onChange={(e) => {
                            setCategoryFilter(e.target.value);
                            setSubCategoryFilter(''); // clear child filter
                            setAttributeFilters({});
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        value={subCategoryFilter}
                        onChange={(e) => {
                            setSubCategoryFilter(e.target.value);
                            setAttributeFilters({});
                        }}
                        disabled={!categoryFilter}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                    >
                        <option value="">All Sub-Categories</option>
                        {subCategories
                            .filter(s => (s.category?._id || s.category) === categoryFilter)
                            .map(s => (
                                <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                    </select>

                    {filterAttributes.map(mapping => {
                        const attr = mapping.attribute;
                        if (!attr) return null;
                        const options = attr.values || [];
                        return (
                            <select
                                key={attr._id}
                                value={attributeFilters[attr._id] || ''}
                                onChange={(e) => {
                                    setAttributeFilters(prev => ({
                                        ...prev,
                                        [attr._id]: e.target.value,
                                    }));
                                    setPage(1);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            >
                                <option value="">{attr.name}</option>
                                {options.map(option => (
                                    <option key={option.value} value={option.value}>{option.value}</option>
                                ))}
                            </select>
                        );
                    })}
                </div>
            </Card>

            <BulkActions
                selectedIds={selectedIds}
                onBulkDelete={handleBulkDelete}
                onBulkStatusChange={handleBulkStatus}
            />

            {/* Data Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length > 0 && selectedIds.length === products.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4">Product</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Price</th>
                                <th className="px-6 py-4">Total Stock</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Loading catalog products...
                                    </td>
                                </tr>
                            ) : products.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400">
                                        No products matched criteria.
                                    </td>
                                </tr>
                            ) : (
                                products.map((prod) => {
                                    const mainImage = prod.images?.find(img => img.isThumbnail)?.url || prod.images?.[0]?.url || null;
                                    return (
                                        <tr key={prod._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(prod._id)}
                                                    onChange={(e) => handleSelectRow(prod._id, e.target.checked)}
                                                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {mainImage ? (
                                                        <img src={mainImage} alt={prod.name} className="w-12 h-12 object-cover rounded-lg border border-gray-100" />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-amber-50 border border-amber-100 rounded-lg flex items-center justify-center text-amber-800 font-bold text-xs">
                                                            TOY
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{prod.name}</p>
                                                        <p className="text-xs text-gray-400 font-mono mt-0.5">{prod.sku || 'No SKU'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-gray-900">{prod.category?.name || 'Unknown'}</p>
                                            </td>
                                            <td className="px-6 py-4 font-semibold text-amber-900">₹{(prod.price || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4">
                                                {prod.totalStock <= prod.lowStockAlert ? (
                                                    <Badge variant="red">{prod.totalStock} low</Badge>
                                                ) : (
                                                    <Badge variant="green">{prod.totalStock} in stock</Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleToggleStatus(prod)}
                                                    className="focus:outline-none hover:opacity-80 transition-opacity"
                                                >
                                                    {prod.isActive ? (
                                                        <Badge variant="green">Active</Badge>
                                                    ) : (
                                                        <Badge variant="gray">Inactive</Badge>
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2 mt-2">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleOpenForm(prod)}
                                                        className="p-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteClick(prod._id)}
                                                        className="p-1.5 text-red-600 hover:text-red-700 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paging */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center px-6 py-4 border-t border-gray-100 bg-gray-50">
                        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page === 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                disabled={page === totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Product Add/Edit Dialog Full Form Drawer */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        {/* Drawer Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {editId ? 'Edit Product Catalog Item' : 'New Product Catalog Item'}
                                </h2>
                                <p className="text-xs text-gray-500 mt-0.5">Build customized attributes and variants details.</p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Section 1: Base details */}
                            <div className="space-y-4">
                                <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2">Basic Information</h3>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Product Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g. Classic Wooden Train"
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Base SKU *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.sku}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. TOY-TRAIN-01"
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Category *</label>
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={(e) => {
                                                const newCatId = e.target.value;
                                                setFormData(prev => ({ ...prev, category: newCatId }));
                                                generateSKU(newCatId, formData.subCategory);
                                            }}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Sub-Category *</label>
                                        <select
                                            required
                                            value={formData.subCategory}
                                            onChange={(e) => {
                                                const newSubId = e.target.value;
                                                setFormData(prev => ({ ...prev, subCategory: newSubId }));
                                                generateSKU(formData.category, newSubId);
                                            }}
                                            disabled={!formData.category}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white disabled:opacity-50"
                                        >
                                            <option value="">Select Sub-Category</option>
                                            {formSubCategories.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-semibold text-gray-700">Description *</label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, additionalInfo: [...prev.additionalInfo, { key: '', value: '' }] }))}
                                            className="text-xs font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1"
                                        >
                                            <Plus size={14} /> Add Field
                                        </button>
                                    </div>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Detailed description of the product features, benefits..."
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                    />
                                    
                                    {formData.additionalInfo?.map((info, idx) => (
                                        <div key={idx} className="flex gap-2 mt-2 items-start">
                                            <input 
                                                type="text" 
                                                placeholder="Field Name (e.g. Material)" 
                                                value={info.key}
                                                onChange={(e) => {
                                                    const newArr = [...formData.additionalInfo];
                                                    newArr[idx].key = e.target.value;
                                                    setFormData(prev => ({ ...prev, additionalInfo: newArr }));
                                                }}
                                                className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                            />
                                            <input 
                                                type="text" 
                                                placeholder="Value (e.g. Oak Wood)" 
                                                value={info.value}
                                                onChange={(e) => {
                                                    const newArr = [...formData.additionalInfo];
                                                    newArr[idx].value = e.target.value;
                                                    setFormData(prev => ({ ...prev, additionalInfo: newArr }));
                                                }}
                                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                            />
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const newArr = formData.additionalInfo.filter((_, i) => i !== idx);
                                                    setFormData(prev => ({ ...prev, additionalInfo: newArr }));
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Custom attributes */}
                            {mappedAttributes.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center gap-2">
                                        <Sparkles size={18} className="text-amber-600" />
                                        Custom Specifications
                                    </h3>
                                    <DynamicFormBuilder
                                        mappings={mappedAttributes}
                                        values={formData.attributeValues}
                                        onChange={handleAttributeValChange}
                                    />
                                </div>
                            )}

                            {/* Section 5: Dynamic Variants Table */}
                            {/* Section 5: Dynamic Variants Management */}
                            {mappedAttributes.some(m => m.attribute?.isVariant) && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                                        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                            <Layers size={18} className="text-amber-700" />
                                            Variant Management
                                        </h3>
                                    </div>
                                    <VariantManagement 
                                        variants={formData.variants}
                                        onChange={(variants) => setFormData(prev => ({ ...prev, variants }))}
                                        mappedAttributes={mappedAttributes}
                                        attributeValues={formData.attributeValues}
                                        baseSku={formData.sku}
                                        basePrice={formData.price}
                                        baseCostPrice={formData.costPrice}
                                        baseWeight={formData.shippingWeight}
                                    />
                                </div>
                            )}

                            {/* Section 6: SEO */}
                            <div className="border-t border-gray-100 pt-6 mt-6">
                                <h3 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Globe size={18} className="text-blue-600" />
                                    SEO & Search Indexing
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600">SEO Custom Title</label>
                                        <input
                                            type="text"
                                            value={formData.seoTitle}
                                            onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                                            placeholder="Page title for search engines"
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-semibold text-gray-600">SEO Keywords (comma separated)</label>
                                        <input
                                            type="text"
                                            value={formData.metaKeywords}
                                            onChange={(e) => setFormData(prev => ({ ...prev, metaKeywords: e.target.value }))}
                                            placeholder="building blocks, kids toys"
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 mt-4">
                                    <label className="text-xs font-semibold text-gray-600">SEO Snippet / Description</label>
                                    <textarea
                                        rows={3}
                                        value={formData.seoDescription}
                                        onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                                        placeholder="Google snippet text (max 160 characters)"
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                    />
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6">
                                <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" loading={formLoading}>
                                    Save Product
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={confirmAction}
                message={confirmMessage}
            />
        </div>
    );
};

export default ProductsPage;

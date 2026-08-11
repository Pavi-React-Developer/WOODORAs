import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings, ToggleLeft, ToggleRight, List, Columns, ShieldAlert, Download, RefreshCw, Sparkles, Layers, Globe, SquarePen, Trash, X, GripVertical, Image as ImageIcon } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { productV2API, categoryV2API, subCategoryV2API } from '../../../api/catalogV2Service';
import toast from 'react-hot-toast';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { SearchBar, Button, Badge, Card } from '../../../components/admin/CommonComponents';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import BulkActions from '../../../components/admin/BulkActions';
import ImageUploader from '../../../components/admin/ImageUploader';
import DynamicFormBuilder from '../../../components/admin/DynamicFormBuilder';
import VariantManagement from '../../../components/admin/VariantManagement';

const Field = ({ label, required, children }) => (
  <div>
    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
      {label} {required && <span className="text-red-500 text-lg ml-1">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = 'w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors';

export const ProductsPage = ({ canCreate = true, canEdit = true, canDelete = true, isAddMode = false, onCancelAdd = null }) => {
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
    const [isFormOpen, setIsFormOpen] = useState(isAddMode);

    useEffect(() => {
        if (isAddMode) {
            setIsFormOpen(true);
            setEditId(null);
            setFormData({
                name: '',
                description: '',
                category: '',
                subCategory: '',
                price: 0,
                stock: 0,
                sku: '',
                images: [],
                isActive: true,
                displayOrder: 1,
                seoTitle: '',
                seoDescription: '',
                attributeValues: {},
                additionalInfo: [],
                variants: [],
            });
        }
    }, [isAddMode]);

    const handleCloseForm = () => {
        window.history.pushState({}, '', '/admin/products');
        setIsFormOpen(false);
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
        setFormErrors({});
        setMappedAttributes([]);
        if (onCancelAdd) onCancelAdd();
    };

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
    const [formErrors, setFormErrors] = useState({});

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
        } else {
            setFormSubCategories([]);
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
        setMappedAttributes([]);
        if (product) {
            window.history.pushState({}, '', '/admin/products/edit');
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
                        lowStockAlert: prod.lowStockAlert !== undefined ? prod.lowStockAlert : 5,
                        isActive: prod.isActive !== undefined ? prod.isActive : true,
                        seoTitle: prod.seoTitle || '',
                        seoDescription: prod.seoDescription || '',
                        metaKeywords: Array.isArray(prod.metaKeywords) ? prod.metaKeywords.join(', ') : '',
                        tags: Array.isArray(prod.tags) ? prod.tags.join(', ') : '',
                        additionalInfo: prod.additionalInfo || [],
                        images: prod.images || [],
                        variants: (prod.variants || []).map(v => ({
                            ...v,
                            images: Array.isArray(v.images) ? v.images.map((img, idx) => {
                                const obj = typeof img === 'string' ? { url: img } : { ...img };
                                return {
                                    ...obj,
                                    altText: obj.altText || `Variant Image ${idx + 1}`,
                                    isThumbnail: obj.isThumbnail !== undefined ? obj.isThumbnail : idx === 0,
                                    displayOrder: obj.displayOrder !== undefined ? obj.displayOrder : idx + 1
                                };
                            }) : []
                        })),
                        attributeValues: attrVals,
                    });
                }
            } catch (err) {
                console.error(err);
                handleCloseForm();
            } finally {
                setFormLoading(false);
            }
        } else {
            window.history.pushState({}, '', '/admin/products/add');
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
        console.log('--- SAVE PRODUCT BUTTON CLICKED ---');
        console.log('Current form data:', formData);
        setErrorMsg('');

        let errors = {};
        if (!formData.name || formData.name.trim().length < 3) errors.name = 'Product name must be at least 3 characters.';
        if (!formData.category) errors.category = 'Category is required.';
        if (!formData.subCategory) errors.subCategory = 'Sub-Category is required.';
        if (formData.price < 0) errors.price = 'Price cannot be negative.';
        if (!formData.description || formData.description.trim().length < 10) errors.description = 'Description must be at least 10 characters long.';

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error("Please fix the validation errors at the top of the form before saving.");

            setTimeout(() => {
                const firstErrorEl = document.querySelector('.border-red-500');
                if (firstErrorEl) {
                    firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 100);
            return;
        }

        setFormLoading(true);

        // Transform attribute values format back into Mongoose array format
        const avArray = Object.entries(formData.attributeValues).map(([attrId, payload]) => ({
            attributeId: attrId,
            ...payload
        }));

        // Extract images from variants since Product-level image section is removed
        let derivedImages = [];
        if (formData.variants && formData.variants.length > 0) {
            const uniqueUrls = new Set();
            formData.variants.forEach(v => {
                if (Array.isArray(v.images)) {
                    v.images.forEach(img => {
                        const url = typeof img === 'string' ? img : img.url;
                        if (url && !uniqueUrls.has(url)) {
                            uniqueUrls.add(url);
                            derivedImages.push(img);
                        }
                    });
                }
            });
        }

        const payload = {
            ...formData,
            images: derivedImages.length > 0 ? derivedImages : formData.images,
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
            handleCloseForm();
            fetchProducts();
        } catch (err) {
            const msg = err.message || 'Failed to save product';
            setErrorMsg(msg);
            toast.error(msg);
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
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                    <p className="text-[13px] md:text-sm font-serif text-[#94A3B8] mb-1">
                        Dashboard &rsaquo; Catalog Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Products</span>
                    </p>
                    <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Products</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchProducts} className="admin-secondary-btn">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={exportProductsExcel} className="admin-export-btn">
                        <Download size={16} /> Export Excel
                    </button>
                    {canCreate && (
                        <button onClick={() => handleOpenForm()} className="admin-btn">
                            <Plus size={16} /> Add Product
                        </button>
                    )}
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
                onClear={() => setSelectedIds([])}
            />

            {/* Data Table */}
            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
                            <tr>
                                <th className="px-4 py-3.5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={products.length > 0 && selectedIds.length === products.length}
                                        onChange={e => handleSelectAll(e.target.checked)}
                                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                    />
                                </th>
                                {['Product', 'Category', 'Price', 'Total Stock', 'Status', 'Actions'].map(h => (
                                    <th key={h} className={`px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap ${h === 'Actions' ? 'text-right pr-8' : 'text-left'}`}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
                                        Loading catalog products...
                                    </div>
                                </td></tr>
                            ) : products.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center text-2xl">🧸</div>
                                        <p className="font-medium">No products matched criteria.</p>
                                    </div>
                                </td></tr>
                            ) : (
                                products.map((prod, idx) => {
                                    const mainImage = prod.images?.find(img => img.isThumbnail)?.url || prod.images?.[0]?.url || null;
                                    return (
                                        <tr
                                            key={prod._id}
                                            className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                                        >
                                            <td className="px-4 py-3.5">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(prod._id)}
                                                    onChange={(e) => handleSelectRow(prod._id, e.target.checked)}
                                                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                                />
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    {mainImage ? (
                                                        <img src={mainImage} alt={prod.name} className="w-12 h-12 object-cover rounded-lg border border-[#E6DFD4]" />
                                                    ) : (
                                                        <div className="w-12 h-12 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-[#8B5E3C] font-bold text-xs">
                                                            TOY
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="font-semibold text-gray-800">{prod.name}</p>
                                                        <p className="text-xs text-gray-400 font-mono mt-0.5">{prod.sku || 'No SKU'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 font-semibold text-[#8B5E3C]">{prod.category?.name || 'Unknown'}</td>
                                            <td className="px-4 py-3.5 font-semibold text-amber-900">₹{(prod.price || 0).toFixed(2)}</td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${prod.isLowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {prod.totalStock} {prod.isLowStock ? 'low' : 'in stock'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                {canEdit ? (
                                                    <button onClick={() => handleToggleStatus(prod)} title="Click to toggle">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${prod.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                            }`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${prod.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                            {prod.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </button>
                                                ) : (
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${prod.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${prod.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                        {prod.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3.5 pr-8">
                                                <div className="flex gap-2 justify-end">
                                                    {canEdit && (
                                                        <button
                                                            onClick={() => handleOpenForm(prod)}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <SquarePen size={16} />
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            onClick={() => handleDeleteClick(prod._id)}
                                                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Paging */}
                <div className="px-5 py-3 border-t border-[#E6DFD4] flex flex-col sm:flex-row justify-center items-center bg-[#FAFAFA] gap-4">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        className="flex items-center justify-center gap-2 flex-wrap"
                    />
                </div>
            </div>

            {/* Product Add/Edit Dialog Full Form Drawer */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-[#141225] tracking-tight">{editId ? 'Edit Product Catalog Item' : 'New Product Catalog Item'}</h2>
                            </div>
                            <button onClick={handleCloseForm} className="p-2 rounded-full hover:bg-[#E6DFD4] text-gray-400 hover:text-gray-700 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <form onSubmit={handleSave} noValidate className="flex-1 overflow-y-auto p-6 space-y-8">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Section 1: Base details */}
                            <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                    <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">📦</span>
                                    Basic Information
                                </h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Product Name" required>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); if (formErrors.name) setFormErrors({ ...formErrors, name: '' }); }}
                                            placeholder="e.g. Classic Wooden Train"
                                            className={inputCls + (formErrors.name ? ' border-red-500 focus:ring-red-500' : '')}
                                        />
                                        {formErrors.name && <p className="text-red-500 text-[10px] mt-1">{formErrors.name}</p>}
                                    </Field>
                                    <Field label="Base SKU" required>
                                        <input
                                            type="text"
                                            required
                                            value={formData.sku}
                                            onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                                            placeholder="e.g. TOY-TRAIN-01"
                                            className={inputCls + ' font-mono'}
                                        />
                                    </Field>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Category" required>
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={(e) => {
                                                const newCatId = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    category: newCatId,
                                                    subCategory: '',
                                                    attributeValues: {}
                                                }));
                                                setMappedAttributes([]);
                                                generateSKU(newCatId, '');
                                                if (formErrors.category) setFormErrors({ ...formErrors, category: '' });
                                            }}
                                            className={inputCls + ' bg-white' + (formErrors.category ? ' border-red-500 focus:ring-red-500' : '')}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                        {formErrors.category && <p className="text-red-500 text-[10px] mt-1">{formErrors.category}</p>}
                                    </Field>
                                    <Field label="Sub-Category" required>
                                        <select
                                            required
                                            value={formData.subCategory}
                                            onChange={(e) => {
                                                const newSubId = e.target.value;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    subCategory: newSubId,
                                                    attributeValues: {}
                                                }));
                                                generateSKU(formData.category, newSubId);
                                            }}
                                            disabled={!formData.category}
                                            className={inputCls + ' bg-white disabled:opacity-50' + (formErrors.subCategory ? ' border-red-500 focus:ring-red-500' : '')}
                                        >
                                            <option value="">Select Sub-Category</option>
                                            {formSubCategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                        {formErrors.subCategory && <p className="text-red-500 text-[10px] mt-1">{formErrors.subCategory}</p>}
                                    </Field>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="text-[15px] font-serif font-bold text-[#3E2723]">Description <span className="text-red-500 text-lg ml-1">*</span></label>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, additionalInfo: [...(prev.additionalInfo || []), { key: '', value: '' }] }))}
                                            className="text-xs font-bold text-[#8B5E3C] hover:text-[#7a5234] flex items-center gap-1 bg-[#F8F4EC] px-2 py-1 rounded-md"
                                        >
                                            <Plus size={14} /> Add Field
                                        </button>
                                    </div>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.description}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, description: e.target.value }));
                                            if (formErrors.description) setFormErrors({ ...formErrors, description: '' });
                                        }}
                                        placeholder="Detailed description of the product features, benefits..."
                                        className={inputCls + (formErrors.description ? ' border-red-500 focus:ring-red-500' : '')}
                                    />
                                    {formErrors.description && <p className="text-red-500 text-[10px] mt-1">{formErrors.description}</p>}

                                    {formData.additionalInfo?.map((info, idx) => (
                                        <div key={idx} className="flex gap-2 mt-3 items-start bg-white p-3 rounded-xl border border-[#E6DFD4]">
                                            <div className="w-1/3">
                                                <input
                                                    type="text"
                                                    placeholder="Field Name (e.g. Material)"
                                                    value={info.key}
                                                    onChange={(e) => {
                                                        const newArr = [...formData.additionalInfo];
                                                        newArr[idx].key = e.target.value;
                                                        setFormData(prev => ({ ...prev, additionalInfo: newArr }));
                                                    }}
                                                    className={inputCls}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <textarea
                                                    rows={1}
                                                    placeholder="Value (e.g. Oak Wood)"
                                                    value={info.value}
                                                    onChange={(e) => {
                                                        const newArr = [...formData.additionalInfo];
                                                        newArr[idx].value = e.target.value;
                                                        setFormData(prev => ({ ...prev, additionalInfo: newArr }));
                                                    }}
                                                    className={inputCls + ' resize-y min-h-[44px]'}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newArr = formData.additionalInfo.filter((_, i) => i !== idx);
                                                    setFormData(prev => ({ ...prev, additionalInfo: newArr }));
                                                }}
                                                className="mt-2.5 p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Section 2: Custom attributes */}
                            {mappedAttributes.length > 0 && (
                                <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                    <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                        <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">✨</span>
                                        Custom Specifications
                                    </h3>
                                    <DynamicFormBuilder
                                        mappings={mappedAttributes}
                                        values={formData.attributeValues}
                                        onChange={handleAttributeValChange}
                                    />
                                </div>
                            )}

                            {/* Section 5: Dynamic Variants Management */}
                            {mappedAttributes.some(m => m.attribute?.isVariant) && (
                                <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                    <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                        <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">📑</span>
                                        Variant Management
                                    </h3>
                                    <VariantManagement
                                        variants={formData.variants}
                                        onChange={(updater) => setFormData(prev => ({
                                            ...prev,
                                            variants: typeof updater === 'function' ? updater(prev.variants) : updater
                                        }))}
                                        mappedAttributes={mappedAttributes}
                                        attributeValues={formData.attributeValues}
                                        baseSku={formData.sku}
                                        basePrice={formData.price}
                                        baseCostPrice={formData.costPrice}
                                        baseWeight={formData.shippingWeight}
                                        baseDimensions={formData.dimensions}
                                        baseImages={formData.images}
                                    />
                                </div>
                            )}

                            {/* Section 6: SEO */}
                            <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                    <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">🌐</span>
                                    SEO & Search Indexing
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="SEO Custom Title">
                                        <input
                                            type="text"
                                            value={formData.seoTitle}
                                            onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                                            placeholder="Page title for search engines"
                                            className={inputCls}
                                        />
                                    </Field>
                                    <Field label="SEO Keywords (comma separated)">
                                        <input
                                            type="text"
                                            value={formData.metaKeywords}
                                            onChange={(e) => setFormData(prev => ({ ...prev, metaKeywords: e.target.value }))}
                                            placeholder="building blocks, kids toys"
                                            className={inputCls}
                                        />
                                    </Field>
                                </div>
                                <Field label="SEO Snippet / Description">
                                    <textarea
                                        rows={3}
                                        value={formData.seoDescription}
                                        onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                                        placeholder="Google snippet text (max 160 characters)"
                                        className={inputCls}
                                    />
                                </Field>
                            </div>

                            {/* Form Actions */}
                            <div className="flex items-center justify-center gap-4 pt-6 pb-2">
                                <button type="button" onClick={handleCloseForm} className="px-8 py-3 border border-[#E6DFD4] rounded-full text-[15px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                                    CANCEL
                                </button>
                                <button type="submit" disabled={formLoading} className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm uppercase tracking-wide">
                                    {formLoading ? 'Saving...' : 'SAVE PRODUCT'}
                                </button>
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

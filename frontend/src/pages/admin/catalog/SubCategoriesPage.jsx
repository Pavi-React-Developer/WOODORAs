import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Settings, ToggleLeft, ToggleRight, List, Columns, ShieldAlert, Download, RefreshCw } from 'lucide-react';
import { subCategoryV2API, categoryV2API, attributeV2API } from '../../../api/catalogV2Service';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { SearchBar, Button, Badge, Card } from '../../../components/admin/CommonComponents';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import BulkActions from '../../../components/admin/BulkActions';

export const SubCategoriesPage = ({ canCreate = true, canEdit = true, canDelete = true }) => {
    // Lists
    const [subCategories, setSubCategories] = useState([]);
    const [categories, setCategories] = useState([]);
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Form/Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        category: '',
        description: '',
        displayOrder: 1,
        isActive: true,
        seoTitle: '',
        seoDescription: '',
        seoKeywords: '',
    });
    const [formLoading, setFormLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Mapping state
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [mappingSubId, setMappingSubId] = useState(null);
    const [mappingSubName, setMappingSubName] = useState('');
    const [mappedAttributes, setMappedAttributes] = useState([]); // Array of mapping models
    const [mapLoading, setMapLoading] = useState(false);

    // Selection/Bulk state
    const [selectedIds, setSelectedIds] = useState([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    useEffect(() => {
        fetchSubCategories();
        fetchCategories();
        fetchAttributes();
    }, [search, categoryFilter, page]);

    const fetchSubCategories = async () => {
        setLoading(true);
        try {
            const res = await subCategoryV2API.getAll({
                search,
                category: categoryFilter,
                page,
                limit: 10,
            });
            if (res.success) {
                setSubCategories(res.subCategories || []);
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
            if (res.success) {
                setCategories(res.categories || []);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchAttributes = async () => {
        try {
            const res = await attributeV2API.getAll({ limit: 100 });
            if (res.success) {
                setAttributes(res.attributes || []);
            }
        } catch (err) {
            console.error(err);
        }
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
            setSelectedIds(subCategories.map(s => s._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleOpenForm = (subCategory = null) => {
        if (subCategory) {
            setEditId(subCategory._id);
            setFormData({
                name: subCategory.name || '',
                slug: subCategory.slug || '',
                category: subCategory.category?._id || subCategory.category || '',
                description: subCategory.description || '',
                displayOrder: subCategory.displayOrder || 1,
                isActive: subCategory.isActive !== undefined ? subCategory.isActive : true,
                seoTitle: subCategory.seoTitle || '',
                seoDescription: subCategory.seoDescription || '',
                seoKeywords: Array.isArray(subCategory.seoKeywords) ? subCategory.seoKeywords.join(', ') : '',
            });
        } else {
            setEditId(null);
            setFormData({
                name: '',
                slug: '',
                category: categories[0]?._id || '',
                description: '',
                displayOrder: 1,
                isActive: true,
                seoTitle: '',
                seoDescription: '',
                seoKeywords: '',
            });
        }
        setErrorMsg('');
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setErrorMsg('');

        const payload = {
            ...formData,
            seoKeywords: formData.seoKeywords.split(',').map(s => s.trim()).filter(Boolean),
            displayOrder: Number(formData.displayOrder),
        };

        try {
            if (editId) {
                await subCategoryV2API.update(editId, payload);
            } else {
                await subCategoryV2API.create(payload);
            }
            setIsFormOpen(false);
            fetchSubCategories();
        } catch (err) {
            setErrorMsg(err.message || 'Failed to save subcategory');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClick = (id) => {
        setConfirmAction(() => async () => {
            await subCategoryV2API.delete(id);
            fetchSubCategories();
            setIsConfirmOpen(false);
        });
        setConfirmMessage('Are you sure you want to delete this subcategory?');
        setIsConfirmOpen(true);
    };

    const handleBulkDelete = () => {
        setConfirmAction(() => async () => {
            await subCategoryV2API.bulkDelete(selectedIds);
            setSelectedIds([]);
            fetchSubCategories();
            setIsConfirmOpen(false);
        });
        setConfirmMessage(`Are you sure you want to delete the ${selectedIds.length} selected subcategories?`);
        setIsConfirmOpen(true);
    };

    const handleBulkStatus = async (isActive) => {
        setLoading(true);
        try {
            await subCategoryV2API.bulkStatus(selectedIds, isActive);
            setSelectedIds([]);
            fetchSubCategories();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportSubCategoriesExcel = () => {
        const header = ['Sub-Category Name', 'Parent Category', 'Slug', 'Status', 'Display Order'];
        const rows = subCategories.map((sub) => [
            sub.name || '',
            sub.category?.name || '',
            sub.slug || '',
            sub.isActive ? 'Active' : 'Inactive',
            sub.displayOrder ?? '',
        ]);
        downloadExcelFile('sub_categories', header, rows);
    };

    const handleToggleStatus = async (subCategory) => {
        try {
            await subCategoryV2API.update(subCategory._id, { isActive: !subCategory.isActive });
            fetchSubCategories();
        } catch (err) {
            console.error(err);
        }
    };

    // Attribute Mapping Methods
    const handleOpenMapping = async (subCategory) => {
        setMappingSubId(subCategory._id);
        setMappingSubName(subCategory.name);
        setMapLoading(true);
        setIsMapOpen(true);

        try {
            const res = await subCategoryV2API.getMappedAttributes(subCategory._id);
            if (res.success) {
                setMappedAttributes(res.mappings || []);
            }
        } catch (err) {
            console.error(err);
            setMappedAttributes([]);
        } finally {
            setMapLoading(false);
        }
    };

    const handleToggleMapAttribute = (attributeId, isChecked) => {
        if (isChecked) {
            // Add new mapping entry
            setMappedAttributes(prev => [
                ...prev,
                {
                    attribute: { _id: attributeId },
                    isRequired: false,
                    displayOrder: prev.length + 1
                }
            ]);
        } else {
            // Remove entry
            setMappedAttributes(prev => prev.filter(m => m.attribute?._id !== attributeId));
        }
    };

    const handleMapValueChange = (attributeId, key, value) => {
        setMappedAttributes(prev =>
            prev.map(m => {
                if (m.attribute?._id === attributeId) {
                    return { ...m, [key]: value };
                }
                return m;
            })
        );
    };

    const handleSaveMapping = async () => {
        setMapLoading(true);
        try {
            // Convert to payload format
            const payload = mappedAttributes.map(m => ({
                attributeId: m.attribute?._id,
                isRequired: m.isRequired,
                displayOrder: Number(m.displayOrder || 1)
            }));
            await subCategoryV2API.mapAttributes(mappingSubId, payload);
            setIsMapOpen(false);
        } catch (err) {
            console.error(err);
        } finally {
            setMapLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Sub-Categories</h1>
                    <p className="text-gray-500 mt-1">Manage subcategories and map fields or specifications to them.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button onClick={fetchSubCategories} className="admin-secondary-btn">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={exportSubCategoriesExcel} className="admin-export-btn flex items-center gap-2">
                        <Download size={16} /> Export Excel
                    </button>
                    {canCreate && (
                    <Button onClick={() => handleOpenForm()} className="shadow-lg hover:shadow-xl transition-all">
                        <Plus size={20} />
                        Add Sub-Category
                    </Button>
                    )}
                </div>
            </div>

            {/* Filter Panel */}
            <Card className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search subcategories..."
                    className="w-full sm:max-w-xs"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                    <option value="">All Categories</option>
                    {categories.map(c => (
                        <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                </select>
            </Card>

            {(canEdit || canDelete) && (
            <BulkActions
                selectedIds={selectedIds}
                onBulkDelete={canDelete ? handleBulkDelete : undefined}
                onBulkStatusChange={canEdit ? handleBulkStatus : undefined}
            />
            )}

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length > 0 && selectedIds.length === subCategories.length}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                    />
                                </th>
                                <th className="px-6 py-4">Sub-Category Name</th>
                                <th className="px-6 py-4">Parent Category</th>
                                <th className="px-6 py-4">Slug</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Loading subcategories...
                                    </td>
                                </tr>
                            ) : subCategories.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-8 text-gray-400">
                                        No subcategories found.
                                    </td>
                                </tr>
                            ) : (
                                subCategories.map((sub) => (
                                    <tr key={sub._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(sub._id)}
                                                onChange={(e) => handleSelectRow(sub._id, e.target.checked)}
                                                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{sub.name}</td>
                                        <td className="px-6 py-4 text-amber-800 font-semibold">{sub.category?.name || 'Unknown'}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{sub.slug}</td>
                                        <td className="px-6 py-4">
                                            {canEdit ? (
                                                <button
                                                    onClick={() => handleToggleStatus(sub)}
                                                    className="focus:outline-none hover:opacity-80 transition-opacity"
                                                >
                                                    {sub.isActive ? (
                                                        <Badge variant="green">Active</Badge>
                                                    ) : (
                                                        <Badge variant="gray">Inactive</Badge>
                                                    )}
                                                </button>
                                            ) : (
                                                sub.isActive ? (
                                                    <Badge variant="green">Active</Badge>
                                                ) : (
                                                    <Badge variant="gray">Inactive</Badge>
                                                )
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {canEdit && (
                                            <button
                                                onClick={() => handleOpenMapping(sub)}
                                                className="p-1.5 hover:bg-amber-50 rounded-lg text-amber-700 hover:text-amber-800 transition-colors"
                                                title="Map Fields/Attributes"
                                            >
                                                <Settings size={16} />
                                            </button>
                                            )}
                                            {canEdit && (
                                            <button
                                                onClick={() => handleOpenForm(sub)}
                                                className="p-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            )}
                                            {canDelete && (
                                            <button
                                                onClick={() => handleDeleteClick(sub._id)}
                                                className="p-1.5 text-red-600 hover:text-red-700 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
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

            {/* Create/Edit Drawer */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editId ? 'Edit Sub-Category' : 'Create Sub-Category'}
                            </h2>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Sub-Category Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. Wooden Block Set"
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Parent Category *</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                                    >
                                        <option value="">Select Parent Category</option>
                                        {categories.map(c => (
                                            <option key={c._id} value={c._id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Slug (Optional)</label>
                                    <input
                                        type="text"
                                        value={formData.slug}
                                        onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                                        placeholder="e.g. wooden-block-set"
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Description</label>
                                    <textarea
                                        rows={3}
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Enter subcategory description..."
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Display Order</label>
                                        <input
                                            type="number"
                                            value={formData.displayOrder}
                                            onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value }))}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5 justify-center mt-6">
                                        <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                                            <input
                                                type="checkbox"
                                                checked={formData.isActive}
                                                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                                className="rounded text-amber-600 focus:ring-amber-500"
                                            />
                                            Active Status
                                        </label>
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-4 mt-6">
                                    <h3 className="font-bold text-gray-800 text-sm mb-3">SEO & Metadata Settings</h3>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">SEO Title</label>
                                            <input
                                                type="text"
                                                value={formData.seoTitle}
                                                onChange={(e) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                                                placeholder="Meta title for Google search"
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">SEO Description</label>
                                            <textarea
                                                rows={2}
                                                value={formData.seoDescription}
                                                onChange={(e) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                                                placeholder="Meta description for search snippets"
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-xs font-semibold text-gray-600">SEO Keywords (comma separated)</label>
                                            <input
                                                type="text"
                                                value={formData.seoKeywords}
                                                onChange={(e) => setFormData(prev => ({ ...prev, seoKeywords: e.target.value }))}
                                                placeholder="toys, blocks, stacking"
                                                className="px-4 py-2 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" loading={formLoading}>
                                    Save
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Map Attributes Drawer */}
            {isMapOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Map Custom Fields</h2>
                                <p className="text-xs text-amber-800 font-semibold mt-0.5">Sub-Category: {mappingSubName}</p>
                            </div>
                            <button
                                onClick={() => setIsMapOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {mapLoading ? (
                                <div className="text-center py-12 text-gray-400">
                                    <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    Loading mapped specifications...
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 leading-relaxed mb-4">
                                        Select and prioritize the specifications or custom attributes that products in this subcategory should possess. Checked attributes will dynamically generate form fields during product entry.
                                    </p>

                                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                                        {attributes.map(attr => {
                                            const mapEntry = mappedAttributes.find(m => m.attribute?._id === attr._id);
                                            const isChecked = !!mapEntry;

                                            return (
                                                <div key={attr._id} className={`flex items-center justify-between p-4 transition-all ${
                                                    isChecked ? 'bg-amber-50/30' : 'hover:bg-gray-50/50'
                                                }`}>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={(e) => handleToggleMapAttribute(attr._id, e.target.checked)}
                                                            className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                                                        />
                                                        <div>
                                                            <p className="font-semibold text-gray-900 text-sm">{attr.name}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <Badge size="sm" variant="gray">{attr.type}</Badge>
                                                                {attr.code && <span className="text-[10px] text-gray-400 font-mono">[{attr.code}]</span>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isChecked && (
                                                        <div className="flex items-center gap-4">
                                                            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={mapEntry.isRequired || false}
                                                                    onChange={(e) => handleMapValueChange(attr._id, 'isRequired', e.target.checked)}
                                                                    className="rounded text-amber-600 focus:ring-amber-500"
                                                                />
                                                                Required
                                                            </label>

                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-xs text-gray-500">Order:</span>
                                                                <input
                                                                    type="number"
                                                                    value={mapEntry.displayOrder || 1}
                                                                    onChange={(e) => handleMapValueChange(attr._id, 'displayOrder', e.target.value)}
                                                                    className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                            <Button variant="secondary" onClick={() => setIsMapOpen(false)}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSaveMapping} loading={mapLoading}>
                                Save Mapping
                            </Button>
                        </div>
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

export default SubCategoriesPage;

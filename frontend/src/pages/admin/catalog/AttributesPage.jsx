import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, ChevronDown, Check, X, Download, RefreshCw } from 'lucide-react';
import { attributeV2API, categoryV2API, subCategoryV2API } from '../../../api/catalogV2Service';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { SearchBar, Button, Badge, Card } from '../../../components/admin/CommonComponents';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';

export const AttributesPage = ({ canCreate = true, canEdit = true, canDelete = true }) => {
    const [attributes, setAttributes] = useState([]);
    const [categories, setCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [subCategoryFilter, setSubCategoryFilter] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Form/Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        category: '',
        subCategory: '',
        type: 'Text',
        description: '',
        displayOrder: 1,
        isActive: true,
        isRequired: false,
        isSearchable: false,
        isFilterable: false,
        visibleOnProduct: true,
        visibleOnWebsite: true,
        values: [], // Array of { value, colorCode, displayOrder }
    });
    const [formLoading, setFormLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Inline value creation states (within the form)
    const [newValue, setNewValue] = useState('');
    const [newColorCode, setNewColorCode] = useState('#d97706'); // Default color code

    // Confirm state
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmMessage, setConfirmMessage] = useState('');

    useEffect(() => {
        fetchAttributes();
    }, [search, categoryFilter, subCategoryFilter, page]);

    useEffect(() => {
        fetchCategories();
        fetchSubCategories();
    }, []);

    const fetchAttributes = async () => {
        setLoading(true);
        try {
            const res = await attributeV2API.getAll({
                search,
                category: categoryFilter,
                subCategory: subCategoryFilter,
                page,
                limit: 10,
            });
            if (res.success) {
                setAttributes(res.attributes || []);
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
            const res = await categoryV2API.getAll({ limit: 1000, isActive: 'true' });
            if (res.success) setCategories(res.categories || []);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchSubCategories = async () => {
        try {
            const res = await subCategoryV2API.getAll({ limit: 1000, isActive: 'true' });
            if (res.success) setSubCategories(res.subCategories || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleOpenForm = (attr = null) => {
        if (attr) {
            setEditId(attr._id);
            setFormData({
                name: attr.name || '',
                code: attr.code || '',
                category: attr.category?._id || attr.category || '',
                subCategory: attr.subCategory?._id || attr.subCategory || '',
                type: attr.type || 'Text',
                description: attr.description || '',
                displayOrder: attr.displayOrder || 1,
                isActive: attr.isActive !== undefined ? attr.isActive : true,
                isRequired: attr.isRequired !== undefined ? attr.isRequired : false,
                isSearchable: attr.isSearchable !== undefined ? attr.isSearchable : false,
                isFilterable: attr.isFilterable !== undefined ? attr.isFilterable : false,
                isVariant: attr.isVariant !== undefined ? attr.isVariant : false,
                visibleOnProduct: attr.visibleOnProduct !== undefined ? attr.visibleOnProduct : true,
                visibleOnWebsite: attr.visibleOnWebsite !== undefined ? attr.visibleOnWebsite : true,
                values: attr.values ? attr.values.map(v => ({
                    value: v.value,
                    colorCode: v.colorCode || '',
                    displayOrder: v.displayOrder || 1
                })) : [],
            });
        } else {
            setEditId(null);
            setFormData({
                name: '',
                code: '',
                category: categories[0]?._id || '',
                subCategory: '',
                type: 'Text',
                description: '',
                displayOrder: 1,
                isActive: true,
                isRequired: false,
                isSearchable: false,
                isFilterable: false,
                isVariant: false,
                visibleOnProduct: true,
                visibleOnWebsite: true,
                values: [],
            });
        }
        setNewValue('');
        setErrorMsg('');
        setIsFormOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setErrorMsg('');

        try {
            if (editId) {
                await attributeV2API.update(editId, formData);
            } else {
                await attributeV2API.create(formData);
            }
            setIsFormOpen(false);
            fetchAttributes();
        } catch (err) {
            setErrorMsg(err.message || 'Failed to save attribute');
        } finally {
            setFormLoading(false);
        }
    };

    const exportAttributesExcel = () => {
        const header = ['Attribute ID', 'Name', 'Code', 'Category', 'SubCategory', 'Type', 'Required', 'Searchable', 'Filterable', 'Active', 'Created At'];
        const rows = attributes.map(attr => ({
            'Attribute ID': attr._id,
            'Name': attr.name || '',
            'Code': attr.code || '',
            'Category': attr.category?.name || attr.category || '',
            'SubCategory': attr.subCategory?.name || attr.subCategory || '',
            'Type': attr.type || '',
            'Required': attr.isRequired ? 'Yes' : 'No',
            'Searchable': attr.isSearchable ? 'Yes' : 'No',
            'Filterable': attr.isFilterable ? 'Yes' : 'No',
            'Active': attr.isActive ? 'Yes' : 'No',
            'Created At': attr.createdAt ? new Date(attr.createdAt).toLocaleString('en-IN') : '',
        }));
        downloadExcelFile('attributes', header, rows);
    };

    const handleDeleteClick = (id) => {
        setConfirmAction(() => async () => {
            await attributeV2API.delete(id);
            fetchAttributes();
            setIsConfirmOpen(false);
        });
        setConfirmMessage('Are you sure you want to delete this attribute? All mapped settings will be cleared.');
        setIsConfirmOpen(true);
    };

    // Value lists helpers
    const handleAddValueOption = () => {
        if (!newValue.trim()) return;

        const inputs = newValue.split(',').map(s => s.trim()).filter(Boolean);
        let newValues = [...formData.values];
        let displayOrder = newValues.length + 1;
        let addedCount = 0;

        inputs.forEach(inputVal => {
            if (!newValues.some(v => v.value.toLowerCase() === inputVal.toLowerCase())) {
                newValues.push({
                    value: inputVal,
                    colorCode: formData.type === 'ColorPicker' ? newColorCode : undefined,
                    displayOrder: displayOrder++
                });
                addedCount++;
            }
        });

        if (addedCount === 0) {
            setErrorMsg('Value option(s) already exist in this list');
            return;
        }

        setFormData(prev => ({
            ...prev,
            values: newValues
        }));
        setNewValue('');
        setErrorMsg('');
    };

    const handleRemoveValueOption = (index) => {
        setFormData(prev => ({
            ...prev,
            values: prev.values.filter((_, idx) => idx !== index)
        }));
    };

    const hasOptionsList = ['Dropdown', 'MultiSelect', 'Checkbox', 'RadioButton', 'ColorPicker'].includes(formData.type);
    const formSubCategories = subCategories.filter(s => (s.category?._id || s.category) === formData.category);
    const filterSubCategories = subCategories.filter(s => (s.category?._id || s.category) === categoryFilter);
    const inputTypes = [
        ['Text', 'Textbox'],
        ['Textarea', 'Textarea'],
        ['Number', 'Number Input'],
        ['Dropdown', 'Dropdown'],
        ['MultiSelect', 'Multi Select'],
        ['Checkbox', 'Checkbox Group'],
        ['RadioButton', 'Radio Group'],
        ['ColorPicker', 'Color Picker'],
        ['Date', 'Date Picker'],
        ['Boolean', 'Toggle Switch'],
        ['File', 'File URL'],
        ['Image', 'Image URL'],
    ];

    // Auto-generate unique System Code from Attribute Name (only for new attributes)
    const generateCode = (name) => {
        if (editId) return; // Don't overwrite on edit
        // Convert to SNAKE_UPPER_CASE: trim, replace spaces/special chars with _, uppercase
        const base = name
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, ''); // strip leading/trailing underscores

        if (!base) {
            setFormData(prev => ({ ...prev, code: '' }));
            return;
        }

        // Check against already-loaded attributes for uniqueness
        const existingCodes = attributes.map(a => (a.code || '').toUpperCase());
        let candidate = base;
        let counter = 2;
        while (existingCodes.includes(candidate)) {
            candidate = `${base}_${counter}`;
            counter++;
        }
        setFormData(prev => ({ ...prev, code: candidate }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Attributes</h1>
                    <p className="text-gray-500 mt-1">Configure specification formats and dropdown selection elements.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchAttributes} className="admin-secondary-btn">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={exportAttributesExcel} className="admin-export-btn">
                        <Download size={16} /> Export Excel
                    </button>
                    {canCreate && (
                    <Button onClick={() => handleOpenForm()} className="shadow-lg hover:shadow-xl transition-all">
                        <Plus size={20} />
                        Add Attribute
                    </Button>
                    )}
                </div>
            </div>

            {/* Filter */}
            <Card className="p-4 flex flex-col sm:flex-row gap-4 items-center">
                <SearchBar
                    value={search}
                    onChange={setSearch}
                    placeholder="Search attributes..."
                    className="w-full sm:max-w-xs"
                />
                <select
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setSubCategoryFilter('');
                        setPage(1);
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
                        setPage(1);
                    }}
                    disabled={!categoryFilter}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                >
                    <option value="">All Sub Categories</option>
                    {filterSubCategories.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                </select>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                                <th className="px-6 py-4">Attribute Name</th>
                                <th className="px-6 py-4">Mapping</th>
                                <th className="px-6 py-4">System Code</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Options/Values</th>
                                <th className="px-6 py-4">Validation</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400">
                                        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Loading attributes...
                                    </td>
                                </tr>
                            ) : attributes.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-8 text-gray-400">
                                        No attributes configured yet.
                                    </td>
                                </tr>
                            ) : (
                                attributes.map((attr) => (
                                    <tr key={attr._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-semibold text-gray-900">{attr.name}</p>
                                            {attr.description && <p className="text-xs text-gray-400 mt-0.5">{attr.description}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-semibold text-gray-900">{attr.category?.name || 'Unmapped'}</p>
                                            <p className="text-xs text-gray-500">{attr.subCategory?.name || '-'}</p>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{attr.code || '-'}</td>
                                        <td className="px-6 py-4">
                                            <Badge variant="amber">{attr.type}</Badge>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            {attr.values && attr.values.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {attr.values.slice(0, 4).map((v, i) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                                            {attr.type === 'ColorPicker' && (
                                                                <span className="w-2.5 h-2.5 rounded-full mr-1.5 border border-black/10" style={{ backgroundColor: v.colorCode }} />
                                                            )}
                                                            {v.value}
                                                        </span>
                                                    ))}
                                                    {attr.values.length > 4 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-500">
                                                            +{attr.values.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No values defined</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {attr.isRequired && <Badge size="sm" variant="red">Required</Badge>}
                                                {attr.isSearchable && <Badge size="sm" variant="green">Searchable</Badge>}
                                                {attr.isFilterable && <Badge size="sm" variant="amber">Filterable</Badge>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {canEdit && (
                                            <button
                                                onClick={() => handleOpenForm(attr)}
                                                className="p-1.5 text-blue-600 hover:text-blue-700 transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            )}
                                            {canDelete && (
                                            <button
                                                onClick={() => handleDeleteClick(attr._id)}
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

            {/* Create/Edit Attribute Form Drawer */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editId ? 'Edit Attribute' : 'Create Attribute'}
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Category *</label>
                                        <select
                                            required
                                            value={formData.category}
                                            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value, subCategory: '' }))}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(c => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Sub Category *</label>
                                        <select
                                            required
                                            value={formData.subCategory}
                                            onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))}
                                            disabled={!formData.category}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white disabled:opacity-50"
                                        >
                                            <option value="">Select Sub Category</option>
                                            {formSubCategories.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Attribute Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => {
                                                const newName = e.target.value;
                                                setFormData(prev => ({ ...prev, name: newName }));
                                                generateCode(newName);
                                            }}
                                            placeholder="e.g. Toy Material"
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">System Code *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.code}
                                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                                            placeholder="e.g. TOY_MATERIAL"
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Input Format / Type *</label>
                                    <select
                                        value={formData.type}
                                        onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value, values: [] }))}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
                                    >
                                        {inputTypes.map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-sm font-semibold text-gray-700">Description</label>
                                    <textarea
                                        rows={2}
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Add explanatory text below the input field..."
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-sm font-semibold text-gray-700">Display Order</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.displayOrder}
                                            onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value }))}
                                            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                        />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 mt-7">
                                        <input
                                            type="checkbox"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Active
                                    </label>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 border-t border-gray-100 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.isRequired}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isRequired: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Required
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.isSearchable}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isSearchable: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Searchable
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.isFilterable}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isFilterable: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Filterable
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.isVariant}
                                            onChange={(e) => setFormData(prev => ({ ...prev, isVariant: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Is Variant
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.visibleOnProduct}
                                            onChange={(e) => setFormData(prev => ({ ...prev, visibleOnProduct: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Product Form
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                                        <input
                                            type="checkbox"
                                            checked={formData.visibleOnWebsite}
                                            onChange={(e) => setFormData(prev => ({ ...prev, visibleOnWebsite: e.target.checked }))}
                                            className="rounded text-amber-600 focus:ring-amber-500"
                                        />
                                        Website Visible
                                    </label>
                                </div>

                                {/* Options manager */}
                                {hasOptionsList && (
                                    <div className="border-t border-gray-100 pt-6 mt-6">
                                        <h3 className="font-bold text-gray-900 text-sm mb-3">Value Options / Picklist</h3>
                                        
                                        <div className="flex gap-2 items-center mb-4">
                                            <input
                                                type="text"
                                                value={newValue}
                                                onChange={(e) => setNewValue(e.target.value)}
                                                placeholder={formData.type === 'ColorPicker' ? 'e.g. Natural Wood' : 'e.g. Maple'}
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                                            />
                                            {formData.type === 'ColorPicker' && (
                                                <input
                                                    type="color"
                                                    value={newColorCode}
                                                    onChange={(e) => setNewColorCode(e.target.value)}
                                                    className="w-10 h-10 border border-gray-300 rounded-lg p-0.5 cursor-pointer bg-white"
                                                />
                                            )}
                                            <Button type="button" size="sm" onClick={handleAddValueOption}>
                                                Add
                                            </Button>
                                        </div>

                                        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 border border-gray-200 rounded-xl">
                                            {formData.values.length === 0 ? (
                                                <span className="text-gray-400 text-xs italic">Define options using input above.</span>
                                            ) : (
                                                formData.values.map((val, idx) => (
                                                    <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-gray-200 shadow-xs"
                                                    >
                                                        {formData.type === 'ColorPicker' && (
                                                            <span className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs" style={{ backgroundColor: val.colorCode }} />
                                                        )}
                                                        {val.value}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveValueOption(idx)}
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                                                        >
                                                            ✕
                                                        </button>
                                                    </span>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                                <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
                                    Cancel
                                </Button>
                                <Button variant="primary" type="submit" loading={formLoading}>
                                    Save Attribute
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

export default AttributesPage;

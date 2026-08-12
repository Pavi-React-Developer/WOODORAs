import React, { useState, useEffect } from 'react';
import { Download, Plus, SquarePen, Trash, RefreshCw, X, PlusCircle, Settings2 } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import { attributeV2API, categoryV2API, subCategoryV2API } from '../../../api/catalogV2Service';
import { downloadExcelFile } from '../../../utils/exportUtils';
import { SearchBar, Button, Badge, Card } from '../../../components/admin/CommonComponents';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';

const Field = ({ label, required, children }) => (
    <div>
        <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
            {label} {required && <span className="text-red-500 text-lg ml-1">*</span>}
        </label>
        {children}
    </div>
);

const inputCls = 'w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors';

export const AttributesPage = ({ canCreate = true, canEdit = true, canDelete = true }) => {
    const [attributes, setAttributes] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);

    const toggleSelectAll = (checked) => {
        setSelectedIds(checked ? attributes.map(item => item._id) : []);
    };

    const toggleSelectOne = (id, checked) => {
        setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
    };
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
        window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '') + (editId || attr ? '/edit' : '/add')); setIsFormOpen(true);
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
            (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setIsFormOpen(false));
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

    const handleBulkDelete = () => {
        setConfirmAction(() => async () => {
            await Promise.all(selectedIds.map(id => attributeV2API.delete(id)));
            setSelectedIds([]);
            fetchAttributes();
            setIsConfirmOpen(false);
        });
        setConfirmMessage(`Are you sure you want to delete ${selectedIds.length} selected attribute(s)?`);
        setIsConfirmOpen(true);
    };

    const handleBulkStatus = (isActive) => {
        setConfirmAction(() => async () => {
            await Promise.all(selectedIds.map(id => attributeV2API.update(id, { isActive })));
            setSelectedIds([]);
            fetchAttributes();
            setIsConfirmOpen(false);
        });
        setConfirmMessage(`Set ${selectedIds.length} selected attribute(s) to ${isActive ? 'Active' : 'Inactive'}?`);
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
                    <p className="text-[13px] md:text-sm font-serif text-white mb-1">
                        Dashboard &rsaquo; Catalog Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Attributes</span>
                    </p>
                    <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Attributes</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchAttributes} className="admin-secondary-btn">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    <button onClick={exportAttributesExcel} className="admin-export-btn">
                        <Download size={16} /> Export Excel
                    </button>
                    {canCreate && (
                        <button onClick={() => handleOpenForm()} className="admin-btn">
                            <Plus size={16} /> Add Attribute
                        </button>
                    )}
                </div>
            </div>

            {/* Filter */}
            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <input
                        type="text"
                        placeholder="Search attributes..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setSubCategoryFilter('');
                        setPage(1);
                    }}
                    className="py-2.5 px-3 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
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
                    className="py-2.5 px-3 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
                    disabled={!categoryFilter}
                >
                    <option value="">All Sub-Categories</option>
                    {filterSubCategories.map(s => (
                        <option key={s._id} value={s._id}>{s.name}</option>
                    ))}
                </select>
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
                <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
                    <div className="flex gap-2 ml-auto flex-wrap">
                        {canEdit && (
                            <>
                                <button onClick={() => handleBulkStatus(true)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                                <button onClick={() => handleBulkStatus(false)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
                            </>
                        )}
                        {canDelete && (
                            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
                        )}
                        <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
                            <tr>
                                <th className="px-4 py-3.5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={attributes.length > 0 && selectedIds.length === attributes.length}
                                        onChange={e => toggleSelectAll(e.target.checked)}
                                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                    />
                                </th>
                                {['Attribute Name', 'Mapping', 'System Code', 'Type', 'Options/Values', 'Validation', 'Actions'].map(h => (
                                    <th key={h} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
                                        Loading attributes...
                                    </div>
                                </td></tr>
                            ) : attributes.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center text-2xl">🏷️</div>
                                        <p className="font-medium">No attributes configured yet.</p>
                                    </div>
                                </td></tr>
                            ) : (
                                attributes.map((attr, idx) => (
                                    <tr
                                        key={attr._id}
                                        className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}
                                    >
                                        <td className="px-4 py-3.5">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(attr._id)}
                                                onChange={e => toggleSelectOne(attr._id, e.target.checked)}
                                                className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <p className="font-semibold text-gray-800">{attr.name}</p>
                                            {attr.description && <p className="text-xs text-gray-400 mt-0.5">{attr.description}</p>}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <p className="text-xs font-semibold text-[#8B5E3C]">{attr.category?.name || 'Unmapped'}</p>
                                            <p className="text-xs text-gray-500">{attr.subCategory?.name || '-'}</p>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <code className="text-xs bg-[#F8F4EC] text-[#8B5E3C] px-2 py-1 rounded-md font-mono">{attr.code || '-'}</code>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">{attr.type}</span>
                                        </td>
                                        <td className="px-4 py-3.5 max-w-xs">
                                            {attr.values && attr.values.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {attr.values.slice(0, 4).map((v, i) => (
                                                        <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-[#F8F4EC] border border-[#E6DFD4] text-gray-700">
                                                            {attr.type === 'ColorPicker' && (
                                                                <span className="w-2.5 h-2.5 rounded-full mr-1.5 border border-black/10" style={{ backgroundColor: v.colorCode }} />
                                                            )}
                                                            {v.value}
                                                        </span>
                                                    ))}
                                                    {attr.values.length > 4 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                                                            +{attr.values.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-[#8B5E3C] text-xs italic opacity-70">No values defined</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex flex-wrap gap-1">
                                                {attr.isRequired && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Required</span>}
                                                {attr.isSearchable && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Searchable</span>}
                                                {attr.isFilterable && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">Filterable</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-2 justify-end">
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleOpenForm(attr)}
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <SquarePen size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteClick(attr._id)}
                                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center bg-white">
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                    />
                </div>
            </div>


            {/* Create/Edit Attribute Form Drawer */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        <div className="flex items-center justify-between px-8 py-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-[#141225] tracking-tight">{editId ? 'Edit Attribute' : 'Create Attribute'}</h2>
                            </div>
                            <button onClick={() => (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setIsFormOpen(false))} className="p-2 rounded-full hover:bg-[#E6DFD4] text-gray-400 hover:text-gray-700 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
                            {errorMsg && (
                                <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg font-medium">
                                    {errorMsg}
                                </div>
                            )}

                            {/* Classification */}
                            <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                    <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">📂</span>
                                    Classification
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Category" required>
                                        <select required value={formData.category} onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value, subCategory: '' }))} className={inputCls + ' bg-white'}>
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Sub Category" required>
                                        <select required value={formData.subCategory} onChange={(e) => setFormData(prev => ({ ...prev, subCategory: e.target.value }))} disabled={!formData.category} className={inputCls + ' bg-white disabled:opacity-50'}>
                                            <option value="">Select Sub Category</option>
                                            {formSubCategories.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                        </select>
                                    </Field>
                                </div>
                            </div>

                            {/* Basic Info */}
                            <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                    <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">📦</span>
                                    Attribute Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Attribute Name" required>
                                        <input type="text" required value={formData.name} onChange={(e) => {
                                            const newName = e.target.value;
                                            setFormData(prev => ({ ...prev, name: newName }));
                                            generateCode(newName);
                                        }} placeholder="e.g. Toy Material" className={inputCls} />
                                    </Field>
                                    <Field label="System Code" required>
                                        <input type="text" required value={formData.code} onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))} placeholder="e.g. TOY_MATERIAL" className={inputCls + ' font-mono'} />
                                    </Field>
                                </div>
                                <Field label="Input Format / Type" required>
                                    <select value={formData.type} onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value, values: [] }))} className={inputCls + ' bg-white'}>
                                        {inputTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                    </select>
                                </Field>
                                <Field label="Description">
                                    <textarea rows={2} value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} placeholder="Add explanatory text below the input field..." className={inputCls} />
                                </Field>
                            </div>

                            {/* Settings & Flags */}
                            <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                    <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">⚙️</span>
                                    Settings & Flags
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="Display Order">
                                        <input type="text" inputMode="numeric" min="1" value={formData.displayOrder} onChange={(e) => setFormData(prev => ({ ...prev, displayOrder: e.target.value }))} className={inputCls} />
                                    </Field>
                                    <div className="flex flex-col gap-1.5 justify-center mt-7">
                                        <label className="flex items-center gap-2 cursor-pointer text-[15px] font-serif font-bold text-[#3E2723]">
                                            <input type="checkbox" checked={formData.isActive} onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))} className="rounded text-[#8B5E3C] focus:ring-[#8B5E3C]" />
                                            Active Status
                                        </label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 border-t border-[#F0EAE2] pt-5 mt-5">
                                    {['isRequired:Required', 'isSearchable:Searchable', 'isFilterable:Filterable', 'isVariant:Is Variant', 'visibleOnProduct:Product Form', 'visibleOnWebsite:Website Visible'].map(flag => {
                                        const [key, label] = flag.split(':');
                                        return (
                                            <label key={key} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 whitespace-nowrap">
                                                <input type="checkbox" checked={formData[key]} onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.checked }))} className="rounded text-[#8B5E3C] focus:ring-[#8B5E3C]" />
                                                {label}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Options manager */}
                            {hasOptionsList && (
                                <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                    <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                        <span className="w-6 h-6 bg-[#F8F4EC] border border-[#E6DFD4] rounded-lg flex items-center justify-center text-xs">📋</span>
                                        Value Options / Picklist
                                    </h3>

                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={newValue}
                                            onChange={(e) => setNewValue(e.target.value)}
                                            placeholder={formData.type === 'ColorPicker' ? 'e.g. Natural Wood' : 'e.g. Maple'}
                                            className={inputCls + ' flex-1'}
                                        />
                                        {formData.type === 'ColorPicker' && (
                                            <input
                                                type="color"
                                                value={newColorCode}
                                                onChange={(e) => setNewColorCode(e.target.value)}
                                                className="w-11 h-11 border border-[#E6DFD4] rounded-xl p-0.5 cursor-pointer bg-white shrink-0"
                                            />
                                        )}
                                        <button type="button" onClick={handleAddValueOption} className="shrink-0 px-6 py-2.5 bg-[#8B5E3C] hover:bg-[#7a5234] text-white rounded-xl text-sm font-bold transition-colors">
                                            Add
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-white border border-[#E6DFD4] rounded-xl">
                                        {formData.values.length === 0 ? (
                                            <span className="text-gray-400 text-sm italic py-1">Define options using input above.</span>
                                        ) : (
                                            formData.values.map((val, idx) => (
                                                <span key={idx} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold bg-[#F8F4EC] border border-[#E6DFD4] text-[#3E2723]">
                                                    {formData.type === 'ColorPicker' && (
                                                        <span className="w-4 h-4 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: val.colorCode }} />
                                                    )}
                                                    {val.value}
                                                    <button type="button" onClick={() => handleRemoveValueOption(idx)} className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors ml-1">
                                                        ✕
                                                    </button>
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-center gap-4 pt-6 pb-2">
                                <button type="button" onClick={() => (window.history.pushState({}, '', window.location.pathname.replace(/\/edit$|\/add$/, '')), setIsFormOpen(false))} className="admin-cancel-btn">
                                    CANCEL
                                </button>
                                <button type="submit" disabled={formLoading} className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm uppercase tracking-wide">
                                    {formLoading ? 'Saving...' : 'SAVE ATTRIBUTE'}
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

export default AttributesPage;

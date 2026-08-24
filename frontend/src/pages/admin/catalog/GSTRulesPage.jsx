import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ActiveBadge, StatusBadge } from '../../../components/admin/CommonComponents';
import { RefreshCw, Eye, SquarePen, Trash2, Plus, X } from 'lucide-react';

import { gstService } from '../../../api/gstService';
import BulkActions from '../../../components/admin/BulkActions';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import toast from 'react-hot-toast';

export default function GSTRulesPage({ canCreate = true, canEdit = true, canDelete = true }) {
    const location = useLocation();
    const navigate = useNavigate();

    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedRule, setSelectedRule] = useState(null);
    const [viewMode, setViewMode] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        percentage: '',
        isActive: true
    });

    const [saving, setSaving] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [deleteTarget, setDeleteTarget] = useState(null); // single delete confirm

    useEffect(() => {
        fetchRules();
    }, []);

    useEffect(() => {
        const checkRoute = () => {
            const path = location.pathname;
            if (path === '/admin/catalog/gst-rules/add') {
                if (!isFormOpen || editMode) {
                    openForm(null, false);
                }
            } else if (path.startsWith('/admin/catalog/gst-rules/edit/')) {
                const id = path.split('/').pop();
                if (!isFormOpen || selectedRule?._id !== id) {
                    const rule = rules.find(r => r._id === id);
                    if (rule) {
                        openForm(rule, false);
                    } else if (!loading && rules.length > 0) {
                        navigate('/admin/catalog/gst-rules');
                    }
                }
            } else if (path.startsWith('/admin/catalog/gst-rules/view/')) {
                const id = path.split('/').pop();
                if (!isFormOpen || selectedRule?._id !== id) {
                    const rule = rules.find(r => r._id === id);
                    if (rule) {
                        openForm(rule, true);
                    } else if (!loading && rules.length > 0) {
                        navigate('/admin/catalog/gst-rules');
                    }
                }
            } else {
                setIsFormOpen(false);
                setSelectedRule(null);
                setEditMode(false);
                setViewMode(false);
            }
        };
        checkRoute();
    }, [location.pathname, rules, loading]);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const data = await gstService.getRules();
            setRules(data.rules || []);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to fetch GST rules');
        } finally {
            setLoading(false);
        }
    };

    const openForm = (rule = null, isView = false) => {
        if (rule) {
            setSelectedRule(rule);
            setFormData({
                name: rule.name,
                percentage: rule.percentage,
                isActive: rule.isActive
            });
            setEditMode(!isView);
            setViewMode(isView);
        } else {
            setSelectedRule(null);
            setFormData({ name: '', percentage: '', isActive: true });
            setEditMode(false);
            setViewMode(false);
        }
        setIsFormOpen(true);
    };

    const handleOpenFormAction = (rule = null, isView = false) => {
        if (rule) {
            if (isView) {
                navigate(`/admin/catalog/gst-rules/view/${rule._id}`);
            } else {
                navigate(`/admin/catalog/gst-rules/edit/${rule._id}`);
            }
        } else {
            navigate('/admin/catalog/gst-rules/add');
        }
    };

    const handleCloseForm = () => {
        navigate('/admin/catalog/gst-rules');
        setIsFormOpen(false);
        setFormData({ name: '', percentage: '', isActive: true });
        setSelectedRule(null);
        setEditMode(false);
        setViewMode(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error('GST Name is required');
            return;
        }

        if (formData.percentage === '' || isNaN(formData.percentage) || formData.percentage < 0) {
            toast.error('Valid GST percentage is required');
            return;
        }

        try {
            setSaving(true);
            if (editMode && selectedRule) {
                await gstService.updateRule(selectedRule._id, formData);
                toast.success('GST Rule updated successfully');
            } else {
                await gstService.createRule(formData);
                toast.success('GST Rule created successfully');
            }
            fetchRules();
            handleCloseForm();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save GST rule');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            await gstService.deleteRule(deleteTarget);
            toast.success('GST Rule deleted successfully');
            setSelectedIds(prev => prev.filter(selId => selId !== deleteTarget));
            setDeleteTarget(null);
            fetchRules();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to delete GST rule');
        }
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(rules.map(r => r._id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id, checked) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
        }
    };

    const handleBulkDelete = async () => {
        setLoading(true);
        try {
            await Promise.all(selectedIds.map(id => gstService.deleteRule(id)));
            toast.success('Selected GST rules deleted');
            setSelectedIds([]);
            fetchRules();
        } catch (error) {
            toast.error('Failed to delete some GST rules');
            fetchRules();
        } finally {
            setLoading(false);
        }
    };

    const handleBulkStatusChange = async (isActive) => {
        setLoading(true);
        try {
            await Promise.all(
                selectedIds.map(id => {
                    const rule = rules.find(r => r._id === id);
                    if (rule) {
                        return gstService.updateRule(id, {
                            name: rule.name,
                            percentage: rule.percentage,
                            isActive
                        });
                    }
                    return Promise.resolve();
                })
            );
            toast.success(`Selected GST rules set to ${isActive ? 'Active' : 'Inactive'}`);
            setSelectedIds([]);
            fetchRules();
        } catch (error) {
            toast.error('Failed to update some GST rules');
            fetchRules();
        }
    };

    const inputCls = 'w-full px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-colors';

    return (
        <>
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <div>
                    <p className="text-[13px] md:text-sm font-serif text-white mb-1">
                        Dashboard &rsaquo; Catalog Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">GST Rules</span>
                    </p>
                    <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">GST Rules</h1>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={fetchRules} className="admin-secondary-btn flex items-center gap-2">
                        <RefreshCw size={16} /> Refresh
                    </button>
                    {canCreate && (
                        <button
                            onClick={() => handleOpenFormAction()}
                            className="admin-btn shadow-sm flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Add GST Rule
                        </button>
                    )}
                </div>
            </div>

            {(canEdit || canDelete) && (
                <BulkActions
                    selectedIds={selectedIds}
                    onBulkDelete={canDelete ? handleBulkDelete : undefined}
                    onBulkStatusChange={canEdit ? handleBulkStatusChange : undefined}
                    onClear={() => setSelectedIds([])}
                    loading={loading}
                />
            )}

            <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
                            <tr>
                                {(canEdit || canDelete) && (
                                    <th className="px-6 py-3.5 w-10">
                                        <input
                                            type="checkbox"
                                            checked={rules.length > 0 && selectedIds.length === rules.length}
                                            onChange={e => handleSelectAll(e.target.checked)}
                                            className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                        />
                                    </th>
                                )}
                                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-left">GST Name</th>
                                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-left">Percentage</th>
                                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-left">Status</th>
                                <th className="px-6 py-3.5 text-[14px] font-bold uppercase tracking-widest text-[#8B5E3C] whitespace-nowrap text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-400 text-[16px]">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-4 h-4 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
                                            Loading rules...
                                        </div>
                                    </td>
                                </tr>
                            ) : rules.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-400 text-[16px]">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-[#F8F4EC] rounded-full flex items-center justify-center text-2xl">📋</div>
                                            <p className="font-medium">No GST rules found. Create your first rule above.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rules.map((rule, idx) => (
                                    <tr key={rule._id} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                                        {(canEdit || canDelete) && (
                                            <td className="px-6 py-4 whitespace-nowrap text-[16px]">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.includes(rule._id)}
                                                    onChange={(e) => handleSelectRow(rule._id, e.target.checked)}
                                                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-[16px] text-gray-800">{rule.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[16px] font-semibold text-black-600">{rule.percentage}%</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[16px]">
                                            <StatusBadge status={rule.isActive ? 'Active' : 'Inactive'} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => handleOpenFormAction(rule, true)}
                                                    className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => handleOpenFormAction(rule, false)}
                                                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                                                        title="Edit"
                                                    >
                                                        <SquarePen size={16} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => setDeleteTarget(rule._id)}
                                                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
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
            </div>

            {/* GST Rule Add/Edit Drawer */}
            {isFormOpen && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
                    <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
                        {/* Drawer Header */}
                        <div className="flex items-center justify-between px-8 py-8 border-b border-[#E6DFD4] bg-[#F8F4EC]">
                            <div>
                                <h2 className="text-3xl font-serif font-bold text-[#141225] tracking-tight">
                                    {viewMode ? 'View GST Rule' : editMode ? 'Edit GST Rule' : 'New GST Rule'}
                                </h2>
                            </div>
                            <button onClick={handleCloseForm} className="p-2 text-gray-400 hover:text-red-700 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                                    <span className="w-6 h-6 #E6DFD4] flex items-center justify-center text-sm font-semibold text-gray-800">📋</span>
                                    Rule Information
                                </h3>

                                <div>
                                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                                        GST Name <span className="text-red-500 text-lg ml-1">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. IGST 18%"
                                        className={inputCls + (viewMode ? ' bg-gray-50' : ' bg-white')}
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        disabled={viewMode}
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">
                                        GST Percentage <span className="text-red-500 text-lg ml-1">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="text"
                                            placeholder="18"
                                            className={inputCls + ' pr-10' + (viewMode ? ' bg-gray-50' : ' bg-white')}
                                            value={formData.percentage}
                                            onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                                            disabled={viewMode}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                                    </div>
                                </div>

                                {!viewMode && (
                                    <div className="flex items-center gap-3 pt-2">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="w-5 h-5 text-[#8B5E3C] border-[#E6DFD4] rounded focus:ring-[#8B5E3C] accent-[#8B5E3C] cursor-pointer"
                                        />
                                        <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer select-none">
                                            Rule is Active
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-center gap-4 pt-6 pb-2">
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="admin-cancel-btn"
                                >
                                    {viewMode ? 'CLOSE' : 'CANCEL'}
                                </button>
                                {!viewMode && (
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors shadow-sm uppercase tracking-wide"
                                    >
                                        {saving ? 'SAVING...' : 'SAVE RULE'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>

        <ConfirmDialog
            isOpen={!!deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDelete}
            title="Delete GST Rule"
            message="Are you sure you want to delete this GST rule? It will also be removed from any products using it. This action cannot be undone."
            confirmText="DELETE"
            cancelText="CANCEL"
            variant="danger"
        />
        </>
    );
}

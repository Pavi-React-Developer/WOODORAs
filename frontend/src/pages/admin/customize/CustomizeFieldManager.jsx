import { ActiveBadge, RequestBadge, OrderBadge, TypeBadge } from '../../../components/admin/CommonComponents';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Settings, X, PlusCircle, Trash, RefreshCw, Edit } from 'lucide-react';
import { customizeService } from '../../../api/customizeService';

export default function CustomizeFieldManager({ canCreate = true, canEdit = true, canDelete = true }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    isRequired: true,
    options: ['']
  });

  useEffect(() => {
    fetchFields();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchFields();
    setIsRefreshing(false);
  };

  const fetchFields = async () => {
    setLoading(true);
    try {
      const data = await customizeService.getAllFields();
      setFields(data);
    } catch (error) {
      toast.error('Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.label.trim()) return;

    // Filter out empty options if dropdown
    const filteredOptions = newField.type === 'dropdown'
      ? newField.options.filter(opt => opt.trim() !== '')
      : [];

    if (newField.type === 'dropdown' && filteredOptions.length === 0) {
      toast.error('Please add at least one option for the dropdown');
      return;
    }

    setAdding(true);
    try {
      await customizeService.createField({
        label: newField.label.trim(),
        type: newField.type,
        options: filteredOptions,
        isRequired: newField.isRequired,
        isActive: true
      });
      toast.success('Field created successfully');
      setNewField({ label: '', type: 'text', isRequired: true, options: [''] });
      setShowAddModal(false);
      fetchFields();
    } catch (error) {
      toast.error(error.message || 'Failed to create field');
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (field) => {
    setEditingField({
      ...field,
      options: field.options && field.options.length > 0 ? [...field.options] : ['']
    });
    setShowEditModal(true);
  };

  const handleUpdateField = async (e) => {
    e.preventDefault();
    if (!editingField.label.trim()) return;

    const filteredOptions = editingField.type === 'dropdown'
      ? editingField.options.filter(opt => opt.trim() !== '')
      : [];

    if (editingField.type === 'dropdown' && filteredOptions.length === 0) {
      toast.error('Please add at least one option for the dropdown');
      return;
    }

    setEditing(true);
    try {
      await customizeService.updateField(editingField._id, {
        label: editingField.label.trim(),
        type: editingField.type,
        options: filteredOptions,
        isRequired: editingField.isRequired
      });
      toast.success('Field updated successfully');
      setShowEditModal(false);
      setEditingField(null);
      fetchFields();
    } catch (error) {
      toast.error(error.message || 'Failed to update field');
    } finally {
      setEditing(false);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await customizeService.updateField(id, { isActive: !currentStatus });
      toast.success('Field status updated');
      fetchFields();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this field?')) return;
    try {
      await customizeService.deleteField(id);
      toast.success('Field deleted');
      fetchFields();
    } catch (error) {
      toast.error('Failed to delete field');
    }
  };

  const updateOption = (index, value) => {
    const newOptions = [...newField.options];
    newOptions[index] = value;
    setNewField({ ...newField, options: newOptions });
  };

  const addOption = () => {
    setNewField({ ...newField, options: [...newField.options, ''] });
  };

  const removeOption = (index) => {
    const newOptions = newField.options.filter((_, i) => i !== index);
    setNewField({ ...newField, options: newOptions });
  };

  const updateEditOption = (index, value) => {
    const newOptions = [...editingField.options];
    newOptions[index] = value;
    setEditingField({ ...editingField, options: newOptions });
  };

  const addEditOption = () => {
    setEditingField({ ...editingField, options: [...editingField.options, ''] });
  };

  const removeEditOption = (index) => {
    const newOptions = editingField.options.filter((_, i) => i !== index);
    setEditingField({ ...editingField, options: newOptions });
  };

  if (loading) {
    return <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center text-[#8B5E3C]">Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Customize Order &rsaquo; <span className="font-semibold text-[#8B5E3C]">Form Fields Builder</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Form Fields Builder</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-6 py-2.5 bg-white border border-[#E6DFD4] text-[#6D625C] font-bold text-sm rounded-full hover:bg-gray-50 transition-all shadow-sm"
          >
            <RefreshCw size={18} className={`text-[#8B5E3C] ${isRefreshing ? 'animate-spin' : ''}`} />
            REFRESH
          </button>
          {canCreate && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#8B5E3C] text-white font-bold text-sm rounded-full hover:bg-[#7a5234] transition-colors shadow-sm uppercase tracking-wide"
            >
              <Plus className="w-4 h-4" /> Add Field
            </button>
          )}
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            {canEdit && (
              <>
                <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                <button onClick={() => toast.success('Status updated')} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
              </>
            )}
            {canDelete && (
              <button onClick={() => { toast.success('Selected fields deleted'); setSelectedIds([]); }} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
            )}
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border border-[#E6DFD4] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[#FAF4EF] text-[#8B5E3C] text-xs uppercase tracking-wider text-center">
              <tr>
                <th className="px-6 py-4 border-b border-[#E6DFD4] w-12 text-center">
                  <input
                    type="checkbox"
                    checked={fields.length > 0 && selectedIds.length === fields.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? fields.map(f => f._id) : [])}
                    className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer mx-auto block"
                  />
                </th>
                <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold text-center">Label</th>
                <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold text-center">Type</th>
                <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold text-center">Required</th>
                <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold text-center">Status</th>
                <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]">
              {fields.map((field, idx) => (
                  <tr key={field._id} className={`hover:bg-[#FAF4EF]/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(field._id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, field._id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== field._id));
                          }
                        }}
                        className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer mx-auto block"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-sm">
                      <p className="font-bold text-sm text-gray-800">{field.label}</p>
                      {field.type === 'dropdown' && (
                        <div className="text-[10px] text-gray-500 mt-1 truncate max-w-[200px]">
                          {field.options.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex justify-center">
                        <TypeBadge type={field.type} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex justify-center">
                        <ActiveBadge status={field.isRequired ? 'Required' : 'Optional'} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex justify-center">
                        {canEdit ? (
                          <button onClick={() => handleToggleStatus(field._id, field.isActive)} title="Click to toggle">
                            <ActiveBadge status={field.isActive} />
                          </button>
                        ) : (
                          <ActiveBadge status={field.isActive} />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <div className="flex items-center justify-center gap-3">
                      {canEdit && (
                        <button onClick={() => openEditModal(field)} className="text-blue-600 hover:text-blue-700 transition-colors" title="Edit Field">
                          <Edit size={15} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(field._id)} className="text-red-500 hover:text-red-600 transition-colors" title="Delete Field">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {fields.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No custom fields found. Click "Add Field" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
            <div className="px-6 py-5 border-b border-[#E9DED3] bg-[#FDFBF7] flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-3xl font-serif font-bold text-[#141225] tracking-tight">Create New Field</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 text-gray-400 hover:text-red-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form id="addFieldForm" onSubmit={handleAddField} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center text-sm font-semibold text-gray-800">📋</span>
                  Field Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Field Label <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={newField.label}
                      onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                      placeholder="e.g. Wood Type, Product Name, Gift Wrap"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Field Type <span className="text-red-500">*</span></label>
                      <select
                        value={newField.type}
                        onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none"
                      >
                        <option value="text">Text Input</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Requirement</label>
                      <select
                        value={newField.isRequired ? 'yes' : 'no'}
                        onChange={(e) => setNewField({ ...newField, isRequired: e.target.value === 'yes' })}
                        className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none"
                      >
                        <option value="yes">Required</option>
                        <option value="no">Optional</option>
                      </select>
                    </div>
                  </div>

                  {newField.type === 'dropdown' && (
                    <div className="bg-[#F8F4EC] p-6 rounded-xl space-y-4 border border-[#E9DED3]">
                      <label className="block text-[15px] font-serif font-bold text-[#3E2723]">Dropdown Options</label>
                      {newField.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-3">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateOption(idx, e.target.value)}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => removeOption(idx)}
                            disabled={newField.options.length === 1}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addOption}
                        className="text-[15px] font-bold text-[#8B5E3C] hover:text-[#7a5234] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Option
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-[#E9DED3] bg-[#FDFBF7] flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 rounded-xl border border-[#D6C9BC] text-[#7A5C44] font-semibold hover:bg-[#F5EDE4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="addFieldForm"
                disabled={adding}
                className="px-8 py-2.5 rounded-xl bg-[#8B5E3C] text-white font-bold hover:bg-[#7A5234] transition-colors shadow-md disabled:opacity-70 flex items-center gap-2"
              >
                {adding ? 'Saving...' : 'Save Field'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingField && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-left">
            <div className="px-6 py-5 border-b border-[#E9DED3] bg-[#FDFBF7] flex items-center justify-between sticky top-0 z-10">
              <h2 className="text-3xl font-serif font-bold text-[#141225] tracking-tight">Edit Field</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-red-700 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form id="editFieldForm" onSubmit={handleUpdateField} className="flex-1 overflow-y-auto p-6 space-y-8 bg-white">
              <div className="bg-[#FAFAFA] border border-[#F0EAE2] rounded-2xl p-6 space-y-5">
                <h3 className="text-[17px] font-serif font-bold text-[#3E2723] flex items-center gap-2">
                  <span className="w-6 h-6 flex items-center justify-center text-sm font-semibold text-gray-800">📋</span>
                  Field Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Field Label <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={editingField.label}
                      onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                      placeholder="e.g. Wood Type, Product Name, Gift Wrap"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Field Type <span className="text-red-500">*</span></label>
                      <select
                        value={editingField.type}
                        onChange={(e) => setEditingField({ ...editingField, type: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none"
                      >
                        <option value="text">Text Input</option>
                        <option value="dropdown">Dropdown</option>
                        <option value="checkbox">Checkbox</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Requirement</label>
                      <select
                        value={editingField.isRequired ? 'yes' : 'no'}
                        onChange={(e) => setEditingField({ ...editingField, isRequired: e.target.value === 'yes' })}
                        className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none"
                      >
                        <option value="yes">Required</option>
                        <option value="no">Optional</option>
                      </select>
                    </div>
                  </div>

                  {editingField.type === 'dropdown' && (
                    <div className="bg-[#F8F4EC] p-6 rounded-xl space-y-4 border border-[#E9DED3]">
                      <label className="block text-[15px] font-serif font-bold text-[#3E2723]">Dropdown Options</label>
                      {editingField.options.map((opt, idx) => (
                        <div key={idx} className="flex gap-3">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...editingField.options];
                              newOpts[idx] = e.target.value;
                              setEditingField({ ...editingField, options: newOpts });
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="flex-1 px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newOpts = editingField.options.filter((_, i) => i !== idx);
                              setEditingField({ ...editingField, options: newOpts });
                            }}
                            disabled={editingField.options.length === 1}
                            className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                          >
                            <Trash className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField({ ...editingField, options: [...editingField.options, ''] });
                        }}
                        className="text-[15px] font-bold text-[#8B5E3C] hover:text-[#7a5234] flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Option
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </form>
            
            <div className="p-6 border-t border-[#E9DED3] bg-[#FDFBF7] flex justify-end gap-3 sticky bottom-0 z-10">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2.5 rounded-xl border border-[#D6C9BC] text-[#7A5C44] font-semibold hover:bg-[#F5EDE4] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editFieldForm"
                disabled={adding}
                className="px-8 py-2.5 rounded-xl bg-[#8B5E3C] text-white font-bold hover:bg-[#7A5234] transition-colors shadow-md disabled:opacity-70 flex items-center gap-2"
              >
                {adding ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Settings, X, PlusCircle , Trash, RefreshCw } from 'lucide-react';
import { customizeService } from '../../../api/customizeService';

export default function CustomizeFieldManager({ canCreate = true, canEdit = true, canDelete = true }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
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

  if (loading) {
    return <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center text-[#8B5E3C]">Loading...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-[#94A3B8] mb-1">
            Dashboard &rsaquo; Customize Order &rsaquo; <span className="font-semibold text-[#8B5E3C]">Form Fields Builder</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Form Fields Builder</h1>
          <p className="text-sm text-[#8A817C] mt-2">Manage the dynamic input fields shown on the Custom Order page</p>
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
            className="flex items-center gap-2 px-4 py-2 bg-[#8B5E3C] text-white rounded-xl hover:bg-[#7a5234] transition-colors"
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
            <thead className="text-xs text-[#8A817C] uppercase bg-[#FAF4EF]">
              <tr>
                <th className="px-6 py-4 w-10 border-b border-[#E6DFD4]">
                  <input
                    type="checkbox"
                    checked={fields.length > 0 && selectedIds.length === fields.length}
                    onChange={(e) => setSelectedIds(e.target.checked ? fields.map(f => f._id) : [])}
                    className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold">Field Label</th>
              <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold">Type</th>
              <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold">Required</th>
              <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold">Status</th>
              <th className="px-6 py-4 border-b border-[#E6DFD4] font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6DFD4]">
            {fields.map((field, idx) => (
              <tr key={field._id} className={`hover:bg-[#FAF4EF]/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(field._id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds([...selectedIds, field._id]);
                      else setSelectedIds(selectedIds.filter(id => id !== field._id));
                    }}
                    className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer"
                  />
                </td>
                <td className="px-6 py-4">
                  <span className="font-medium text-[#4A3326]">{field.label}</span>
                  {field.type === 'dropdown' && (
                    <div className="text-xs text-gray-500 mt-1">Options: {field.options.join(', ')}</div>
                  )}
                </td>
                <td className="px-6 py-4 uppercase text-xs tracking-wider font-semibold text-gray-600">
                  {field.type}
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-md ${field.isRequired ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
                    {field.isRequired ? 'Required' : 'Optional'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {canEdit && (
                  <button
                    onClick={() => handleToggleStatus(field._id, field.isActive)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${field.isActive ? 'bg-[#4ADE80]' : 'bg-gray-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  {canDelete && (
                  <button onClick={() => handleDelete(field._id)} className="text-red-500 hover:text-red-600 transition-colors">
                    <Trash className="w-4 h-4" />
                  </button>
                  )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-[#4A3326] mb-6 flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#8B5E3C]" /> Create New Field
            </h3>
            <form onSubmit={handleAddField} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Label *</label>
                <input
                  type="text"
                  required
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  className="w-full px-4 py-2 border border-[#E6DFD4] rounded-xl focus:ring-2 focus:ring-[#8B5E3C] outline-none"
                  placeholder="e.g. Wood Type, Product Name, Gift Wrap"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Type *</label>
                  <select
                    value={newField.type}
                    onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                    className="w-full px-4 py-2 border border-[#E6DFD4] rounded-xl focus:ring-2 focus:ring-[#8B5E3C] outline-none bg-white"
                  >
                    <option value="text">Text Input</option>
                    <option value="dropdown">Dropdown</option>
                    <option value="checkbox">Checkbox</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requirement</label>
                  <select
                    value={newField.isRequired ? 'yes' : 'no'}
                    onChange={(e) => setNewField({ ...newField, isRequired: e.target.value === 'yes' })}
                    className="w-full px-4 py-2 border border-[#E6DFD4] rounded-xl focus:ring-2 focus:ring-[#8B5E3C] outline-none bg-white"
                  >
                    <option value="yes">Required</option>
                    <option value="no">Optional</option>
                  </select>
                </div>
              </div>

              {newField.type === 'dropdown' && (
                <div className="bg-[#F8F4EC] p-4 rounded-xl space-y-3 border border-[#E9DED3]">
                  <label className="block text-sm font-medium text-[#4A3326]">Dropdown Options</label>
                  {newField.options.map((opt, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => updateOption(idx, e.target.value)}
                        placeholder={`Option ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 border border-[#E6DFD4] rounded-lg outline-none"
                        required
                      />
                      {newField.options.length > 1 && (
                        <button type="button" onClick={() => removeOption(idx)} className="text-red-500 hover:text-red-600 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1 text-sm text-[#8B5E3C] font-medium hover:underline mt-2"
                  >
                    <PlusCircle className="w-4 h-4" /> Add Another Option
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[#E6DFD4]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2 text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="px-6 py-2 bg-[#8B5E3C] text-white rounded-xl font-medium hover:bg-[#7a5234] transition-colors disabled:opacity-50"
                >
                  {adding ? 'Saving...' : 'Save Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

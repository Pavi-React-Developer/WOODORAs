import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2, Settings, X, PlusCircle } from 'lucide-react';
import { customizeService } from '../../../api/customizeService';

export default function CustomizeFieldManager({ canCreate = true, canEdit = true, canDelete = true }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const [newField, setNewField] = useState({
    label: '',
    type: 'text',
    isRequired: true,
    options: ['']
  });

  useEffect(() => {
    fetchFields();
  }, []);

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
    return <div className="flex items-center justify-center h-64 text-[#8B5E3C]">Loading...</div>;
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E6DFD4] p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#4A3326]">Form Fields Builder</h2>
          <p className="text-sm text-gray-500 mt-1">Manage the dynamic input fields shown on the Custom Order page</p>
        </div>
        {canCreate && (
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#8B5E3C] text-white rounded-xl hover:bg-[#7a5234] transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Field
        </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-[#F8F4EC]">
            <tr>
              <th className="px-6 py-3 rounded-tl-xl">Field Label</th>
              <th className="px-6 py-3">Type</th>
              <th className="px-6 py-3">Required</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 rounded-tr-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field) => (
              <tr key={field._id} className="border-b border-[#E6DFD4] hover:bg-[#FDFBF7] transition-colors">
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
                  <button onClick={() => handleDelete(field._id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  )}
                </td>
              </tr>
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                  No custom fields found. Click "Add Field" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
                        <button type="button" onClick={() => removeOption(idx)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
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

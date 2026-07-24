import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { bulkOrderService } from '../../api/bulkOrderService';
import { toast } from 'react-hot-toast';

export default function BulkOrderFieldsAdminPage() {
  const [fields, setFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    _id: null,
    label: '',
    type: 'text',
    options: '', // comma separated string for UI, converted to array on submit
    placeholder: '',
    isRequired: true,
    isActive: true
  });

  const loadFields = async () => {
    try {
      const res = await bulkOrderService.getAllFields();
      if (res.success) {
        setFields(res.data);
      }
    } catch (err) {
      toast.error('Failed to load fields');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleOpenModal = (field = null) => {
    if (field) {
      setFormData({
        _id: field._id,
        label: field.label,
        type: field.type,
        options: field.options ? field.options.join(', ') : '',
        placeholder: field.placeholder || '',
        isRequired: field.isRequired,
        isActive: field.isActive
      });
    } else {
      setFormData({
        _id: null,
        label: '',
        type: 'text',
        options: '',
        placeholder: '',
        isRequired: true,
        isActive: true
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({
      _id: null,
      label: '',
      type: 'text',
      options: '',
      placeholder: '',
      isRequired: true,
      isActive: true
    });
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.label.trim()) {
      toast.error('Label is required');
      return;
    }

    try {
      const payload = {
        label: formData.label,
        type: formData.type,
        placeholder: formData.placeholder,
        isRequired: formData.isRequired,
        isActive: formData.isActive
      };

      if (formData.type === 'dropdown') {
        payload.options = formData.options.split(',').map(opt => opt.trim()).filter(Boolean);
        if (payload.options.length === 0) {
          toast.error('Dropdown fields require at least one option');
          return;
        }
      }

      if (formData._id) {
        await bulkOrderService.updateField(formData._id, payload);
        toast.success('Field updated successfully');
      } else {
        await bulkOrderService.createField(payload);
        toast.success('Field created successfully');
      }
      
      handleCloseModal();
      loadFields();
    } catch (err) {
      toast.error('Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this field?')) {
      try {
        await bulkOrderService.deleteField(id);
        toast.success('Field deleted');
        loadFields();
      } catch (err) {
        toast.error('Delete failed');
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading fields...</div>;
  }

  return (
    <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
      <div className="p-6 border-b border-[#E6DFD4] flex justify-between items-center bg-[#FAF4EF]/50">
        <div>
          <h2 className="text-xl font-bold text-[#4A3326] font-serif">Bulk Order Form Fields</h2>
          <p className="text-sm text-[#8A817C] mt-1">Manage dynamic fields that appear on the bulk order submission form.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#4A3326] hover:bg-[#3A281E] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Field
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAF4EF] text-[#8A817C] text-xs uppercase tracking-wider">
              <th className="p-4 font-bold border-b border-[#E6DFD4]">Label</th>
              <th className="p-4 font-bold border-b border-[#E6DFD4]">Type</th>
              <th className="p-4 font-bold border-b border-[#E6DFD4]">Required</th>
              <th className="p-4 font-bold border-b border-[#E6DFD4]">Status</th>
              <th className="p-4 font-bold border-b border-[#E6DFD4] text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6DFD4]">
            {fields.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-[#8A817C]">
                  No custom fields defined yet.
                </td>
              </tr>
            ) : (
              fields.map(field => (
                <tr key={field._id} className="hover:bg-[#FAF4EF]/30 transition-colors">
                  <td className="p-4 font-medium text-[#4A3326]">{field.label}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#EBF3F8] text-[#1D4E89] uppercase tracking-wide">
                      {field.type}
                    </span>
                    {field.type === 'dropdown' && field.options && (
                      <div className="text-[10px] text-gray-500 mt-1 truncate max-w-[200px]">
                        {field.options.join(', ')}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    {field.isRequired ? (
                      <span className="flex items-center gap-1 text-[#2E7D32] text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-[#8A817C] text-xs"><XCircle className="w-3.5 h-3.5" /> No</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${field.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {field.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button 
                      onClick={() => handleOpenModal(field)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(field._id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-[#E6DFD4] flex justify-between items-center bg-[#FAF4EF]/50">
              <h3 className="font-serif font-bold text-lg text-[#4A3326]">
                {formData._id ? 'Edit Field' : 'Add New Field'}
              </h3>
              <button onClick={handleCloseModal} className="text-[#8A817C] hover:text-[#4A3326] transition-colors p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-1.5">Field Label</label>
                <input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Expected Delivery Date"
                  className="w-full px-3 py-2 rounded-lg border border-[#E6DFD4] focus:ring-2 focus:ring-[#9C755A] focus:border-[#9C755A] outline-none transition-all bg-[#FAF4EF]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-1.5">Field Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="w-full px-3 py-2 rounded-lg border border-[#E6DFD4] focus:ring-2 focus:ring-[#9C755A] focus:border-[#9C755A] outline-none transition-all bg-[#FAF4EF]/30 appearance-none"
                >
                  <option value="text">Short Text</option>
                  <option value="dropdown">Dropdown Options</option>
                  <option value="checkbox">Checkbox (Yes/No)</option>
                </select>
              </div>

              {formData.type === 'text' && (
                <div>
                  <label className="block text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-1.5">Placeholder</label>
                  <input
                    type="text"
                    name="placeholder"
                    value={formData.placeholder}
                    onChange={handleChange}
                    placeholder="e.g. Enter your company name"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6DFD4] focus:ring-2 focus:ring-[#9C755A] focus:border-[#9C755A] outline-none transition-all bg-[#FAF4EF]/30"
                  />
                  <p className="text-[10px] text-[#8A817C] mt-1">Optional hint text for the input field</p>
                </div>
              )}

              {formData.type === 'dropdown' && (
                <div>
                  <label className="block text-xs font-bold text-[#8A817C] uppercase tracking-wider mb-1.5">Dropdown Options</label>
                  <input
                    type="text"
                    name="options"
                    value={formData.options}
                    onChange={handleChange}
                    required={formData.type === 'dropdown'}
                    placeholder="e.g. Option 1, Option 2, Option 3"
                    className="w-full px-3 py-2 rounded-lg border border-[#E6DFD4] focus:ring-2 focus:ring-[#9C755A] focus:border-[#9C755A] outline-none transition-all bg-[#FAF4EF]/30"
                  />
                  <p className="text-[10px] text-[#8A817C] mt-1">Separate multiple options with commas (,)</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isRequired"
                    checked={formData.isRequired}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#4A3326] border-[#E6DFD4] rounded focus:ring-[#4A3326]"
                  />
                  <span className="text-sm text-[#4A3326] font-medium">Is Required?</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#4A3326] border-[#E6DFD4] rounded focus:ring-[#4A3326]"
                  />
                  <span className="text-sm text-[#4A3326] font-medium">Is Active?</span>
                </label>
              </div>

              <div className="pt-4 mt-4 border-t border-[#E6DFD4] flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 text-sm font-bold text-[#4A3326] bg-[#E6DFD4]/50 hover:bg-[#E6DFD4] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-[#4A3326] hover:bg-[#3A281E] rounded-xl transition-colors"
                >
                  {formData._id ? 'Update Field' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

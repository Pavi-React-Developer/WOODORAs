import { ActiveBadge, RequestBadge, OrderBadge, TypeBadge, StatusBadge } from '../../components/admin/CommonComponents';
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, SquarePen, Trash, Check, X } from 'lucide-react';
import { bulkOrderService } from '../../api/bulkOrderService';
import { toast } from 'react-hot-toast';
import ConfirmDialog from '../../components/admin/ConfirmDialog';

export default function BulkOrderFieldsAdminPage({ canCreate = true, canEdit = true, canDelete = true }) {
  const [deleteId, setDeleteId] = useState(null);
  const [fields, setFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  const handleBulkDelete = async () => {
    
    try {
      await Promise.all(selectedIds.map(id => bulkOrderService.deleteField(id)));
      toast.success(`${selectedIds.length} field(s) deleted`);
      setSelectedIds([]);
      loadFields();
    } catch (err) {
      toast.error('Delete failed');
    }
  };

  const handleBulkStatus = async (isActive) => {
    try {
      await Promise.all(selectedIds.map(id => bulkOrderService.updateField(id, { isActive })));
      toast.success(`${selectedIds.length} field(s) set to ${isActive ? 'Active' : 'Inactive'}`);
      setSelectedIds([]);
      loadFields();
    } catch (err) {
      toast.error('Status update failed');
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading fields...</div>;
  }

  const totalPages = Math.max(1, Math.ceil(fields.length / ITEMS_PER_PAGE));
  const paginatedFields = fields.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Checkbox helpers
  const pageIds = paginatedFields.map(f => f._id);
  const allChecked = pageIds.length > 0 && pageIds.every(id => selectedIds.includes(id));
  const toggleAll = () => {
    if (allChecked) setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    else setSelectedIds(prev => [...new Set([...prev, ...pageIds])]);
  };
  const toggleOne = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const getPaginationPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) pages.push(1, 2, 3, 4, '...', totalPages);
      else if (currentPage >= totalPages - 2) pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      else pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const navCls = (disabled) => [
    'w-8 h-8 flex items-center justify-center rounded-md border text-sm font-medium transition-all select-none',
    disabled
      ? 'border-[#E9DED3] text-[#C5B8AD] cursor-not-allowed opacity-50'
      : 'border-[#D6C9BC] text-[#7A5C44] hover:bg-[#F5EDE4] hover:border-[#C4A98B] cursor-pointer',
  ].join(' ');

  return (
    <div className="flex-1 overflow-y-auto p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Bulk Orders &rsaquo; <span className="font-semibold text-[#8B5E3C]">Bulk Order Fields</span>
          </p>
          <h1 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Bulk Order Form Fields</h1>
        </div>
        {canCreate && (
          <button
            onClick={() => handleOpenModal()}
            className="admin-btn flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm"
          >
            <Plus size={16} /> Add Field
          </button>
        )}
      </div>
      {/* Selection bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#F8F4EC] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
          <div className="flex gap-2 ml-auto flex-wrap">
            {canEdit && (
              <>
                <button onClick={() => handleBulkStatus(true)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                <button onClick={() => handleBulkStatus(false)} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Set Inactive</button>
              </>
            )}
            {canDelete && (
              <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
            )}
            <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-white transition-colors text-gray-500">Clear</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">


        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF4EF] text-[#8A817C] text-xs uppercase tracking-wider text-center">
                <th className="px-6 py-4 border-b border-[#E6DFD4] w-12 text-center">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer mx-auto block"
                  />
                </th>
                <th className="px-6 py-4 font-bold border-b border-[#E6DFD4] text-[#8B5E3C] text-[14px] font-serif uppercase tracking-wider text-center whitespace-nowrap">LABEL</th>
                <th className="px-6 py-4 font-bold border-b border-[#E6DFD4] text-[#8B5E3C] text-[14px] font-serif uppercase tracking-wider text-center whitespace-nowrap">TYPE</th>
                <th className="px-6 py-4 font-bold border-b border-[#E6DFD4] text-[#8B5E3C] text-[14px] font-serif uppercase tracking-wider text-center whitespace-nowrap">REQUIRED</th>
                <th className="px-6 py-4 font-bold border-b border-[#E6DFD4] text-[#8B5E3C] text-[14px] font-serif uppercase tracking-wider text-center whitespace-nowrap">STATUS</th>
                <th className="px-6 py-4 font-bold border-b border-[#E6DFD4] text-[#8B5E3C] text-[14px] font-serif uppercase tracking-wider text-center whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]">
              {fields.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-[16px] p-8 text-center text-[#8A817C]">
                    No custom fields defined yet.
                  </td>
                </tr>
              ) : (
                paginatedFields.map((field, idx) => (
                  <tr key={field._id} className={`hover:bg-[#FAF4EF]/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(field._id)}
                        onChange={() => toggleOne(field._id)}
                        className="w-4 h-4 rounded border-[#C4B9B0] accent-[#8B5E3C] cursor-pointer mx-auto block"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-left text-[16px]">
                      <p className="font-bold text-[16px] font-serif text-gray-800">{field.label}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                      <div className="flex justify-center">
                        <TypeBadge type={field.type} size={16} />
                      </div>
                      {field.type === 'dropdown' && field.options && (
                        <div className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                          {field.options.join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                      <div className="flex justify-center">
                        <StatusBadge status={field.isRequired ? 'Required' : 'Optional'} size={16} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                      <div className="flex justify-center">
                        <StatusBadge status={field.isActive ? 'Active' : 'Inactive'} size={16} />
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-[16px]">
                      <div className="flex items-center justify-center gap-3">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenModal(field)}
                            className="text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center"
                            title="Edit"
                          >
                            <SquarePen size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteId(field._id)}
                            className="text-red-500 hover:text-red-600 transition-colors flex items-center justify-center"
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center px-4 py-4 border-t border-[#E6DFD4]">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={navCls(currentPage === 1)}
                title="First page"
              >«</button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={navCls(currentPage === 1)}
                title="Previous page"
              >‹</button>
              {getPaginationPages().map((page, i) =>
                page === '...' ? (
                  <span key={`dots-${i}`} className="w-8 h-8 flex items-center justify-center text-[#A89585] text-sm select-none">…</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded-md border text-sm font-semibold transition-all ${currentPage === page
                      ? 'bg-[#C4965A] text-white border-[#C4965A] shadow-sm'
                      : 'border-[#D6C9BC] text-[#7A5C44] hover:bg-[#F5EDE4] hover:border-[#C4A98B]'
                      }`}
                  >
                    {page}
                  </button>
                )
              )}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={navCls(currentPage === totalPages)}
                title="Next page"
              >›</button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className={navCls(currentPage === totalPages)}
                title="Last page"
              >»</button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 md:px-8 border-b border-[#E6DFD4] flex justify-between items-center bg-[#F8F4EC]">
              <h3 className="font-serif font-bold text-[28px] text-[#141225] tracking-tight">
                {formData._id ? 'Edit Field' : 'Add New Field'}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 bg-white">
              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Field Label</label>
                <input
                  type="text"
                  name="label"
                  value={formData.label}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Expected Delivery Date"
                  className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                />
              </div>

              <div>
                <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Field Type</label>
                <div className="relative">
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all appearance-none pr-10"
                  >
                    <option value="text">Short Text</option>
                    <option value="dropdown">Dropdown Options</option>
                    <option value="checkbox">Checkbox (Yes/No)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {formData.type === 'text' && (
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Placeholder</label>
                  <input
                    type="text"
                    name="placeholder"
                    value={formData.placeholder}
                    onChange={handleChange}
                    placeholder="e.g. Enter your company name"
                    className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-2">Optional hint text for the input field</p>
                </div>
              )}

              {formData.type === 'dropdown' && (
                <div>
                  <label className="block text-[15px] font-serif font-bold text-[#3E2723] mb-1.5">Dropdown Options</label>
                  <input
                    type="text"
                    name="options"
                    value={formData.options}
                    onChange={handleChange}
                    required={formData.type === 'dropdown'}
                    placeholder="e.g. Option 1, Option 2, Option 3"
                    className="w-full px-4 py-3 bg-white border border-[#E6DFD4] rounded-xl text-[15px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C] transition-all"
                  />
                  <p className="text-xs text-gray-500 mt-2">Separate multiple options with commas (,)</p>
                </div>
              )}

              <div className="flex items-center gap-8 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      name="isRequired"
                      checked={formData.isRequired}
                      onChange={handleChange}
                      className="peer appearance-none w-5 h-5 border-2 border-[#E6DFD4] rounded-md checked:bg-[#8B5E3C] checked:border-[#8B5E3C] transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span className="text-[15px] text-[#3E2723] group-hover:text-[#8B5E3C] transition-colors font-medium">Is Required?</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="peer appearance-none w-5 h-5 border-2 border-[#E6DFD4] rounded-md checked:bg-[#8B5E3C] checked:border-[#8B5E3C] transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 14 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5L4.5 8.5L13 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span className="text-[15px] text-[#3E2723] group-hover:text-[#8B5E3C] transition-colors font-medium">Is Active?</span>
                </label>
              </div>

              <div className="pt-6 mt-6 flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="admin-cancel-btn"
                >CANCEL</button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] text-white px-8 py-3 rounded-full text-[15px] font-bold shadow-sm transition-all uppercase tracking-wide"
                >
                  {formData._id ? 'SAVE CHANGES' : 'CREATE FIELD'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    
      
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
            handleDelete(deleteId); setDeleteId(null);
        }}
        title="Delete Item"
        message="This action cannot be undone. Are you sure?"
      />
      
</div>
  );
}

import { ActiveBadge, RequestBadge, OrderBadge } from '../../../components/admin/CommonComponents';
import React, { useState, useEffect, useMemo } from 'react';
import { Edit3, Trash2, Download, Plus, RefreshCw, Package , SquarePen } from 'lucide-react';
import { feeAPI } from '../../../api/feeService';
import Pagination from '../../../components/common/Pagination';
import { downloadExcelFile } from '../../../utils/exportUtils';
import ProductFeeRulesPage from './ProductFeeRulesPage';

export default function FeeListPage({ onNavigate, onEditFee, canCreate = true, canEdit = true, canDelete = true }) {
  const [fees, setFees] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelectAll = (checked) => {
    setSelectedIds(checked ? fees.map(item => item._id) : []);
  };

  const toggleSelectOne = (id, checked) => {
    setSelectedIds(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showGlobalFees, setShowGlobalFees] = useState(false);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [feesData, catsData] = await Promise.all([
        feeAPI.getAllFees(),
        feeAPI.getFeeCategories()
      ]);
      setFees(feesData || []);
      setCategories(catsData || []);

      // Extract unique payment methods
      if (feesData && feesData.length > 0) {
        const uniquePMs = [...new Set(feesData.map(f => f.paymentMethod).filter(Boolean))];
        setPaymentMethods(uniquePMs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportFeesExcel = () => {
    const header = ['Fee Name', 'Category', 'Fee Type', 'Payment Method', 'State', 'Weight Limits / Amount', 'Status'];
    const rows = fees.map((fee) => [
      fee.feeName || '',
      fee.feeCategory?.name || '',
      fee.feeType || '',
      fee.paymentMethod || '',
      fee.state || 'All States',
      fee.feeType === 'Fixed Amount' ? `₹${fee.amount}` : `₹${fee.amount} per kg`,
      fee.active ? 'Active' : 'Inactive',
    ]);
    downloadExcelFile('fees', header, rows);
  };

  const handleToggleStatus = async (fee) => {
    try {
      const payload = { active: !fee.active };
      if (fee.feeCategory && typeof fee.feeCategory === 'object') {
        payload.feeCategory = fee.feeCategory._id;
      } else if (fee.feeCategory) {
        payload.feeCategory = fee.feeCategory;
      }
      
      await feeAPI.updateFee(fee._id, payload);
      setFees(fees.map(f => f._id === fee._id ? { ...f, active: !f.active } : f));
    } catch (err) {
      alert('Failed to toggle fee status');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this fee?')) {
      try {
        await feeAPI.deleteFee(id);
        setFees(fees.filter(f => f._id !== id));
      } catch (err) {
        alert('Failed to delete fee');
      }
    }
  };

  const handleBulkStatusChange = async (activeStatus) => {
    if (window.confirm(`Are you sure you want to set ${selectedIds.length} fees to ${activeStatus ? 'Active' : 'Inactive'}?`)) {
      try {
        await Promise.all(selectedIds.map(async id => {
          const fee = fees.find(f => f._id === id);
          if (fee) {
            const payload = { active: activeStatus };
            if (fee.feeCategory && typeof fee.feeCategory === 'object') {
              payload.feeCategory = fee.feeCategory._id;
            } else if (fee.feeCategory) {
              payload.feeCategory = fee.feeCategory;
            }
            await feeAPI.updateFee(id, payload);
          }
        }));
        setFees(fees.map(f => selectedIds.includes(f._id) ? { ...f, active: activeStatus } : f));
        setSelectedIds([]);
      } catch (err) {
        alert('Failed to update status for some fees');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} fees?`)) {
      try {
        await Promise.all(selectedIds.map(id => feeAPI.deleteFee(id)));
        setFees(fees.filter(f => !selectedIds.includes(f._id)));
        setSelectedIds([]);
      } catch (err) {
        alert('Failed to delete some fees');
      }
    }
  };

  const filteredFees = useMemo(() => {
    let result = fees;
    if (search.trim()) {
      result = result.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()));
    }
    if (categoryFilter) {
      result = result.filter(f => {
        const catId = typeof f.feeCategory === 'object' ? f.feeCategory?._id : f.feeCategory;
        return catId === categoryFilter;
      });
    }
    if (paymentFilter) {
      result = result.filter(f => f.paymentMethod === paymentFilter);
    }
    return result;
  }, [fees, search, categoryFilter, paymentFilter]);

  const totalPages = Math.ceil(filteredFees.length / itemsPerPage);
  const paginatedFees = filteredFees.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading fees...</div>;
  }

  if (showGlobalFees) {
    return <ProductFeeRulesPage onBack={() => setShowGlobalFees(false)} canCreate={canCreate} canEdit={canEdit} canDelete={canDelete} />;
  }

  return (
    <div className="flex-1 overflow-y-auto p-8 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 gap-4 mb-4">
        <div>
          <p className="text-[13px] md:text-sm font-serif text-white mb-1">
            Dashboard &rsaquo; Fee Management &rsaquo; <span className="font-semibold text-[#8B5E3C]">Fee List</span>
          </p>
          <h2 className="text-4xl md:text-[42px] font-serif font-bold text-[#141225] leading-tight tracking-tight">Fee List</h2>
        </div>
        <div className="flex justify-end gap-3 mb-4 flex-wrap">
          <button onClick={loadData} className="admin-secondary-btn">
            <RefreshCw size={16} /> Refresh
          </button>
          {canEdit && (
            <button
              onClick={() => setShowGlobalFees(true)}
              className="admin-btn"
            >
              <Package size={16} /> Global Fees
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => onNavigate('add')}
              className="admin-btn"
            >
              <Plus size={16} /> Add New Fee
            </button>
          )}
          <button
            onClick={() => {
              if (!fees || fees.length === 0) {
                alert('No fee data available to export');
                return;
              }
              exportFeesExcel();
            }}
            disabled={!fees || fees.length === 0}
            className={`admin-export-btn flex items-center gap-2 ${(!fees || fees.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Download size={16} /> Export Excel
          </button>
        </div>
      </div>


      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 mb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
            type="text"
            placeholder="Search by Fee Name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
          />
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
          </select>
          <select
            value={paymentFilter}
            onChange={(e) => { setPaymentFilter(e.target.value); setCurrentPage(1); }}
            className="w-full border border-[#E6DFD4] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-medium"
          >
            <option value="">All Payment Methods</option>
            <option value="COD">COD</option>
            <option value="CashFree">CashFree</option>
            <option value="Both (COD & CashFree)">Both (COD & CashFree)</option>
          </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
          <div className="bg-[#FDF9F5] border border-[#E6DFD4] rounded-2xl px-5 py-3 mb-4 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-[#8B5E3C]">{selectedIds.length} selected</span>
            <div className="flex gap-2 ml-auto flex-wrap">
              {canEdit && (
                <>
                  <button onClick={() => handleBulkStatusChange(true)} className="px-3 py-1.5 text-xs font-semibold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors">Set Active</button>
                  <button onClick={() => handleBulkStatusChange(false)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">Set Inactive</button>
                </>
              )}
              {canDelete && (
                <button onClick={handleBulkDelete} className="px-3 py-1.5 text-xs font-semibold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors">Delete Selected</button>
              )}
              <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] bg-white rounded-lg hover:bg-gray-50 transition-colors text-gray-500">Clear</button>
            </div>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0">
              <tr className="bg-[#FAF4EF] text-[#8A817C] text-xs font-bold tracking-widest uppercase border-b border-[#E6DFD4]">
                                <th className="px-4 py-3.5 w-10">
                                    <input
                                        type="checkbox"
                                        checked={fees.length > 0 && selectedIds.length === fees.length}
                                        onChange={e => toggleSelectAll(e.target.checked)}
                                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                                    />
                                </th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">S.No</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Fee Name</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Category</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Fee Type</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Payment Method</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">State</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Weight Limits / Amount</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Status</th>
                <th className="px-4 py-3.5 text-center text-[14px] font-bold uppercase tracking-wider text-[#8B5E3C] whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4] text-[16px] text-brand-dark">
              {paginatedFees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="text-[16px] py-12 text-center text-gray-500 font-medium">
                    No fees available. Please add a new fee.
                  </td>
                </tr>
              ) : (
                paginatedFees.map((fee, idx) => (
                  <tr key={fee._id} className="transition-colors hover:bg-[#FDF9F5] bg-white">
                    <td className="text-[16px] py-4 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(fee._id)}
                        onChange={(e) => toggleSelectOne(fee._id, e.target.checked)}
                        className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4 font-bold text-[16px] text-center whitespace-nowrap">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="py-4 px-4 text-[16px] font-bold text-center text-gray-900 whitespace-nowrap">{fee.feeName}</td>
                    <td className="py-4 px-4 text-[16px] font-bold text-center text-gray-900 whitespace-nowrap">{fee.feeCategory?.name}</td>
                    <td className="py-4 px-4 text-[16px] font-semibold text-center text-gray-700 whitespace-nowrap">{fee.feeType}</td>
                    <td className="py-4 px-4 text-[16px] font-semibold text-center text-gray-700 whitespace-nowrap">{fee.paymentMethod || 'Both (COD & CashFree)'}</td>
                    <td className="py-4 px-4 text-[16px] font-semibold text-center text-gray-700 whitespace-nowrap">
                      <div className="flex flex-wrap justify-center gap-x-1">
                        {(Array.isArray(fee.applicationState) ? fee.applicationState : [fee.applicationState]).filter(Boolean).map((s, i, arr) => (
                          <div key={i} className="whitespace-nowrap">
                            {s}{i < arr.length - 1 ? ',' : ''}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-[16px] text-center whitespace-nowrap">
                      {fee.weightSlabs && fee.weightSlabs.length > 0 ? (
                        fee.weightSlabs.map((slab, i) => (
                          <div key={i} className="text-[16px] mb-1">
                            {slab.minWeight}-{slab.maxWeight}kg: <span className="font-bold">{fee.feeType === 'Fixed Amount' ? '₹' : ''}{slab.feeValue}{fee.feeType === 'Percentage' ? '%' : ''}</span>
                          </div>
                        ))
                      ) : (
                        <span className="font-bold text-[16px]">{fee.feeType === 'Fixed Amount' ? '₹' : ''}{fee.flatFeeValue !== undefined ? fee.flatFeeValue : 'Not Set'}{fee.feeType === 'Percentage' ? '%' : ''}</span>
                      )}
                    </td>
                    <td className="text-[16px] py-4 px-4 text-center">
                      <button 
                        onClick={() => handleToggleStatus(fee)}
                        className="transition-colors hover:opacity-80" title={fee.active ? "Deactivate" : "Activate"}>
                        <ActiveBadge status={fee.active} size={16} />
                      </button>
                    </td>
                    <td className="text-[16px] py-4 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => onEditFee(fee)}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <SquarePen size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(fee._id)}
                            className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
          <div className="p-6 border-t border-[#E6DFD4] bg-white rounded-b-2xl flex justify-center">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={setCurrentPage} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { Edit3, Trash2, Download } from 'lucide-react';
import { feeAPI } from '../../../api/feeService';
import { downloadExcelFile } from '../../../utils/exportUtils';

export default function FeeListPage({ onNavigate, onEditFee }) {
  const [fees, setFees] = useState([]);
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  
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
    setLoading(true);
    try {
      const [feesData, catsData] = await Promise.all([
        feeAPI.getAllFees(),
        feeAPI.getFeeCategories()
      ]);
      setFees(feesData);
      setCategories(catsData);
    } catch (error) {
      console.error('Error loading fee data:', error);
      alert('Failed to load fees');
    } finally {
      setLoading(false);
    }
  };

  const exportFeesExcel = () => {
    const header = ['Fee Name', 'Category', 'Fee Type', 'Payment Method', 'State(s)', 'Weight/Amount', 'Status'];
    const rows = fees.map((fee) => [
      fee.feeName || '',
      fee.feeCategory?.name || '',
      fee.feeType || '',
      fee.paymentMethod || 'Both (COD & CashFree)',
      Array.isArray(fee.applicationState) ? fee.applicationState.join(', ') : fee.applicationState || '',
      fee.weightSlabs && fee.weightSlabs.length > 0
        ? fee.weightSlabs.map((slab) => `${slab.minWeight}-${slab.maxWeight}kg: ${fee.feeType === 'Percentage' ? `${slab.feeValue}%` : `₹${slab.feeValue}`}`).join('; ')
        : `${fee.feeType === 'Fixed Amount' ? '₹' : ''}${fee.flatFeeValue ?? ''}${fee.feeType === 'Percentage' ? '%' : ''}`,
      fee.active ? 'Active' : 'Inactive',
    ]);
    downloadExcelFile('fees', header, rows);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this fee?')) {
      try {
        await feeAPI.deleteFee(id);
        setFees(fees.filter(f => f._id !== id));
      } catch (error) {
        alert('Failed to delete fee');
      }
    }
  };

  const filteredFees = useMemo(() => {
    let result = fees;

    if (search) {
      result = result.filter(f => f.feeName.toLowerCase().includes(search.toLowerCase()));
    }
    if (categoryFilter) {
      result = result.filter(f => f.feeCategory?._id === categoryFilter);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#E6DFD4] pb-4 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-dark font-serif">Fee List</h2>
          <p className="text-sm text-brand-medium">Manage all configured fees</p>
        </div>
        <button 
          onClick={() => onNavigate('add')}
          className="bg-brand-dark hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          Add New Fee
        </button>
      </div>

      <div className="flex justify-end mb-4">
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

      <div className="bg-white border border-[#E6DFD4] rounded-2xl p-6 shadow-sm">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-brand-light/50 border-b border-[#E6DFD4] text-brand-medium text-[10px] font-bold tracking-widest uppercase">
                <th className="py-4 px-4">S.No</th>
                <th className="py-4 px-4">Fee Name</th>
                <th className="py-4 px-4">Category</th>
                <th className="py-4 px-4">Fee Type</th>
                <th className="py-4 px-4">Payment Method</th>
                <th className="py-4 px-4">State</th>
                <th className="py-4 px-4">Weight Limits / Amount</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6DFD4]/55 text-sm text-brand-dark">
              {paginatedFees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-500 font-medium">
                    No fees available. Please add a new fee.
                  </td>
                </tr>
              ) : (
                paginatedFees.map((fee, idx) => (
                  <tr key={fee._id} className="hover:bg-brand-light/25 transition-colors">
                    <td className="py-4 px-4 font-medium">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="py-4 px-4 font-bold">{fee.feeName}</td>
                    <td className="py-4 px-4">{fee.feeCategory?.name}</td>
                    <td className="py-4 px-4">{fee.feeType}</td>
                    <td className="py-4 px-4">{fee.paymentMethod || 'Both (COD & CashFree)'}</td>
                    <td className="py-4 px-4">{Array.isArray(fee.applicationState) ? fee.applicationState.join(', ') : fee.applicationState}</td>
                    <td className="py-4 px-4">
                      {fee.weightSlabs && fee.weightSlabs.length > 0 ? (
                        fee.weightSlabs.map((slab, i) => (
                          <div key={i} className="text-xs mb-1">
                            {slab.minWeight}-{slab.maxWeight}kg: <span className="font-bold">{fee.feeType === 'Fixed Amount' ? '₹' : ''}{slab.feeValue}{fee.feeType === 'Percentage' ? '%' : ''}</span>
                          </div>
                        ))
                      ) : (
                        <span className="font-bold text-sm">{fee.feeType === 'Fixed Amount' ? '₹' : ''}{fee.flatFeeValue !== undefined ? fee.flatFeeValue : 'Not Set'}{fee.feeType === 'Percentage' ? '%' : ''}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${fee.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {fee.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => onEditFee(fee)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E6DFD4] bg-white text-brand-dark hover:bg-[#F9FAFB] transition-colors"
                          title="Edit"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(fee._id)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E6DFD4] bg-white text-red-500 hover:bg-[#FEF2F2] transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          <div className="mt-6 flex justify-between items-center text-sm">
            <span className="text-brand-medium">Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredFees.length)} of {filteredFees.length} entries</span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="px-3 py-1 border border-[#E6DFD4] rounded-lg disabled:opacity-50 hover:bg-brand-light transition-colors"
              >
                Previous
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="px-3 py-1 border border-[#E6DFD4] rounded-lg disabled:opacity-50 hover:bg-brand-light transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { staffAPI } from '../../api/staffService';
import { roleAPI } from '../../api/roleService';
import { Download, RefreshCw, Plus } from 'lucide-react';
import { downloadExcelFile } from '../../utils/exportUtils';

const Badge = ({ status }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
    status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
    {status === 'active' ? 'Active' : 'Inactive'}
  </span>
);

export default function StaffListPage({ onAddStaff, onEditStaff, onRoleAssign, canCreate = true, canEdit = true, canDelete = true }) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [deleteId, setDeleteId] = useState(null);
  const [dynamicRoles, setDynamicRoles] = useState([]);

  useEffect(() => {
    roleAPI.getAll().then(roles => setDynamicRoles(roles)).catch(() => setDynamicRoles([]));
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const data = await staffAPI.getAll(params);
      setStaffList(data.staff || []);
      setPagination(data.pagination || { total: 0, pages: 1 });
    } catch (err) {
      console.error('Failed to fetch staff', err);
      setError(err.message || 'Failed to load staff. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await staffAPI.delete(deleteId);
      setDeleteId(null);
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleStatus = async (member) => {
    try {
      await staffAPI.update(member._id, { status: member.status === 'active' ? 'inactive' : 'active' });
      fetchStaff();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportStaffExcel = () => {
    const header = ['Staff ID', 'Name', 'Email', 'Mobile', 'Role', 'Status', 'Created At'];
    const rows = staffList.map(member => ({
      'Staff ID': member._id,
      'Name': member.fullName || '',
      'Email': member.email || '',
      'Mobile': member.mobile || '',
      'Role': member.role || '',
      'Status': member.status || '',
      'Created At': member.createdAt ? new Date(member.createdAt).toLocaleString('en-IN') : '',
    }));
    downloadExcelFile('staff', header, rows);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &rsaquo; Staff Management &rsaquo; <span className="text-[#8B5E3C] font-semibold">Staff List</span></p>
          <h1 className="text-2xl font-bold text-gray-800">Staff List</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchStaff} className="admin-secondary-btn">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={exportStaffExcel} className="admin-export-btn">
            <Download size={16} /> Export Excel
          </button>
          {canCreate && (
          <button
            onClick={onAddStaff}
            className="admin-btn"
          >
            <Plus size={16} /> Add Staff
          </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="py-2.5 px-3 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white">
          <option value="">All Roles</option>
          {dynamicRoles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
        </select>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="py-2.5 px-3 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button onClick={fetchStaff} className="p-2.5 border border-[#E6DFD4] rounded-xl hover:bg-[#F8F4EC] transition-colors" title="Refresh">
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F8F4EC] border-b border-[#E6DFD4]">
              <tr>
                {['Profile', 'Full Name', 'Email', 'Mobile', 'Role', 'Status', 'Created Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-[#8B5E3C] border-t-transparent rounded-full animate-spin" />
                    Loading staff...
                  </div>
                </td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <p className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors">{error}</p>
                    <button onClick={fetchStaff} className="px-4 py-2 bg-[#8B5E3C] text-white rounded-xl text-xs font-semibold">Retry</button>
                  </div>
                </td></tr>
              ) : staffList.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-gray-400">No staff members found.</td></tr>
              ) : (
                staffList.map((member, idx) => (
                  <tr key={member._id} className={`border-b border-[#F0EAE2] transition-colors hover:bg-[#FDF9F5] ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                    <td className="px-4 py-3.5">
                      <div className="w-9 h-9 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center text-sm font-bold">
                        {member.fullName?.charAt(0).toUpperCase()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-gray-800 whitespace-nowrap">{member.fullName}</td>
                    <td className="px-4 py-3.5 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3.5 text-gray-500">{member.mobile || '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className="bg-[#F8F4EC] text-[#8B5E3C] text-xs font-semibold px-2.5 py-1 rounded-lg border border-[#E6DFD4]">{member.role}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {canEdit ? (
                        <button onClick={() => handleToggleStatus(member)} title="Toggle status">
                          <Badge status={member.status} />
                        </button>
                      ) : (
                        <Badge status={member.status} />
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{new Date(member.createdAt).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        {canEdit && (
                        <button onClick={() => onEditStaff(member)} className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        )}
                        {canEdit && (
                        <button onClick={() => onRoleAssign(member)} className="p-1.5 rounded-lg text-[#8B5E3C] hover:bg-[#F8F4EC] transition-colors" title="Edit Permissions">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </button>
                        )}
                        {canDelete && (
                        <button onClick={() => setDeleteId(member._id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
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
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-[#E6DFD4] flex items-center justify-between">
            <p className="text-xs text-gray-500">Showing {staffList.length} of {pagination.total} results</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs border border-[#E6DFD4] rounded-lg disabled:opacity-40 hover:bg-[#F8F4EC]">Prev</button>
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)} className={`px-3 py-1.5 text-xs border rounded-lg ${p === page ? 'bg-[#8B5E3C] text-white border-[#8B5E3C]' : 'border-[#E6DFD4] hover:bg-[#F8F4EC]'}`}>{p}</button>
              ))}
              <button disabled={page === pagination.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs border border-[#E6DFD4] rounded-lg disabled:opacity-40 hover:bg-[#F8F4EC]">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 text-center mb-2">Delete Staff Member</h3>
            <p className="text-sm text-gray-500 text-center mb-6">This action cannot be undone. Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-[#E6DFD4] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

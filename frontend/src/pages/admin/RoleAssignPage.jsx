import React, { useState, useEffect, useCallback } from 'react';
import { staffAPI } from '../../api/staffService';
import { roleAPI } from '../../api/roleService';
import { ADMIN_MODULES } from '../../config/adminModules';

// Permission modules will be fetched from backend if available.
// Fall back to frontend config `ADMIN_MODULES` when backend call fails.

const ACTIONS = ['view', 'create', 'edit', 'delete'];

const initPerms = (modules) =>
  (modules || []).reduce((acc, mod) => {
    const key = mod.key || mod;
    acc[key] = { view: false, create: false, edit: false, delete: false };
    return acc;
  }, {});

const permsToMap = (permissionsArr, modules) => {
  const map = initPerms(modules);
  (permissionsArr || []).forEach(p => {
    if (map[p.module] !== undefined) {
      map[p.module] = { view: !!p.view, create: !!p.create, edit: !!p.edit, delete: !!p.delete };
    }
  });
  return map;
};

const mapToPerms = (map) =>
  Object.entries(map).map(([module, actions]) => ({ module, ...actions }));

const PermissionTable = ({ modules, permissions, onToggle, onToggleRow, onToggleColumn, onSelectAll, onClearAll }) => (
  <div className="overflow-x-auto">
    <div className="flex justify-end gap-2 mb-3">
      <button onClick={onSelectAll} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-[#F8F4EC] text-gray-600 transition-colors">Select All</button>
      <button onClick={onClearAll} className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-[#F8F4EC] text-gray-600 transition-colors">Clear All</button>
    </div>
    <table className="w-full text-sm border border-[#E6DFD4] rounded-xl overflow-hidden">
      <thead className="bg-[#F8F4EC]">
        <tr>
          <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 w-48">Module</th>
          {ACTIONS.map(action => (
            <th key={action} className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
              <button onClick={() => onToggleColumn(action)} className="hover:text-[#8B5E3C] transition-colors capitalize">{action}</button>
            </th>
          ))}
          <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500">All</th>
        </tr>
      </thead>
      <tbody>
        {modules.map((mod, idx) => {
          const perm = permissions[mod.key] || {};
          const allOn = ACTIONS.every(a => perm[a]);
          return (
            <tr key={mod.key} className={`border-b border-[#F0EAE2] hover:bg-[#FDF9F5] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
              <td className="px-5 py-3.5 font-semibold text-gray-700">
                <span className="mr-2">{mod.icon}</span>{mod.label}
              </td>
              {ACTIONS.map(action => (
                <td key={action} className="px-5 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!perm[action]}
                    onChange={() => onToggle(mod.key, action)}
                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                  />
                </td>
              ))}
              <td className="px-5 py-3.5 text-center">
                <input
                  type="checkbox"
                  checked={allOn}
                  onChange={() => onToggleRow(mod.key)}
                  className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export default function RoleAssignPage({ onBack, targetStaff }) {
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(targetStaff || null);
  const [permissionModules, setPermissionModules] = useState(ADMIN_MODULES);
  const [staffPerms, setStaffPerms] = useState(initPerms(ADMIN_MODULES));
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Create Role state
  const [roleName, setRoleName] = useState('');
  const [rolePerms, setRolePerms] = useState(initPerms(ADMIN_MODULES));
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleCreated, setRoleCreated] = useState('');
  const [roleError, setRoleError] = useState('');

  const fetchStaffList = useCallback(async () => {
    try {
      const data = await staffAPI.getAll({ limit: 100 });
      setStaffList(data.staff || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => { fetchStaffList(); }, [fetchStaffList]);

  // Fetch permission modules from backend (if available)
  useEffect(() => {
    let mounted = true;
    staffAPI.getModules()
      .then(res => {
        if (!mounted) return;
        if (res && Array.isArray(res.modules) && res.modules.length > 0) {
          // remove 'users' and 'brands' from modules list so they don't show in permissions
          const filtered = res.modules.filter(m => m.key !== 'users' && m.key !== 'brands');
          setPermissionModules(filtered);
          setRolePerms(initPerms(filtered));
          setStaffPerms(initPerms(filtered));
        }
      })
      .catch(() => {
        // ignore and keep fallback
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      setLoadingPerms(true);
      staffAPI.getById(selectedStaff._id)
        .then(data => {
          setStaffPerms(permsToMap(data.staff?.permissions || [], permissionModules));
        })
        .catch(console.error)
        .finally(() => setLoadingPerms(false));
    }
  }, [selectedStaff, permissionModules]);

  // Role permission helpers
  const toggleRolePerm = (moduleKey, action) => {
    setRolePerms(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] } }));
  };
  const toggleRoleRow = (moduleKey) => {
    const allOn = ACTIONS.every(a => rolePerms[moduleKey][a]);
    setRolePerms(prev => ({ ...prev, [moduleKey]: { view: !allOn, create: !allOn, edit: !allOn, delete: !allOn } }));
  };
  const toggleRoleColumn = (action) => {
    const allOn = permissionModules.every(m => rolePerms[m.key][action]);
    setRolePerms(prev => {
      const next = { ...prev };
      permissionModules.forEach(m => { next[m.key] = { ...next[m.key], [action]: !allOn }; });
      return next;
    });
  };
  const roleSelectAll = () => {
    const map = {};
    permissionModules.forEach(m => { map[m.key] = { view: true, create: true, edit: true, delete: true }; });
    setRolePerms(map);
  };
  const roleClearAll = () => setRolePerms(initPerms(permissionModules));

  const handleCreateRole = async () => {
    if (!roleName.trim()) return;
    setCreatingRole(true);
    setRoleError('');
    setRoleCreated('');
    try {
      await roleAPI.create({ name: roleName.trim(), permissions: mapToPerms(rolePerms) });
      setRoleCreated(`Role "${roleName.trim()}" created successfully!`);
      setRoleName('');
      setRolePerms(initPerms(permissionModules));
    } catch (err) {
      setRoleError(err.message || 'Error creating role');
    } finally {
      setCreatingRole(false);
    }
  };

  // Staff permission helpers
  const toggleStaffPerm = (moduleKey, action) => {
    setStaffPerms(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] } }));
    setSaved(false);
  };
  const toggleStaffRow = (moduleKey) => {
    const allOn = ACTIONS.every(a => staffPerms[moduleKey][a]);
    setStaffPerms(prev => ({ ...prev, [moduleKey]: { view: !allOn, create: !allOn, edit: !allOn, delete: !allOn } }));
    setSaved(false);
  };
  const toggleStaffColumn = (action) => {
    const allOn = permissionModules.every(m => staffPerms[m.key][action]);
    setStaffPerms(prev => {
      const next = { ...prev };
      permissionModules.forEach(m => { next[m.key] = { ...next[m.key], [action]: !allOn }; });
      return next;
    });
    setSaved(false);
  };
  const staffSelectAll = () => {
    const map = {};
    permissionModules.forEach(m => { map[m.key] = { view: true, create: true, edit: true, delete: true }; });
    setStaffPerms(map);
    setSaved(false);
  };
  const staffClearAll = () => { setStaffPerms(initPerms(permissionModules)); setSaved(false); };

  const handleSave = async () => {
    if (!selectedStaff) return;
    setSaving(true);
    try {
      await staffAPI.updatePermissions(selectedStaff._id, mapToPerms(staffPerms));
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-gray-400 mb-1">Dashboard &rsaquo; Staff Management &rsaquo; <span className="text-[#8B5E3C] font-semibold">Role Assign</span></p>
          <h1 className="text-2xl font-bold text-gray-800">Role Assign &amp; Permissions</h1>
        </div>
        <button onClick={onBack} className="px-4 py-2 border border-[#E6DFD4] rounded-xl text-sm text-gray-600 hover:bg-gray-50">
          ← Back to List
        </button>
      </div>

      {/* ── Create Role Card ── */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-800 text-base mb-5 flex items-center gap-2">
          <span className="w-7 h-7 bg-[#F8F4EC] rounded-lg flex items-center justify-center text-[#8B5E3C] text-sm font-bold">+</span>
          Create Role
        </h2>

        {/* Role Name Field */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role Name <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={roleName}
            onChange={e => { setRoleName(e.target.value); setRoleCreated(''); setRoleError(''); }}
            placeholder="Enter Role Name"
            className="w-full md:w-96 px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C]"
          />
        </div>

        {/* Permission Matrix for Create Role */}
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Permission Matrix</h3>
          <PermissionTable
            modules={permissionModules}
            permissions={rolePerms}
            onToggle={toggleRolePerm}
            onToggleRow={toggleRoleRow}
            onToggleColumn={toggleRoleColumn}
            onSelectAll={roleSelectAll}
            onClearAll={roleClearAll}
          />
        </div>

        {/* Feedback messages */}
        {roleCreated && (
          <p className="flex items-center gap-1.5 text-sm text-green-600 font-semibold mb-3">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {roleCreated}
          </p>
        )}
        {roleError && <p className="text-sm text-red-500 mb-3">{roleError}</p>}

        {/* Create Button */}
        <div className="flex justify-end">
          <button
            onClick={handleCreateRole}
            disabled={creatingRole || !roleName.trim()}
            className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {creatingRole ? 'Creating...' : 'Create Role'}
          </button>
        </div>
      </div>

      {/* ── Assign Permissions to Staff ── */}
      <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 mb-6">
        <h2 className="font-bold text-gray-800 text-base mb-4 flex items-center gap-2">
          <span className="w-7 h-7 bg-[#F8F4EC] rounded-lg flex items-center justify-center text-[#8B5E3C] text-sm">👥</span>
          Assign Permissions to Staff
        </h2>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Staff Member</label>
        <select
          value={selectedStaff?._id || ''}
          onChange={e => {
            const found = staffList.find(s => s._id === e.target.value);
            setSelectedStaff(found || null);
            setSaved(false);
          }}
          className="w-full md:w-96 px-4 py-2.5 text-sm border border-[#E6DFD4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5E3C]/30 bg-white"
        >
          <option value="">-- Select Staff --</option>
          {staffList.map(s => <option key={s._id} value={s._id}>{s.fullName} ({s.role})</option>)}
        </select>
      </div>

      {/* Staff Permission Matrix */}
      {selectedStaff && (
        <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0EAE2] bg-[#FAFAFA]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#8B5E3C] text-white flex items-center justify-center font-bold text-sm">
                {selectedStaff.fullName?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-sm">{selectedStaff.fullName}</p>
                <p className="text-xs text-gray-500">{selectedStaff.role}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700">Permission Matrix</p>
          </div>

          {loadingPerms ? (
            <div className="text-center py-12 text-gray-400">Loading permissions...</div>
          ) : (
            <div className="p-6">
              <PermissionTable
                modules={permissionModules}
                permissions={staffPerms}
                onToggle={toggleStaffPerm}
                onToggleRow={toggleStaffRow}
                onToggleColumn={toggleStaffColumn}
                onSelectAll={staffSelectAll}
                onClearAll={staffClearAll}
              />
            </div>
          )}

          {/* Save Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-[#E6DFD4] bg-[#FAFAFA]">
            {saved ? (
              <span className="flex items-center gap-1.5 text-sm text-green-600 font-semibold">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Permissions saved successfully!
              </span>
            ) : <span />}
            <div className="flex gap-3">
              <button onClick={onBack} className="px-5 py-2.5 border border-[#E6DFD4] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {saving ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { staffAPI } from '../../api/staffService';
import { roleAPI } from '../../api/roleService';
import { ADMIN_MODULES } from '../../config/adminModules';

const ACTIONS = ['view', 'create', 'edit', 'delete'];

const canToggleAction = (moduleKey, action, currentUserPermissions = [], isAdmin = false) => {
  if (isAdmin) return true;
  const permission = (currentUserPermissions || []).find((entry) => entry.module === moduleKey);
  if (!permission) return false;
  if (action === 'view') return !!(permission.view || permission.create || permission.edit || permission.delete);
  return !!permission[action];
};

const getVisibleModules = (modules = [], currentUserPermissions = [], isAdmin = false) => {
  if (isAdmin) return modules;
  return (modules || []).filter((mod) => ACTIONS.some((action) => canToggleAction(mod.key || mod, action, currentUserPermissions, isAdmin)));
};

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

const PermissionTable = ({ modules, permissions, onToggle, onToggleRow, onToggleColumn, onSelectAll, onClearAll, canToggleAction: canToggleActionForModule = () => true }) => {
  const visibleModules = (modules || []).filter((mod) => ACTIONS.some((action) => canToggleActionForModule(mod.key || mod, action)));

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-end gap-2 mb-3">
        <button onClick={onSelectAll} type="button" className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-[#F8F4EC] text-gray-600 transition-colors">Select All</button>
        <button onClick={onClearAll} type="button" className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-[#F8F4EC] text-gray-600 transition-colors">Clear All</button>
      </div>
      <table className="w-full text-sm border border-[#E6DFD4] rounded-xl overflow-hidden">
        <thead className="bg-[#F8F4EC]">
          <tr>
            <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 w-48">Module</th>
            {ACTIONS.map(action => (
              <th key={action} className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500">
                <button onClick={() => onToggleColumn(action)} type="button" className="hover:text-[#8B5E3C] transition-colors capitalize">{action}</button>
              </th>
            ))}
            <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500">All</th>
          </tr>
        </thead>
        <tbody>
          {visibleModules.map((mod, idx) => {
            const moduleKey = mod.key || mod;
            const perm = permissions[moduleKey] || {};
            const allOn = ACTIONS.every(a => perm[a]);
            const canToggleRowForModule = ACTIONS.some((action) => canToggleActionForModule(moduleKey, action));
            return (
              <tr key={moduleKey} className={`border-b border-[#F0EAE2] hover:bg-[#FDF9F5] transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                <td className="px-5 py-3.5 font-semibold text-gray-700">
                  <span className="mr-2">{mod.icon}</span>{mod.label}
                </td>
                {ACTIONS.map(action => (
                  <td key={action} className="px-5 py-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={!!perm[action]}
                      disabled={!canToggleActionForModule(moduleKey, action)}
                      onChange={() => onToggle(moduleKey, action)}
                      className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </td>
                ))}
                <td className="px-5 py-3.5 text-center">
                  <input
                    type="checkbox"
                    checked={allOn}
                    disabled={!canToggleRowForModule}
                    onChange={() => onToggleRow(moduleKey)}
                    className="w-4 h-4 accent-[#8B5E3C] rounded cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const InputField = ({ label, error, required, children }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {error && <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1"><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{error}</p>}
  </div>
);

const inputClass = (hasError) =>
  `w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 transition-colors ${
    hasError ? 'border-red-400 focus:ring-red-200' : 'border-[#E6DFD4] focus:ring-[#8B5E3C]/30 focus:border-[#8B5E3C]'
  }`;

export default function AddStaffPage({ onBack, onSuccess, editingStaff, currentUserPermissions = [], isAdmin = false }) {
  const isEdit = !!editingStaff;

  const [form, setForm] = useState({
    fullName: '', email: '', mobile: '', password: '', role: '', status: 'active',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successStaff, setSuccessStaff] = useState(null);
  const [dynamicRoles, setDynamicRoles] = useState([]);

  const [permissionModules, setPermissionModules] = useState(ADMIN_MODULES);
  const [staffPerms, setStaffPerms] = useState(initPerms(ADMIN_MODULES));
  const [loadingPerms, setLoadingPerms] = useState(false);
  const visiblePermissionModules = getVisibleModules(permissionModules, currentUserPermissions, isAdmin);

  useEffect(() => {
    roleAPI.getAll().then(roles => setDynamicRoles(roles)).catch(() => setDynamicRoles([]));
  }, []);

  useEffect(() => {
    let mounted = true;
    staffAPI.getModules()
      .then(res => {
        if (!mounted) return;
        if (res && Array.isArray(res.modules) && res.modules.length > 0) {
          const filtered = res.modules.filter(m => m.key !== 'users' && m.key !== 'brands');
          // enrich with icons from the frontend ADMIN_MODULES config
          const enriched = filtered.map(m => {
            const local = ADMIN_MODULES.find(a => a.key === m.key);
            return { ...m, icon: local?.icon || m.icon || '' };
          });
          setPermissionModules(enriched);
          setStaffPerms(initPerms(enriched));
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (editingStaff) {
      setForm({
        fullName: editingStaff.fullName || '',
        email: editingStaff.email || '',
        mobile: editingStaff.mobile || '',
        password: '',
        role: editingStaff.role || '',
        status: editingStaff.status || 'active',
      });
      
      setLoadingPerms(true);
      staffAPI.getById(editingStaff._id)
        .then(data => {
          setStaffPerms(permsToMap(data.staff?.permissions || [], permissionModules));
        })
        .catch(console.error)
        .finally(() => setLoadingPerms(false));
    }
  }, [editingStaff, permissionModules]);

  const toggleStaffPerm = (moduleKey, action) => {
    setStaffPerms(prev => ({ ...prev, [moduleKey]: { ...prev[moduleKey], [action]: !prev[moduleKey][action] } }));
  };
  const toggleStaffRow = (moduleKey) => {
    const allOn = ACTIONS.every(a => staffPerms[moduleKey][a]);
    setStaffPerms(prev => ({ ...prev, [moduleKey]: { view: !allOn, create: !allOn, edit: !allOn, delete: !allOn } }));
  };
  const toggleStaffColumn = (action) => {
    const allowedModules = visiblePermissionModules.filter((m) => canToggleAction(m.key, action, currentUserPermissions, isAdmin));
    if (allowedModules.length === 0) return;
    const allOn = allowedModules.every(m => staffPerms[m.key][action]);
    setStaffPerms(prev => {
      const next = { ...prev };
      allowedModules.forEach(m => { next[m.key] = { ...next[m.key], [action]: !allOn }; });
      return next;
    });
  };
  const staffSelectAll = () => {
    const map = {};
    visiblePermissionModules.forEach(m => { map[m.key] = { view: true, create: true, edit: true, delete: true }; });
    setStaffPerms(prev => ({ ...prev, ...map }));
  };
  const staffClearAll = () => setStaffPerms(prev => ({ ...prev, ...Object.fromEntries(visiblePermissionModules.map(m => [m.key, { view: false, create: false, edit: false, delete: false }])) }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Full Name is required.';
    if (!form.email.trim()) e.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address.';
    if (!isEdit && !form.password) e.password = 'Password is required.';
    else if (form.password && form.password.length < 8) e.password = 'Password must contain at least 8 characters.';
    if (!form.role) e.role = 'Role is required.';
    return e;
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;

      let result;
      if (isEdit) {
        result = await staffAPI.update(editingStaff._id, payload);
        await staffAPI.updatePermissions(editingStaff._id, mapToPerms(staffPerms));
      } else {
        result = await staffAPI.create(payload);
        // Save permissions for the newly created staff member
        const newId = result?.staff?._id || result?._id;
        if (newId) {
          await staffAPI.updatePermissions(newId, mapToPerms(staffPerms));
        }
      }
      onBack();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">
          Dashboard &rsaquo; Staff Management &rsaquo; <span className="text-[#8B5E3C] font-semibold">{isEdit ? 'Edit Staff' : 'Add Staff'}</span>
        </p>
        <h1 className="text-2xl font-bold text-gray-800">{isEdit ? 'Edit Staff Member' : 'Add New Staff'}</h1>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 md:p-8 space-y-5">
          <div className="flex items-center gap-2 mb-2 pb-4 border-b border-[#F0EAE2]">
            <div className="w-8 h-8 bg-[#F8F4EC] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-[#8B5E3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <h2 className="font-bold text-gray-700">Basic Information</h2>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{errors.submit}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField label="Full Name" error={errors.fullName} required>
              <input
                type="text"
                value={form.fullName}
                onChange={handleChange('fullName')}
                placeholder="e.g. Ravi Kumar"
                className={inputClass(errors.fullName)}
              />
            </InputField>
            <InputField label="Email Address" error={errors.email} required>
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                placeholder="e.g. ravi@woodentoys.com"
                className={inputClass(errors.email)}
              />
            </InputField>
            <InputField label="Mobile Number" error={errors.mobile}>
              <input
                type="tel"
                value={form.mobile}
                onChange={handleChange('mobile')}
                placeholder="e.g. 9876543210"
                className={inputClass(errors.mobile)}
              />
            </InputField>
            <InputField label={isEdit ? 'New Password (leave blank to keep)' : 'Password'} error={errors.password} required={!isEdit}>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="Min. 8 characters"
                  className={inputClass(errors.password) + ' pr-11'}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </InputField>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <InputField label="Role Assignment" error={errors.role} required>
              <select value={form.role} onChange={handleChange('role')} className={inputClass(errors.role)}>
                <option value="">Select Role...</option>
                {dynamicRoles.map(r => <option key={r._id} value={r.name}>{r.name}</option>)}
              </select>
            </InputField>
            <InputField label="Status">
              <select value={form.status} onChange={handleChange('status')} className={inputClass(false)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </InputField>
          </div>
          
          <div className="bg-white rounded-2xl border border-[#E6DFD4] shadow-sm p-6 md:p-8 space-y-5 mt-6">
            <div className="flex items-center gap-2 mb-2 pb-4 border-b border-[#F0EAE2]">
              <div className="w-8 h-8 bg-[#F8F4EC] rounded-lg flex items-center justify-center">
                <span className="text-[#8B5E3C] text-sm">👥</span>
              </div>
              <h2 className="font-bold text-gray-700">Assign Permissions</h2>
            </div>
            {loadingPerms ? (
              <div className="text-center py-6 text-gray-400">Loading permissions...</div>
            ) : (
              <PermissionTable
                modules={visiblePermissionModules}
                permissions={staffPerms}
                onToggle={toggleStaffPerm}
                onToggleRow={toggleStaffRow}
                onToggleColumn={toggleStaffColumn}
                onSelectAll={staffSelectAll}
                onClearAll={staffClearAll}
                canToggleAction={(moduleKey, action) => canToggleAction(moduleKey, action, currentUserPermissions, isAdmin)}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button type="button" onClick={onBack} className="px-6 py-2.5 border border-[#E6DFD4] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 bg-[#8B5E3C] hover:bg-[#7a5234] disabled:opacity-60 text-white px-7 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Save Staff'}
          </button>
        </div>
      </form>
    </div>
  );
}

const Staff = require('../models/Staff');
const Role = require('../models/Role');
const { PERMISSION_MODULES } = require('../models/Staff');
const Module = require('../models/Module');

const buildEmptyPermissions = () =>
  PERMISSION_MODULES.map((module) => ({
    module,
    view: false,
    create: false,
    edit: false,
    delete: false,
  }));

const normalizePermissions = (permissions = []) => {
  const merged = new Map(buildEmptyPermissions().map((permission) => [permission.module, permission]));

  (permissions || []).forEach((permission) => {
    if (!permission?.module || !merged.has(permission.module)) return;

    merged.set(permission.module, {
      module: permission.module,
      view: !!permission.view,
      create: !!permission.create,
      edit: !!permission.edit,
      delete: !!permission.delete,
    });
  });

  return Array.from(merged.values());
};

const getPermissionsForRole = async (roleName) => {
  const role = await Role.findOne({ name: roleName }).lean();
  return normalizePermissions(role?.permissions);
};

// ─── GET ALL STAFF ────────────────────────────────────────────────────────────
const getAllStaff = async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const total = await Staff.countDocuments(query);
    const staff = await Staff.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({ success: true, staff, pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET SINGLE STAFF ─────────────────────────────────────────────────────────
const getStaffById = async (req, res) => {
  try {
    const member = await Staff.findById(req.params.id).select('-password');
    if (!member) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, staff: member });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── CREATE STAFF ─────────────────────────────────────────────────────────────
const createStaff = async (req, res) => {
  try {
    const { fullName, email, mobile, password, role, status } = req.body;

    // Validate required
    if (!fullName || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'fullName, email, password, and role are required.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const existing = await Staff.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success: false, message: 'A staff member with this email already exists.' });

    const defaultPermissions = await getPermissionsForRole(role);

    const staff = await Staff.create({
      fullName,
      email,
      mobile: mobile || '',
      password,
      role,
      status: status || 'active',
      permissions: defaultPermissions,
      createdBy: req.user?._id,
    });

    const result = staff.toObject();
    delete result.password;
    res.status(201).json({ success: true, staff: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE STAFF ─────────────────────────────────────────────────────────────
const updateStaff = async (req, res) => {
  try {
    const { fullName, email, mobile, role, status, password } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    if (fullName) staff.fullName = fullName;
    if (email) staff.email = email;
    if (mobile !== undefined) staff.mobile = mobile;
    if (role && role !== staff.role) {
      staff.role = role;
      staff.permissions = await getPermissionsForRole(role);
    }
    if (status) staff.status = status;
    if (password) {
      if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      staff.password = password;
    }

    const updated = await staff.save();
    const result = updated.toObject();
    delete result.password;
    res.json({ success: true, staff: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE STAFF ─────────────────────────────────────────────────────────────
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findByIdAndDelete(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });
    res.json({ success: true, message: 'Staff member deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── UPDATE PERMISSIONS ───────────────────────────────────────────────────────
const updatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ success: false, message: 'Staff not found' });

    staff.permissions = normalizePermissions(permissions);
    await staff.save();
    const result = staff.toObject();
    delete result.password;
    res.json({ success: true, staff: result, message: 'Permissions updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET PERMISSION MODULES LIST ─────────────────────────────────────────────
const getPermissionModules = async (req, res) => {
  try {
    const modules = await Module.find({ isActive: true }).sort({ displayOrder: 1 }).lean();
    if (modules && modules.length > 0) {
      // return objects compatible with frontend: { key, label, icon }
      const mapped = modules.map(m => ({ key: m.key, label: m.label, icon: m.icon }));
      return res.json({ success: true, modules: mapped });
    }
  } catch (err) {
    console.warn('Could not load modules from DB:', err.message);
  }

  // Fallback to static list defined in Staff model
  const fallback = PERMISSION_MODULES.map(k => ({ key: k, label: k, icon: '' }));
  res.json({ success: true, modules: fallback });
};

module.exports = { getAllStaff, getStaffById, createStaff, updateStaff, deleteStaff, updatePermissions, getPermissionModules };

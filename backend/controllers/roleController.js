const Role = require('../models/Role');
const Staff = require('../models/Staff');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
const getRoles = async (req, res) => {
  try {
    const roles = await Role.find({}).sort({ createdAt: -1 });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: 'Server Error fetching roles' });
  }
};

// @desc    Create a new role and apply its permissions to all existing staff with that role
// @route   POST /api/roles
// @access  Private/Admin
const createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const roleExists = await Role.findOne({ name });
    if (roleExists) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = await Role.create({ name, permissions: permissions || [] });

    // Apply the new role's permissions to all staff members who already have this role name
    if (permissions && permissions.length > 0) {
      await Staff.updateMany(
        { role: name },
        { $set: { permissions: permissions } }
      );
    }

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: 'Server Error creating role' });
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private/Admin
const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Optional: check if staff members are using this role and prevent deletion or let it be.
    // For now, just delete the role.
    await Role.findByIdAndDelete(req.params.id);
    res.json({ message: 'Role removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error deleting role' });
  }
};

module.exports = {
  getRoles,
  createRole,
  deleteRole,
};

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const PERMISSION_MODULES = [
  'dashboard', 'staff_management', 'catalog', 'users', 'products', 'categories',
  'brands', 'orders', 'inventory', 'coupons', 'reviews', 'customers',
  'reports', 'settings', 'fees', 'cancellation', 'refund', 'bulk_orders',
  'gift_and_card', 'customize_order', 'cms'
];

const permissionSchema = new mongoose.Schema({
  module: { type: String, enum: PERMISSION_MODULES, required: true },
  view:   { type: Boolean, default: false },
  create: { type: Boolean, default: false },
  edit:   { type: Boolean, default: false },
  delete: { type: Boolean, default: false },
}, { _id: false });

const staffSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, trim: true, lowercase: true },
  mobile:   { type: String, trim: true, default: '' },
  password: { type: String, required: true },
  role: {
    type: String,
    required: true,
  },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  permissions: { type: [permissionSchema], default: [] },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Hash password before saving
staffSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

staffSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Staff', staffSchema);
module.exports.PERMISSION_MODULES = PERMISSION_MODULES;

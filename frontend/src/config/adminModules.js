/**
 * SINGLE SOURCE OF TRUTH for all Admin Dashboard modules.
 *
 * Every entry here automatically appears as:
 *  1. A nav item in the AdminDashboard sidebar.
 *  2. A row in the Role Assign permission matrix table.
 *
 * To add a new module to the dashboard, add an entry here.
 * The permission table will update automatically.
 */

export const ADMIN_MODULES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    key: 'staff_management',
    label: 'Staff Management',
    icon: '👥',
  },
  {
    key: 'catalog',
    label: 'Catalog',
    icon: '🗂️',
  },
  {
    key: 'products',
    label: 'Products',
    icon: '🛍️',
  },
  {
    key: 'categories',
    label: 'Categories',
    icon: '🏷️',
  },
  {
    key: 'orders',
    label: 'Orders Management',
    icon: '📦',
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: '🏭',
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: '🙋',
  },
  {
    key: 'coupons',
    label: 'Coupons',
    icon: '🎟️',
  },
  {
    key: 'reviews',
    label: 'Reviews',
    icon: '⭐',
  },
  {
    key: 'fees',
    label: 'Fee Management',
    icon: '💰',
  },
  {
    key: 'cancellation',
    label: 'Cancellation Management',
    icon: '🚫',
  },
  {
    key: 'refund',
    label: 'Refund Management',
    icon: '💳',
  },
  {
    key: 'bulk_orders',
    label: 'Bulk Orders',
    icon: '📦',
  }
];


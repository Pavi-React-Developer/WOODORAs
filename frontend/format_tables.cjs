const fs = require('fs');

const files = [
  'src/pages/admin/AddStaffPage.jsx',
  'src/pages/admin/advanced-booking/AdvancedBookingManagement.jsx',
  'src/pages/admin/BulkOrderFieldsAdminPage.jsx',
  'src/pages/admin/BulkOrdersAdminPage.jsx',
  'src/pages/admin/cancellations/CancellationManagementPage.jsx',
  'src/pages/admin/catalog/AttributesPage.jsx',
  'src/pages/admin/catalog/CategoriesPage.jsx',
  'src/pages/admin/catalog/GSTRulesPage.jsx',
  'src/pages/admin/catalog/ProductsPage.jsx',
  'src/pages/admin/catalog/SubCategoriesPage.jsx',
  'src/pages/admin/coupons/CouponManagementPage.jsx',
  'src/pages/admin/customers/CustomerManagementPage.jsx',
  'src/pages/admin/customize/CustomizeFieldManager.jsx',
  'src/pages/admin/customize/CustomizeList.jsx',
  'src/pages/admin/fees/FeeListPage.jsx',
  'src/pages/admin/fees/ProductFeeRulesPage.jsx',
  'src/pages/admin/GiftAndCardAdminPage.jsx',
  'src/pages/admin/inventory/InventoryManagement.jsx',
  'src/pages/admin/OrdersPage.jsx',
  'src/pages/admin/refunds/RefundManagementPage.jsx',
  'src/pages/admin/reviews/ReviewManagementPage.jsx',
  'src/pages/admin/RoleAssignPage.jsx',
  'src/pages/admin/StaffListPage.jsx'
];

let totalModifications = 0;

files.forEach(file => {
  try {
    if (!fs.existsSync(file)) return;
    
    let content = fs.readFileSync(file, 'utf8');
    
    // 1. Standardize <td> padding and font size
    let newContent = content.replace(/<td([^>]*)className=[\"'](.*?)[\"']/g, (match, beforeClass, classList) => {
      // Remove existing px-X, py-X, p-X, text-xs, text-[Xpx], text-base
      let newClass = classList
        .replace(/\bpx-\d+(\.\d+)?\b/g, '')
        .replace(/\bpy-\d+(\.\d+)?\b/g, '')
        .replace(/\bp-\d+(\.\d+)?\b/g, '')
        .replace(/\btext-xs\b/g, '')
        .replace(/\btext-base\b/g, '')
        .replace(/\btext-\[\d+px\]\b/g, '')
        .trim();
        
      // Ensure text-sm and px-6 py-4
      if (!newClass.includes('text-sm')) newClass += ' text-sm';
      newClass = 'px-6 py-4 ' + newClass;
      
      // Clean up multiple spaces
      newClass = newClass.replace(/\s+/g, ' ').trim();
      
      return `<td${beforeClass}className="${newClass}"`;
    });

    // 2. Standardize Action Icons styling (blue for edit, red for delete, gray for view)
    // Note: The logic for the icons themselves varies, so we will focus on standardizing the button wrapper classes and icon sizes.
    // Replace text-blue-500, text-blue-600, text-indigo-500, text-[#8B5E3C] on action buttons
    // Since this is too complex for regex, we'll focus on just standardizing size={X} -> size={16} inside common action buttons
    newContent = newContent.replace(/<(Edit|SquarePen|Pencil)[^>]*size=\{\d+\}/g, (match) => {
        return match.replace(/size=\{\d+\}/, 'size={16}');
    });
    newContent = newContent.replace(/<Trash2?[^>]*size=\{\d+\}/g, (match) => {
        return match.replace(/size=\{\d+\}/, 'size={16}');
    });
    newContent = newContent.replace(/<Eye[^>]*size=\{\d+\}/g, (match) => {
        return match.replace(/size=\{\d+\}/, 'size={16}');
    });

    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf8');
      totalModifications++;
      console.log('Updated: ' + file);
    }
  } catch (err) {
    console.error('Error with ' + file + ':', err.message);
  }
});

console.log('Total files modified:', totalModifications);

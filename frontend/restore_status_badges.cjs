const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/admin/StaffListPage.jsx',
  'src/pages/admin/catalog/CategoriesPage.jsx',
  'src/pages/admin/catalog/SubCategoriesPage.jsx',
  'src/pages/admin/catalog/ProductsPage.jsx',
  'src/pages/admin/catalog/AttributesPage.jsx',
  'src/pages/admin/coupons/CouponManagementPage.jsx',
  'src/pages/admin/inventory/InventoryManagement.jsx',
  'src/pages/admin/fees/FeeListPage.jsx',
  'src/pages/admin/fees/ProductFeeRulesPage.jsx'
];

let count = 0;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace StatusBadge ({ active })
  const activeRegex = /const StatusBadge = \(\{ active \}\) => \(\s*<span className="text-sm font-semibold text-gray-800">\s*\{active \? 'Active' : 'Inactive'\}\s*<\/span>\s*\);/g;
  const newActiveBadge = `const StatusBadge = ({ active }) => (
  <span className={\`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider \${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}\`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);`;

  content = content.replace(activeRegex, newActiveBadge);

  // Replace Badge ({ status })
  const statusRegex = /const Badge = \(\{ status \}\) => \(\s*<span className="text-sm font-semibold text-gray-800">\s*\{status === 'active' \? 'Active' : 'Inactive'\}\s*<\/span>\s*\);/g;
  const newStatusBadge = `const Badge = ({ status }) => {
  const isAct = String(status).toLowerCase() === 'active';
  return (
    <span className={\`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider \${isAct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}\`}>
      {isAct ? 'Active' : 'Inactive'}
    </span>
  );
};`;

  content = content.replace(statusRegex, newStatusBadge);

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Restored colored badges in:', file);
    count++;
  }
});

console.log('Total files restored:', count);

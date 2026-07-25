const fs = require('fs');

const files = [
  'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/coupons/CouponManagementPage.jsx',
  'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/CMS/HomePageCMS.jsx',
  'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/customize/CustomizeList.jsx',
  'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/GiftAndCardAdminPage.jsx',
  'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/BulkOrdersAdminPage.jsx',
  'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/fees/ProductFeeRulesList.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Ensure RefreshCw is imported from lucide-react
  if (content.includes('lucide-react') && !content.includes('RefreshCw')) {
    content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
      return `import {${p1}, RefreshCw } from 'lucide-react';`;
    });
  } else if (!content.includes('lucide-react')) {
    content = `import { RefreshCw } from 'lucide-react';\n` + content;
  }

  // Add the button
  const buttonCode = `\n          <button onClick={() => window.location.reload()} className="admin-secondary-btn flex items-center gap-2">\n            <RefreshCw size={16} /> Refresh\n          </button>`;

  if (!content.includes('RefreshCw size={16}')) {
    if (file.includes('CouponManagementPage.jsx')) {
      content = content.replace(/(<button onClick=\{exportExcel\}.*?>)/, `${buttonCode}\n          $1`);
    } else if (file.includes('HomePageCMS.jsx')) {
      content = content.replace(/(<div className="p-6 space-y-6">\s*<div>\s*<h2 className="text-2xl font-bold text-brand-dark">Home Page CMS<\/h2>\s*<p className="text-sm text-brand-medium mt-1">Manage all dynamic content on the homepage\.<\/p>\s*<\/div>)/, `<div className="flex items-center justify-between mb-6">$1${buttonCode}</div>`);
    } else if (file.includes('CustomizeList.jsx')) {
      content = content.replace(/(<div className="mb-6">[\s\S]*?<\/div>)/, `<div className="flex items-center justify-between mb-6">\n        <div>\n          <h2 className="text-xl font-bold text-[#4A3326]">Customize Requests</h2>\n          <p className="text-sm text-gray-500 mt-1">Manage user custom order requests</p>\n        </div>${buttonCode}\n      </div>`);
    } else if (file.includes('GiftAndCardAdminPage.jsx')) {
      content = content.replace(/(<h1 className="text-2xl font-bold text-\[#4A403B\]">Gift & Card Management<\/h1>)/, `$1${buttonCode}`);
    } else if (file.includes('BulkOrdersAdminPage.jsx')) {
      content = content.replace(/(<p className="mt-1 text-sm text-\[#6D625C\]">Review and manage corporate and wholesale orders\.<\/p>\s*<\/div>)/, `$1${buttonCode}`);
    } else if (file.includes('ProductFeeRulesList.jsx')) {
      content = content.replace(/(<p className="text-\[#8A817C\] mt-1">Manage volume-based product fee rules<\/p>\s*<\/div>)/, `$1${buttonCode}`);
    }
  }

  fs.writeFileSync(file, content);
});
console.log('Refresh buttons added successfully.');

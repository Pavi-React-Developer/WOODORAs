const fs = require('fs');

const filesToFix = [
  {
    path: 'src/pages/admin/coupons/CouponManagementPage.jsx',
    fetchFunc: 'loadCoupons',
    headerRegex: /(<div className="flex gap-2">\s*<button onClick=\{exportExcel\}.*?>)/,
    titleHeader: false
  },
  {
    path: 'src/pages/admin/customize/CustomizeList.jsx',
    fetchFunc: 'fetchRequests',
    headerRegex: /(<div className="mb-6">\s*<h2 className="text-xl font-bold text-\[#4A3326\]">Customize Requests<\/h2>\s*<p className="text-sm text-gray-500 mt-1">Manage user custom order requests<\/p>\s*<\/div>)/,
    titleHeader: true
  },
  {
    path: 'src/pages/admin/GiftAndCardAdminPage.jsx',
    fetchFunc: 'fetchData',
    headerRegex: /(<h1 className="text-2xl font-bold text-\[#4A403B\]">Gift & Card Management<\/h1>)/,
    titleHeader: true
  },
  {
    path: 'src/pages/admin/BulkOrdersAdminPage.jsx',
    fetchFunc: 'fetchOrders',
    headerRegex: /(<p className="mt-1 text-sm text-\[#6D625C\]">Review and manage corporate and wholesale orders\.<\/p>\s*<\/div>)/,
    titleHeader: true
  },
  {
    path: 'src/pages/admin/fees/ProductFeeRulesList.jsx',
    fetchFunc: 'fetchRules',
    headerRegex: /(<p className="text-\[#8A817C\] mt-1">Manage volume-based product fee rules<\/p>\s*<\/div>)/,
    titleHeader: true
  }
];

filesToFix.forEach(f => {
  let content = fs.readFileSync(f.path, 'utf8');

  // Remove existing window.location.reload() button if it exists
  const existingBtnRegex = /<button onClick=\{\(\) => window\.location\.reload\(\)\} className="admin-secondary-btn flex items-center gap-2">\s*<RefreshCw size=\{16\} \/> Refresh\s*<\/button>/g;
  content = content.replace(existingBtnRegex, '');

  // Fix duplicated headers if any
  if (content.includes('<div className="flex items-center justify-between mb-6">') && content.includes('<div className="flex items-center justify-between mb-6">', content.indexOf('<div className="flex items-center justify-between mb-6">') + 10)) {
     // I'll skip fixing messy regex replacements and just do it cleanly below
  }

  // Ensure RefreshCw is imported
  if (content.includes('lucide-react') && !content.includes('RefreshCw')) {
    content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
      return `import {${p1}, RefreshCw } from 'lucide-react';`;
    });
  } else if (!content.includes('lucide-react')) {
    content = `import { RefreshCw } from 'lucide-react';\n` + content;
  }

  // Add the correct button
  const buttonCode = `\n          <button onClick={${f.fetchFunc}} className="admin-secondary-btn flex items-center gap-2">\n            <RefreshCw size={16} /> Refresh\n          </button>`;

  if (!content.includes(`onClick={${f.fetchFunc}}`) && !content.includes('RefreshCw size={16}')) {
    if (f.titleHeader) {
      if (f.path.includes('CustomizeList')) {
          content = content.replace(f.headerRegex, `<div className="flex items-center justify-between mb-6">\n        <div>\n          <h2 className="text-xl font-bold text-[#4A3326]">Customize Requests</h2>\n          <p className="text-sm text-gray-500 mt-1">Manage user custom order requests</p>\n        </div>${buttonCode}\n      </div>`);
      } else if (f.path.includes('GiftAndCardAdminPage')) {
          content = content.replace(f.headerRegex, `$1${buttonCode}`);
      } else if (f.path.includes('BulkOrdersAdminPage')) {
          content = content.replace(f.headerRegex, `$1${buttonCode}`);
      } else if (f.path.includes('ProductFeeRulesList')) {
          content = content.replace(f.headerRegex, `$1${buttonCode}`);
      }
    } else {
      if (f.path.includes('CouponManagementPage')) {
        content = content.replace(/(<button onClick=\{exportExcel\}.*?>)/, `${buttonCode}\n          $1`);
      }
    }
  }
  
  fs.writeFileSync(f.path, content);
});

// HomePageCMS requires special treatment
const homePage = 'src/pages/admin/CMS/HomePageCMS.jsx';
let homeContent = fs.readFileSync(homePage, 'utf8');
const existingHomeBtn = /<button onClick=\{\(\) => window\.location\.reload\(\)\} className="admin-secondary-btn flex items-center gap-2">\s*<RefreshCw size=\{16\} \/> Refresh\s*<\/button>/g;
homeContent = homeContent.replace(existingHomeBtn, '');
if (!homeContent.includes('const [refreshKey, setRefreshKey] = useState(0);')) {
  homeContent = homeContent.replace(/const \[activeTab, setActiveTab\] = useState\('layout'\);/, `const [activeTab, setActiveTab] = useState('layout');\n  const [refreshKey, setRefreshKey] = useState(0);`);
}
if (!homeContent.includes('onClick={() => setRefreshKey(prev => prev + 1)}')) {
    const homeBtn = `\n          <button onClick={() => setRefreshKey(prev => prev + 1)} className="admin-secondary-btn flex items-center gap-2">\n            <RefreshCw size={16} /> Refresh\n          </button>`;
    homeContent = homeContent.replace(/(<div className="p-6 space-y-6">\s*<div>\s*<h2 className="text-2xl font-bold text-brand-dark">Home Page CMS<\/h2>\s*<p className="text-sm text-brand-medium mt-1">Manage all dynamic content on the homepage\.<\/p>\s*<\/div>)/, `<div className="flex items-center justify-between mb-6">$1${homeBtn}</div>`);
}
if (homeContent.includes('const renderTab = () => {')) {
   homeContent = homeContent.replace(/return <([a-zA-Z]+) \/>/g, 'return <$1 key={refreshKey} />');
}
fs.writeFileSync(homePage, homeContent);

console.log('Reload bugs fixed!');

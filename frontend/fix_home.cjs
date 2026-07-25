const fs = require('fs');

const file = 'src/pages/admin/CMS/HomePageCMS.jsx';
let content = fs.readFileSync(file, 'utf8');

// Ensure RefreshCw import
if (content.includes('lucide-react') && !content.includes('RefreshCw')) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
    return `import {${p1}, RefreshCw } from 'lucide-react';`;
  });
} else if (!content.includes('lucide-react')) {
  content = `import { RefreshCw } from 'lucide-react';\n` + content;
}

// Add state
if (!content.includes('const [refreshKey, setRefreshKey] = useState(0);')) {
  content = content.replace(/const \[activeTab, setActiveTab\] = useState\('layout'\);/, `const [activeTab, setActiveTab] = useState('layout');\n  const [refreshKey, setRefreshKey] = useState(0);`);
}

// Pass key
content = content.replace(/return <([a-zA-Z]+) \/>/g, 'return <$1 key={refreshKey} />');

// Add button
const btn = `\n      <div className="flex items-center justify-between mb-6">\n        <div>\n          <h2 className="text-2xl font-bold text-brand-dark">Home Page CMS</h2>\n          <p className="text-sm text-brand-medium mt-1">Manage all dynamic content on the homepage.</p>\n        </div>\n        <button onClick={() => setRefreshKey(prev => prev + 1)} className="admin-secondary-btn flex items-center gap-2">\n          <RefreshCw size={16} /> Refresh\n        </button>\n      </div>`;

content = content.replace(/<div className="p-6 space-y-6">\s*<div>\s*<h2 className="text-2xl font-bold text-brand-dark">Home Page CMS<\/h2>\s*<p className="text-sm text-brand-medium mt-1">Manage all dynamic content on the homepage\.<\/p>\s*<\/div>/, `<div className="p-6 space-y-6">${btn}`);

fs.writeFileSync(file, content);
console.log('HomePageCMS fixed!');

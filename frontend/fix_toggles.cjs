const fs = require('fs');

function updateFile(filename, replacer) {
  let content = fs.readFileSync(filename, 'utf8');
  const newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(filename, newContent, 'utf8');
    console.log('Updated:', filename);
  }
}

// 1. GiftAndCardAdminPage.jsx toggle replacement
updateFile('src/pages/admin/GiftAndCardAdminPage.jsx', (content) => {
  return content.replace(
    /className=\{\`transition-colors \$\{rule\.isActive \? 'text-green-500 hover:text-green-600' : 'text-gray-400 hover:text-gray-500'\}\`\} title=\{rule\.isActive \? 'Deactivate' : 'Activate'\}>\s*\{rule\.isActive \? <ToggleRight size=\{17\} \/> : <ToggleLeft size=\{17\} \/>\}/g,
    'title={rule.isActive ? "Deactivate" : "Activate"}>\n                                  <ActiveBadge status={rule.isActive} />'
  );
});

// 2. ProductFeeRulesPage.jsx toggle replacement
updateFile('src/pages/admin/fees/ProductFeeRulesPage.jsx', (content) => {
  return content.replace(
    /className=\{\`p-1\.5 rounded-lg transition-colors \$\{rule\.isActive \? 'text-green-500 hover:text-green-700 hover:bg-green-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'\}\`\}\s*title=\{rule\.isActive \? 'Deactivate' : 'Activate'\}\s*>\s*\{rule\.isActive \? <ToggleRight size=\{15\} \/> : <ToggleLeft size=\{15\} \/>\}/g,
    'title={rule.isActive ? "Deactivate" : "Activate"}>\n                            <ActiveBadge status={rule.isActive} />'
  );
});

// 3. FeeListPage.jsx button replacement
updateFile('src/pages/admin/fees/FeeListPage.jsx', (content) => {
  return content.replace(
    /className=\{\`px-2 py-0\.5 rounded-full text-\[10px\] font-bold uppercase tracking-wider transition-colors cursor-pointer \$\{fee\.active \? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'\}\`\}\s*>\s*\{fee\.active \? 'Active' : 'Inactive'\}/g,
    'className="transition-colors hover:opacity-80" title={fee.active ? "Deactivate" : "Activate"}>\n                        <ActiveBadge status={fee.active} />'
  );
});


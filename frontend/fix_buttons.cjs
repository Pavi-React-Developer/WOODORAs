const fs = require('fs');
const glob = require('glob');
const path = require('path');

// Fix Select All buttons
const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  // Replace Select All
  const selectAllRegex = /<button([^>]*?onClick={onSelectAll}[^>]*?)className="p-1\.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"([^>]*?)>Select All<\/button>/g;
  if (selectAllRegex.test(content)) {
    content = content.replace(selectAllRegex, '<button$1className="px-3 py-1.5 text-xs font-semibold border border-[#E6DFD4] rounded-lg hover:bg-[#F8F4EC] text-gray-600 transition-colors"$2>Select All</button>');
    changed = true;
  }

  // Replace old Refresh buttons
  const refreshRegex = /<button([^>]*?)className="p-1\.5 text-[a-z]+-\d+ hover:text-[a-z]+-\d+ hover:bg-[a-z]+-\d+ rounded transition-colors"([^>]*?)>([\s\S]*?)<RefreshCw([\s\S]*?)>([\s\S]*?)Refresh\s*<\/button>/g;
  if (refreshRegex.test(content)) {
    content = content.replace(refreshRegex, '<button$1className="admin-secondary-btn flex items-center gap-2"$2>$3<RefreshCw$4>$5Refresh</button>');
    changed = true;
  }

  // Remove borders from action icons (View, Edit, Delete, Approve, Reject)
  // These usually have `border border-gray-200` or similar
  const actionBtnRegex = /<button([^>]*?)className="p-1\.5 text-[a-z]+-\d+ hover:text-[a-z]+-\d+ hover:bg-[a-z]+-\d+ rounded transition-colors"([^>]*?)>([\s\S]*?)<(Eye|SquarePen|Trash2|Check|X)([\s\S]*?)>([\s\S]*?)<\/button>/g;
  // Wait, the user said "remove the border and give same icon i menation", I already did that before.
  // The git checkout restored them to having borders? The original code had `p-1.5 ...`. They don't have borders!
  
  if (changed) {
    fs.writeFileSync(fullPath, content);
  }
});

console.log('Restoration scripts applied successfully.');

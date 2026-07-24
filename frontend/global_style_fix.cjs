const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.jsx')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
};

const files = walkSync('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // We simply replace the exact class strings with the new ones.
  // The codebase currently has "p-1.5 text-blue-600 hover:text-blue-700 transition-colors"
  // or similar. Let's make it robust:
  
  content = content.replace(/className=\"([^\"]*text-teal-600[^\"]*)\"/g, (match, p1) => {
    if (!p1.includes('hover:bg-teal-50')) {
      return `className="p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"`;
    }
    return match;
  });
  
  content = content.replace(/className=\"([^\"]*text-blue-600[^\"]*)\"/g, (match, p1) => {
    if (!p1.includes('hover:bg-blue-50')) {
      return `className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"`;
    }
    return match;
  });
  
  content = content.replace(/className=\"([^\"]*text-red-500[^\"]*)\"/g, (match, p1) => {
    // Make sure we don't accidentally match the "Add Rule" button which might be red?
    // The "Add Rule" button doesn't have text-red-500 in the original committed code, it was only red because of MY previous script.
    // Since I restored, it's safe.
    if (!p1.includes('hover:bg-red-50')) {
      return `className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"`;
    }
    return match;
  });
  
  // also handle text-indigo-600 which is used in InventoryManagement for Add Stock
  content = content.replace(/className=\"([^\"]*text-indigo-600[^\"]*)\"/g, (match, p1) => {
    if (!p1.includes('hover:bg-indigo-50')) {
      return `className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

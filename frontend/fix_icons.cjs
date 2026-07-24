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
const unifiedClass = 'p-1.5 text-[#6D625C] hover:text-[#9A6031] hover:bg-[#F2E3D1] rounded transition-colors';

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // This regex finds button tags containing typical action icons, matching className
  const regex = /<button[^>]*className=\"([^\"]*)\"[^>]*>[\s\S]*?<(?:Trash2|Edit\d*|Pencil|Eye|EyeOff)[\s\S]*?<\/button>/g;
  
  content = content.replace(regex, (match, classStr) => {
    // Skip if it looks like a primary button or has specific standard admin classes
    if (classStr.includes('admin-btn') || classStr.includes('admin-primary-btn') || classStr.includes('admin-secondary-btn') || classStr.includes('admin-export-btn')) {
      return match;
    }
    
    // Replace the className string with our unifiedClass
    return match.replace(`className="${classStr}"`, `className="${unifiedClass}"`);
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

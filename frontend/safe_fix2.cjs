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

  // We will split the content by "<button" and reconstruct it.
  const parts = content.split('<button');
  
  for (let i = 1; i < parts.length; i++) {
    const endIdx = parts[i].indexOf('</button>');
    if (endIdx !== -1) {
      let buttonInner = parts[i].substring(0, endIdx);
      
      // Determine what icon is inside this button
      const hasEye = buttonInner.includes('<Eye ') || buttonInner.includes('<EyeOff ');
      const hasEdit = buttonInner.includes('<Edit ') || buttonInner.includes('<Edit2 ') || buttonInner.includes('<Edit3 ') || buttonInner.includes('<Pencil ');
      const hasTrash = buttonInner.includes('<Trash2 ') || buttonInner.includes('<Trash ');
      const hasText = />[^<]*[a-zA-Z]+[^<]*$/.test(buttonInner.replace(/<[^>]+>/g, ' '));
      
      let newClass = null;
      if (hasEye && !hasEdit && !hasTrash) newClass = 'p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors';
      if (hasEdit && !hasEye && !hasTrash) newClass = 'p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors';
      if (hasTrash && !hasEye && !hasEdit) newClass = 'p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors';
      
      if (newClass && !hasText) {
        // Skip if button has specific admin classes
        if (!buttonInner.includes('admin-btn') && !buttonInner.includes('admin-primary-btn') && !buttonInner.includes('admin-secondary-btn') && !buttonInner.includes('admin-export-btn')) {
          
          // Replace className
          buttonInner = buttonInner.replace(/className=\"[^\"]*\"/, `className="${newClass}"`);
          buttonInner = buttonInner.replace(/className=\{`[^`]*`\}/, `className="${newClass}"`);
          
          parts[i] = buttonInner + parts[i].substring(endIdx);
        }
      }
    }
  }

  content = parts.join('<button');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

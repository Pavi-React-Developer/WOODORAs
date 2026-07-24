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

  let offset = 0;
  while (true) {
    const start = content.indexOf('<button', offset);
    if (start === -1) break;
    
    // Find the matching </button> carefully
    const end = content.indexOf('</button>', start);
    if (end === -1) break;
    
    const fullButton = content.substring(start, end + 9);
    
    // Only process if it doesn't have another <button inside (just to be safe against nested buttons, which shouldn't exist)
    if (fullButton.indexOf('<button', 7) === -1) {
      
      const hasEye = /<(?:Eye|EyeOff)\b/.test(fullButton);
      const hasEdit = /<(?:Edit\d*|Pencil)\b/.test(fullButton);
      const hasTrash = /<Trash2?\b/.test(fullButton);
      
      // Strip all tags and check for text
      const textOnly = fullButton.replace(/<[^>]+>/g, ' ').trim();
      const hasText = textOnly.length > 0;
      
      // Also exclude known primary/secondary buttons
      const isSystemButton = fullButton.includes('admin-btn') || fullButton.includes('admin-primary-btn') || fullButton.includes('admin-secondary-btn') || fullButton.includes('admin-export-btn');
      
      if (!hasText && !isSystemButton) {
        let newClass = null;
        if (hasEye && !hasEdit && !hasTrash) newClass = 'p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors';
        if (hasEdit && !hasEye && !hasTrash) newClass = 'p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors';
        if (hasTrash && !hasEye && !hasEdit) newClass = 'p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors';
        
        if (newClass) {
          // Replace className
          let modifiedButton = fullButton.replace(/className=\"[^\"]*\"/, `className="${newClass}"`);
          modifiedButton = modifiedButton.replace(/className=\{`[^`]*`\}/, `className="${newClass}"`);
          
          content = content.substring(0, start) + modifiedButton + content.substring(end + 9);
          // Adjust offset based on the length difference
          offset = start + modifiedButton.length;
          continue; // skip the offset += 1 below
        }
      }
    }
    offset = start + 1;
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

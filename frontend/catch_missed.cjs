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

  // Catch the missed Edit buttons (which had hover:text-blue-500)
  content = content.replace(/className=\"([^\"]*hover:text-blue-500[^\"]*)\"/g, (match, p1) => {
    if (!p1.includes('hover:bg-blue-50')) {
      return `className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"`;
    }
    return match;
  });
  
  // Catch the missed Eye buttons (which might have had hover:text-teal-500 or just text-gray-400 without hover:text-teal)
  // Let's just catch Eye icons directly but very safely, since we know they are purely view icons.
  const parts = content.split('<button');
  for (let i = 1; i < parts.length; i++) {
    const endIdx = parts[i].indexOf('</button>');
    if (endIdx !== -1) {
      let buttonInner = parts[i].substring(0, endIdx);
      if (buttonInner.includes('<Eye ') || buttonInner.includes('<EyeOff ')) {
        // if it doesn't already have text-teal-600
        if (!buttonInner.includes('text-teal-600') && !buttonInner.includes('text-[#6D625C]')) {
          let textContent = buttonInner.substring(buttonInner.indexOf('>') + 1).replace(/<[^>]+>/g, '').trim();
          if (!/[a-zA-Z]/.test(textContent) && !buttonInner.includes('admin-btn')) {
             let modified = buttonInner;
             modified = modified.replace(/className=\"[^\"]*\"/, `className="p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors"`);
             parts[i] = modified + parts[i].substring(endIdx);
          }
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

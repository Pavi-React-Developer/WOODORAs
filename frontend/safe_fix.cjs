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

const styleMap = [
  {
    // Match Eye or EyeOff
    regex: /<button[^>]*className=(?:\"([^\"]*)\"|\{`([^`]*)`\})[^>]*>(?:[^<]|\<(?!\/?button))*?<(?:Eye|EyeOff)[\s\S]*?(?:[^<]|\<(?!\/?button))*?<\/button>/g,
    newClass: 'p-1.5 text-teal-600 hover:text-teal-700 hover:bg-teal-50 rounded transition-colors'
  },
  {
    // Match Edit or Pencil
    regex: /<button[^>]*className=(?:\"([^\"]*)\"|\{`([^`]*)`\})[^>]*>(?:[^<]|\<(?!\/?button))*?<(?:Edit\d*|Pencil)[\s\S]*?(?:[^<]|\<(?!\/?button))*?<\/button>/g,
    newClass: 'p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors'
  },
  {
    // Match Trash2
    regex: /<button[^>]*className=(?:\"([^\"]*)\"|\{`([^`]*)`\})[^>]*>(?:[^<]|\<(?!\/?button))*?<(?:Trash2?)[\s\S]*?(?:[^<]|\<(?!\/?button))*?<\/button>/g,
    newClass: 'p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors'
  }
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  styleMap.forEach(({ regex, newClass }) => {
    content = content.replace(regex, (match, classStr1, classStr2) => {
      const classStr = classStr1 || classStr2;
      if (!classStr) return match;
      
      // Safety checks: skip if there's text inside the button like "Add Rule", "Back", etc.
      if (match.match(/>[^<]*[A-Za-z]+[^<]*<\/button>/) && !match.match(/>\s*<\/button>/)) {
        return match;
      }
      
      if (classStr.includes('admin-btn') || classStr.includes('admin-primary-btn') || classStr.includes('admin-secondary-btn') || classStr.includes('admin-export-btn')) {
        return match;
      }
      
      if (classStr1) {
        return match.replace(`className="${classStr1}"`, `className="${newClass}"`);
      } else {
        return match.replace(`className={\`${classStr2}\`}`, `className="${newClass}"`);
      }
    });
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});

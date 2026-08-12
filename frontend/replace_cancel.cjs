const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('d:\\\\Marakathai\\\\frontend\\\\src\\\\pages\\\\admin', function(filePath) {
  if (filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    
    // 1. Replace existing className with admin-cancel-btn for Cancel/CANCEL buttons
    // The regex handles single/double quotes and multi-line matching
    content = content.replace(/(<button[^>]*?className=["'])([^"']*)(["'][^>]*?>\s*)(?:Cancel|CANCEL)(\s*<\/button>)/gis, '$1admin-cancel-btn$3CANCEL$4');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});

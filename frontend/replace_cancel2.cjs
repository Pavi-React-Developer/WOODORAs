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
    
    // Replace <button ...>Cancel</button> where className is present
    // The previous regex assumed className was right before > or didn't allow for other characters properly.
    // Let's use a simpler approach: finding <button ...>Cancel</button> and doing a secondary replace on className.
    
    let regex = /<button([^>]*)>\s*(Cancel|CANCEL)\s*<\/button>/gi;
    
    content = content.replace(regex, (match, attrs, text) => {
      // if attrs contains className, replace its value
      if (/className=["']([^"']*)["']/.test(attrs)) {
        attrs = attrs.replace(/className=["']([^"']*)["']/, 'className="admin-cancel-btn"');
      } else {
        // if no className, add it
        attrs = attrs + ' className="admin-cancel-btn"';
      }
      return `<button${attrs}>CANCEL</button>`;
    });
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});

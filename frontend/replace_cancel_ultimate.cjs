const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir('d:\\\\Marakathai\\\\frontend\\\\src\\\\pages\\\\admin', function(filePath) {
  if (!filePath.endsWith('.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // We want to find any <button ...>CANCEL</button> or <button ...>Cancel</button>
  // and ensure its className is exactly "admin-cancel-btn"
  
  // Regex to match a button that contains CANCEL or Cancel
  // We use [\s\S]*? to match across newlines inside the button tag
  const btnRegex = /<button([^>]*?)>(\s*(?:Cancel|CANCEL)\s*)<\/button>/gi;
  
  content = content.replace(btnRegex, (match, attrs, text) => {
    // Check if the button already has admin-cancel-btn
    if (attrs.includes('admin-cancel-btn')) {
      return match;
    }
    
    // Remove existing className completely
    let newAttrs = attrs.replace(/className=(?:{[^}]+}|["'][^"']*["'])/g, '');
    
    // Add our class
    newAttrs = newAttrs + ' className="admin-cancel-btn"';
    
    return `<button${newAttrs}>CANCEL</button>`;
  });
  
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
});

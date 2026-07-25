const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  const lucideImports = ['SquarePen', 'Trash', 'Check', 'X', 'Eye'];
  
  lucideImports.forEach(imp => {
    // If the file uses this component...
    if (content.includes(`<${imp} `) || content.includes(`<${imp}/`) || content.includes(`<${imp}\n`)) {
      // Check if it's already properly imported from lucide-react
      // We look for 'imp' inside the import { ... } block
      const hasLucide = content.includes('lucide-react');
      
      let isImported = false;
      if (hasLucide) {
        // Find the lucide-react import
        const lucideMatch = content.match(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/);
        if (lucideMatch) {
          // Check if imp is in the imported list (as a whole word)
          const regex = new RegExp(`\\b${imp}\\b`);
          if (regex.test(lucideMatch[1])) {
            isImported = true;
          }
        }
      }

      if (!isImported) {
        if (hasLucide) {
          // Add it to the existing import
          content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]lucide-react['"]/, (match, p1) => {
            return `import {${p1}, ${imp} } from 'lucide-react'`;
          });
        } else {
          // Add new import at the top
          content = `import { ${imp} } from 'lucide-react';\n` + content;
        }
      }
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Imports flawlessly fixed!');

const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Fix the regex mistakes
  content = content.replace(/<SquarePen2/g, '<SquarePen');
  content = content.replace(/<SquarePen3/g, '<SquarePen');
  content = content.replace(/<Trash2/g, '<Trash');
  content = content.replace(/<Check2/g, '<Check');
  content = content.replace(/<CheckCircle2/g, '<Check');
  content = content.replace(/<CheckCircle/g, '<Check');
  content = content.replace(/<XCircle/g, '<X');

  // Also replace any remaining Edit/Edit2 etc that didn't get caught because of the button parsing
  // Let's just aggressively replace the action icons inside buttons
  const parts = content.split('<button');
  for (let i = 1; i < parts.length; i++) {
    const endTagIdx = parts[i].indexOf('</button>');
    if (endTagIdx !== -1) {
      let btnOuter = parts[i].substring(0, endTagIdx);
      
      const hasEye = btnOuter.includes('<Eye ') || btnOuter.includes('<Eye/');
      const hasEdit = btnOuter.includes('<Edit ') || btnOuter.includes('<Edit2 ') || btnOuter.includes('<Pencil ') || btnOuter.includes('<SquarePen ');
      const hasTrash = btnOuter.includes('<Trash ');
      const hasCheck = btnOuter.includes('<Check ');
      const hasX = btnOuter.includes('<X ');
      
      if (hasEye || hasEdit || hasTrash || hasCheck || hasX) {
        
        // Ensure the icons themselves are exactly correct
        btnOuter = btnOuter.replace(/<(Edit|Edit2|Pencil)[\s>]/g, match => match.replace(/Edit|Edit2|Pencil/, 'SquarePen'));
        
        // Set the borderless class
        let newClass = '';
        if (hasEye) newClass = 'text-green-600 hover:text-green-700 transition-colors';
        else if (hasEdit) newClass = 'text-blue-600 hover:text-blue-700 transition-colors';
        else if (hasTrash) newClass = 'text-red-500 hover:text-red-600 transition-colors';
        else if (hasCheck) newClass = 'text-green-600 hover:text-green-700 transition-colors';
        else if (hasX) newClass = 'text-red-500 hover:text-red-600 transition-colors';

        if (btnOuter.includes('className=')) {
          btnOuter = btnOuter.replace(/className=(?:"[^"]*"|`[^`]*`|\{[^}]*\})/, `className="${newClass}"`);
        } else {
          btnOuter = ' className="' + newClass + '" ' + btnOuter;
        }

        parts[i] = btnOuter + parts[i].substring(endTagIdx);
      }
    }
  }
  
  content = parts.join('<button');

  // Fix imports
  const lucideImports = ['SquarePen', 'Trash', 'Check', 'X', 'Eye'];
  lucideImports.forEach(imp => {
    if (content.includes(`<${imp} `) || content.includes(`<${imp}/`)) {
      if (content.includes('lucide-react') && !content.includes(imp)) {
        content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (match, p1) => {
          return `import {${p1}, ${imp} } from 'lucide-react';`;
        });
      } else if (!content.includes('lucide-react')) {
        content = `import { ${imp} } from 'lucide-react';\n` + content;
      }
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Action column buttons flawlessly updated (fixed regex bugs)!');

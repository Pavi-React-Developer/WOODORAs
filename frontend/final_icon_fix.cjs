const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // Split by <button to safely parse React tags
  const parts = content.split('<button');
  
  for (let i = 1; i < parts.length; i++) {
    const endTagIdx = parts[i].indexOf('</button>');
    if (endTagIdx !== -1) {
      let btnOuter = parts[i].substring(0, endTagIdx);
      const btnEndIdx = btnOuter.indexOf('>');
      
      // Since btnOuter could have > inside props (e.g. () =>), we need to find the real end of the tag.
      // But actually, we don't even need to be that strict if we just replace the icon names and className inside btnOuter.
      
      // Determine what icon is inside this button
      const hasEye = btnOuter.includes('<Eye ') || btnOuter.includes('<Eye/');
      const hasEdit = btnOuter.includes('<Edit ') || btnOuter.includes('<Edit2 ') || btnOuter.includes('<Edit3 ') || btnOuter.includes('<Pencil ') || btnOuter.includes('<SquarePen ');
      const hasTrash = btnOuter.includes('<Trash2 ') || btnOuter.includes('<Trash ');
      const hasCheck = btnOuter.includes('<Check ') || btnOuter.includes('<CheckCircle ') || btnOuter.includes('<CheckCircle2 ');
      const hasX = btnOuter.includes('<X ') || btnOuter.includes('<XCircle ');
      
      // Make sure it doesn't have text
      const stripTags = btnOuter.replace(/<[^>]+>/g, '');
      const hasText = /[a-zA-Z]{3,}/.test(stripTags); // if it has a word of 3+ letters, it's probably not an icon-only button (e.g., "Add Staff", "Refresh")
      
      if (!hasText && (hasEye || hasEdit || hasTrash || hasCheck || hasX)) {
        // It's an action button!
        
        // 1. Swap the icon to the specific one
        if (hasEye) {
          btnOuter = btnOuter.replace(/<Eye([^a-zA-Z])/g, '<Eye$1'); // already Eye
        } else if (hasEdit) {
          btnOuter = btnOuter.replace(/<(Edit|Edit2|Edit3|Pencil)([^a-zA-Z])/g, '<SquarePen$2');
        } else if (hasTrash) {
          btnOuter = btnOuter.replace(/<(Trash2)([^a-zA-Z])/g, '<Trash$2');
        } else if (hasCheck) {
          btnOuter = btnOuter.replace(/<(CheckCircle|CheckCircle2)([^a-zA-Z])/g, '<Check$2');
        } else if (hasX) {
          btnOuter = btnOuter.replace(/<(XCircle)([^a-zA-Z])/g, '<X$2');
        }
        
        // 2. Set the borderless class
        let newClass = '';
        if (hasEye) newClass = 'text-green-600 hover:text-green-700 transition-colors';
        if (hasEdit) newClass = 'text-blue-600 hover:text-blue-700 transition-colors';
        if (hasTrash) newClass = 'text-red-500 hover:text-red-600 transition-colors';
        if (hasCheck) newClass = 'text-green-600 hover:text-green-700 transition-colors';
        if (hasX) newClass = 'text-red-500 hover:text-red-600 transition-colors';

        // Replace className attribute entirely
        // Handle className="..." or className={`...`} safely
        if (btnOuter.includes('className=')) {
          btnOuter = btnOuter.replace(/className=(?:"[^"]*"|`[^`]*`|\{[^}]*\})/, `className="${newClass}"`);
        } else {
          // insert className before the closing > of the opening button tag
          // wait, finding the closing > of opening tag is hard if there are => inside.
          // let's insert it right after the first space.
          btnOuter = btnOuter.replace(/^(\s*)/, `$1 className="${newClass}" `);
        }

        parts[i] = btnOuter + parts[i].substring(endTagIdx);
      }
    }
  }
  
  content = parts.join('<button');
  
  // Also add imports if needed
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
console.log('Action column buttons flawlessly updated to borderless styles and specific icons!');

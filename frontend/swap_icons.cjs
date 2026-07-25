const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // 1. Replace the actual icons inside action buttons
  // Edit -> SquarePen
  content = content.replace(/(<button[^>]*?>\s*)<(Edit|Edit2|Edit3|Pencil)([\s\S]*?)(\/>|<\/(Edit|Edit2|Edit3|Pencil)>)(\s*<\/button>)/g, '$1<SquarePen$3$4$6');
  // Delete -> Trash
  content = content.replace(/(<button[^>]*?>\s*)<(Trash2)([\s\S]*?)(\/>|<\/(Trash2)>)(\s*<\/button>)/g, '$1<Trash$3$4$6');
  // Approve -> Check
  // Note: only in action buttons, but regex above handles that. Actually, let's just replace all CheckCircle/CheckCircle2 with Check if they are inside buttons.
  content = content.replace(/(<button[^>]*?>\s*)<(CheckCircle|CheckCircle2)([\s\S]*?)(\/>|<\/(CheckCircle|CheckCircle2)>)(\s*<\/button>)/g, '$1<Check$3$4$6');
  // Reject -> X
  content = content.replace(/(<button[^>]*?>\s*)<(XCircle)([\s\S]*?)(\/>|<\/(XCircle)>)(\s*<\/button>)/g, '$1<X$3$4$6');

  // 2. Add imports if missing
  const lucideImports = ['SquarePen', 'Trash', 'Check', 'X'];
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

  // 3. Ensure the exact styles are applied
  const fixIcon = (iconName, colorClass, hoverColorClass) => {
    const regex = new RegExp(`(<button[^>]*?)className="([^"]*?)"([^>]*?>\\s*<${iconName}[\\s\\S]*?<\\/button>)`, 'g');
    
    content = content.replace(regex, (match, p1, oldClasses, p3) => {
      let newClasses = oldClasses.split(' ').filter(c => {
        if (c.startsWith('text-') || c.startsWith('bg-') || c.startsWith('hover:text-') || c.startsWith('hover:bg-') || c.startsWith('border') || c.startsWith('p-') || c.startsWith('rounded') || c === 'transition-colors' || c === 'shadow-sm') return false;
        return true;
      });
      
      newClasses.push(colorClass);
      newClasses.push(hoverColorClass);
      newClasses.push('transition-colors');
      
      return `${p1}className="${newClasses.join(' ').trim()}"${p3}`;
    });
  };

  fixIcon('Eye', 'text-green-600', 'hover:text-green-700');
  fixIcon('SquarePen', 'text-blue-600', 'hover:text-blue-700');
  fixIcon('Trash', 'text-red-500', 'hover:text-red-600');
  fixIcon('Check', 'text-green-600', 'hover:text-green-700');
  fixIcon('X', 'text-red-500', 'hover:text-red-600');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Successfully swapped to SquarePen, Trash, Check, X, and applied borderless styling!');

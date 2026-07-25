const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  let originalContent = content;

  // We are looking for <button> tags that wrap these specific icons.
  // The user wants them completely clean (no borders, no backgrounds, no padding).
  
  // Helper to fix buttons wrapping specific icons
  const fixIcon = (iconName, colorClass, hoverColorClass) => {
    // Regex matches <button ...> ... <IconName ... /> ... </button>
    // We want to replace the className of the button.
    const regex = new RegExp(`(<button[^>]*?)className="([^"]*?)"([^>]*?>\\s*<${iconName}[\\s\\S]*?<\\/button>)`, 'g');
    
    content = content.replace(regex, (match, p1, oldClasses, p3) => {
      // Keep structural classes but remove colors, borders, padding, bg
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

  // View (Eye): Borderless Green
  fixIcon('Eye', 'text-green-600', 'hover:text-green-700');
  
  // Edit (Square Pen, Edit, Edit2): Borderless Blue
  fixIcon('SquarePen', 'text-blue-600', 'hover:text-blue-700');
  fixIcon('Edit', 'text-blue-600', 'hover:text-blue-700');
  fixIcon('Edit2', 'text-blue-600', 'hover:text-blue-700');
  
  // Delete (Trash, Trash2): Borderless Red
  fixIcon('Trash', 'text-red-500', 'hover:text-red-600');
  fixIcon('Trash2', 'text-red-500', 'hover:text-red-600');
  
  // Approve (Check, CheckCircle): Borderless Green
  fixIcon('Check', 'text-green-600', 'hover:text-green-700');
  fixIcon('CheckCircle', 'text-green-600', 'hover:text-green-700');
  
  // Reject (X, XCircle): Borderless Red
  fixIcon('X', 'text-red-500', 'hover:text-red-600');
  fixIcon('XCircle', 'text-red-500', 'hover:text-red-600');

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content);
  }
});

console.log('Action icons perfectly styled (truly borderless and backgroundless) according to exact instructions.');

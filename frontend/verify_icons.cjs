const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/pages/admin/**/*.jsx', { cwd: 'd:/full/MEKHA/NEW/NEW/WoodenToy/frontend' });

let badButtons = [];

files.forEach(f => {
  const fullPath = path.join('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend', f);
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Look for buttons wrapping common icons
  const iconRegex = /(<button[^>]*?)className="([^"]*?)"([^>]*?>\s*<(Eye|EyeOff|SquarePen|Edit|Edit2|Trash|Trash2|Check|CheckCircle|CheckCircle2|X|XCircle)[\s\S]*?<\/button>)/g;
  
  let match;
  while ((match = iconRegex.exec(content)) !== null) {
    const className = match[2];
    // Check if it's supposed to be an action icon (no text inside, just the icon)
    // We check if it has p-, bg-, border
    if (className.includes('p-') || className.includes('bg-') || className.includes('border') || className.includes('hover:bg-')) {
      badButtons.push(`${f}: ${match[0]}`);
    }
  }
});

if (badButtons.length > 0) {
  console.log('Found these potentially un-styled action buttons:');
  console.log(badButtons.join('\n\n'));
} else {
  console.log('All action buttons are perfectly borderless!');
}

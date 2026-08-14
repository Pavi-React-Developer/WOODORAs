const fs = require('fs');
const path = require('path');
const dir = 'd:/Marakathai/frontend/src/pages/admin/CMS';
const files = [
  'HomeLayoutBuilder.jsx', 'HeroBannerAdmin.jsx', 'ThirdBannerAdmin.jsx',
  'ProductGridAdmin.jsx', 'CategoryGridAdmin.jsx', 'CategoriesGridAdmin.jsx',
  'GiftCardBannerAdmin.jsx', 'CustomizeBannerAdmin.jsx', 'BulkOrderBannerAdmin.jsx',
  'FooterAdmin.jsx', 'ReviewAdmin.jsx', 'NavbarAdmin.jsx'
];

files.forEach(f => {
  const filepath = path.join(dir, f);
  if (!fs.existsSync(filepath)) return;
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // Add Trash2 to imports if not present
  if (content.includes('Trash ') || content.includes('Trash=')) {
    if (!content.includes('Trash2')) {
      content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, (m, p1) => {
        return "import { " + p1 + ", Trash2 } from 'lucide-react';";
      });
      changed = true;
    }
  }

  const regexes = [
    { from: /<Trash className=\"[^\"]+\" \/>/g, to: '<Trash2 size={15} />' },
    { from: /<Trash size=\{[^\}]+\} \/>/g, to: '<Trash2 size={15} />' },
    { from: /<SquarePen className=\"[^\"]+\" \/>/g, to: '<SquarePen size={15} />' },
    { from: /<SquarePen size=\{[^\}]+\} \/>/g, to: '<SquarePen size={15} />' },
    { from: /<Eye className=\"[^\"]+\" \/>/g, to: '<Eye size={15} />' },
    { from: /<Eye size=\{[^\}]+\} \/>/g, to: '<Eye size={15} />' },
    { from: /<EyeOff className=\"[^\"]+\" \/>/g, to: '<EyeOff size={15} />' },
    { from: /<EyeOff size=\{[^\}]+\} \/>/g, to: '<EyeOff size={15} />' },
    { from: /<Trash2 className=\"[^\"]+\" \/>/g, to: '<Trash2 size={15} />' },
    { from: /<Trash2 size=\{[^\}]+\} \/>/g, to: '<Trash2 size={15} />' },
    { from: /<GripVertical className=\"[^\"]+\" \/>/g, to: '<GripVertical size={15} />' },
    { from: /<GripVertical size=\{[^\}]+\} \/>/g, to: '<GripVertical size={15} />' },
    { from: /<Plus className=\"[^\"]+\" \/>/g, to: '<Plus size={15} />' }
  ];

  regexes.forEach(r => {
    if (content.match(r.from)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  });

  // Centering wrappers for action icons
  // Replacing `className="flex items-center gap-4"` with `justify-center` where appropriate
  // Usually action icons in CMS are in a `td` or `div` that is for actions.
  // Actually, I'll regex replace common action div classNames
  
  const centeringReplacements = [
    { from: /className=\"flex items-center gap-4\"/g, to: 'className=\"flex items-center justify-center gap-4\"' },
    { from: /className=\"flex items-center gap-3\"/g, to: 'className=\"flex items-center justify-center gap-3\"' },
    { from: /className=\"flex gap-4\"/g, to: 'className=\"flex items-center justify-center gap-4\"' },
    { from: /className=\"flex justify-end gap-3\"/g, to: 'className=\"flex items-center justify-center gap-3\"' },
    { from: /className=\"flex justify-end gap-4\"/g, to: 'className=\"flex items-center justify-center gap-4\"' }
  ];

  centeringReplacements.forEach(r => {
    if (content.match(r.from)) {
      content = content.replace(r.from, r.to);
      changed = true;
    }
  });

  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    console.log('Updated', f);
  }
});

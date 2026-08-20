const fs = require('fs');
const files = [
  'src/pages/admin/BulkOrderFieldsAdminPage.jsx',
  'src/pages/admin/BulkOrdersAdminPage.jsx',
  'src/pages/admin/GiftAndCardAdminPage.jsx'
];
files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s+\{\s*(ActiveBadge[^}]*)\s*\}\s+from\s+['"]\.\.\/\.\.\/\.\.\/components\/admin\/CommonComponents['"];/g, 
    "import { $1 } from '../../components/admin/CommonComponents';");
  fs.writeFileSync(file, content, 'utf8');
});

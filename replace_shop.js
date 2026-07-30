const fs = require('fs'); 
const files = [
  'frontend/src/App.jsx', 
  'frontend/src/components/Header.jsx', 
  'frontend/src/pages/CategoriesPage.jsx', 
  'frontend/src/components/home/HomeComponents.jsx', 
  'frontend/src/pages/admin/CMS/NavbarAdmin.jsx', 
  'frontend/src/pages/admin/CMS/FooterAdmin.jsx'
]; 
files.forEach(f => { 
  const p = 'd:/full/full/MEKHA/New/New/WoodenToy/' + f; 
  let c = fs.readFileSync(p, 'utf8'); 
  c = c.replace(/'\/shop'/g, "'/products'");
  c = c.replace(/`\/shop\?/g, "`/products?");
  c = c.replace(/'\/shop\?/g, "'/products?");
  c = c.replace(/"\/shop\?/g, "\"/products?");
  c = c.replace(/"\/shop"/g, "\"/products\"");
  c = c.replace(/path="\/shop"/g, 'path="/products"');
  fs.writeFileSync(p, c, 'utf8'); 
}); 
console.log('Done');

const fs = require('fs');
let content = fs.readFileSync('d:/full/MEKHA/NEW/NEW/WoodenToy/frontend/src/pages/admin/catalog/ProductsPage.jsx', 'utf8');

const regex = /(<button[^>]*?)className="([^"]*?)"([^>]*?>\s*<(Edit|Edit2)[\s\S]*?<\/button>)/g;
let match = regex.exec(content);
if (match) {
  console.log('Match found!', match[0]);
} else {
  console.log('No match found for Edit2');
  
  // Let's try simpler regex
  const simpleRegex = /<Edit2[\s\S]*?<\/button>/g;
  let simpleMatch = simpleRegex.exec(content);
  if (simpleMatch) {
    console.log('Found Edit2 with simple regex:', simpleMatch[0]);
    // Backtrack to button
    const btnIdx = content.lastIndexOf('<button', simpleMatch.index);
    console.log('Button string:', content.substring(btnIdx, simpleMatch.index + simpleMatch[0].length));
  }
}

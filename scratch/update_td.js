const fs = require('fs');
const path = require('path');

const targetDir = 'd:/Marakathai/frontend/src/pages/admin';

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Regex to match <td ... > tags
  // We need to carefully add text-[16px] to the className if it doesn't already have text-[16px]
  
  content = content.replace(/<td([^>]*)>/g, (match, attrs) => {
    // If it already has text-[16px], skip
    if (attrs.includes('text-[16px]')) return match;
    
    // If it has className="...", inject text-[16px]
    if (attrs.includes('className="')) {
      return `<td${attrs.replace(/className="/, 'className="text-[16px] ')}>`;
    } 
    // If it has className={`...`}, inject text-[16px]
    else if (attrs.includes('className={`')) {
      return `<td${attrs.replace(/className={`/, 'className={`text-[16px] ')}>`;
    }
    // If it has className={'...'}, inject text-[16px]
    else if (attrs.includes("className={'")) {
      return `<td${attrs.replace(/className=\{'/, "className={'text-[16px] ")}>`;
    }
    // No className
    else {
      return `<td className="text-[16px]"${attrs}>`;
    }
  });

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

walk(targetDir);
console.log('Done updating td elements.');

const fs = require('fs');
const path = require('path');

function walk(dir, done) {
  let results = [];
  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    let pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
          if (file.endsWith('.jsx')) results.push(file);
          if (!--pending) done(null, results);
        }
      });
    });
  });
}

const badClasses = [
  /bg-[a-zA-Z0-9#\-\[\]]+/g, // e.g. bg-green-100, bg-[#F8F4EC]
  /px-[0-9.]+/g,
  /py-[0-9.]+/g,
  /rounded[a-zA-Z0-9\-]*/g, // e.g. rounded-full, rounded, rounded-lg
  /border[a-zA-Z0-9\-\[\]]*/g, // e.g. border, border-[#E6DFD4]
  /shadow[a-zA-Z0-9\-]*/g,
  /inline-flex/g,
  /inline-block/g,
  /uppercase/g,
  /tracking-[a-zA-Z\-]+/g,
  /text-\[[0-9]+px\]/g,
  /text-xs/g,
  /text-[a-zA-Z]+\-[0-9]+/g, // e.g. text-green-700
  /text-\[[#a-zA-Z0-9]+\]/g // e.g. text-[#8B5E3C]
];

walk('d:/Marakathai/frontend/src/pages/admin', (err, files) => {
  if (err) throw err;
  let count = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Match both className="something" and className={`something`}
    content = content.replace(/<span\s+className=(['"`])(.*?)\1/g, (spanMatch, quote, classes) => {
      let newClasses = classes;
      
      // Only strip if it looks like a badge (has rounded- and px-)
      // or if it's a specific status badge
      if ((newClasses.includes('rounded') && newClasses.includes('px-')) || newClasses.includes('bg-[#F8F4EC]') || newClasses.includes('bg-')) {
        badClasses.forEach(regex => {
          newClasses = newClasses.replace(regex, '');
        });
        
        // Add back standard text style
        // Clean up weird artifacts like ${...} string interpolations if any (but we shouldn't wipe the ${} logic)
        // Wait, if it's a template literal className={`... ${getStyle()}`}, removing bg- might break the logic?
        // Actually, the logic usually returns 'bg-green-100 text-green-700'
        
        // Instead of completely modifying template literals, let's just make sure we don't mess up JS code inside ${}
        // If there's JS code inside ${}, it might be tricky.
        
        newClasses = (newClasses + ' text-sm font-semibold text-gray-800').replace(/\s+/g, ' ').trim();
        
        return `<span className=${quote}${newClasses}${quote}`;
      }
      
      return spanMatch;
    });
    
    // Also strip inside ${getStatusStyle(...)} if defined in the file
    content = content.replace(/(switch\s*\([a-zA-Z0-9_.]+\)\s*\{[\s\S]*?\}|const\s+get[a-zA-Z0-9_]*Style\s*=\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\})/g, (funcMatch) => {
      let newFunc = funcMatch;
      badClasses.forEach(regex => {
        newFunc = newFunc.replace(regex, '');
      });
      // Ensure we add text-sm font-semibold text-gray-800 to the cases
      newFunc = newFunc.replace(/return\s+(['"`])(.*?)\1/g, (m, q, c) => `return ${q}${c} text-sm font-semibold text-gray-800${q}`);
      return newFunc;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated badges to plain text in', file);
    }
  });
  
  console.log('Total files updated:', count);
});

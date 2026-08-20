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

walk('d:/Marakathai/frontend/src/pages/admin', (err, files) => {
  if (err) throw err;
  let count = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We replace text-sm back to smaller sizes for badges based on patterns
    content = content.replace(/className=(['"])(.*?)\1/g, (match, quote, classes) => {
      let newClasses = classes;
      
      // If it's a badge with padding and rounded corners, it shouldn't be text-sm
      if (newClasses.includes('text-sm')) {
        if (newClasses.includes('px-3 py-1.5') && newClasses.includes('uppercase')) {
          newClasses = newClasses.replace('text-sm', 'text-[11px]');
        } else if (newClasses.includes('px-2.5 py-1 rounded-full')) {
          newClasses = newClasses.replace('text-sm', 'text-[10px]');
        } else if (newClasses.includes('px-2 py-0.5 rounded-full') || newClasses.includes('px-2 py-0.5 rounded')) {
          newClasses = newClasses.replace('text-sm', 'text-xs');
        } else if (newClasses.includes('px-2.5 py-0.5 rounded-full')) {
          newClasses = newClasses.replace('text-sm', 'text-xs');
        }
      }
      
      if (newClasses !== classes) {
        return `className=${quote}${newClasses}${quote}`;
      }
      return match;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated badges in', file);
    }
  });
  
  console.log('Total files updated:', count);
});

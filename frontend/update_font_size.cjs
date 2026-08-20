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

    // Find all tbody sections and replace text size classes inside them
    // Note: since tbody can span multiple lines, we use a regex with the dotAll 's' flag.
    // However, there could be multiple tbodys or nested tables, though unlikely here.
    content = content.replace(/<tbody[\s\S]*?<\/tbody>/g, (tbodyMatch) => {
      let newTbody = tbodyMatch;
      
      // Replace text-xs with text-sm
      newTbody = newTbody.replace(/\btext-xs\b/g, 'text-sm');
      
      // Replace text-[10px], text-[11px], text-[12px], etc. with text-sm
      newTbody = newTbody.replace(/\btext-\[\d+px\]/g, 'text-sm');
      
      // Some text might not have any size class, but inherit. 
      // If the user wants ALL to be text-sm, replacing the smaller ones is usually enough,
      // and maybe making sure tbody has text-sm
      
      // If they had text-sm text-sm, deduplicate
      newTbody = newTbody.replace(/\btext-sm\s+text-sm\b/g, 'text-sm');
      
      return newTbody;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated', file);
    }
  });
  
  console.log('Total files updated:', count);
});

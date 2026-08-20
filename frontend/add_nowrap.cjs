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
    
    // Replace <td className="something"> with <td className="whitespace-nowrap something">
    content = content.replace(/<td\s+className=(['"])(.*?)\1/g, (match, quote, classes) => {
      // If it doesn't already have whitespace-nowrap and doesn't have whitespace-normal
      if (!classes.includes('whitespace-nowrap') && !classes.includes('whitespace-normal')) {
        return '<td className=' + quote + 'whitespace-nowrap ' + classes + quote;
      }
      return match;
    });

    // Also handle case where td has no className? No, all our tds have classNames.
    // Replace whitespace-normal with whitespace-nowrap just in case
    content = content.replace(/whitespace-normal/g, 'whitespace-nowrap');
    
    // Just to make sure we don't duplicate
    content = content.replace(/whitespace-nowrap whitespace-nowrap/g, 'whitespace-nowrap');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated', file);
    }
  });
  console.log('Total files updated:', count);
});

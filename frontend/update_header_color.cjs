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

    // We're specifically targeting text-gray-500 inside <th> tags and replacing it with text-[#8B5E3C]
    content = content.replace(/(<th[^>]*class(?:Name)?=['"`][^'"`]*?)text-gray-500([^'"`]*['"`])/gi, '$1text-[#8B5E3C]$2');
    
    // Some headers might not use exactly text-gray-500 but might still need changing,
    // though text-gray-500 was our standard header color class.
    
    // Wait, in map loops:
    // {['Name'].map(h => (<th className="... text-gray-500 ...">))} 
    // This is caught by the regex above!

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated header colors in', file);
    }
  });
  
  console.log('Total files updated:', count);
});

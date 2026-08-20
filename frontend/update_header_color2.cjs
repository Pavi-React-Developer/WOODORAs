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

    // We're targeting text-gray-500 inside <th> tags and replacing it with text-[#8B5E3C]
    // The class attribute could be className="..." or className={`...`}
    content = content.replace(/(<th[^>]*class(?:Name)?=(?:['"`]|\{[\s\S]*?['"`])[\s\S]*?)text-gray-500([\s\S]*?(?:['"`]|['"`][\s\S]*?\})>)/gi, '$1text-[#8B5E3C]$2');
    
    // An easier, safer regex just replaces text-gray-500 within the <th... > tag string directly.
    content = content.replace(/<th\b[^>]*>/gi, (match) => {
        return match.replace(/text-gray-500/g, 'text-[#8B5E3C]');
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated header colors in', file);
    }
  });
  
  console.log('Total additional files updated:', count);
});

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
  let inconsistencies = [];
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Check headers
    let theadMatch = content.match(/<thead[\s\S]*?<\/thead>/g);
    if (theadMatch) {
      theadMatch.forEach(thead => {
        let thMatches = thead.match(/<th\s+[^>]*className=['"`]([^>]+)['"`][^>]*>/g) || [];
        thMatches.forEach(th => {
          if (!th.includes('text-[11px]') || !th.includes('font-bold') || !th.includes('uppercase')) {
            inconsistencies.push({ file: path.basename(file), type: 'TH_MISMATCH', content: th });
          }
        });
      });
    }

    // Check body cells
    let tbodyMatch = content.match(/<tbody[\s\S]*?<\/tbody>/g);
    if (tbodyMatch) {
      tbodyMatch.forEach(tbody => {
        // Find bad text sizes
        let sizes = [...tbody.matchAll(/text-(xs|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[\d+px\])/g)].map(m => m[0]);
        let badSizes = sizes.filter(s => s !== 'text-[15px]'); 
        if (badSizes.length > 0) {
          inconsistencies.push({ file: path.basename(file), type: 'TBODY_BAD_SIZE', sizes: [...new Set(badSizes)] });
        }
      });
    }
  });

  console.log(JSON.stringify(inconsistencies, null, 2));
});

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

    content = content.replace(/<tbody[\s\S]*?<\/tbody>/g, (tbodyMatch) => {
      let newTbody = tbodyMatch.replace(/<span\s+className=(['"])(.*?)\1/g, (spanMatch, quote, classes) => {
        let newClasses = classes;
        
        // Only strip if it looks like a badge (has bg-, rounded-, or px-)
        if (newClasses.includes('bg-') || newClasses.includes('rounded') || newClasses.includes('px-')) {
          badClasses.forEach(regex => {
            newClasses = newClasses.replace(regex, '');
          });
          
          // Add back standard text style
          newClasses = (newClasses + ' text-sm font-semibold text-gray-800').replace(/\s+/g, ' ').trim();
          
          return `<span className=${quote}${newClasses}${quote}`;
        }
        
        return spanMatch;
      });
      return newTbody;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated badges to plain text in', file);
    }
  });
  
  console.log('Total files updated:', count);
});

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
  /bg-[a-zA-Z0-9#\-\[\]]+/g, 
  /px-[0-9.]+/g,
  /py-[0-9.]+/g,
  /rounded[a-zA-Z0-9\-]*/g, 
  /border[a-zA-Z0-9\-\[\]]*/g, 
  /shadow[a-zA-Z0-9\-]*/g,
  /inline-flex/g,
  /inline-block/g,
  /uppercase/g,
  /tracking-[a-zA-Z\-]+/g,
  /text-\[[0-9]+px\]/g,
  /text-xs/g,
  /text-[a-zA-Z]+\-[0-9]+/g,
  /text-\[[#a-zA-Z0-9]+\]/g
];

walk('d:/Marakathai/frontend/src/pages/admin', (err, files) => {
  if (err) throw err;
  let count = 0;
  
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Use dotAll modifier 's' to match multi-line classNames
    content = content.replace(/<span\s+className=(['"`])([\s\S]*?)\1/g, (spanMatch, quote, classes) => {
      let newClasses = classes;
      
      if ((newClasses.includes('rounded') && newClasses.includes('px-')) || newClasses.includes('bg-[#F8F4EC]') || newClasses.includes('bg-')) {
        badClasses.forEach(regex => {
          newClasses = newClasses.replace(regex, '');
        });
        
        newClasses = (newClasses + ' text-sm font-semibold text-gray-800').replace(/\s+/g, ' ').trim();
        
        return `<span className=${quote}${newClasses}${quote}`;
      }
      
      return spanMatch;
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      count++;
      console.log('Updated badges to plain text in', file);
    }
  });
  
  console.log('Total files updated:', count);
});

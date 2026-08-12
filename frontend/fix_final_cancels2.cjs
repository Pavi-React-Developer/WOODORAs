const fs = require('fs');
const path = require('path');

const dir = 'd:\\\\Marakathai\\\\frontend\\\\src\\\\pages\\\\admin';

const targetClasses = [
  'className="px-4 py-2 border border-[#E9DED3] text-[#6D625C] font-bold text-sm rounded-lg hover:bg-[#FAF8F5]"',
  'className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs font-bold rounded-lg hover:bg-gray-50"',
  'className="px-6 py-2 bg-white border border-[#E9DED3] text-[#6D625C] rounded font-bold hover:bg-gray-50 shadow-sm transition-colors text-sm"',
  'className="px-8 py-3 border border-[#E6DFD4] rounded-full text-[15px] font-bold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"',
  'className="flex-1 py-3 bg-white border border-[#E9DED3] text-[#4A403B] rounded-xl font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors"',
  'className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-50 transition"',
  'className="px-8 py-3 border border-[#E6DFD4] rounded-full text-[15px] font-bold text-[#6D625C] bg-white hover:bg-[#F8F4EC] transition-colors shadow-sm uppercase tracking-wide"'
];

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir(dir, function(filePath) {
  if (!filePath.endsWith('.jsx')) return;
  
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  targetClasses.forEach(cls => {
    content = content.split(cls).join('className="admin-cancel-btn"');
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', filePath);
  }
});

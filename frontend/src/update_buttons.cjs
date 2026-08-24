const fs = require('fs');
const file = 'd:/Marakathai/frontend/src/pages/CustomerProfilePage.jsx';
let content = fs.readFileSync(file, 'utf8');

const deskStyle = 'w-full py-2.5 rounded-md border border-[#8B5E3C] text-[#8B5E3C] text-[13px] font-bold hover:bg-[#FAF8F5] transition text-center flex items-center justify-center gap-1.5';
const tabStyle = 'flex-1 py-2 rounded border border-[#8B5E3C] text-[#8B5E3C] text-xs font-bold transition hover:bg-[#FAF8F5] flex items-center justify-center gap-1.5';
const mobStyle = 'w-full py-2.5 rounded-lg border border-[#8B5E3C] text-[#8B5E3C] text-xs font-bold transition hover:bg-[#F0EAE1] flex items-center justify-center gap-1.5';

// 1. Order History Desktop
content = content.replace(
  /className="w-full py-2\.5 rounded-md border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition text-center"\s*>\s*View Details/g,
  `className="${deskStyle}">\n                              View Details`
);
content = content.replace( // 2nd occurrence for Return/Refund desktop
  /className="w-full py-2\.5 rounded-md border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition text-center"\s*>\s*View Details/g,
  `className="${deskStyle}">\n                              View Details`
);

// 2. Customize Order Desktop
content = content.replace(
  /className="w-full mt-5 flex items-center justify-center gap-1\.5 py-2\.5 rounded-md bg-white border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition"\s*>\s*<Eye className="w-4 h-4" \/> View Details/g,
  `className="${mobStyle}">\n                          View Details`
);
content = content.replace( // Actual desktop customize order
  /className="w-full py-2\.5 rounded-md border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition text-center"\s*>\s*View Details/g,
  `className="${deskStyle}">\n                            View Details`
);

// 3. Bulk Order Desktop
content = content.replace( // Actual desktop bulk order
  /className="w-full py-2\.5 rounded-md border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition text-center"\s*>\s*View Details/g,
  `className="${deskStyle}">\n                            View Details`
);

// 4. Gift Card Desktop
content = content.replace( // Actual desktop gift card
  /className="w-full py-2\.5 rounded-md border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition text-center"\s*>\s*View Details/g,
  `className="${deskStyle}">\n                            View Details`
);

// Replace any remaining desktop
content = content.replace(
  /className="w-full py-2\.5 rounded-md border border-\[#8B5E3C\] text-\[#8B5E3C\] text-\[13px\] font-bold hover:bg-\[#FAF8F5\] transition text-center"\s*>\s*View Details/g,
  `className="${deskStyle}">View Details`
);

// TABLET REPLACEMENTS
content = content.replace(
  /className="flex-1 py-2 rounded border border-\[#8B5E3C\] text-\[#8B5E3C\] text-xs font-bold transition hover:bg-\[#FAF8F5\] flex items-center justify-center">View Details/g,
  `className="${tabStyle}">View Details`
);
content = content.replace(
  /className="flex-1 py-2 rounded border border-\[#8B5E3C\] text-\[#8B5E3C\] text-xs font-bold transition hover:bg-\[#FAF8F5\]">View Details/g,
  `className="${tabStyle}">View Details`
);
content = content.replace(
  /className="flex-1 py-2 rounded border border-\[#8B5E3C\] text-\[#8B5E3C\] text-xs font-bold transition hover:bg-\[#FAF8F5\] flex items-center justify-center gap-1\.5"><Eye className="w-3\.5 h-3\.5" \/> View Details/g,
  `className="${tabStyle}">View Details`
);

// MOBILE REPLACEMENTS
content = content.replace(
  /className="rounded-\[8px\] border border-\[#8B5E3C\] px-4 py-2\.5 text-sm font-bold text-\[#8B5E3C\] transition hover:bg-\[#FAF8F5\] flex items-center justify-center"\s*>\s*View Details/g,
  `className="${mobStyle}">\n                            View Details`
);
// Mobile Gift card
content = content.replace(
  /className="flex-1 py-2 rounded border border-\[#8B5E3C\] text-\[#8B5E3C\] text-xs font-bold transition hover:bg-\[#FAF8F5\] flex items-center justify-center gap-1\.5"\s*>\s*View Details/g,
  `className="${mobStyle}">\n                          View Details`
);

fs.writeFileSync(file, content);
console.log('Replacements completed');

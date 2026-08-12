const fs = require('fs');

const files = {
  'src/pages/admin/StaffListPage.jsx': [
    /<Pagination[\s\S]*?className=[\s\S]*?\/>/, 
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n          <Pagination \n            currentPage={page} \n            totalPages={pagination.pages} \n            onPageChange={setPage} \n          />\n        </div>'
  ],
  'src/pages/admin/catalog/SubCategoriesPage.jsx': [
    /<div className="px-5 py-3 border-t border-\[#E6DFD4\] flex flex-col sm:flex-row justify-center items-center bg-\[#FAFAFA\] gap-4">\s*<Pagination\s*currentPage={page}\s*totalPages={totalPages}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n                    <Pagination\n                        currentPage={page}\n                        totalPages={totalPages}\n                    />\n                </div>'
  ],
  'src/pages/admin/catalog/ProductsPage.jsx': [
    /<div className="px-5 py-3 border-t border-\[#E6DFD4\] flex flex-col sm:flex-row justify-center items-center bg-\[#FAFAFA\] gap-4">\s*<Pagination\s*currentPage={page}\s*totalPages={totalPages}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n                    <Pagination\n                        currentPage={page}\n                        totalPages={totalPages}\n                    />\n                </div>'
  ],
  'src/pages/admin/catalog/CategoriesPage.jsx': [
    /<div className="px-5 py-3 border-t border-\[#E6DFD4\] flex flex-col sm:flex-row justify-center items-center bg-\[#FAFAFA\] gap-4">\s*<Pagination\s*currentPage={page}\s*totalPages={totalPages}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n          <Pagination\n            currentPage={page}\n            totalPages={totalPages}\n          />\n        </div>'
  ],
  'src/pages/admin/catalog/AttributesPage.jsx': [
    /<div className="px-5 py-3 border-t border-\[#E6DFD4\] flex flex-col sm:flex-row justify-center items-center bg-\[#FAFAFA\] gap-4">\s*<Pagination\s*currentPage={page}\s*totalPages={totalPages}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n                    <Pagination\n                        currentPage={page}\n                        totalPages={totalPages}\n                    />\n                </div>'
  ],
  'src/pages/admin/customers/CustomerManagementPage.jsx': [
    /<div className="py-2 border-t border-\[#E9DED3\] flex items-center justify-center">\s*<Pagination\s*currentPage={orderPage}\s*totalPages={Math\.ceil\(orders\.length \/ orderLimit\)}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n              <Pagination \n                currentPage={orderPage}\n                totalPages={Math.ceil(orders.length / orderLimit)}\n              />\n            </div>'
  ],
  'src/pages/admin/customers/CustomerManagementPage.jsx_2': [
    /<div className="py-2 border-t border-\[#E9DED3\] flex items-center justify-center">\s*<Pagination\s*currentPage={currentPage}\s*totalPages={Math\.ceil\(displayed\.length \/ limit\)}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center">\n              <Pagination\n                currentPage={currentPage}\n                totalPages={Math.ceil(displayed.length / limit)}\n              />\n            </div>'
  ],
  'src/pages/admin/refunds/RefundManagementPage.jsx': [
    /<Pagination \s*currentPage={currentPage} \s*totalPages={totalPages} \s*onPageChange={setCurrentPage} \s*\/>/,
    '</div>\n            <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center w-full mt-4">\n            <Pagination \n              currentPage={currentPage} \n              totalPages={totalPages} \n              onPageChange={setCurrentPage} \n            />'
  ],
  'src/pages/admin/fees/FeeListPage.jsx': [
    /<Pagination \s*currentPage={currentPage} \s*totalPages={totalPages} \s*onPageChange={setCurrentPage} \s*\/>/,
    '</div>\n          <div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center w-full mt-4">\n          <Pagination \n            currentPage={currentPage} \n            totalPages={totalPages} \n            onPageChange={setCurrentPage} \n          />'
  ],
  'src/pages/admin/coupons/CouponManagementPage.jsx': [
    /<div className="mt-4 flex flex-col sm:flex-row items-center justify-end gap-4 text-sm text-gray-600">\s*<Pagination\s*currentPage={page}\s*totalPages={pagination\.pages \|\| 1}\s*onPageChange={setPage}\s*\/>\s*<\/div>/,
    '<div className="px-5 py-6 border-t border-[#E6DFD4] flex justify-center mt-4">\n        <Pagination\n          currentPage={page}\n          totalPages={pagination.pages || 1}\n          onPageChange={setPage}\n        />\n      </div>'
  ]
};

for (const [key, [regex, replacement]] of Object.entries(files)) {
  const file = key.replace('_2', '');
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (regex.test(content)) {
      fs.writeFileSync(file, content.replace(regex, replacement));
      console.log('Updated ' + key);
    } else {
      console.log('Regex not matched in ' + key);
    }
  } else {
    console.log('File not found: ' + file);
  }
}

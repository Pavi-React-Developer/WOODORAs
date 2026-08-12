const fs = require('fs');
const path = require('path');

const targetFiles = [
  'StaffListPage.jsx',
  'fees/AddFeePage.jsx',
  'coupons/CouponManagementPage.jsx',
  'CMS/GiftCardBannerAdmin.jsx',
  'CMS/NavbarAdmin.jsx',
  'CMS/ProductGridAdmin.jsx',
  'CMS/ThirdBannerAdmin.jsx',
  'CMS/HeroBannerAdmin.jsx',
  'catalog/CategoriesPage.jsx',
  'CMS/CategoryGridAdmin.jsx',
  'CMS/CategoriesGridAdmin.jsx'
];

targetFiles.forEach(file => {
  const filePath = path.join('d:\\\\Marakathai\\\\frontend\\\\src\\\\pages\\\\admin', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // We look for anything that looks like className="..." ... >Cancel</button>
    // or >CANCEL</button>
    // Since some have line breaks, we can match <button ... >Cancel</button>
    
    // Simplest way: replace any existing cancel button pattern.
    // We know these buttons end with >Cancel</button> or >CANCEL</button>
    
    content = content.replace(/(<button[^>]*?className=["'])([^"']*)(["'][^>]*?>\s*)(?:Cancel|CANCEL)(\s*<\/button>)/gis, '$1admin-cancel-btn$3CANCEL$4');
    
    // Some buttons have className on a separate line from >Cancel</button>
    // Let's replace the specific long class if it exists:
    const longClass = 'px-8 py-3 border border-red-200 rounded-full text-[15px] font-bold text-red-600 bg-white hover:bg-red-50 transition-colors shadow-sm uppercase tracking-wide';
    content = content.replace(new RegExp(longClass, 'g'), 'admin-cancel-btn');
    content = content.replace(/>Cancel<\/button>/g, '>CANCEL</button>');
    
    // Check for StaffListPage specifically
    content = content.replace(/className="flex-1 py\.2\.5 border border-\[#E6DFD4\] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">CANCEL<\/button>/g, 'className="admin-cancel-btn">CANCEL</button>');
    content = content.replace(/className="flex-1 py-2\.5 border border-\[#E6DFD4\] rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">CANCEL<\/button>/g, 'className="admin-cancel-btn">CANCEL</button>');
    content = content.replace(/className="px-4 py-2 text-xs font-bold text-gray-600">CANCEL<\/button>/g, 'className="admin-cancel-btn">CANCEL</button>');
    content = content.replace(/className="px-6 py-2\.5 border border-\[#E6DFD4\] rounded-xl text-sm font-semibold text-\[#6B4F37\] hover:bg-\[#F8F4EC\]">CANCEL<\/button>/g, 'className="admin-cancel-btn">CANCEL</button>');
    
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated', filePath);
    }
  }
});

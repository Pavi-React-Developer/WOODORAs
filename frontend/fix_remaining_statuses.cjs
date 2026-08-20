const fs = require('fs');
const path = require('path');

function updateFile(file, regex, replacement) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Add import for StatusBadge if missing and we are replacing something
    if (content.match(regex)) {
        if (!content.includes('StatusBadge')) {
            // Find CommonComponents import and add StatusBadge
            content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]([^'"]*CommonComponents)['"];/, (match, imports, path) => {
                if (!imports.includes('StatusBadge')) {
                    return `import { ${imports.trim()}, StatusBadge } from '${path}';`;
                }
                return match;
            });
            // If CommonComponents is not imported at all, add it
            if (!content.includes('StatusBadge')) {
                content = `import { StatusBadge } from '../../../components/admin/CommonComponents';\n` + content;
            }
        }
        
        let newContent = content.replace(regex, replacement);
        if (newContent !== content) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log('Updated:', file);
        }
    }
}

// 1. Update SubCategoriesPage.jsx
const subCatRegex = /<span className="text-sm font-semibold text-gray-800">\s*\{sub\.isActive \? 'Active' : 'Inactive'\}\s*<\/span>/g;
updateFile(
    'src/pages/admin/catalog/SubCategoriesPage.jsx',
    subCatRegex,
    '<StatusBadge status={sub.isActive ? "Active" : "Inactive"} />'
);

// 2. Update ProductsPage.jsx (canEdit case)
const prodRegex1 = /<span className=\{\`inline-flex items-center gap-1\.5 px-2\.5 py-1 rounded-full text-sm font-semibold \$\{prod\.isActive \? 'bg-green-100 text-green-700' : 'bg-gray-100 text-\[#8B5E3C\]'\s*\}\`\}>\s*<span className=\{\`w-1\.5 h-1\.5 rounded-full \$\{prod\.isActive \? 'bg-green-500' : 'bg-gray-400'\}\`\} \/>\s*\{prod\.isActive \? 'Active' : 'Inactive'\}\s*<\/span>/g;
updateFile(
    'src/pages/admin/catalog/ProductsPage.jsx',
    prodRegex1,
    '<StatusBadge status={prod.isActive ? "Active" : "Inactive"} />'
);

// 3. Update ProductsPage.jsx (readonly case)
const prodRegex2 = /<span className=\{\`inline-flex items-center gap-1\.5 px-2\.5 py-1 rounded-full text-sm font-semibold \$\{prod\.isActive \? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'\s*\}\`\}>\s*<span className=\{\`w-1\.5 h-1\.5 rounded-full \$\{prod\.isActive \? 'bg-green-500' : 'bg-gray-400'\}\`\} \/>\s*\{prod\.isActive \? 'Active' : 'Inactive'\}\s*<\/span>/g;
updateFile(
    'src/pages/admin/catalog/ProductsPage.jsx',
    prodRegex2,
    '<StatusBadge status={prod.isActive ? "Active" : "Inactive"} />'
);

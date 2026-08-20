const fs = require('fs');

const files = [
  'src/pages/admin/BulkOrderFieldsAdminPage.jsx',
  'src/pages/admin/BulkOrdersAdminPage.jsx',
  'src/pages/admin/GiftAndCardAdminPage.jsx',
  'src/pages/admin/fees/ProductFeeRulesPage.jsx',
  'src/pages/admin/customize/CustomizeFieldManager.jsx',
  'src/pages/admin/fees/FeeListPage.jsx',
  'src/pages/admin/cancellations/CancellationManagementPage.jsx',
  'src/pages/admin/refunds/RefundManagementPage.jsx',
  'src/pages/admin/advanced-booking/AdvancedBookingManagement.jsx'
];

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    
    // Add imports
    if (content.includes('CommonComponents')) {
        content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]([^'"]*CommonComponents)['"];/, (match, imports, path) => {
            let newImports = imports;
            if (!newImports.includes('ActiveBadge')) newImports += ', ActiveBadge';
            if (!newImports.includes('RequestBadge')) newImports += ', RequestBadge';
            if (!newImports.includes('OrderBadge')) newImports += ', OrderBadge';
            return `import { ${newImports.trim()} } from '${path}';`;
        });
    } else {
        const depth = file.split('/').length - 3;
        const relative = '../'.repeat(depth) + 'components/admin/CommonComponents';
        content = `import { ActiveBadge, RequestBadge, OrderBadge } from '${relative}';\n` + content;
    }

    // specific replacement for CustomizeFieldManager Required
    content = content.replace(
        /<span className=\{\`text-\[11px\] px-2 py-1 rounded-md font-bold uppercase tracking-wider \$\{([^ ]+) \? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'\}\`\}>\s*\{\1 \? 'Required' : 'Optional'\}\s*<\/span>/g,
        "<ActiveBadge status={$1 ? 'Required' : 'Optional'} />"
    );
    
    // FeeListPage Required
    content = content.replace(
        /<span className=\{\`inline-block px-3 py-1\.5 rounded-full text-\[11px\] font-bold uppercase tracking-wider \$\{([^ ]+) \? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'\}\`\}>\s*\{\1 \? 'Required' : 'Optional'\}\s*<\/span>/g,
        "<ActiveBadge status={$1 ? 'Required' : 'Optional'} />"
    );

    // FeeListPage active/inactive
    content = content.replace(
        /<span className=\{\`inline-block px-3 py-1\.5 rounded-full text-\[11px\] font-bold uppercase tracking-wider \$\{([^ ]+) \? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'\}\`\}>\s*\{\1 \? 'Active' : 'Inactive'\}\s*<\/span>/g,
        "<ActiveBadge status={$1 ? 'Active' : 'Inactive'} />"
    );

    // Any generic badge replacements that match old formats
    content = content.replace(/<span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">\s*Active\s*<\/span>/g, '<ActiveBadge status="Active" />');
    content = content.replace(/<span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold">\s*Inactive\s*<\/span>/g, '<ActiveBadge status="Inactive" />');
    content = content.replace(/<span className="text-sm font-semibold text-gray-800">\s*\{([^ ]+) \? 'Active' : 'Inactive'\}\s*<\/span>/g, "<ActiveBadge status={$1 ? 'Active' : 'Inactive'} />");
    
    content = content.replace(/<Badge status=\{([^\}]+)\} \/>/g, (match, val) => {
        if (file.includes('Orders') || file.includes('Booking')) return `<OrderBadge status={${val}} />`;
        else if (file.includes('Cancellation') || file.includes('Refund') || file.includes('Gift')) return `<RequestBadge status={${val}} />`;
        else return `<ActiveBadge status={${val}} />`;
    });
    
    content = content.replace(/<StatusBadge status=\{([^\}]+)\} \/>/g, (match, val) => {
        if (file.includes('Orders') || file.includes('Booking')) return `<OrderBadge status={${val}} />`;
        else if (file.includes('Cancellation') || file.includes('Refund') || file.includes('Gift') || file.includes('Fee')) return `<RequestBadge status={${val}} />`;
        else return `<ActiveBadge status={${val}} />`;
    });
    
    content = content.replace(/<StatusBadge active=\{([^\}]+)\} \/>/g, (match, val) => {
        return `<ActiveBadge status={${val} ? 'Active' : 'Inactive'} />`;
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
});

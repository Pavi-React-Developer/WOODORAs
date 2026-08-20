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
    
    // Import the new badges if missing
    if (content.includes('CommonComponents')) {
        content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]([^'"]*CommonComponents)['"];/, (match, imports, path) => {
            let newImports = imports;
            if (!newImports.includes('ActiveBadge')) newImports += ', ActiveBadge';
            if (!newImports.includes('RequestBadge')) newImports += ', RequestBadge';
            if (!newImports.includes('OrderBadge')) newImports += ', OrderBadge';
            return `import { ${newImports.trim()} } from '${path}';`;
        });
    } else {
        content = `import { ActiveBadge, RequestBadge, OrderBadge } from '../../../components/admin/CommonComponents';\n` + content;
    }

    // 1. Replace Required styling
    // e.g. <span className={`text-sm px-2 py-1 rounded-md font-bold uppercase tracking-wider ${field.isRequired ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}> {field.isRequired ? 'Required' : 'Optional'} </span>
    content = content.replace(/<span[^>]*className=[\"'][^\"']*bg-(?:orange|green|red|gray)[^>]*>[\s\S]*?(?:Required|Optional)[\s\S]*?<\/span>/ig, (match) => {
        // extract the condition variable
        const matchVar = match.match(/\{([a-zA-Z0-9_.]+(?:isRequired|required|isActive|active)) \?/);
        if (matchVar && matchVar[1]) {
            return `<ActiveBadge status={${matchVar[1]} ? 'Required' : 'Optional'} />`;
        }
        return match;
    });

    // 2. Replace Active/Inactive styling
    // e.g. <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">Active</span>
    // e.g. <span className={`... ${isActive ? 'bg-green-100' : 'bg-red-100'}`}>...</span>
    content = content.replace(/<span[^>]*>[\s\S]*?(?:Active|Inactive)[\s\S]*?<\/span>/ig, (match) => {
        if (match.includes('ActiveBadge') || match.includes('StatusBadge')) return match;
        const matchVar = match.match(/\{([a-zA-Z0-9_.]+(?:isActive|active|status)) (?:===|==|\|\||\?)/);
        if (matchVar && matchVar[1]) {
            return `<ActiveBadge status={${matchVar[1]}} />`;
        }
        // check for static active/inactive rendering
        if (match.includes('{') && match.includes('? \'Active\' : \'Inactive\'')) {
            const m = match.match(/\{([^?]+)\? 'Active' : 'Inactive'\}/);
            if (m && m[1]) return `<ActiveBadge status={${m[1].trim()} ? 'Active' : 'Inactive'} />`;
        }
        return match;
    });

    // 3. Replace Request styling (Pending, Approved, Rejected, Success, Failed)
    content = content.replace(/<span[^>]*>[\s\S]*?\{[a-zA-Z0-9_.]+\.status\}[\s\S]*?<\/span>/ig, (match) => {
        if (match.includes('RequestBadge') || match.includes('OrderBadge') || match.includes('StatusBadge')) return match;
        
        // Is it an order status or request status?
        // BulkOrders, AdvancedBookings typically use OrderBadge
        // Cancellation, Refund, Gift Orders use RequestBadge
        const matchVar = match.match(/\{([a-zA-Z0-9_.]+\.status)\}/);
        if (matchVar && matchVar[1]) {
            if (file.includes('Orders') || file.includes('Booking')) {
                return `<OrderBadge status={${matchVar[1]}} />`;
            } else {
                return `<RequestBadge status={${matchVar[1]}} />`;
            }
        }
        return match;
    });

    // For any remaining hardcoded specific rendering like:
    // {req.status} inside a span with dynamic bg
    content = content.replace(/<span className=\{\`[^`]*\$\{([^=]+)===[^`]*\`\}>[\s\S]*?\{([a-zA-Z0-9_.]+\.status)\}[\s\S]*?<\/span>/g, (match, cond, val) => {
        if (file.includes('Orders') || file.includes('Booking')) {
            return `<OrderBadge status={${val}} />`;
        } else {
            return `<RequestBadge status={${val}} />`;
        }
    });

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated:', file);
});

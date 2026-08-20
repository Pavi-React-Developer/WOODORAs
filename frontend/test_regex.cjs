const fs = require('fs');

const file = 'src/pages/admin/customize/CustomizeFieldManager.jsx';
let content = fs.readFileSync(file, 'utf8');

// Replace Required styling
content = content.replace(/<span[^>]*className=[\"'][^\"']*bg-(?:orange|green|red|gray)[^>]*>[^<]*?(?:Required|Optional)[^<]*?<\/span>/g, (match) => {
    const matchVar = match.match(/\{([a-zA-Z0-9_.]+(?:isRequired|required)) \?/);
    if (matchVar && matchVar[1]) {
        return `<ActiveBadge status={${matchVar[1]} ? 'Required' : 'Optional'} />`;
    }
    return match;
});

// Replace Active/Inactive styling
content = content.replace(/<span[^>]*>[^<]*?(?:Active|Inactive)[^<]*?<\/span>/g, (match) => {
    if (match.includes('ActiveBadge') || match.includes('StatusBadge')) return match;
    const matchVar = match.match(/\{([a-zA-Z0-9_.]+(?:isActive|active|status)) (?:===|==|\|\||\?)/);
    if (matchVar && matchVar[1]) {
        return `<ActiveBadge status={${matchVar[1]}} />`;
    }
    if (match.includes('{') && match.includes('? \'Active\' : \'Inactive\'')) {
        const m = match.match(/\{([^?]+)\? 'Active' : 'Inactive'\}/);
        if (m && m[1]) return `<ActiveBadge status={${m[1].trim()} ? 'Active' : 'Inactive'} />`;
    }
    return match;
});

fs.writeFileSync('test_output.jsx', content);

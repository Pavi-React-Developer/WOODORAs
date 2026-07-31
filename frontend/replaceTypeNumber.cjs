const fs = require('fs');
const path = require('path');

function findAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findAndReplace(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            // Replace type="number" with type="text" inputMode="numeric"
            content = content.replace(/type="number"/g, 'type="text" inputMode="numeric"');
            content = content.replace(/type={'number'}/g, "type={'text'} inputMode=\"numeric\"");
            content = content.replace(/type='number'/g, 'type=\'text\' inputMode="numeric"');
            
            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    }
}

findAndReplace(path.join(__dirname, 'src'));

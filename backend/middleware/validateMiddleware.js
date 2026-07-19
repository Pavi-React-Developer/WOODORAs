/**
 * Simple, robust validator middleware to validate req.body or req.query.
 * @param {Object} schema Definition of fields, types, and required flags.
 * @returns {Function} Express middleware
 */
const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];
        const source = req.method === 'GET' ? req.query : req.body;

        for (const [field, rules] of Object.entries(schema)) {
            const val = source[field];

            // 1. Required check
            if (rules.required && (val === undefined || val === null || val === '')) {
                errors.push(`Field '${field}' is required`);
                continue;
            }

            // If not provided and not required, skip other checks
            if (val === undefined || val === null || val === '') {
                continue;
            }

            // 2. Type checks
            if (rules.type === 'string' && typeof val !== 'string') {
                errors.push(`Field '${field}' must be a string`);
            } else if (rules.type === 'number') {
                const num = Number(val);
                if (isNaN(num)) {
                    errors.push(`Field '${field}' must be a valid number`);
                } else if (rules.min !== undefined && num < rules.min) {
                    errors.push(`Field '${field}' must be at least ${rules.min}`);
                } else if (rules.max !== undefined && num > rules.max) {
                    errors.push(`Field '${field}' must be at most ${rules.max}`);
                }
            } else if (rules.type === 'boolean' && typeof val !== 'boolean' && val !== 'true' && val !== 'false') {
                errors.push(`Field '${field}' must be a boolean`);
            } else if (rules.type === 'array' && !Array.isArray(val)) {
                errors.push(`Field '${field}' must be an array`);
            } else if (rules.type === 'object' && (typeof val !== 'object' || Array.isArray(val))) {
                errors.push(`Field '${field}' must be an object`);
            }
        }

        if (errors.length > 0) {
            console.error('[validate] Validation failed. Body:', JSON.stringify(source), '| Errors:', errors);
            return res.status(400).json({ success: false, message: errors.join(', '), errors });
        }

        next();
    };
};

module.exports = { validate };

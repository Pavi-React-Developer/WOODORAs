const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.get('/', async (req, res) => {
    try {
        const baseUrl = process.env.FRONTEND_URL || 'https://marakathai.com';
        
        // Static URLs
        const staticUrls = [
            { url: '/', changefreq: 'daily', priority: 1.0 },
            { url: '/categories', changefreq: 'daily', priority: 0.8 },
            { url: '/about', changefreq: 'monthly', priority: 0.6 },
            { url: '/contact', changefreq: 'monthly', priority: 0.6 },
            { url: '/login', changefreq: 'monthly', priority: 0.5 },
            { url: '/signup', changefreq: 'monthly', priority: 0.5 },
            { url: '/terms', changefreq: 'yearly', priority: 0.3 },
            { url: '/privacy', changefreq: 'yearly', priority: 0.3 },
        ];

        // Fetch active, non-deleted products
        const products = await Product.find({ isActive: true, isDeleted: false })
            .select('_id updatedAt')
            .lean();

        // Build XML
        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        // Optional XSL stylesheet to make it look nice in browsers
        // xml += `<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n`;
        xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

        // Add static URLs
        for (const link of staticUrls) {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}${link.url === '/' ? '' : link.url}</loc>\n`;
            xml += `    <changefreq>${link.changefreq}</changefreq>\n`;
            xml += `    <priority>${link.priority.toFixed(4)}</priority>\n`;
            xml += `  </url>\n`;
        }

        // Add product URLs
        for (const product of products) {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/product/${product._id}</loc>\n`;
            if (product.updatedAt) {
                xml += `    <lastmod>${product.updatedAt.toISOString()}</lastmod>\n`;
            }
            xml += `    <changefreq>daily</changefreq>\n`;
            xml += `    <priority>0.9000</priority>\n`;
            xml += `  </url>\n`;
        }

        xml += `</urlset>`;

        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Sitemap Generation Error:', error);
        res.status(500).send('Error generating sitemap');
    }
});

module.exports = router;

/**
 * Seed Shop Categories (for Homepage Display)
 * Run this to populate the database with main categories shown on homepage
 * Usage: node seed-shop-categories.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('./models/Category');

dotenv.config();

const seedShopCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/wooden-toys');
        console.log('Connected to MongoDB');

        // Clear existing Main categories (optional - comment out to preserve)
        // await Category.deleteMany({ type: 'Main' });

        // ==========================================
        // CREATE MAIN CATEGORIES FOR SHOP
        // ==========================================
        console.log('Creating main shop categories...');
        const shopCategories = [
            {
                name: 'Baby & Toddlers',
                slug: 'baby-toddlers',
                type: 'Main',
                parentCategory: null,
                description: '0-3 Years',
                image: '/WhatsApp Image 2026-07-13 at 7.46.53 PM.jpeg',
                displayOrder: 1,
                isActive: true,
                brand: 'WoodenToys',
            },
            {
                name: 'Pretend Play',
                slug: 'pretend-play',
                type: 'Main',
                parentCategory: null,
                description: '3-6 Years',
                image: '/WhatsApp Image 2026-07-13 at 7.47.29 PM.jpeg',
                displayOrder: 2,
                isActive: true,
                brand: 'WoodenToys',
            },
            {
                name: 'Building & Construction',
                slug: 'building-construction',
                type: 'Main',
                parentCategory: null,
                description: '3-8 Years',
                image: '/WhatsApp Image 2026-07-13 at 7.48.05 PM.jpeg',
                displayOrder: 3,
                isActive: true,
                brand: 'WoodenToys',
            },
            {
                name: 'Puzzles & Games',
                slug: 'puzzles-games',
                type: 'Main',
                parentCategory: null,
                description: '4-10 Years',
                image: '/WhatsApp Image 2026-07-13 at 7.51.25 PM.jpeg',
                displayOrder: 4,
                isActive: true,
                brand: 'WoodenToys',
            },
            {
                name: 'Educational Toys',
                slug: 'educational-toys',
                type: 'Main',
                parentCategory: null,
                description: 'All Ages',
                image: '/WhatsApp Image 2026-07-13 at 7.43.27 PM.jpeg',
                displayOrder: 5,
                isActive: true,
                brand: 'WoodenToys',
            },
            {
                name: 'All Toys',
                slug: 'all-toys',
                type: 'Main',
                parentCategory: null,
                description: 'View All',
                image: '/WhatsApp Image 2026-07-13 at 7.46.10 PM.jpeg',
                displayOrder: 6,
                isActive: true,
                brand: 'WoodenToys',
            },
        ];

        // Check for existing categories and update or create
        for (const catData of shopCategories) {
            const existing = await Category.findOne({ slug: catData.slug });
            if (existing) {
                // Update existing category with new data
                await Category.findByIdAndUpdate(existing._id, catData, { new: true });
                console.log(`✓ Updated category: ${catData.name}`);
            } else {
                // Create new category
                await Category.create(catData);
                console.log(`✓ Created category: ${catData.name}`);
            }
        }

        console.log('✓ Shop categories seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding shop categories:', error);
        process.exit(1);
    }
};

seedShopCategories();

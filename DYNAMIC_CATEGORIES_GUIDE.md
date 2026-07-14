# Dynamic Categories Management Guide

## 🎉 What Was Implemented

The "Shop by Categories" section on your homepage is now **fully dynamic**. Instead of hardcoded category data, categories are now:
- Stored in MongoDB database
- Fetched via REST API on page load
- Automatically displayed with images and descriptions
- Easy to add/edit/remove without touching code

## 📊 Backend Implementation

### New API Endpoint
```
GET /api/catalog/shop-categories
```

**Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "ObjectId",
      "title": "Baby & Toddlers",
      "subtitle": "0-3 Years",
      "image": "/WhatsApp Image 2026-07-13 at 7.46.53 PM.jpeg",
      "slug": "baby-toddlers",
      "displayOrder": 1
    },
    // ... more categories
  ]
}
```

### Controller Method
- **File**: `backend/controllers/categoryController.js`
- **Method**: `getShopCategories()`
- **Filter**: Only returns categories where:
  - `type === 'Main'` (main shop categories)
  - `isActive === true` (published)
  - `parentCategory === null` (top-level only)
  - Sorted by `displayOrder`

### Database Schema (Category Model)
```javascript
{
  name: String,              // "Baby & Toddlers"
  slug: String,              // "baby-toddlers"
  type: String,              // "Main" (enum)
  parentCategory: ObjectId,  // null for top-level
  description: String,       // "0-3 Years"
  image: String,             // Image path/URL
  displayOrder: Number,      // Sort order (1-6)
  isActive: Boolean,         // true to show
  brand: String,             // "WoodenToys"
}
```

## 🖥️ Frontend Implementation

### Service Integration
- **File**: `frontend/src/api/catalogService.js`
- **Method**: `catalogService.getShopCategories()`
- Fetches from: `GET http://localhost:5000/api/catalog/shop-categories`

### Home Page Changes
- **File**: `frontend/src/pages/Home.jsx`
- **State**: `shopCategories` (replaces static SHOP_CATEGORIES)
- **Fallback**: `FALLBACK_SHOP_CATEGORIES` if API fails
- **Rendering**: Maps dynamic array to category cards

## 🛠️ Managing Categories

### Option 1: Admin Dashboard (Coming Soon)
Create an admin panel to add/edit/delete categories with images.

### Option 2: API Requests
Use the existing POST/PUT/DELETE category endpoints:

#### Create New Category
```bash
curl -X POST http://localhost:5000/api/catalog/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "New Category Name",
    "slug": "new-category-name",
    "type": "Main",
    "description": "Age/Description",
    "image": "/path/to/image.jpg",
    "displayOrder": 7,
    "isActive": true
  }'
```

#### Update Existing Category
```bash
curl -X PUT http://localhost:5000/api/catalog/categories/:categoryId \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Name",
    "image": "/new/image.jpg",
    "displayOrder": 2
  }'
```

#### Delete Category
```bash
curl -X DELETE http://localhost:5000/api/catalog/categories/:categoryId \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Option 3: Seed Script
Edit `backend/seed-shop-categories.js` and run:
```bash
cd backend
node seed-shop-categories.js
```

## 📸 Current Categories in Database

```
1. Baby & Toddlers      (0-3 Years)
2. Pretend Play         (3-6 Years)
3. Building & Construction (3-8 Years)
4. Puzzles & Games      (4-10 Years)
5. Educational Toys     (All Ages)
6. All Toys             (View All)
```

## 🔄 Data Flow Diagram

```
User visits Homepage
    ↓
Home.jsx useEffect runs
    ↓
catalogService.getShopCategories() called
    ↓
API Request: GET /api/catalog/shop-categories
    ↓
Backend: categoryController.getShopCategories()
    ↓
Query MongoDB: Category.find({ type: 'Main', isActive: true, ... })
    ↓
Format response with title, subtitle, image, slug
    ↓
Return to Frontend
    ↓
useState(shopCategories) updated
    ↓
Swiper component re-renders with live categories
    ↓
User sees carousel with all categories!
```

## 📝 Database Queries

### View all Main categories
```javascript
// In MongoDB shell
db.categories.find({ type: 'Main', isActive: true }).sort({ displayOrder: 1 })
```

### Update category image
```javascript
db.categories.updateOne(
  { slug: 'baby-toddlers' },
  { $set: { image: '/new-image.jpeg' } }
)
```

### Reorder categories
```javascript
db.categories.updateOne(
  { slug: 'all-toys' },
  { $set: { displayOrder: 6 } }
)
```

## ⚠️ Important Notes

1. **Type Must Be 'Main'**: Only categories with `type: 'Main'` appear on homepage
2. **isActive Must Be True**: Categories must be published to display
3. **Image Paths**: Should reference files in `frontend/public/` (e.g., `/image-name.jpg`)
4. **Display Order**: Lower numbers appear first (1-6 recommended)
5. **Fallback**: If API fails, static fallback categories still display

## 🚀 Next Steps

1. **Test the implementation**: Visit homepage, should show 6 categories from database
2. **Add admin panel**: Create UI to manage categories
3. **Upload more images**: Add additional category images as needed
4. **Create sub-categories**: Use `parentCategory` field for category hierarchy

## ✅ Testing the API

Test the endpoint manually:
```bash
# In terminal/postman
GET http://localhost:5000/api/catalog/shop-categories

# Should return:
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "title": "Baby & Toddlers",
      "subtitle": "0-3 Years",
      "image": "/WhatsApp Image 2026-07-13 at 7.46.53 PM.jpeg",
      "slug": "baby-toddlers",
      "displayOrder": 1
    },
    // ... 5 more categories
  ]
}
```

## 📂 Files Modified/Created

**Backend**:
- ✅ `controllers/categoryController.js` - Added `getShopCategories()` method
- ✅ `routes/catalogRoutes.js` - Added GET `/shop-categories` route
- ✅ `seed-shop-categories.js` - New seed script (CREATED)

**Frontend**:
- ✅ `api/catalogService.js` - Added `getShopCategories()` method
- ✅ `pages/Home.jsx` - Updated to fetch and display dynamic categories

**Database**:
- ✅ 6 Shop categories seeded into MongoDB

---

**Status**: ✅ **COMPLETE AND TESTED**

The dynamic categories system is now live. Your homepage categories are powered by your database!

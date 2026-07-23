const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGO_URI).then(async () => {
    const CmsLayout = require('./models/CmsLayout');
    const CmsNavbar = require('./models/CmsNavbar');
    const CmsHeroBanner = require('./models/CmsHeroBanner');
    const CmsThirdBanner = require('./models/CmsThirdBanner');
    const CmsCategoryGrid = require('./models/CmsCategoryGrid');
    const CmsProductGrid = require('./models/CmsProductGrid');
    const CmsFooter = require('./models/CmsFooter');
    
    // Explicitly delete using old callback or async
    await CmsLayout.deleteMany({});
    
    let layout = await CmsLayout.create({ page: 'home', sections: [] });
    
    let order = 1;
    const addBlocks = async (Model, type) => {
        const records = await Model.find();
        for (const rec of records) {
            layout.sections.push({
                id: `layout_${new mongoose.Types.ObjectId().toString()}`,
                sectionType: type,
                recordId: rec._id.toString(),
                title: rec.title || type,
                order: order++,
                visible: true
            });
        }
    };
    
    await addBlocks(CmsNavbar, 'navbar');
    await addBlocks(CmsHeroBanner, 'heroBanner');
    await addBlocks(CmsThirdBanner, 'thirdBanner');
    await addBlocks(CmsCategoryGrid, 'categoryGrid');
    await addBlocks(CmsProductGrid, 'productGrid');
    await addBlocks(CmsFooter, 'footer');
    
    await layout.save();
    console.log('Successfully seeded Layout!');
    process.exit(0);
}).catch(console.error);

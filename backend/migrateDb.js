const mongoose = require('mongoose');
require('dotenv').config();

const CmsLayout = require('./models/CmsLayout');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://woodendb:Xh0k6H82wK54Z1Oq@cluster0.oq5fgf6.mongodb.net/woodentoy');
    console.log('Connected to DB');

    const layout = await CmsLayout.findOne({ page: 'home' });
    if (layout) {
      const hasReviews = layout.sections.find(s => s.sectionType === 'reviews');
      if (!hasReviews) {
        const footerIndex = layout.sections.findIndex(s => s.sectionType === 'footer');
        if (footerIndex !== -1) {
          layout.sections.splice(footerIndex, 0, {
            id: 'reviews',
            sectionType: 'reviews',
            order: footerIndex + 1,
            visible: true
          });
          for (let i = footerIndex + 1; i < layout.sections.length; i++) {
             layout.sections[i].order = i + 1;
          }
        } else {
           layout.sections.push({
             id: 'reviews',
             sectionType: 'reviews',
             order: layout.sections.length + 1,
             visible: true
           });
        }
        await layout.save();
        console.log('Migrated layout with reviews block');
      } else {
        console.log('Reviews block already exists in layout');
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}

migrate();

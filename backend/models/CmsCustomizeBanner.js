const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: { type: String, default: 'Request a Custom Order' },
  description: { type: String, default: "Design your own handcrafted wooden toy. Share your idea, and we'll create it just for you." },
  image: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('CmsCustomizeBanner', schema);

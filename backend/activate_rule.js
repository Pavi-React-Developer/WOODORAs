const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const ProductFeeRule = require('./models/ProductFeeRule');
    
    // Activate the rule for volume 0-599
    const rule = await ProductFeeRule.findOne({ sizeName: 'S', minVolume: 0 });
    if (rule) {
        rule.isActive = true;
        await rule.save();
        console.log("Activated Product Fee Rule for Volume 0-599!");
    } else {
        console.log("Rule not found.");
    }
    process.exit(0);
});

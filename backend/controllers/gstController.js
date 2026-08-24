const GSTRule = require('../models/GSTRule');
const Product = require('../models/Product');

exports.createRule = async (req, res) => {
    try {
        const { name, percentage } = req.body;
        
        if (!name || percentage === undefined) {
            return res.status(400).json({ success: false, message: 'Name and percentage are required' });
        }

        const existingRule = await GSTRule.findOne({ name });
        if (existingRule) {
            return res.status(400).json({ success: false, message: 'GST Rule with this name already exists' });
        }

        const rule = new GSTRule({
            name,
            percentage,
            createdBy: req.user ? req.user._id : undefined
        });

        await rule.save();
        res.status(201).json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRules = async (req, res) => {
    try {
        const rules = await GSTRule.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, rules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getRuleById = async (req, res) => {
    try {
        const rule = await GSTRule.findById(req.params.id);
        if (!rule) {
            return res.status(404).json({ success: false, message: 'GST Rule not found' });
        }
        res.status(200).json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateRule = async (req, res) => {
    try {
        const { name, percentage, isActive } = req.body;
        
        const rule = await GSTRule.findByIdAndUpdate(
            req.params.id,
            { name, percentage, isActive },
            { new: true, runValidators: true }
        );

        if (!rule) {
            return res.status(404).json({ success: false, message: 'GST Rule not found' });
        }

        res.status(200).json({ success: true, rule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteRule = async (req, res) => {
    try {
        const ruleId = req.params.id;
        
        // Remove this gstRule reference from any products that are using it
        await Product.updateMany(
            { gstRule: ruleId },
            { $unset: { gstRule: "" } }
        );

        const rule = await GSTRule.findByIdAndDelete(ruleId);
        if (!rule) {
            return res.status(404).json({ success: false, message: 'GST Rule not found' });
        }

        res.status(200).json({ success: true, message: 'GST Rule deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

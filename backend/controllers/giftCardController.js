const mongoose = require('mongoose');
const GiftCardConfig = require('../models/GiftCardConfig');
const GiftBoxRule = require('../models/GiftBoxRule');
const Order = require('../models/Order');

// Get config
exports.getConfig = async (req, res) => {
  try {
    let config = await GiftCardConfig.findOne();
    if (!config) {
      config = await GiftCardConfig.create({});
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update config
exports.updateConfig = async (req, res) => {
  try {
    let config = await GiftCardConfig.findOne();
    if (!config) {
      config = await GiftCardConfig.create(req.body);
    } else {
      const { _id, __v, createdAt, updatedAt, ...updateData } = req.body;
      Object.assign(config, updateData);
      await config.save();
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all gift card orders for admin
exports.getAdminGiftOrders = async (req, res) => {
  try {
    const orders = await Order.find({ isGiftOrder: true })
      .populate('user', 'id name email fullName')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's gift card orders
exports.getUserGiftOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id, isGiftOrder: true })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const GiftMessage = require('../models/GiftMessage');

// Create standalone gift message
exports.createMessage = async (req, res) => {
  try {
    const { message, style, scheduledDeliveryDate } = req.body;
    const newMessage = await GiftMessage.create({
      user: req.user._id,
      message,
      style,
      scheduledDeliveryDate
    });
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all messages for admin
exports.getAdminMessages = async (req, res) => {
  try {
    const orders = await Order.find({ 
      isGiftOrder: true, 
      giftMessage: { $exists: true, $ne: '' } 
    })
    .populate('user', 'name email fullName')
    .sort({ createdAt: -1 });

    const messages = orders.map(order => {
      let customerName = 'N/A';
      if (order.user) {
        customerName = order.user.name || order.user.fullName || 'N/A';
      } else if (order.shippingAddress && order.shippingAddress.fullName) {
        customerName = order.shippingAddress.fullName + ' (Guest)';
      }

      return {
        _id: order._id,
        user: { name: customerName }, // Frontend expects msg.user?.name
        message: order.giftMessage,
        style: order.giftMessageStyle || 'Classic',
        createdAt: order.createdAt
      };
    });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user's messages
exports.getUserMessages = async (req, res) => {
  try {
    const messages = await GiftMessage.find({ user: req.user._id })
      .sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- Dynamic Gift Box Rules ---

exports.getGiftBoxRules = async (req, res) => {
  try {
    const rules = await GiftBoxRule.find().sort({ minVolume: 1 });
    res.json(rules);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createGiftBoxRule = async (req, res) => {
  try {
    const newRule = await GiftBoxRule.create(req.body);
    res.status(201).json(newRule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateGiftBoxRule = async (req, res) => {
  try {
    const updatedRule = await GiftBoxRule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedRule) {
      return res.status(404).json({ message: 'Gift Box Rule not found' });
    }
    res.json(updatedRule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteGiftBoxRule = async (req, res) => {
  try {
    const rule = await GiftBoxRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Gift Box Rule not found' });
    }
    await rule.deleteOne();
    res.json({ message: 'Gift Box Rule removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

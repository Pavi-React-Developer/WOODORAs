const mongoose = require('mongoose');
const GiftCardConfig = require('../models/GiftCardConfig');
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
    const messages = await GiftMessage.find()
      .populate('user', 'name email fullName')
      .sort({ createdAt: -1 });
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

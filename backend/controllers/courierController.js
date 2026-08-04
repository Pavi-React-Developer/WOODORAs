const Courier = require('../models/Courier');

const getCouriers = async (req, res) => {
  try {
    const couriers = await Courier.find().sort({ name: 1 });
    res.json(couriers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCourier = async (req, res) => {
  try {
    const { name, trackingUrl } = req.body;
    if (!name) return res.status(400).json({ message: 'Courier name is required' });

    const exists = await Courier.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (exists) return res.status(400).json({ message: 'Courier already exists' });

    const courier = await Courier.create({ name, trackingUrl });
    res.status(201).json(courier);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCourier = async (req, res) => {
  try {
    const courier = await Courier.findByIdAndDelete(req.params.id);
    if (!courier) return res.status(404).json({ message: 'Courier not found' });
    res.json({ message: 'Courier deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getCouriers,
  createCourier,
  deleteCourier
};

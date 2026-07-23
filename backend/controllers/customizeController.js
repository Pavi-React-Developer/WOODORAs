const CustomizeField = require('../models/CustomizeField');
const CustomizeRequest = require('../models/CustomizeRequest');

// ========================
// Customize Field Controllers
// ========================

const getActiveFields = async (req, res) => {
  try {
    const fields = await CustomizeField.find({ isActive: true }).sort({ createdAt: 1 });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fields', error: error.message });
  }
};

const getAllFields = async (req, res) => {
  try {
    const fields = await CustomizeField.find({}).sort({ createdAt: -1 });
    res.json(fields);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fields', error: error.message });
  }
};

const createField = async (req, res) => {
  try {
    const { label, type, options, isRequired, isActive } = req.body;
    if (!label || !type) return res.status(400).json({ message: 'Label and type are required' });

    const existing = await CustomizeField.findOne({ label: { $regex: new RegExp(`^${label}$`, 'i') } });
    if (existing) return res.status(400).json({ message: 'Field already exists' });

    const field = await CustomizeField.create({ 
      label, 
      type, 
      options: options || [], 
      isRequired: isRequired !== undefined ? isRequired : true,
      isActive: isActive !== undefined ? isActive : true 
    });
    res.status(201).json(field);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create field', error: error.message });
  }
};

const updateField = async (req, res) => {
  try {
    const field = await CustomizeField.findById(req.params.id);
    if (!field) return res.status(404).json({ message: 'Field not found' });

    const { label, type, options, isRequired, isActive } = req.body;
    if (label) field.label = label;
    if (type) field.type = type;
    if (options !== undefined) field.options = options;
    if (isRequired !== undefined) field.isRequired = isRequired;
    if (isActive !== undefined) field.isActive = isActive;

    const updated = await field.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update field', error: error.message });
  }
};

const deleteField = async (req, res) => {
  try {
    const field = await CustomizeField.findById(req.params.id);
    if (!field) return res.status(404).json({ message: 'Field not found' });

    await field.deleteOne();
    res.json({ message: 'Field removed' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete field', error: error.message });
  }
};


// ========================
// Customize Request Controllers
// ========================

// @desc    Submit a new customize request
// @route   POST /api/customize/requests
// @access  Public
const submitRequest = async (req, res) => {
  try {
    const { customerInfo, shippingAddress, productDetails, images } = req.body;
    
    // Create new request
    const newRequest = await CustomizeRequest.create({
      user: req.user ? req.user._id : undefined,
      customerInfo,
      shippingAddress,
      productDetails,
      images: images || [],
    });

    res.status(201).json(newRequest);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit request', error: error.message });
  }
};

// @desc    Get user's own customize requests
// @route   GET /api/customize/my-requests
// @access  Private
const getMyRequests = async (req, res) => {
  try {
    const requests = await CustomizeRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch your requests', error: error.message });
  }
};

// @desc    Get all customize requests
// @route   GET /api/customize/admin/requests
// @access  Private/Admin
const getAllRequests = async (req, res) => {
  try {
    const requests = await CustomizeRequest.find({}).sort({ createdAt: -1 });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch requests', error: error.message });
  }
};

// @desc    Update customize request status
// @route   PUT /api/customize/admin/requests/:id/status
// @access  Private/Admin
const updateRequestStatus = async (req, res) => {
  try {
    const request = await CustomizeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    const { status, rejectionReason } = req.body;
    if (!['Pending', 'Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    request.status = status;
    if (status === 'Rejected' && rejectionReason) {
      request.rejectionReason = rejectionReason;
    }
    
    const updated = await request.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update request status', error: error.message });
  }
};

module.exports = {
  getActiveFields,
  getAllFields,
  createField,
  updateField,
  deleteField,
  submitRequest,
  getMyRequests,
  getAllRequests,
  updateRequestStatus,
};

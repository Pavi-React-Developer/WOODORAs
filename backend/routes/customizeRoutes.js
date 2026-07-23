const express = require('express');
const router = express.Router();
const {
  getActiveFields,
  getAllFields,
  createField,
  updateField,
  deleteField,
  submitRequest,
  getMyRequests,
  getAllRequests,
  updateRequestStatus
} = require('../controllers/customizeController');
const { protect, optionalAuth, authorize } = require('../middleware/authMiddleware');

// Public routes
router.get('/fields', getActiveFields);
router.post('/requests', optionalAuth, submitRequest);

// Protected user routes
router.get('/my-requests', protect, getMyRequests);

// Admin routes for Customize Fields
router.route('/admin/fields')
  .get(protect, authorize('admin'), getAllFields)
  .post(protect, authorize('admin'), createField);

router.route('/admin/fields/:id')
  .put(protect, authorize('admin'), updateField)
  .delete(protect, authorize('admin'), deleteField);

// Admin routes for Requests
router.route('/admin/requests')
  .get(protect, authorize('admin'), getAllRequests);

router.route('/admin/requests/:id/status')
  .put(protect, authorize('admin'), updateRequestStatus);

module.exports = router;

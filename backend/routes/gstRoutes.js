const express = require('express');
const router = express.Router();
const gstController = require('../controllers/gstController');
const { protect, authorize } = require('../middleware/authMiddleware');

const requireAdmin = authorize('admin');

router.route('/')
    .post(protect, requireAdmin, gstController.createRule)
    .get(gstController.getRules);

router.route('/:id')
    .get(gstController.getRuleById)
    .put(protect, requireAdmin, gstController.updateRule)
    .delete(protect, requireAdmin, gstController.deleteRule);

module.exports = router;

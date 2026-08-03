const express = require('express');
const router = express.Router();
const packageController = require('../controllers/packageController');
const { decodeTokenOptional } = require('../middlewares/authMiddleware');

// REST API routes for packages
router.get('/search', decodeTokenOptional, packageController.searchPackages);
router.get('/filter', packageController.getFilterOptions);
router.get('/categories', packageController.getCategories);
router.get('/providers', packageController.getProviders);

router.get('/', decodeTokenOptional, packageController.getPackages);
router.get('/:id', decodeTokenOptional, packageController.getPackageById);

router.post('/', packageController.createPackage);
router.put('/:id', packageController.updatePackage);
router.delete('/:id', packageController.deletePackage);

module.exports = router;

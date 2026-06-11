const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  uploadImage
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/upload-image', uploadImage);

router.route('/')
  .get(getProducts)
  .post(createProduct);

router.route('/:id')
  .get(getProduct)
  .put(updateProduct)
  .delete(deleteProduct);

router.patch('/:id/stock', updateStock);

module.exports = router;


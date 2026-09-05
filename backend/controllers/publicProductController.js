const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all products (public - no auth required)
// @route   GET /api/public/products
// @access  Public
const getProducts = asyncHandler(async (req, res) => {
  const { category, vehicle_type } = req.query;
  let query = 'SELECT * FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (is_active = 1 OR is_active IS NULL)';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (vehicle_type) {
    // Return all services applicable to this vehicle type (standard Services and Extra Services)
    // Exclude retail goods like Car Freshner, Acce, and Accessories
    query += ' AND category NOT IN ("Car Freshner", "Acce", "Accessories")';
    if (vehicle_type === 'Saloon') {
      query += ' AND (vehicle_type = "Saloon" OR vehicle_type = "Both" OR vehicle_type IS NULL) AND category != "4x4 Extra Service"';
    } else if (vehicle_type === '4x4') {
      query += ' AND (vehicle_type = "4x4" OR vehicle_type = "Both" OR vehicle_type IS NULL) AND category != "Saloon Extra Service"';
    } else {
      query += ' AND (vehicle_type = ? OR vehicle_type = "Both" OR vehicle_type IS NULL)';
      params.push(vehicle_type);
    }
  }

  query += ' ORDER BY category ASC, name ASC';

  const [products] = await pool.query(query, params);

  res.json({ products });
});

// @desc    Get extra services for customer site popup
// @route   GET /api/public/extra-services
// @access  Public
const getExtraServices = asyncHandler(async (req, res) => {
  const { vehicle_type } = req.query;
  
  let targetCategory = 'Saloon Extra Service';
  if (vehicle_type === '4x4') {
    targetCategory = '4x4 Extra Service';
  }

  const [products] = await pool.query(
    'SELECT * FROM products WHERE (is_deleted = 0 OR is_deleted IS NULL) AND (is_active = 1 OR is_active IS NULL) AND (category = ? OR category = "Extra Service") ORDER BY name ASC',
    [targetCategory]
  );

  res.json({ products });
});

// @desc    Get single product (public)
// @route   GET /api/public/products/:id
// @access  Public
const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

  if (products.length === 0) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json({ product: products[0] });
});

module.exports = {
  getProducts,
  getExtraServices,
  getProduct
};


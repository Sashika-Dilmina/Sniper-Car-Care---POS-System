const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');
const fs = require('fs');
const path = require('path');

// @desc    Get all products
// @route   GET /api/products
// @access  Private
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, vehicle_type } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (vehicle_type) {
    query += ' AND (vehicle_type = ? OR vehicle_type = "Both")';
    params.push(vehicle_type);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm);
  }

  query += ' ORDER BY created_at DESC';

  const [products] = await pool.query(query, params);

  res.json({ products });
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
const getProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

  if (products.length === 0) {
    return res.status(404).json({ message: 'Product not found' });
  }

  res.json({ product: products[0] });
});

// @desc    Create product
// @route   POST /api/products
// @access  Private
const createProduct = asyncHandler(async (req, res) => {
  const { name, description, category, price, stock, image_url, supplier_id, vehicle_type } = req.body;

  if (!name || !category || !price || stock === undefined) {
    return res.status(400).json({ message: 'Please provide all required fields' });
  }

  const [result] = await pool.query(
    'INSERT INTO products (name, description, category, price, stock, image_url, supplier_id, vehicle_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || null, category, price, stock, image_url || null, supplier_id || null, vehicle_type || 'Both']
  );

  const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

  res.status(201).json({ message: 'Product created successfully', product: newProduct[0] });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private
const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, category, price, stock, image_url, supplier_id, vehicle_type } = req.body;

  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
  if (products.length === 0) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await pool.query(
    'UPDATE products SET name = ?, description = ?, category = ?, price = ?, stock = ?, image_url = ?, supplier_id = ?, vehicle_type = ? WHERE id = ?',
    [name, description, category, price, stock, image_url || null, supplier_id || null, vehicle_type || 'Both', id]
  );

  const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

  res.json({ message: 'Product updated successfully', product: updated[0] });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private
const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [products] = await pool.query('SELECT id FROM products WHERE id = ?', [id]);
  if (products.length === 0) {
    return res.status(404).json({ message: 'Product not found' });
  }

  await pool.query('DELETE FROM products WHERE id = ?', [id]);

  res.json({ message: 'Product deleted successfully' });
});

// @desc    Update stock
// @route   PATCH /api/products/:id/stock
// @access  Private
const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (stock === undefined) {
    return res.status(400).json({ message: 'Stock value is required' });
  }

  await pool.query('UPDATE products SET stock = ? WHERE id = ?', [stock, id]);

  const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

  res.json({ message: 'Stock updated successfully', product: updated[0] });
});

// @desc    Upload product/service image (base64)
// @route   POST /api/products/upload-image
// @access  Private
const uploadImage = asyncHandler(async (req, res) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({ message: 'No image data provided' });
  }

  // Expect base64 image data like "data:image/jpeg;base64,..."
  const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return res.status(400).json({ message: 'Invalid base64 image format' });
  }

  const imageType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Determine file extension
  let extension = 'jpg';
  if (imageType.includes('png')) extension = 'png';
  else if (imageType.includes('webp')) extension = 'webp';
  else if (imageType.includes('gif')) extension = 'gif';

  // Ensure uploads directory exists
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `service_${Date.now()}_${Math.round(Math.random() * 1E9)}.${extension}`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, buffer);

  const imageUrl = `/uploads/${filename}`;
  res.status(200).json({
    message: 'Image uploaded successfully',
    imageUrl
  });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  uploadImage
};


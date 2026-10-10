const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all feedback (admin only)
// @route   GET /api/feedback
// @access  Private (Admin only)
const getFeedback = asyncHandler(async (req, res) => {
  const { status, rating, limit = 50 } = req.query;
  
  let query = `
    SELECT f.*,
           c.name as customer_name,
           c.phone as customer_phone,
           c.vehicle_plate,
           c.vehicle_type,
           o.id as order_id,
           s.id as service_id,
           s.service_name
    FROM feedback f
    LEFT JOIN customers c ON f.customer_id = c.id
    LEFT JOIN orders o ON f.order_id = o.id
    LEFT JOIN services s ON f.service_id = s.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND f.status = ?';
    params.push(status);
  }

  if (rating) {
    query += ' AND f.rating = ?';
    params.push(rating);
  }

  query += ' ORDER BY f.created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  const [feedback] = await pool.query(query, params);

  res.json({ feedback });
});

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Private (Admin only)
const getFeedbackById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [feedback] = await pool.query(
    `SELECT f.*,
            c.name as customer_name,
            c.phone as customer_phone,
            c.vehicle_plate,
            c.vehicle_type,
            o.id as order_id,
            o.total as order_total,
            s.id as service_id,
            s.service_name,
            s.price as service_price
     FROM feedback f
     LEFT JOIN customers c ON f.customer_id = c.id
     LEFT JOIN orders o ON f.order_id = o.id
     LEFT JOIN services s ON f.service_id = s.id
     WHERE f.id = ?`,
    [id]
  );

  if (feedback.length === 0) {
    return res.status(404).json({ message: 'Feedback not found' });
  }

  res.json({ feedback: feedback[0] });
});

// @desc    Create feedback (public or authenticated)
// @route   POST /api/feedback
// @access  Public (for customers to submit feedback)
const createFeedback = asyncHandler(async (req, res) => {
  const { customer_id, customer_name, customer_phone, order_id, service_id, rating, comment } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Rating must be between 1 and 5' });
  }

  const [result] = await pool.query(
    `INSERT INTO feedback (customer_id, customer_name, customer_phone, order_id, service_id, rating, comment, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [customer_id || null, customer_name || null, customer_phone || null, order_id || null, service_id || null, rating, comment || null]
  );

  const [newFeedback] = await pool.query('SELECT * FROM feedback WHERE id = ?', [result.insertId]);

  res.status(201).json({ 
    message: 'Feedback submitted successfully. Thank you!',
    feedback: newFeedback[0]
  });
});

// @desc    Update feedback status (admin only)
// @route   PUT /api/feedback/:id/status
// @access  Private (Admin only)
const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Valid status is required (pending, approved, rejected)' });
  }

  await pool.query('UPDATE feedback SET status = ? WHERE id = ?', [status, id]);

  const [updated] = await pool.query('SELECT * FROM feedback WHERE id = ?', [id]);

  res.json({ 
    message: 'Feedback status updated successfully',
    feedback: updated[0]
  });
});

// @desc    Delete feedback (admin only)
// @route   DELETE /api/feedback/:id
// @access  Private (Admin only)
const deleteFeedback = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const [feedback] = await pool.query('SELECT id FROM feedback WHERE id = ?', [id]);
  
  if (feedback.length === 0) {
    return res.status(404).json({ message: 'Feedback not found' });
  }

  await pool.query('DELETE FROM feedback WHERE id = ?', [id]);

  res.json({ message: 'Feedback deleted successfully' });
});

// @desc    Get latest public feedback (top 3)
// @route   GET /api/feedback/public/latest
// @access  Public
const getPublicLatestFeedback = asyncHandler(async (req, res) => {
  const [feedback] = await pool.query(`
    SELECT f.id, 
           COALESCE(NULLIF(TRIM(f.customer_name), ''), NULLIF(TRIM(c.name), ''), 'Valued Customer') as customer_name, 
           COALESCE(NULLIF(TRIM(c.vehicle_type), ''), 'Saloon') as vehicle_type, 
           f.rating, 
           COALESCE(NULLIF(TRIM(f.comment), ''), 'High quality service and great care! ⭐⭐⭐⭐⭐') as comment, 
           f.created_at 
    FROM feedback f
    LEFT JOIN customers c ON f.customer_id = c.id
    ORDER BY (CASE WHEN f.comment IS NOT NULL AND TRIM(f.comment) != '' THEN 0 ELSE 1 END), f.created_at DESC 
    LIMIT 3
  `);

  res.json({ success: true, feedback });
});

module.exports = {
  getFeedback,
  getFeedbackById,
  createFeedback,
  updateFeedbackStatus,
  deleteFeedback,
  getPublicLatestFeedback
};






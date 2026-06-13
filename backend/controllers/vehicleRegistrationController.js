const pool = require('../config/database');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get plate codes for an emirate
// @route   GET /api/vehicle-registration/plate-codes/:emirate
// @access  Private
const getPlateCodesByEmirate = asyncHandler(async (req, res) => {
  const { emirate } = req.params;
  
  if (!emirate) {
    return res.status(400).json({ message: 'Emirate is required' });
  }

  const [rows] = await pool.query(
    'SELECT Id, PlateCode FROM PlateCodeMaster WHERE EmirateName = ? AND Status = ? ORDER BY PlateCode ASC',
    [emirate, 'active']
  );

  res.json({
    success: true,
    emirate,
    codes: rows.map(r => r.PlateCode)
  });
});

module.exports = {
  getPlateCodesByEmirate
};

const { body, validationResult } = require('express-validator');

exports.validateSessionCreation = [
  body('durationMinutes')
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateAttendance = [
  body('code')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('Invalid session code'),
  body('prn')
    .matches(/^[A-Z]{3}\d{5}$/)
    .withMessage('Invalid PRN format'),
  body('faceImage')
    .notEmpty()
    .withMessage('Face image is required'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

exports.validateLocation = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Location data is required' });
  }

  // Add your location validation logic here
  // For example, check if the coordinates are within the allowed range
  // or if they match the expected location for the session

  next();
}; 
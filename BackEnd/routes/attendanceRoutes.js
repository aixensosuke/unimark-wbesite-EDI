const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { 
    verifyLocation,
    verifySessionCode,
    verifyFace,
    checkUserFaceUpload
} = require('../controllers/attendanceController');

// Check if user has uploaded their face photo
router.get('/check-face-upload', authenticateToken, checkUserFaceUpload);

// Verify location
router.post('/verify-location', authenticateToken, verifyLocation);

// Verify session code
router.post('/verify-code', authenticateToken, verifySessionCode);

// Verify face
router.post('/verify-face', authenticateToken, verifyFace);

module.exports = router;
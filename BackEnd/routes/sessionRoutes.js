const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');
const authMiddleware = require('../middlewares/authMiddleware');
const validationMiddleware = require('../middlewares/validationMiddleware');

// Create a new session
router.post('/',
  authMiddleware.authenticate,
  authMiddleware.authorize(['supervisor']),
  validationMiddleware.validateSessionCreation,
  sessionController.createSession
);

// Get active sessions
router.get('/active',
  authMiddleware.authenticate,
  sessionController.getActiveSessions
);

// End a session
router.post('/:sessionId/end',
  authMiddleware.authenticate,
  authMiddleware.authorize(['supervisor']),
  sessionController.endSession
);

// Get session details
router.get('/:sessionId',
  authMiddleware.authenticate,
  sessionController.getSessionDetails
);

module.exports = router; 
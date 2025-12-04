const express = require('express');
const router = express.Router();
const { auth, db } = require('../config/firebaseConfig');
const authMiddleware = require('../middlewares/authMiddleware');

// Register a new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, role, name, prn } = req.body;

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name
    });

    // Set custom claims for role
    await auth.setCustomUserClaims(userRecord.uid, { role });

    // Create user document in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      role,
      prn,
      createdAt: new Date(),
      faceImage: null
    });

    res.status(201).json({
      message: 'User registered successfully',
      uid: userRecord.uid
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Upload face image
router.post('/face-image',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const { faceImage } = req.body;
      const userId = req.user.uid;

      await db.collection('users').doc(userId).update({
        faceImage
      });

      res.json({ message: 'Face image uploaded successfully' });
    } catch (error) {
      console.error('Face image upload error:', error);
      res.status(500).json({ error: 'Failed to upload face image' });
    }
  }
);

// Get user profile
router.get('/profile',
  authMiddleware.authenticate,
  async (req, res) => {
    try {
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }

      const userData = userDoc.data();
      res.json({
        uid: userDoc.id,
        ...userData
      });
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

module.exports = router; 
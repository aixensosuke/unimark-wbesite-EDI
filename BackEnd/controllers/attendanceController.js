const { db } = require('../config/firebaseConfig');
const admin = require('firebase-admin');
const { calculateDistance } = require('../utils/geoUtils');
const { compareFaces } = require('../utils/faceUtils');

// Check if user has uploaded their face photo
exports.checkUserFaceUpload = async (req, res) => {
    try {
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();
        
        if (!userData.faceImage) {
            return res.status(400).json({
                error: 'Face photo not uploaded',
                message: 'Please upload your face photo before marking attendance'
            });
        }
        res.json({ hasFacePhoto: true });
    } catch (error) {
        console.error('Error checking face photo:', error);
        res.status(500).json({ error: 'Error checking face photo' });
    }
};

// Verify location
exports.verifyLocation = async (req, res) => {
    try {
        const { latitude, longitude, sessionId } = req.body;
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        
        if (!sessionDoc.exists) {
            return res.status(404).json({ error: 'Session not found' });
        }

        const sessionData = sessionDoc.data();
        const distance = calculateDistance(
            latitude,
            longitude,
            sessionData.location.latitude,
            sessionData.location.longitude
        );

        // Allow attendance within 100 meters
        if (distance > 100) {
            return res.status(400).json({
                error: 'Location mismatch',
                message: 'You must be at the correct venue to mark attendance'
            });
        }

        res.json({ verified: true });
    } catch (error) {
        console.error('Error verifying location:', error);
        res.status(500).json({ error: 'Error verifying location' });
    }
};

// Verify session code
exports.verifySessionCode = async (req, res) => {
    try {
        const { code } = req.body;
        const sessionsSnapshot = await db.collection('sessions')
            .where('code', '==', code)
            .where('status', '==', 'active')
            .where('expiresAt', '>', admin.firestore.FieldValue.serverTimestamp())
            .limit(1)
            .get();

        if (sessionsSnapshot.empty) {
            return res.status(400).json({
                error: 'Invalid code',
                message: 'Invalid or expired session code'
            });
        }

        const sessionDoc = sessionsSnapshot.docs[0];
        const sessionData = sessionDoc.data();

        res.json({ 
            verified: true,
            session: {
                id: sessionDoc.id,
                expiresAt: sessionData.expiresAt
            }
        });
    } catch (error) {
        console.error('Error verifying session code:', error);
        res.status(500).json({ error: 'Error verifying session code' });
    }
};

// Verify face
exports.verifyFace = async (req, res) => {
    try {
        const { image, sessionId } = req.body;
        const userDoc = await db.collection('users').doc(req.user.uid).get();
        const userData = userDoc.data();
        const sessionDoc = await db.collection('sessions').doc(sessionId).get();
        const sessionData = sessionDoc.data();

        if (!userData.faceImage) {
            return res.status(400).json({
                error: 'Face photo not uploaded',
                message: 'Please upload your face photo before marking attendance'
            });
        }

        const match = await compareFaces(image, userData.faceImage);
        if (!match) {
            return res.status(400).json({
                error: 'Face verification failed',
                message: 'Face verification failed. Please try again.'
            });
        }

        // Create attendance record
        const attendanceData = {
            userId: req.user.uid,
            sessionId: sessionId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            verified: true
        };

        await db.collection('attendance').add(attendanceData);

        // Update session attendees
        await db.collection('sessions').doc(sessionId).update({
            attendees: admin.firestore.FieldValue.arrayUnion({
                userId: req.user.uid,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            })
        });

        res.json({ 
            verified: true,
            message: 'Attendance marked successfully'
        });
    } catch (error) {
        console.error('Error verifying face:', error);
        res.status(500).json({ error: 'Error verifying face' });
    }
};

// Get attendance history
exports.getAttendanceHistory = async (req, res) => {
    try {
        const attendanceSnapshot = await db.collection('attendance')
            .where('userId', '==', req.user.uid)
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();

        const attendanceRecords = await Promise.all(
            attendanceSnapshot.docs.map(async (doc) => {
                const sessionDoc = await db.collection('sessions').doc(doc.data().sessionId).get();
                return {
                    id: doc.id,
                    ...doc.data(),
                    timestamp: doc.data().timestamp.toDate(),
                    session: sessionDoc.data()
                };
            })
        );

        res.json(attendanceRecords);
    } catch (error) {
        console.error('Error fetching attendance history:', error);
        res.status(500).json({ error: 'Failed to fetch attendance history' });
    }
}; 
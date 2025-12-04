const { admin, db } = require('../config/firebaseConfig');
const { generateSessionCode } = require('../services/codeGenerator');

exports.createSession = async (req, res) => {
  try {
    const { durationMinutes } = req.body;
    const supervisorId = req.user.uid;
    
    const sessionData = {
      code: generateSessionCode(),
      supervisorId,
      expiresAt: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + durationMinutes * 60000)
      ),
      status: 'active',
      attendees: [],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const sessionRef = await db.collection('sessions').add(sessionData);
    
    res.status(201).json({
      sessionId: sessionRef.id,
      code: sessionData.code,
      expiresAt: sessionData.expiresAt.toDate()
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Session creation failed' });
  }
};

exports.getActiveSessions = async (req, res) => {
  try {
    const sessionsSnapshot = await db.collection('sessions')
      .where('status', '==', 'active')
      .where('expiresAt', '>', admin.firestore.Timestamp.now())
      .get();

    const sessions = sessionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      expiresAt: doc.data().expiresAt.toDate()
    }));

    res.json(sessions);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
};

exports.endSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionRef = db.collection('sessions').doc(sessionId);
    
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    if (sessionData.supervisorId !== req.user.uid) {
      return res.status(403).json({ error: 'Unauthorized to end this session' });
    }

    await sessionRef.update({
      status: 'ended',
      endedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Failed to end session' });
  }
};

exports.getSessionDetails = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionDoc = await db.collection('sessions').doc(sessionId).get();
    
    if (!sessionDoc.exists) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const sessionData = sessionDoc.data();
    const attendees = await Promise.all(
      sessionData.attendees.map(async (attendee) => {
        const userDoc = await db.collection('users').doc(attendee.userId).get();
        return {
          ...attendee,
          user: userDoc.data()
        };
      })
    );

    res.json({
      ...sessionData,
      id: sessionDoc.id,
      expiresAt: sessionData.expiresAt.toDate(),
      attendees
    });
  } catch (error) {
    console.error('Error fetching session details:', error);
    res.status(500).json({ error: 'Failed to fetch session details' });
  }
}; 
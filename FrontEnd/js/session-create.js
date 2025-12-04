// Target location configuration (same as geotag.js)
const TARGET_LOCATION = {
    lat: 18.457437154048705,
    lng: 73.85064332149199,
    radius: 50 // meters
};

// Get DOM elements
const createSessionBtn = document.getElementById('create-session');
const durationInput = document.getElementById('duration');
const sessionsList = document.getElementById('sessions-list');
const statusMessage = document.getElementById('status-message');
const sessionCardTemplate = document.getElementById('session-card-template');

// Format time remaining
function formatTimeRemaining(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    } else {
        return `${remainingSeconds}s`;
    }
}

// Check authentication state
function checkAuth() {
    return new Promise((resolve, reject) => {
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            unsubscribe();
            if (user) {
                resolve(user);
            } else {
                reject(new Error('User not authenticated'));
            }
        });
    });
}

// Check if user is a supervisor and get their organization ID
async function getSupervisorInfo(userId) {
    try {
        const supervisorDoc = await firebase.firestore().collection('supervisors').doc(userId).get();
        if (!supervisorDoc.exists) {
            return { isSupervisor: false };
        }
        
        const data = supervisorDoc.data();
        return {
            isSupervisor: true,
            organizationId: data.organizationId || null
        };
    } catch (error) {
        console.error('Error checking supervisor info:', error);
        return { isSupervisor: false, error: error.message };
    }
}

// Create a new session
async function createSession() {
    try {
        // Check authentication first
        const user = await checkAuth();
        
        // Check if user is a supervisor
        const supervisorInfo = await getSupervisorInfo(user.uid);
        if (!supervisorInfo.isSupervisor) {
            showStatusMessage('error', supervisorInfo.error || 'Only supervisors can create sessions');
            return;
        }
        
        const duration = parseInt(durationInput.value);
        
        if (duration < 1 || duration > 28800) {
            showStatusMessage('error', 'Duration must be between 1 and 28800 seconds');
            return;
        }

        // Generate a random 6-character code
        const code = generateSessionCode();

        // Create session data
        const sessionData = {
            duration: duration,
            location: {
                lat: TARGET_LOCATION.lat,
                lng: TARGET_LOCATION.lng,
                radius: TARGET_LOCATION.radius
            },
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + duration * 1000).toISOString(),
            code: code,
            attendees: 0,
            createdBy: user.uid,
            status: 'active'
        };

        // Add organizationId if available
        if (supervisorInfo.organizationId) {
            sessionData.organizationId = supervisorInfo.organizationId;
        }

        // Add to Firebase
        await firebase.firestore().collection('sessions').doc(code).set(sessionData);

        // Show success message with the session code
        showStatusMessage('success', `Session created successfully! Session Code: ${code}`);
        
        // Add session to list
        addSessionToList(sessionData);
        
        // Reset form
        durationInput.value = 60; // Default to 1 minute
    } catch (error) {
        console.error('Error creating session:', error);
        if (error.message === 'User not authenticated') {
            showStatusMessage('error', 'Please sign in to create a session');
            // Redirect to login page
            window.location.href = '/login.html';
        } else if (error.code === 'permission-denied') {
            showStatusMessage('error', 'You do not have permission to create sessions');
        } else {
            showStatusMessage('error', 'Error creating session: ' + error.message);
        }
    }
}

// Generate a random session code
function generateSessionCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Add session to the list
function addSessionToList(session) {
    // Check if session already exists in the list and remove it
    const existingCard = document.querySelector(`[data-session-code="${session.code}"]`);
    if (existingCard) {
        existingCard.remove();
    }
    
    const card = sessionCardTemplate.content.cloneNode(true);
    
    // Set session details
    const cardElement = card.querySelector('.session-card');
    cardElement.setAttribute('data-session-code', session.code);
    
    card.querySelector('.session-code').textContent = session.code;
    card.querySelector('.session-duration').textContent = session.duration;
    card.querySelector('.session-expires').textContent = new Date(session.endTime).toLocaleString();
    card.querySelector('.session-attendees').textContent = session.attendees;

    // Add event listeners
    const endSessionBtn = card.querySelector('.end-session');
    const viewDetailsBtn = card.querySelector('.view-details');

    endSessionBtn.addEventListener('click', () => endSession(session.code));
    viewDetailsBtn.addEventListener('click', () => viewSessionDetails(session.code));

    // Add to list
    sessionsList.insertBefore(card, sessionsList.firstChild);

    // Start countdown timer and set up real-time session status
    startSessionTimer(cardElement, session.endTime);
    
    // Set up real-time listener for this specific session
    setupSessionListener(session.code, cardElement);
}

// Start countdown timer for a session
function startSessionTimer(card, endTime) {
    const updateTimerInterval = setInterval(() => {
        const now = new Date();
        const end = new Date(endTime);
        const remaining = Math.max(0, Math.floor((end - now) / 1000));

        const statusElement = card.querySelector('.session-status');
        const expiresElement = card.querySelector('.session-expires');

        if (!statusElement || !expiresElement) {
            console.error('Required elements not found in session card');
            clearInterval(updateTimerInterval);
            return;
        }

        if (remaining <= 0) {
            statusElement.textContent = 'Expired';
            statusElement.classList.remove('active');
            statusElement.classList.add('expired');
            
            // Update status in Firestore if session is expired
            const sessionCode = card.getAttribute('data-session-code');
            if (sessionCode) {
                updateSessionStatusIfExpired(sessionCode);
            }
            
            clearInterval(updateTimerInterval);
            return;
        }

        expiresElement.textContent = formatTimeRemaining(remaining);
    }, 1000);
    
    // Store the interval ID on the card element for cleanup
    card.setAttribute('data-timer-id', updateTimerInterval);
}

// Update session status in Firestore if expired
async function updateSessionStatusIfExpired(code) {
    try {
        const sessionRef = firebase.firestore().collection('sessions').doc(code);
        const doc = await sessionRef.get();
        
        if (doc.exists) {
            const sessionData = doc.data();
            const now = new Date();
            const endTime = new Date(sessionData.endTime);
            
            if (now > endTime && sessionData.status === 'active') {
                await sessionRef.update({
                    status: 'expired',
                });
            }
        }
    } catch (error) {
        console.error('Error updating expired session:', error);
    }
}

// Set up real-time listener for session updates
function setupSessionListener(code, cardElement) {
    const sessionRef = firebase.firestore().collection('sessions').doc(code);
    
    // Store the unsubscribe function on the card element for cleanup
    const unsubscribe = sessionRef.onSnapshot((doc) => {
        if (doc.exists) {
            const sessionData = doc.data();
            
            // Store the document ID for navigation to details page
            cardElement.setAttribute('data-session-id', doc.id);
            
            // Update attendee count
            const attendeesElement = cardElement.querySelector('.session-attendees');
            if (attendeesElement) {
                // Check for attendees array first (preferred method)
                if (sessionData.attendees && Array.isArray(sessionData.attendees)) {
                    attendeesElement.textContent = sessionData.attendees.length;
                } 
                // Fall back to attendeesCount field if available
                else if (sessionData.attendeesCount !== undefined) {
                    attendeesElement.textContent = sessionData.attendeesCount;
                }
                // Otherwise default to 0 or whatever was in the data
                else {
                    attendeesElement.textContent = sessionData.attendees || 0;
                }
            }
            
            // Update status if changed
            const statusElement = cardElement.querySelector('.session-status');
            if (statusElement) {
                if (sessionData.status === 'ended' || sessionData.status === 'expired') {
                    statusElement.textContent = sessionData.status === 'ended' ? 'Ended' : 'Expired';
                    statusElement.classList.remove('active');
                    statusElement.classList.add('expired');
                    
                    // Clear the timer if status has changed to ended/expired
                    const timerId = cardElement.getAttribute('data-timer-id');
                    if (timerId) {
                        clearInterval(parseInt(timerId));
                    }
                }
            }
            
            // Update end time if changed
            if (sessionData.endTime) {
                const expiresElement = cardElement.querySelector('.session-expires');
                if (expiresElement) {
                    expiresElement.textContent = new Date(sessionData.endTime).toLocaleString();
                }
            }
        }
    }, (error) => {
        console.error(`Error getting real-time updates for session ${code}:`, error);
    });
    
    // Store the unsubscribe function for cleanup
    cardElement.setAttribute('data-unsubscribe', unsubscribe);
}

// End a session
async function endSession(code) {
    try {
        const user = await checkAuth();
        await firebase.firestore().collection('sessions').doc(code).update({
            status: 'ended',
            endTime: new Date().toISOString()
        });

        showStatusMessage('success', 'Session ended successfully');
        loadActiveSessions(); // Reload sessions list
    } catch (error) {
        console.error('Error ending session:', error);
        if (error.message === 'User not authenticated') {
            showStatusMessage('error', 'Please sign in to end the session');
            window.location.href = '/login.html';
        } else {
            showStatusMessage('error', 'Error ending session: ' + error.message);
        }
    }
}

// View session details
function viewSessionDetails(code) {
    // Get the session card element to retrieve the document ID
    const cardElement = document.querySelector(`[data-session-code="${code}"]`);
    if (cardElement) {
        const sessionId = cardElement.getAttribute('data-session-id');
        if (sessionId) {
            window.location.href = `session-details.html?id=${sessionId}`;
            return;
        }
    }
    
    // Fallback to using code as ID if sessionId is not available
    window.location.href = `session-details.html?id=${code}`;
}

// Show status message
function showStatusMessage(type, message) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
        statusMessage.className = 'status-message';
    }, 5000); // Increased timeout to 5 seconds to give more time to read the code
}

// Load active sessions with real-time updates
async function loadActiveSessions() {
    try {
        const user = await checkAuth();
        
        // Check if user is a supervisor
        const supervisorInfo = await getSupervisorInfo(user.uid);
        if (!supervisorInfo.isSupervisor) {
            showStatusMessage('error', supervisorInfo.error || 'Only supervisors can view sessions');
            return;
        }

        // Clear existing sessions and cleanup listeners
        cleanupSessionListeners();
        
        // Set up real-time listener for all active sessions
        const query = firebase.firestore()
            .collection('sessions')
            .where('status', '==', 'active')  // Only show active sessions
            .where('createdBy', '==', user.uid);
            
        // Store the unsubscribe function
        sessionsUnsubscribe = query.onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const sessionData = change.doc.data();
                
                if (change.type === 'added') {
                    // Add new session to the list
                    addSessionToList(sessionData);
                } 
                else if (change.type === 'modified') {
                    // If session is no longer active, remove it
                    if (sessionData.status !== 'active') {
                        const card = document.querySelector(`[data-session-code="${sessionData.code}"]`);
                        if (card) {
                            // Cleanup listeners and timers
                            const timerId = card.getAttribute('data-timer-id');
                            if (timerId) {
                                clearInterval(parseInt(timerId));
                            }
                            
                            const unsubscribe = card.getAttribute('data-unsubscribe');
                            if (unsubscribe && typeof unsubscribe === 'function') {
                                unsubscribe();
                            }
                            
                            card.remove();
                            showStatusMessage('info', `Session ${sessionData.code} has ${sessionData.status === 'ended' ? 'ended' : 'expired'}`);
                        }
                    } else {
                        // Update existing session in the list if it's still active
                        addSessionToList(sessionData);
                    }
                } 
                else if (change.type === 'removed') {
                    // Remove session from the list
                    const card = document.querySelector(`[data-session-code="${sessionData.code}"]`);
                    if (card) {
                        // Cleanup listeners and timers
                        const timerId = card.getAttribute('data-timer-id');
                        if (timerId) {
                            clearInterval(parseInt(timerId));
                        }
                        
                        const unsubscribe = card.getAttribute('data-unsubscribe');
                        if (unsubscribe && typeof unsubscribe === 'function') {
                            unsubscribe();
                        }
                        
                        card.remove();
                    }
                }
            });
        }, (error) => {
            console.error('Error getting real-time session updates:', error);
            showStatusMessage('error', 'Error getting real-time updates: ' + error.message);
        });
        
    } catch (error) {
        console.error('Error loading sessions:', error);
        if (error.message === 'User not authenticated') {
            showStatusMessage('error', 'Please sign in to view sessions');
            window.location.href = '/login.html';
        } else if (error.code === 'permission-denied') {
            showStatusMessage('error', 'You do not have permission to view sessions');
        } else {
            showStatusMessage('error', 'Error loading sessions: ' + error.message);
        }
    }
}

// Cleanup session listeners and timers
function cleanupSessionListeners() {
    // Clear existing sessions
    const sessionCards = document.querySelectorAll('.session-card');
    sessionCards.forEach(card => {
        // Clear timer
        const timerId = card.getAttribute('data-timer-id');
        if (timerId) {
            clearInterval(parseInt(timerId));
        }
        
        // Unsubscribe from real-time updates
        const unsubscribe = card.getAttribute('data-unsubscribe');
        if (unsubscribe && typeof unsubscribe === 'function') {
            unsubscribe();
        }
    });
    
    // Clear the sessions list
    sessionsList.innerHTML = '';
    
    // Unsubscribe from the main sessions listener if exists
    if (sessionsUnsubscribe && typeof sessionsUnsubscribe === 'function') {
        sessionsUnsubscribe();
    }
}

// Global variables for session listeners
let sessionsUnsubscribe = null;

// Initialize event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Add click event listener to create session button
    createSessionBtn.addEventListener('click', createSession);
    
    // Load active sessions with real-time updates
    loadActiveSessions();
    
    // Cleanup listeners when page is unloaded
    window.addEventListener('beforeunload', cleanupSessionListeners);
}); 
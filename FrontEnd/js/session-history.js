// Initialize Firebase
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            initializeSessionHistory();
        } else {
            // User is not signed in, redirect to login
            window.location.href = '../../index.html';
        }
    });
});

// Session history listeners and filters
let sessionListeners = [];

// Initialize session history functionality
function initializeSessionHistory() {
    // Setup filter event listeners
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('date-filter').addEventListener('change', applyFilters);
    document.getElementById('search-filter').addEventListener('input', applyFilters);
    
    // Make sure empty sessions message is hidden initially
    const emptySessionsMsg = document.getElementById('empty-sessions');
    if (emptySessionsMsg) {
        emptySessionsMsg.style.display = 'none';
    }
    
    // Show loading message immediately
    const statusMessage = document.getElementById('status-message');
    if (statusMessage) {
        statusMessage.textContent = 'Loading sessions...';
        statusMessage.className = 'status-message info';
        statusMessage.style.display = 'block';
    }
    
    // Load all sessions initially
    loadAllSessions();
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

// Load all sessions created by the supervisor
async function loadAllSessions() {
    const statusMessage = document.getElementById('status-message');
    const sessionsListContainer = document.getElementById('sessions-list');
    const emptySessionsMsg = document.getElementById('empty-sessions');
    
    // Clear any existing session listeners
    clearSessionListeners();
    
    try {
        // Get current user
        const user = firebase.auth().currentUser;
        
        if (!user) {
            if (statusMessage) {
                statusMessage.textContent = 'You must be logged in to view session history.';
                statusMessage.className = 'status-message error';
            }
            return;
        }
        
        // Check if user is a supervisor using the same method as session-create.js
        const supervisorInfo = await getSupervisorInfo(user.uid);
        if (!supervisorInfo.isSupervisor) {
            if (statusMessage) {
                statusMessage.textContent = supervisorInfo.error || 'Only supervisors can view session history.';
                statusMessage.className = 'status-message error';
            }
            return;
        }
        
        // User is a supervisor, already showing loading message
        // (we set this in initializeSessionHistory)
        
        // Create query for sessions created by this supervisor
        const sessionsRef = firebase.firestore().collection('sessions');
        const query = sessionsRef.where('createdBy', '==', user.uid);
        
        // Setup real-time listener for sessions
        const listener = query.onSnapshot((snapshot) => {
            // Reset the container
            if (sessionsListContainer) {
                sessionsListContainer.innerHTML = '';
                
                // If we have the empty message element, add it back to the container
                // but keep it hidden until we determine if we have sessions
                if (emptySessionsMsg) {
                    emptySessionsMsg.style.display = 'none';
                    sessionsListContainer.appendChild(emptySessionsMsg);
                }
            }
            
            // Hide status message when sessions are loaded
            if (statusMessage) {
                statusMessage.style.display = 'none';
            }
            
            // Track if we have any sessions
            let hasVisibleSessions = false;
            
            // Add each session to the list
            if (!snapshot.empty) {
                snapshot.forEach(doc => {
                    const sessionData = doc.data();
                    addSessionToHistoryList(doc.id, sessionData);
                    hasVisibleSessions = true;
                });
            }
            
            // Show/hide empty message based on if we have sessions
            if (emptySessionsMsg) {
                emptySessionsMsg.style.display = hasVisibleSessions ? 'none' : 'block';
            }
            
            // Only apply filters if we have sessions
            if (hasVisibleSessions) {
                applyFilters();
            }
            
        }, (error) => {
            console.error("Error loading sessions:", error);
            if (statusMessage) {
                statusMessage.textContent = 'Error loading sessions: ' + error.message;
                statusMessage.className = 'status-message error';
                statusMessage.style.display = 'block';
            }
        });
        
        // Save the listener for cleanup
        sessionListeners.push(listener);
        
    } catch (error) {
        console.error("Error in loadAllSessions:", error);
        if (statusMessage) {
            statusMessage.textContent = 'Error: ' + error.message;
            statusMessage.className = 'status-message error';
            statusMessage.style.display = 'block';
        }
    }
}

// Add a session to the history list
function addSessionToHistoryList(sessionId, sessionData) {
    try {
        const sessionsListContainer = document.getElementById('sessions-list');
        const template = document.getElementById('session-card-template');
        
        if (!sessionsListContainer || !template) {
            console.error('Required elements not found:', {
                listContainer: !!sessionsListContainer,
                template: !!template
            });
            return;
        }
        
        // Clone the template
        const sessionCard = template.content.cloneNode(true);
        
        // Set session details
        sessionCard.querySelector('.session-code').textContent = sessionData.code || 'Unknown';
        sessionCard.querySelector('.session-duration').textContent = sessionData.duration || 'N/A';
        
        // Format and set created time - with null check
        let createdDate;
        if (sessionData.createdAt && typeof sessionData.createdAt.toDate === 'function') {
            createdDate = sessionData.createdAt.toDate();
        } else if (sessionData.startTime) {
            // Fallback to startTime if available
            createdDate = new Date(sessionData.startTime);
        } else {
            // Default to current time if no valid timestamp
            createdDate = new Date();
        }
        
        sessionCard.querySelector('.session-created').textContent = formatDate(createdDate);
        
        // Set ended time if available - with null check
        if (sessionData.endedAt && typeof sessionData.endedAt.toDate === 'function') {
            const endedDate = sessionData.endedAt.toDate();
            sessionCard.querySelector('.session-ended').textContent = formatDate(endedDate);
        } else if (sessionData.endTime) {
            // Fallback to endTime if available
            const endDate = new Date(sessionData.endTime);
            sessionCard.querySelector('.session-ended').textContent = formatDate(endDate);
        } else {
            sessionCard.querySelector('.session-ended').textContent = 'N/A';
        }
        
        // Set attendees count
        sessionCard.querySelector('.session-attendees').textContent = sessionData.attendees ? 
            (Array.isArray(sessionData.attendees) ? sessionData.attendees.length : sessionData.attendees) : 0;
        
        // Set session status
        const statusElement = sessionCard.querySelector('.session-status');
        statusElement.textContent = sessionData.status || 'Unknown';
        statusElement.classList.add((sessionData.status || 'unknown').toLowerCase());
        
        // Set session ID as data attribute
        const cardElement = sessionCard.querySelector('.session-card');
        cardElement.dataset.sessionId = sessionId;
        cardElement.dataset.status = (sessionData.status || 'unknown').toLowerCase();
        cardElement.dataset.createdAt = createdDate.getTime();
        cardElement.dataset.code = sessionData.code || '';
        
        // Setup view details action
        const viewDetailsBtn = sessionCard.querySelector('.view-details');
        viewDetailsBtn.addEventListener('click', () => {
            // Navigate to session details page with the ID from Firestore
            window.location.href = `session-details.html?id=${sessionId}`;
        });
        
        // Add the session card to the container
        sessionsListContainer.appendChild(cardElement);
    } catch (error) {
        console.error("Error adding session to history list:", error);
    }
}

// Apply filters to the sessions list
function applyFilters() {
    try {
        const statusFilter = document.getElementById('status-filter').value;
        const dateFilter = document.getElementById('date-filter').value;
        const searchFilter = document.getElementById('search-filter').value.toLowerCase();
        
        // Get all session cards
        const sessionCards = document.querySelectorAll('.session-card');
        if (sessionCards.length === 0) {
            return; // No cards to filter
        }
        
        const emptySessionsMsg = document.getElementById('empty-sessions');
        
        let visibleCount = 0;
        
        sessionCards.forEach(card => {
            // Get data attributes
            const status = card.dataset.status;
            const createdAt = parseInt(card.dataset.createdAt);
            const code = card.dataset.code.toLowerCase();
            
            // Check status filter
            const statusMatch = statusFilter === 'all' || status === statusFilter;
            
            // Check date filter
            let dateMatch = true;
            if (dateFilter) {
                const filterDate = new Date(dateFilter);
                const sessionDate = new Date(createdAt);
                
                dateMatch = 
                    sessionDate.getFullYear() === filterDate.getFullYear() &&
                    sessionDate.getMonth() === filterDate.getMonth() &&
                    sessionDate.getDate() === filterDate.getDate();
            }
            
            // Check search filter
            const searchMatch = !searchFilter || code.includes(searchFilter);
            
            // Apply filters
            const isVisible = statusMatch && dateMatch && searchMatch;
            card.style.display = isVisible ? 'block' : 'none';
            
            if (isVisible) visibleCount++;
        });
        
        // Show/hide empty message if we have it
        if (emptySessionsMsg) {
            // Show empty message if no sessions are visible
            emptySessionsMsg.style.display = visibleCount === 0 ? 'block' : 'none';
            
            // Update empty message text based on filters
            if (visibleCount === 0) {
                let message = 'No sessions found';
                
                if (statusFilter !== 'all' || dateFilter || searchFilter) {
                    message += ' with the selected filters. Try adjusting your filters.';
                } else {
                    message += '. Start by creating a new session.';
                }
                
                emptySessionsMsg.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
            }
        }
    } catch (error) {
        console.error('Error applying filters:', error);
    }
}

// Format date for display
function formatDate(date) {
    if (!date) return 'N/A';
    
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    };
    
    return date.toLocaleDateString(undefined, options);
}

// Clear session listeners
function clearSessionListeners() {
    sessionListeners.forEach(listener => {
        if (listener) listener();
    });
    sessionListeners = [];
} 
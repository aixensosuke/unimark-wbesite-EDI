// Initialize session details page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            // User is signed in
            initializeSessionDetails();
        } else {
            // User is not signed in, redirect to login
            window.location.href = '../../index.html';
        }
    });
});

// Global variables
let currentSession = null;
let sessionListener = null;
let attendeesListener = null;

// Initialize session details functionality
function initializeSessionDetails() {
    // Get session ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('id');
    
    if (!sessionId) {
        showStatusMessage('No session ID specified. Please select a valid session.', 'error');
        return;
    }
    
    // Setup event listeners
    document.getElementById('end-session').addEventListener('click', endCurrentSession);
    document.getElementById('export-pdf').addEventListener('click', exportSessionToPdf);
    document.getElementById('export-csv').addEventListener('click', exportAttendeesToCsv);
    document.getElementById('export-excel').addEventListener('click', exportSessionToExcel);
    
    // Load session details
    loadSessionDetails(sessionId);
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

// Load session details
async function loadSessionDetails(sessionId) {
    const statusMessage = document.getElementById('status-message');
    
    try {
        const user = firebase.auth().currentUser;
        
        if (!user) {
            showStatusMessage('You must be logged in to view session details.', 'error');
            return;
        }
        
        // Check if user is a supervisor using the same method as session-create.js
        const supervisorInfo = await getSupervisorInfo(user.uid);
        if (!supervisorInfo.isSupervisor) {
            showStatusMessage(supervisorInfo.error || 'Only supervisors can view session details.', 'error');
            return;
        }
        
        // User is a supervisor, load session details
        statusMessage.textContent = 'Loading session details...';
        statusMessage.className = 'status-message info';
        
        // Setup real-time listener for session details
        const sessionRef = firebase.firestore().collection('sessions').doc(sessionId);
        
        sessionListener = sessionRef.onSnapshot((doc) => {
            if (doc.exists) {
                const sessionData = doc.data();
                
                // Check if this session belongs to the current supervisor
                if (sessionData.createdBy === user.uid) {
                    currentSession = { id: doc.id, ...sessionData };
                    updateSessionUI(currentSession);
                    
                    // Hide status message
                    statusMessage.style.display = 'none';
                    
                    // Load attendees
                    loadSessionAttendees(sessionId);
                } else {
                    showStatusMessage('You do not have permission to view this session.', 'error');
                }
            } else {
                showStatusMessage('Session not found. It may have been deleted.', 'error');
            }
        }, (error) => {
            console.error("Error loading session:", error);
            showStatusMessage('Error loading session: ' + error.message, 'error');
        });
        
    } catch (error) {
        console.error("Error in loadSessionDetails:", error);
        showStatusMessage('Error: ' + error.message, 'error');
    }
}

// Update session UI with session data
function updateSessionUI(session) {
    // Update session code and status
    document.getElementById('session-code').textContent = session.code || 'Unknown';
    
    const statusElement = document.getElementById('session-status');
    statusElement.textContent = session.status || 'Unknown';
    statusElement.className = 'session-status ' + (session.status || 'unknown').toLowerCase();
    
    // Update session details
    document.getElementById('session-duration').textContent = `${session.duration || 'N/A'} seconds`;
    
    // Format and set created time - with null check
    let createdDate;
    if (session.createdAt && typeof session.createdAt.toDate === 'function') {
        createdDate = session.createdAt.toDate();
    } else if (session.startTime) {
        // Fallback to startTime if available
        createdDate = new Date(session.startTime);
    } else {
        // Default to current time if no valid timestamp
        createdDate = new Date();
    }
    document.getElementById('created-time').textContent = formatDate(createdDate);
    
    // Set ended time if available - with null check
    if (session.endedAt && typeof session.endedAt.toDate === 'function') {
        const endedDate = session.endedAt.toDate();
        document.getElementById('ended-time').textContent = formatDate(endedDate);
    } else if (session.endTime) {
        // Fallback to endTime if available
        const endDate = new Date(session.endTime);
        document.getElementById('ended-time').textContent = formatDate(endDate);
    } else if (session.status === 'expired') {
        // If expired but no endedAt, calculate using createdAt + duration
        const duration = session.duration || 60; // default to 60 seconds if not specified
        const expiredDate = new Date(createdDate.getTime() + (duration * 1000));
        document.getElementById('ended-time').textContent = `${formatDate(expiredDate)} (Expired)`;
    } else {
        document.getElementById('ended-time').textContent = 'Not ended';
    }
    
    // Update creator details
    loadCreatorDetails(session.createdBy);
    
    // Update UI based on session status
    updateSessionActions(session.status || 'unknown');
}

// Load session creator details
async function loadCreatorDetails(creatorId) {
    if (!creatorId) {
        document.getElementById('created-by').textContent = 'Unknown User';
        return;
    }
    
    try {
        // First try to get info from supervisors collection
        const supervisorDoc = await firebase.firestore().collection('supervisors').doc(creatorId).get();
        
        if (supervisorDoc.exists) {
            // Get current user's email
            const currentUser = firebase.auth().currentUser;
            const email = currentUser ? currentUser.email : 'Unknown Email';
            const name = currentUser ? (currentUser.displayName || email.split('@')[0]) : 'Unknown User';
            
            document.getElementById('created-by').textContent = `${name} (${email})`;
        } else {
            document.getElementById('created-by').textContent = 'Unknown User (ID: ' + creatorId + ')';
        }
    } catch (error) {
        console.error("Error loading creator details:", error);
        document.getElementById('created-by').textContent = 'Error loading creator';
    }
}

// Update UI based on session status
function updateSessionActions(status) {
    const endSessionBtn = document.getElementById('end-session');
    
    if (status === 'active') {
        // Session is active, enable end session button
        endSessionBtn.disabled = false;
        endSessionBtn.style.opacity = '1';
    } else {
        // Session is ended or expired, disable end session button
        endSessionBtn.disabled = true;
        endSessionBtn.style.opacity = '0.5';
    }
}

// Load session attendees
function loadSessionAttendees(sessionId) {
    const attendeesListContainer = document.getElementById('attendees-list');
    const noAttendeesMessage = document.getElementById('no-attendees');
    
    if (!attendeesListContainer) {
        console.error("Attendees list container not found");
        return;
    }
    
    // Setup real-time listener for attendees
    const sessionRef = firebase.firestore().collection('sessions').doc(sessionId);
    
    console.log("Setting up attendees listener for session ID:", sessionId);
    
    attendeesListener = sessionRef.onSnapshot((doc) => {
        if (doc.exists) {
            const sessionData = doc.data();
            console.log("Session data received:", sessionData);
            
            // Store the current session data globally
            currentSession = { ...sessionData, id: doc.id };
            
            // Check for attendees array
            const attendees = sessionData.attendees || [];
            console.log(`Found ${attendees.length} attendees in the session`);
            
            // Update attendee count
            const attendeeCountElement = document.getElementById('attendee-count');
            if (attendeeCountElement) {
                attendeeCountElement.textContent = attendees.length;
            }
            
            // Clear previous attendees list (except the no-attendees message)
            const attendeeItems = attendeesListContainer.querySelectorAll('.attendee-item');
            attendeeItems.forEach(item => item.remove());
            
            if (attendees.length === 0) {
                // No attendees, show message
                if (noAttendeesMessage) {
                    noAttendeesMessage.style.display = 'block';
                }
                return;
            }
            
            // Hide no attendees message
            if (noAttendeesMessage) {
                noAttendeesMessage.style.display = 'none';
            }
            
            // Display attendees with available info
            attendees.forEach((attendeeData, index) => {
                console.log(`Processing attendee ${index + 1}:`, attendeeData);
                
                // Display with minimal available info to avoid permission issues
                addAttendeeToList({
                    userId: attendeeData.userId,
                    name: attendeeData.name || "Student " + (attendeeData.userId || "").substring(0, 6),
                    email: attendeeData.email || "student-" + (attendeeData.userId || "").substring(0, 6),
                    studentId: attendeeData.studentId || "N/A"
                }, attendeeData.timestamp);
            });
        } else {
            console.error("Session document does not exist");
            if (noAttendeesMessage) {
                noAttendeesMessage.style.display = 'block';
                noAttendeesMessage.textContent = "Session not found. It may have been deleted.";
            }
        }
    }, (error) => {
        console.error("Error loading attendees:", error);
        showStatusMessage("Error loading attendees: " + error.message, "error");
    });
}

// Add an attendee to the list
function addAttendeeToList(userData, timestamp) {
    const attendeesListContainer = document.getElementById('attendees-list');
    const template = document.getElementById('attendee-template');
    
    if (!attendeesListContainer || !template) {
        console.error("Required elements for adding attendee not found");
        return;
    }
    
    // Clone the template
    const attendeeItem = template.content.cloneNode(true);
    
    // Set attendee details
    const nameElement = attendeeItem.querySelector('.attendee-name');
    if (nameElement) {
        nameElement.textContent = userData.name || 'Unknown User';
    }
    
    const emailElement = attendeeItem.querySelector('.attendee-email');
    if (emailElement) {
        emailElement.textContent = userData.email || 'Unknown Email';
        // Add student ID if available
        if (userData.studentId && userData.studentId !== "N/A") {
            emailElement.textContent += ` (ID: ${userData.studentId})`;
        }
    }
    
    // Set attendee avatar with initials
    const avatar = attendeeItem.querySelector('.attendee-avatar');
    if (avatar) {
        const initials = getInitials(userData.name || 'U');
        avatar.textContent = initials;
    }
    
    // Set attendance time with null check
    const timeElement = attendeeItem.querySelector('.attendee-time');
    if (timeElement) {
        if (timestamp && typeof timestamp.toDate === 'function') {
            const attendanceDate = timestamp.toDate();
            timeElement.textContent = formatDate(attendanceDate);
        } else if (timestamp instanceof Date) {
            timeElement.textContent = formatDate(timestamp);
        } else {
            timeElement.textContent = 'Unknown time';
        }
    }
    
    // Add the attendee item to the container
    attendeesListContainer.appendChild(attendeeItem);
}

// Get initials from name
function getInitials(name) {
    if (!name) return '?';
    
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

// End current session
function endCurrentSession() {
    if (!currentSession || currentSession.status !== 'active') {
        showStatusMessage('This session cannot be ended. It may already be ended or expired.', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to end this session? Students will no longer be able to mark attendance.')) {
        const sessionRef = firebase.firestore().collection('sessions').doc(currentSession.id);
        
        sessionRef.update({
            status: 'ended',
            endedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            showStatusMessage('Session ended successfully.', 'success');
        })
        .catch((error) => {
            console.error("Error ending session:", error);
            showStatusMessage('Error ending session: ' + error.message, 'error');
        });
    }
}

// Export session to PDF
function exportSessionToPdf() {
    showStatusMessage('PDF export functionality will be implemented in a future update.', 'info');
    // This would be implemented with a library like jsPDF
}

// Export session details to Excel
function exportSessionToExcel() {
    if (!currentSession || !currentSession.attendees || currentSession.attendees.length === 0) {
        showStatusMessage('No attendees to export.', 'error');
        return;
    }
    
    // Check if XLSX library is available
    if (typeof XLSX === 'undefined') {
        // Load SheetJS dynamically if not already available
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
        script.onload = function() {
            // Once loaded, proceed with export
            performExcelExport();
        };
        script.onerror = function() {
            showStatusMessage('Failed to load Excel export library. Please try CSV export instead.', 'error');
        };
        document.head.appendChild(script);
    } else {
        // Library already loaded, proceed with export
        performExcelExport();
    }
}

// Perform the actual Excel export
function performExcelExport() {
    try {
        // Use the available attendee data without querying users collection
        const validAttendees = currentSession.attendees.map(attendeeData => {
            // Format attendance time
            let attendanceTime = 'Unknown';
            if (attendeeData.timestamp && typeof attendeeData.timestamp.toDate === 'function') {
                attendanceTime = formatDate(attendeeData.timestamp.toDate());
            }
            
            return {
                'Name': attendeeData.name || 'Student ' + (attendeeData.userId || '').substring(0, 6),
                'Email': attendeeData.email || 'student-' + (attendeeData.userId || '').substring(0, 6),
                'Student ID': attendeeData.studentId || 'N/A',
                'Attendance Time': attendanceTime,
                'User ID': attendeeData.userId || 'Unknown'
            };
        });
        
        if (validAttendees.length === 0) {
            showStatusMessage('No valid attendees to export.', 'error');
            return;
        }
        
        // Add session details to the first sheet
        const sessionDetails = [
            { 'Session Information': 'Value' },
            { 'Session Information': 'Session Code', 'Value': currentSession.code || 'Unknown' },
            { 'Session Information': 'Status', 'Value': currentSession.status || 'Unknown' },
            { 'Session Information': 'Location', 'Value': currentSession.location || 'N/A' },
            { 'Session Information': 'Duration (seconds)', 'Value': currentSession.duration || 'N/A' },
            { 'Session Information': 'Created By', 'Value': document.getElementById('created-by').textContent },
            { 'Session Information': 'Created At', 'Value': document.getElementById('created-time').textContent },
            { 'Session Information': 'Ended At', 'Value': document.getElementById('ended-time').textContent },
            { 'Session Information': 'Total Attendees', 'Value': validAttendees.length }
        ];
        
        // Create workbook with two sheets
        const workbook = XLSX.utils.book_new();
        
        // Add session details sheet
        const detailsSheet = XLSX.utils.json_to_sheet(sessionDetails, { skipHeader: true });
        XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Session Details');
        
        // Add attendees sheet
        const attendeesSheet = XLSX.utils.json_to_sheet(validAttendees);
        XLSX.utils.book_append_sheet(workbook, attendeesSheet, 'Attendees');
        
        // Set column widths for better readability
        const detailsCols = [{ wch: 25 }, { wch: 50 }];
        const attendeesCols = [{ wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 20 }, { wch: 30 }];
        
        detailsSheet['!cols'] = detailsCols;
        attendeesSheet['!cols'] = attendeesCols;
        
        // Generate filename
        const fileName = `session_${currentSession.code || 'unknown'}_details.xlsx`;
        
        // Export file
        XLSX.writeFile(workbook, fileName);
        
        showStatusMessage('Session exported to Excel successfully.', 'success');
    } catch (error) {
        console.error('Error exporting to Excel:', error);
        showStatusMessage('Error exporting to Excel: ' + error.message, 'error');
    }
}

// Export attendees to CSV
function exportAttendeesToCsv() {
    if (!currentSession || !currentSession.attendees || currentSession.attendees.length === 0) {
        showStatusMessage('No attendees to export.', 'error');
        return;
    }
    
    // Use the available attendee data without querying users collection
    const validAttendees = currentSession.attendees.map(attendeeData => {
        // Format attendance time
        let attendanceTimeStr = 'Unknown';
        if (attendeeData.timestamp && typeof attendeeData.timestamp.toDate === 'function') {
            attendanceTimeStr = formatDate(attendeeData.timestamp.toDate());
        }
        
        return {
            name: attendeeData.name || 'Student ' + (attendeeData.userId || '').substring(0, 6),
            email: attendeeData.email || 'student-' + (attendeeData.userId || '').substring(0, 6),
            studentId: attendeeData.studentId || 'N/A',
            attendanceTime: attendanceTimeStr,
            userId: attendeeData.userId || 'Unknown'
        };
    });
    
    if (validAttendees.length === 0) {
        showStatusMessage('No valid attendees to export.', 'error');
        return;
    }
    
    // Create CSV content
    const headers = ['Name', 'Email', 'Student ID', 'Attendance Time', 'User ID'];
    let csvContent = headers.join(',') + '\n';
    
    validAttendees.forEach(attendee => {
        const row = [
            `"${(attendee.name || '').replace(/"/g, '""')}"`,
            `"${(attendee.email || '').replace(/"/g, '""')}"`,
            `"${(attendee.studentId || '').replace(/"/g, '""')}"`,
            `"${(attendee.attendanceTime || '').replace(/"/g, '""')}"`,
            `"${(attendee.userId || '').replace(/"/g, '""')}"`
        ];
        csvContent += row.join(',') + '\n';
    });
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.setAttribute('href', url);
    link.setAttribute('download', `session_${currentSession.code || 'unknown'}_attendees.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatusMessage('Attendees exported successfully.', 'success');
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

// Show status message
function showStatusMessage(message, type) {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;
    statusMessage.style.display = 'block';
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 5000);
    }
}

// Clean up listeners when page unloads
window.addEventListener('beforeunload', function() {
    if (sessionListener) sessionListener();
    if (attendeesListener) attendeesListener();
}); 
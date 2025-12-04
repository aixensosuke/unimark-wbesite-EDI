// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    console.log("Verify code page loaded");
    
    // Import the target location from the session-create.js file
    // This ensures consistency across the application
    
    // Check if location is verified
    if (localStorage.getItem('locationVerificationStatus') !== 'completed') {
        console.log("Location not verified, redirecting to attendance verify page");
        showStatus('Please verify your location first', 'error');
        
        // Redirect after a short delay to allow the message to be seen
        setTimeout(() => {
        window.location.href = 'attendance-verify.html';
        }, 2000);
        return;
    }
    
    initializeCodeInput();
    initializeVerifyButton();
});

// Target location configuration (ensure consistency with other files)
const TARGET_LOCATION = {
    lat: 18.457437154048705, // Updated coordinates
    lng: 73.85064332149199,
    radius: 50 // meters
};

// Initialize code input field
function initializeCodeInput() {
    const codeInput = document.getElementById('session-code');
    if (codeInput) {
        // Format as code is entered
        codeInput.addEventListener('input', function() {
            // Convert to uppercase for alphanumeric codes
            this.value = this.value.toUpperCase();
            
            // Limit to 6 characters
            if (this.value.length > 6) {
                this.value = this.value.slice(0, 6);
            }
            
            // Enable/disable verify button based on code length
            const verifyButton = document.getElementById('verify-code');
            if (verifyButton) {
                verifyButton.disabled = this.value.length !== 6;
            }
        });
    }
}

// Initialize verify button
function initializeVerifyButton() {
    const verifyButton = document.getElementById('verify-code');
    if (verifyButton) {
        verifyButton.addEventListener('click', () => {
            console.log("Verify code button clicked");
            const codeInput = document.getElementById('session-code');
            
            if (!codeInput || codeInput.value.length !== 6) {
                showStatus('Please enter a valid 6-character code', 'error');
                return;
            }
            
            // Show loading animation
            verifyButton.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                Verifying...
            `;
            verifyButton.disabled = true;
            
            // Get the entered code
            const code = codeInput.value;
            
            // Verify code against Firebase
            verifySessionCode(code);
        });
    }
}

// Verify session code against Firebase
async function verifySessionCode(code) {
    try {
        // Get user
        const user = firebase.auth().currentUser;
        if (!user) {
            showStatus('You need to be logged in to verify attendance', 'error');
            resetVerifyButton();
            return;
        }
        
        // Get location information
        const locationData = {
            latitude: parseFloat(localStorage.getItem('userLatitude')),
            longitude: parseFloat(localStorage.getItem('userLongitude'))
        };
        
        if (isNaN(locationData.latitude) || isNaN(locationData.longitude)) {
            showStatus('Location data is missing. Please verify your location again.', 'error');
            resetVerifyButton();
            return;
        }
        
        try {
            // Check if session code exists and is active - read only
            const sessionRef = firebase.firestore().collection('sessions').doc(code);
            const doc = await sessionRef.get();
            
            if (!doc.exists) {
                showStatus('Invalid session code. Please check and try again.', 'error');
                resetVerifyButton();
                return;
            }
            
            const sessionData = doc.data();
            
            // Check if session is active
            if (sessionData.status !== 'active') {
                showStatus('This session has ended or expired.', 'error');
                resetVerifyButton();
                return;
            }
            
            // Check if session is within time limit
            const now = new Date();
            const endTime = new Date(sessionData.endTime);
            
            if (now > endTime) {
                showStatus('This session has expired.', 'error');
                resetVerifyButton();
                return;
            }
            
            // Check location if session has location restrictions
            if (sessionData.location) {
                // Use session's location data instead of hardcoded values
                const distance = calculateDistance(
                    locationData.latitude, 
                    locationData.longitude,
                    sessionData.location.lat,
                    sessionData.location.lng
                );
                
                if (distance > sessionData.location.radius) {
                    showStatus(`You are ${Math.round(distance)}m away from the session location. Maximum allowed distance is ${sessionData.location.radius}m.`, 'error');
                    resetVerifyButton();
                    return;
                }
            }
            
            // Get user information
            const userName = user.displayName || 'Anonymous User';
            const userEmail = user.email || 'No Email';
            
            // Check if the user has already marked attendance
            let alreadyMarkedAttendance = false;
            if (sessionData.attendees && Array.isArray(sessionData.attendees)) {
                alreadyMarkedAttendance = sessionData.attendees.some(a => a.userId === user.uid);
                
                if (alreadyMarkedAttendance) {
                    showStatus('You have already marked your attendance for this session.', 'info');
                    
                    // Still mark as completed locally since they've already done it
                    localStorage.setItem('codeVerificationStatus', 'completed');
                    localStorage.setItem('codeTimestamp', new Date().toISOString());
                    localStorage.setItem('sessionCode', code);
                    
                    // Success animation
                    const verifyButton = document.getElementById('verify-code');
                    if (verifyButton) {
                        verifyButton.innerHTML = `
                            <i class="fas fa-check"></i>
                            Already Verified!
                        `;
                    }
                    
                    // Redirect back after a delay
            setTimeout(() => {
                        window.location.href = "attendance-verify.html?from=verify-code&status=success";
                    }, 2000);
                    
                    return;
                }
            }
            
            // Prepare attendee data
            const attendeeData = {
                userId: user.uid,
                name: userName,
                email: userEmail,
                // Use a JavaScript Date object instead of serverTimestamp since serverTimestamp 
                // cannot be used inside arrayUnion operations
                timestamp: new Date(),
                location: {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude
                }
            };
            
            // Add student ID if available
            const studentId = localStorage.getItem('studentId');
            if (studentId) {
                attendeeData.studentId = studentId;
            }
            
            // Update the session document with the new attendee
            await sessionRef.update({
                attendees: firebase.firestore.FieldValue.arrayUnion(attendeeData),
                // Also update the attendee count
                attendeesCount: firebase.firestore.FieldValue.increment(1)
            });
            
            // Store verification details locally
            localStorage.setItem('codeVerificationStatus', 'completed');
            localStorage.setItem('codeTimestamp', new Date().toISOString());
            localStorage.setItem('sessionCode', code);
            
                // Success animation
            const verifyButton = document.getElementById('verify-code');
            if (verifyButton) {
                verifyButton.innerHTML = `
                    <i class="fas fa-check"></i>
                    Verified!
                `;
            }
                
                // Show success message
            showStatus('Attendance marked successfully!', 'success');
                
                // Redirect back to attendance verification page after animation
                setTimeout(() => {
                    window.location.href = "attendance-verify.html?from=verify-code&status=success";
                }, 2000);
            
        } catch (error) {
            console.error('Error accessing session data:', error);
            showStatus('Error verifying session code. Please try again later.', 'error');
            resetVerifyButton();
        }
        
    } catch (error) {
        console.error('Error verifying session code:', error);
        showStatus('Error verifying code: ' + (error.message || 'Unknown error'), 'error');
        resetVerifyButton();
    }
}

// Reset verify button to original state
function resetVerifyButton() {
    const verifyButton = document.getElementById('verify-code');
    if (verifyButton) {
        verifyButton.innerHTML = `
            <i class="fas fa-check"></i>
            Verify Code
        `;
        verifyButton.disabled = false;
    }
}

// Calculate distance between two points in meters using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Use the Haversine formula to calculate the distance between two points on Earth
    const R = 6371000; // Radius of the Earth in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

// Function to show status messages
function showStatus(message, type) {
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        statusElement.style.display = 'block';
        
        // Hide after 5 seconds for error messages
        if (type === 'error') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
        }
    } else {
        console.warn('Status message element not found');
    }
} 
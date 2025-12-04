// Utility function to show status messages
function showStatus(message, type) {
    const statusDiv = document.getElementById('statusMessage');
    if (!statusDiv) {
        console.warn('Status message element not found');
        return;
    }
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// Load verification status from localStorage
function loadVerificationStatus() {
    const statusList = document.querySelector('.status-list');
    if (!statusList) return;

    const status = {
        location: localStorage.getItem('locationVerificationStatus') || 'pending',
        code: localStorage.getItem('codeVerificationStatus') || 'pending'
    };

    // Update status indicators
    updateStatusIndicator('Location', status.location);
    updateStatusIndicator('Session Code', status.code);
}

// Update status indicator
function updateStatusIndicator(label, status) {
    const statusItem = Array.from(document.querySelectorAll('.status-item'))
        .find(item => item.querySelector('.status-label').textContent === label);
    
    if (statusItem) {
        const statusValue = statusItem.querySelector('.status-value');
        statusValue.className = `status-value ${status}`;
        statusValue.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    }
}

// Listen for status updates from other pages
window.addEventListener('storage', (e) => {
    if (e.key && e.key.endsWith('VerificationStatus')) {
        const type = e.key.replace('VerificationStatus', '');
        updateStatusIndicator(type.charAt(0).toUpperCase() + type.slice(1), e.newValue);
    }
});

// Initialize the page
async function initializePage() {
    console.log('Attendance verify page loaded');
    try {
        // Load components
        const headerContainer = document.getElementById('header-container');
        const sidebarContainer = document.getElementById('sidebar-container');
        const footerContainer = document.getElementById('footer-container');

        // Check if containers exist before proceeding
        if (!headerContainer || !sidebarContainer || !footerContainer) {
            console.warn('One or more container elements not found:', {
                headerExists: !!headerContainer,
                sidebarExists: !!sidebarContainer,
                footerExists: !!footerContainer
            });
            
            // Handle missing containers more gracefully
            if (headerContainer) {
                const headerResponse = await fetch('at-header.html');
                const headerHtml = await headerResponse.text();
                headerContainer.innerHTML = headerHtml;
            }
            
            if (sidebarContainer) {
                const sidebarResponse = await fetch('at-sidebar.html');
                const sidebarHtml = await sidebarResponse.text();
                sidebarContainer.innerHTML = sidebarHtml;
            }
            
            if (footerContainer) {
                const footerResponse = await fetch('../../components/footer.html');
                const footerHtml = await footerResponse.text();
                footerContainer.innerHTML = footerHtml;
            }
        } else {
            // Load all components if all containers exist
            const [headerResponse, sidebarResponse, footerResponse] = await Promise.all([
                fetch('at-header.html'),
                fetch('at-sidebar.html'),
                fetch('../../components/footer.html')
            ]);

            const [headerHtml, sidebarHtml, footerHtml] = await Promise.all([
                headerResponse.text(),
                sidebarResponse.text(),
                footerResponse.text()
            ]);

            headerContainer.innerHTML = headerHtml;
            sidebarContainer.innerHTML = sidebarHtml;
            footerContainer.innerHTML = footerHtml;
        }

        // Initialize header functionality if it exists
        if (typeof initializeHeader === 'function') {
            initializeHeader();
        }
        
        // Set up event listeners for verification buttons
        setupVerificationButtons();

        // Load verification status
        loadVerificationStatus();

        // Check session limits
        checkSessionLimits();

    } catch (error) {
        console.error('Error initializing page:', error);
        showStatus('Error initializing page. Please refresh and try again.', 'error');
    }
}

function setupVerificationButtons() {
    // Event listeners for location verification button
    const verifyLocationBtn = document.getElementById('verifyLocationBtn');
    if (verifyLocationBtn) {
        verifyLocationBtn.addEventListener('click', (e) => {
            // Store in localStorage to persist across page navigations
            localStorage.setItem('locationVerificationStatus', 'pending');
        });
    }

    // Event listeners for code verification button
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', (e) => {
            // Check if location is verified before allowing code verification
            const locationStatus = localStorage.getItem('locationVerificationStatus');
            if (locationStatus !== 'completed') {
                e.preventDefault();
                showStatus('Please verify your location first', 'error');
            } else {
                // Set pending status for code verification
                localStorage.setItem('codeVerificationStatus', 'pending');
            }
        });
    }

    // Event listeners for mark attendance button
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    if (markAttendanceBtn) {
        markAttendanceBtn.addEventListener('click', () => {
            // Record the attendance in the system
            recordAttendance();
        });
    }
}

// Function to record attendance and redirect to success page
async function recordAttendance() {
    try {
        // Show marking status
        showStatus('Marking your attendance...', 'info');
        
        // Get verified location and session data
        const locationTimestamp = localStorage.getItem('locationTimestamp');
        const codeTimestamp = localStorage.getItem('codeTimestamp');
        
        // Here you would typically make an API call to record the attendance
        // For demonstration, we're simulating a successful API call
        try {
            // Simulate actual API call (in production, uncomment this code)
            /*
            const response = await fetch('/api/attendance/mark', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    locationTimestamp,
                    codeTimestamp,
                    attendanceTime: new Date().toISOString()
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to mark attendance');
            }
            */
            
            // Simulate API call with a short delay
            setTimeout(() => {
                // Store attendance record timestamp
                localStorage.setItem('lastAttendanceMarked', new Date().toISOString());
                
                // Clear verification status from localStorage
                clearVerificationStatus();
                
                // Redirect to the success page
                window.location.href = 'attendance-success.html';
            }, 1000);
        } catch (apiError) {
            console.error('API Error:', apiError);
            throw new Error('Failed to communicate with the attendance server');
        }
        
    } catch (error) {
        console.error('Error marking attendance:', error);
        showStatus('Failed to mark attendance. Please try again.', 'error');
    }
}

// Modify the document visibility handler to be less aggressive
function handleVisibilityChange() {
    if (document.hidden) {
        // Only log this event, don't clear session automatically
        console.log("Page hidden");
    } else {
        console.log("Page visible again");
    }
}

// Start initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (window.videoStream) {
        window.videoStream.getTracks().forEach(track => track.stop());
    }
    // Unload face-api models
    if (faceApiModels) {
        faceApiModels.forEach(model => model.dispose());
    }
});

// Attendance verification state management
const verificationState = {
    location: false,
    sessionCode: false
};

// Check verification status on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log("Attendance verify page loaded");
    
    // Check if we're returning from a verification page
    const urlParams = new URLSearchParams(window.location.search);
    const fromPage = urlParams.get('from');
    const status = urlParams.get('status');
    
    // Use the updated visibility change handler
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    if (fromPage === 'geotag' && status === 'success') {
        console.log("Setting location verification to true");
        // Set location verification status
        localStorage.setItem('locationVerificationStatus', 'completed');
        localStorage.setItem('locationTimestamp', Date.now().toString());
    }
    
    if (fromPage === 'verify-code' && status === 'success') {
        console.log("Setting code verification to true");
        // Set code verification status
        localStorage.setItem('codeVerificationStatus', 'completed');
        localStorage.setItem('codeTimestamp', Date.now().toString());
    }
    
    // Check session limits
    checkSessionLimits();

    // Update UI based on current state
    updateVerificationUI();
});

function checkSessionLimits() {
    console.log('Checking session limits');
    
    // Get timestamps from localStorage
    const locationTimestamp = localStorage.getItem('locationTimestamp');
    const codeTimestamp = localStorage.getItem('codeTimestamp');
    
    console.log('Location timestamp:', locationTimestamp);
    console.log('Code timestamp:', codeTimestamp);
    
    // If no timestamps, nothing to check
    if (!locationTimestamp && !codeTimestamp) {
        return;
    }
    
    const SESSION_LIMIT = 10 * 60 * 1000; // 10 minutes in milliseconds
    const now = new Date().getTime();
    
    let shouldReset = false;
    
    // Check if location verification has expired
    if (locationTimestamp) {
        const locationTime = new Date(locationTimestamp).getTime();
        if ((now - locationTime) > SESSION_LIMIT) {
            console.log('Location verification has expired');
            shouldReset = true;
        }
    }
    
    // Check if code verification has expired
    if (codeTimestamp) {
        const codeTime = new Date(codeTimestamp).getTime();
        if ((now - codeTime) > SESSION_LIMIT) {
            console.log('Code verification has expired');
            shouldReset = true;
        }
    }
    
    // Clear all verification status if any has expired
    if (shouldReset) {
        console.log('Clearing all verification status');
        // Use separate flag to prevent infinite loops
        const isResetting = localStorage.getItem('isResetting');
        if (!isResetting) {
            localStorage.setItem('isResetting', 'true');
            clearVerificationStatus();
            localStorage.removeItem('isResetting');
        }
    }
}

function clearVerificationStatus() {
    localStorage.removeItem('locationVerificationStatus');
    localStorage.removeItem('locationTimestamp');
    localStorage.removeItem('codeVerificationStatus');
    localStorage.removeItem('codeTimestamp');
    
    // Update UI to reflect changes
    updateVerificationUI();
}

function updateVerificationUI() {
    // Update status indicators based on localStorage values
    const locationStatus = document.getElementById('locationStatus');
    const codeStatus = document.getElementById('codeStatus');
    const markAttendanceBtn = document.getElementById('markAttendanceBtn');
    
    if (locationStatus) {
        const status = localStorage.getItem('locationVerificationStatus');
        if (status === 'completed') {
            locationStatus.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
            locationStatus.className = 'status-value completed';
        } else {
            locationStatus.innerHTML = '<i class="fas fa-clock"></i> Pending';
            locationStatus.className = 'status-value pending';
        }
    }
    
    if (codeStatus) {
        const status = localStorage.getItem('codeVerificationStatus');
        if (status === 'completed') {
            codeStatus.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
            codeStatus.className = 'status-value completed';
        } else {
            codeStatus.innerHTML = '<i class="fas fa-clock"></i> Pending';
            codeStatus.className = 'status-value pending';
        }
    }
    
    // Show mark attendance button if both verifications are complete
    if (markAttendanceBtn) {
        const locationVerified = localStorage.getItem('locationVerificationStatus') === 'completed';
        const codeVerified = localStorage.getItem('codeVerificationStatus') === 'completed';
        
        if (locationVerified && codeVerified) {
            markAttendanceBtn.style.display = 'block';
        } else {
            markAttendanceBtn.style.display = 'none';
        }
    }
} 
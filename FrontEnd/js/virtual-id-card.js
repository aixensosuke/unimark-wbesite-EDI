// Virtual ID Card JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize UI elements
    const idCard = document.getElementById('idCard');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const retryButton = document.getElementById('retryButton');
    const downloadPdfButton = document.getElementById('downloadPdf');
    const printCardButton = document.getElementById('printCard');
    
    // Student data elements
    const collegeName = document.getElementById('collegeName');
    const studentName = document.getElementById('studentName');
    const studentBranch = document.getElementById('studentBranch');
    const studentId = document.getElementById('studentId');
    const validityPeriod = document.getElementById('validityPeriod');
    const studentPhoto = document.getElementById('studentPhoto');
    const watermarkText = document.getElementById('watermarkText');
    
    // Firebase configuration
    const firebaseConfig = {
        apiKey: "AIzaSyBlDVySUopFPBIot8dMovVxin8de43zXmI",
        authDomain: "unimark-ummaa.firebaseapp.com",
        projectId: "unimark-ummaa",
        storageBucket: "unimark-ummaa.firebasestorage.app",
        messagingSenderId: "710977794450",
        appId: "1:710977794450:web:46c51e7be2b5c36892d14b",
        measurementId: "G-MQQKNHDP1T"
    };

    // Initialize Firebase
    try {
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log('Firebase initialized in virtual-id-card.js');
        }
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }

    let currentUser = null;
    let studentData = null;
    let dataLoaded = false;
    
    // Cache management
    const CACHE_KEY = 'unimark_id_card_data';
    const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    // Check if we have cached data
    function checkCachedData() {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
            try {
                const { data, timestamp } = JSON.parse(cachedData);
                const now = new Date().getTime();
                
                // Check if cache is still valid
                if (now - timestamp < CACHE_EXPIRY) {
                    return data;
                }
            } catch (error) {
                console.error('Error parsing cached data:', error);
            }
        }
        return null;
    }
    
    // Save data to cache
    function cacheData(data) {
        const cacheObject = {
            data: data,
            timestamp: new Date().getTime()
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    }
    
    // Initialize the ID card
    function initializeIdCard() {
        // First check if we have a cached version
        const cachedData = checkCachedData();
        
        if (cachedData) {
            console.log('Using cached student data');
            studentData = cachedData;
            renderIdCard(cachedData);
            dataLoaded = true;
            return;
        }
        
        // If no cache, fetch from Firebase
        firebase.auth().onAuthStateChanged(function(user) {
            if (user) {
                currentUser = user;
                fetchStudentData(user.uid);
            } else {
                // User is not logged in, redirect to login page
                window.location.href = '../../index.html';
            }
        });
    }
    
    // Fetch student data from Firestore
    function fetchStudentData(userId) {
        showLoading();
        
        // Get the user document directly using the user ID
        firebase.firestore().collection('attendees').doc(userId).get()
            .then((docSnapshot) => {
                if (docSnapshot && docSnapshot.exists) {
                    // Get the student data from the document
                    studentData = docSnapshot.data();
                    console.log('Retrieved student data:', studentData);
                    
                    // Cache the data for future use
                    cacheData(studentData);
                    
                    // Render the ID card with the fetched data
                    renderIdCard(studentData);
                    dataLoaded = true;
                } else {
                    // If document doesn't exist, try querying by uid field
                    return firebase.firestore().collection('attendees')
                        .where('uid', '==', userId)
                        .limit(1)
                        .get();
                }
            })
            .then((querySnapshot) => {
                if (querySnapshot && !querySnapshot.empty) {
                    studentData = querySnapshot.docs[0].data();
                    console.log('Retrieved student data via query:', studentData);
                    
                    // Cache the data for future use
                    cacheData(studentData);
                    
                    // Render the ID card with the fetched data
                    renderIdCard(studentData);
                    dataLoaded = true;
                } else if (!dataLoaded) {
                    // If we still don't have data, show an error
                    showError('No student data found. Please contact your administrator.');
                }
            })
            .catch((error) => {
                console.error('Error fetching student data:', error);
                showError('Failed to load student data: ' + error.message);
            });
    }
    
    // Helper function to get current academic year
    function getCurrentAcademicYear() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
        
        // If we're in the latter half of the year (after July), use current year
        // Otherwise use previous year as the start of the academic year
        if (currentMonth > 7) {
            return `${currentYear}-${currentYear + 1}`;
        } else {
            return `${currentYear - 1}-${currentYear}`;
        }
    }
    
    // Render the ID card with student data
    function renderIdCard(data) {
        // Set college name
        collegeName.textContent = data.collegeName || 'UniMark';
        
        // Set student information
        studentName.textContent = data.fullName || 'Student Name';
        studentBranch.textContent = data.branch || data.department || 'Department';
        studentId.textContent = data.prn || data.studentId || data.attendeeId || 'ID Not Available';
        
        // Set validity period - use data or calculate current academic year
        const validityYears = data.validityPeriod || getCurrentAcademicYear();
        validityPeriod.textContent = validityYears;
        
        // Set student photo if available
        if (data.photoURL) {
            studentPhoto.src = data.photoURL;
        }
        
        // Check if ID is expired and add watermark if needed
        const endYear = parseInt(validityYears.split('-')[1]);
        const currentYearNum = new Date().getFullYear();
        
        if (endYear < currentYearNum) {
            watermarkText.textContent = 'EXPIRED';
            idCard.classList.add('expired');
        } else {
            watermarkText.textContent = '';
        }
        
        // Generate barcode with student PRN/ID
        JsBarcode("#barcode", data.prn || '12345678', {
            format: "CODE128",
            lineColor: "#000",
            width: 2,
            height: 50,
            displayValue: true,
            fontSize: 12,
            margin: 0
        });
        
        // Hide loading state and show ID card
        hideLoading();
        idCard.style.display = 'flex';
    }
    
    // Show loading state
    function showLoading() {
        loadingState.style.display = 'flex';
        idCard.style.display = 'none';
        errorState.style.display = 'none';
    }
    
    // Hide loading state
    function hideLoading() {
        loadingState.style.display = 'none';
    }
    
    // Show error state
    function showError(message) {
        errorMessage.textContent = message || 'An error occurred. Please try again.';
        errorState.style.display = 'block';
        loadingState.style.display = 'none';
        idCard.style.display = 'none';
    }
    
    // Download ID card as PDF
    function downloadAsPDF() {
        if (!dataLoaded) {
            showError('Please wait for the ID card to load completely.');
            return;
        }
        
        // Show loading while generating PDF
        showLoading();
        
        const { jsPDF } = window.jspdf;
        
        // Create a clone of the ID card to avoid modifying the displayed one
        const idCardClone = idCard.cloneNode(true);
        idCardClone.style.display = 'flex';
        idCardClone.style.position = 'absolute';
        idCardClone.style.left = '-9999px';
        document.body.appendChild(idCardClone);
        
        // Use html2canvas to capture the ID card as an image
        html2canvas(idCardClone, {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
        }).then(canvas => {
            // Remove the clone after capturing
            document.body.removeChild(idCardClone);
            
            // Create PDF with proper dimensions
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [100, 160] // ID card dimensions in mm
            });
            
            // Calculate dimensions to maintain aspect ratio
            const imgWidth = 90; // mm
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            // Add the image to the PDF
            pdf.addImage(imgData, 'PNG', 5, 5, imgWidth, imgHeight);
            
            // Generate filename with student name and ID
            const fileName = `${studentData.fullName.replace(/\s+/g, '_')}_ID_Card.pdf`;
            
            // Save the PDF
            pdf.save(fileName);
            
            // Hide loading
            hideLoading();
            idCard.style.display = 'flex';
        }).catch(error => {
            console.error('Error generating PDF:', error);
            showError('Failed to generate PDF. Please try again.');
        });
    }
    
    // Print ID card
    function printIdCard() {
        if (!dataLoaded) {
            showError('Please wait for the ID card to load completely.');
            return;
        }
        
        window.print();
    }
    
    // Event listeners
    retryButton.addEventListener('click', function() {
        if (currentUser) {
            fetchStudentData(currentUser.uid);
        } else {
            initializeIdCard();
        }
    });
    
    downloadPdfButton.addEventListener('click', downloadAsPDF);
    printCardButton.addEventListener('click', printIdCard);
    
    // Initialize the ID card when the page loads
    initializeIdCard();
    
    // Load components
    document.querySelector('#header').innerHTML = '<object type="text/html" data="at-header.html"></object>';
    document.querySelector('#slider').innerHTML = '<object type="text/html" data="at-sidebar.html"></object>';
    document.querySelector('#footer').innerHTML = '<object type="text/html" data="../../components/footer.html"></object>';
});

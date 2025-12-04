// Profile Setup Functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing profile setup page');
    
    // Initialize Firebase if not already initialized
    if (!firebase.apps.length) {
        const firebaseConfig = {
            apiKey: "AIzaSyBiQr7aHxdYxk8sCkHxMebkVyBEgXCnknU",
            authDomain: "unimark-b93b7.firebaseapp.com",
            projectId: "unimark-b93b7",
            storageBucket: "unimark-b93b7.appspot.com",
            messagingSenderId: "107180777427",
            appId: "1:107180777427:web:2c5d8e8c4207f26e7ffd27"
        };
        firebase.initializeApp(firebaseConfig);
    }
    
    // Check if user is logged in
    firebase.auth().onAuthStateChanged(function(user) {
        if (!user) {
            // Redirect to login if not logged in
            console.log('User not logged in, redirecting to login');
            window.location.href = '../../components/login.html';
            return;
        }
        
        console.log('User logged in:', user.uid);
        loadUserData(user.uid);
    });
    
    // Form elements
    const profileSetupForm = document.getElementById('profileSetupForm');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const toStep2Button = document.getElementById('toStep2');
    const toStep3Button = document.getElementById('toStep3');
    const backToStep1Button = document.getElementById('backToStep1');
    const backToStep2Button = document.getElementById('backToStep2');
    const skipPhotoButton = document.getElementById('skipPhoto');
    const progressBar = document.getElementById('setupProgress');
    const steps = document.querySelectorAll('.step');
    
    // Profile photo elements
    const profilePhotoInput = document.getElementById('profilePhotoInput');
    const profilePhotoPreview = document.getElementById('profilePhotoPreview');
    const selectedFileName = document.getElementById('selectedFileName');
    const photoError = document.getElementById('photoError');
    
    // Cropper modal elements
    const cropperModal = document.getElementById('cropperModal');
    const cropperImage = document.getElementById('cropperImage');
    const closeCropperModal = document.getElementById('closeCropperModal');
    const cancelCrop = document.getElementById('cancelCrop');
    const cropImageBtn = document.getElementById('cropImage');
    
    // Error and success messages
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Form field elements for step 2
    const phoneNumber = document.getElementById('phoneNumber');
    const alternateEmail = document.getElementById('alternateEmail');
    const address = document.getElementById('address');
    const city = document.getElementById('city');
    const state = document.getElementById('state');
    const zipCode = document.getElementById('zipCode');
    const country = document.getElementById('country');
    const emergencyContact = document.getElementById('emergencyContact');
    const emergencyPhone = document.getElementById('emergencyPhone');
    
    // Form field elements for step 3
    const emailNotifications = document.getElementById('emailNotifications');
    const smsNotifications = document.getElementById('smsNotifications');
    const pushNotifications = document.getElementById('pushNotifications');
    const attendanceReminders = document.getElementById('attendanceReminders');
    const eventUpdates = document.getElementById('eventUpdates');
    const systemAnnouncements = document.getElementById('systemAnnouncements');
    const marketingUpdates = document.getElementById('marketingUpdates');
    const language = document.getElementById('language');
    const theme = document.getElementById('theme');
    const highContrast = document.getElementById('highContrast');
    const largeText = document.getElementById('largeText');
    const reduceMotion = document.getElementById('reduceMotion');
    
    // Field error elements
    const phoneNumberError = document.getElementById('phoneNumberError');
    const alternateEmailError = document.getElementById('alternateEmailError');
    
    // Variables for storing data
    let userData = null;
    let profilePhotoFile = null;
    let croppedPhotoBlob = null;
    let cropper = null;
    
    // Populate country dropdown
    populateCountries();
    
    // Add event listeners for form navigation
    toStep2Button.addEventListener('click', () => {
        if (validateStep1()) {
            step1.style.display = 'none';
            step2.style.display = 'block';
            progressBar.style.width = '66.66%';
            updateStepStatus(2);
        }
    });
    
    skipPhotoButton.addEventListener('click', () => {
        step1.style.display = 'none';
        step2.style.display = 'block';
        progressBar.style.width = '66.66%';
        updateStepStatus(2);
    });
    
    toStep3Button.addEventListener('click', () => {
        if (validateStep2()) {
            step2.style.display = 'none';
            step3.style.display = 'block';
            progressBar.style.width = '100%';
            updateStepStatus(3);
        }
    });
    
    backToStep1Button.addEventListener('click', () => {
        step2.style.display = 'none';
        step1.style.display = 'block';
        progressBar.style.width = '33.33%';
        updateStepStatus(1);
    });
    
    backToStep2Button.addEventListener('click', () => {
        step3.style.display = 'none';
        step2.style.display = 'block';
        progressBar.style.width = '66.66%';
        updateStepStatus(2);
    });
    
    // Profile photo upload
    profilePhotoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        // Reset error
        photoError.textContent = '';
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            photoError.textContent = 'Please select a valid image file (JPG or PNG)';
            return;
        }
        
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            photoError.textContent = 'Image size should be less than 5MB';
            return;
        }
        
        // Update selected file name
        selectedFileName.textContent = file.name;
        
        // Store the file for later use
        profilePhotoFile = file;
        
        // Show the cropper modal
        showCropperModal(file);
    });
    
    // Cropper modal events
    closeCropperModal.addEventListener('click', closeCropModal);
    cancelCrop.addEventListener('click', closeCropModal);
    
    cropImageBtn.addEventListener('click', function() {
        if (cropper) {
            // Get the cropped canvas
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            // Convert canvas to blob
            canvas.toBlob(function(blob) {
                // Store the cropped blob
                croppedPhotoBlob = blob;
                
                // Update the preview
                const imageUrl = URL.createObjectURL(blob);
                updateProfilePhotoPreview(imageUrl);
                
                // Close the modal
                closeCropModal();
            }, 'image/jpeg', 0.9);
        }
    });
    
    // Form submission
    profileSetupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate step 3 before submission
        if (!validateStep3()) {
            return;
        }
        
        // Reset messages
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        
        // Disable submit button
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Saving...';
        
        try {
            // Get current user
            const user = firebase.auth().currentUser;
            if (!user) {
                throw new Error('User not logged in');
            }
            
            // Prepare profile data
            const profileData = {
                contactInfo: {
                    phoneNumber: phoneNumber.value.trim(),
                    alternateEmail: alternateEmail.value.trim(),
                    address: address.value.trim(),
                    city: city.value.trim(),
                    state: state.value.trim(),
                    zipCode: zipCode.value.trim(),
                    country: country.value,
                    emergencyContact: {
                        name: emergencyContact.value.trim(),
                        phone: emergencyPhone.value.trim()
                    }
                },
                preferences: {
                    notifications: {
                        email: emailNotifications.checked,
                        sms: smsNotifications.checked,
                        push: pushNotifications.checked,
                        types: {
                            attendanceReminders: attendanceReminders.checked,
                            eventUpdates: eventUpdates.checked,
                            systemAnnouncements: systemAnnouncements.checked,
                            marketingUpdates: marketingUpdates.checked
                        }
                    },
                    language: language.value,
                    theme: theme.value,
                    accessibility: {
                        highContrast: highContrast.checked,
                        largeText: largeText.checked,
                        reduceMotion: reduceMotion.checked
                    }
                },
                profileComplete: true,
                lastUpdated: new Date().toISOString()
            };
            
            // Upload profile photo if available
            let photoURL = null;
            if (croppedPhotoBlob) {
                // Create a storage reference
                const storageRef = firebase.storage().ref();
                const photoRef = storageRef.child(`profile_photos/${user.uid}_${Date.now()}.jpg`);
                
                // Upload the file
                const uploadTask = await photoRef.put(croppedPhotoBlob);
                
                // Get the download URL
                photoURL = await uploadTask.ref.getDownloadURL();
                
                // Add photo URL to profile data
                profileData.photoURL = photoURL;
            }
            
            // Update user profile in Firebase Auth
            if (photoURL) {
                await user.updateProfile({
                    photoURL: photoURL
                });
            }
            
            // Update user data in Firestore
            await firebase.firestore().collection('attendees').doc(user.uid).update(profileData);
            
            // Update session storage data
            const sessionData = JSON.parse(sessionStorage.getItem('userData') || '{}');
            sessionData.profileComplete = true;
            if (photoURL) {
                sessionData.photoURL = photoURL;
            }
            sessionStorage.setItem('userData', JSON.stringify(sessionData));
            
            // Show success message
            successMessage.textContent = 'Profile setup completed successfully! Redirecting to dashboard...';
            successMessage.style.display = 'block';
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'at-dashboard.html';
            }, 2000);
            
        } catch (error) {
            console.error('Error saving profile:', error);
            errorMessage.textContent = error.message || 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Complete Setup';
        }
    });
    
    // Helper Functions
    
    // Load user data from Firestore
    async function loadUserData(userId) {
        try {
            const doc = await firebase.firestore().collection('attendees').doc(userId).get();
            
            if (doc.exists) {
                userData = doc.data();
                console.log('User data loaded:', userData);
                
                // Pre-fill form fields if data exists
                prefillFormFields(userData);
            } else {
                console.log('No user data found');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    // Pre-fill form fields with existing user data
    function prefillFormFields(data) {
        if (!data) return;
        
        // Check if user already has a profile photo
        if (data.photoURL) {
            updateProfilePhotoPreview(data.photoURL);
        }
        
        // Pre-fill contact info
        if (data.contactInfo) {
            const contactInfo = data.contactInfo;
            if (contactInfo.phoneNumber) phoneNumber.value = contactInfo.phoneNumber;
            if (contactInfo.alternateEmail) alternateEmail.value = contactInfo.alternateEmail;
            if (contactInfo.address) address.value = contactInfo.address;
            if (contactInfo.city) city.value = contactInfo.city;
            if (contactInfo.state) state.value = contactInfo.state;
            if (contactInfo.zipCode) zipCode.value = contactInfo.zipCode;
            if (contactInfo.country) country.value = contactInfo.country;
            
            if (contactInfo.emergencyContact) {
                if (contactInfo.emergencyContact.name) emergencyContact.value = contactInfo.emergencyContact.name;
                if (contactInfo.emergencyContact.phone) emergencyPhone.value = contactInfo.emergencyContact.phone;
            }
        }
        
        // Pre-fill preferences
        if (data.preferences) {
            const prefs = data.preferences;
            
            if (prefs.notifications) {
                if (prefs.notifications.email !== undefined) emailNotifications.checked = prefs.notifications.email;
                if (prefs.notifications.sms !== undefined) smsNotifications.checked = prefs.notifications.sms;
                if (prefs.notifications.push !== undefined) pushNotifications.checked = prefs.notifications.push;
                
                if (prefs.notifications.types) {
                    const types = prefs.notifications.types;
                    if (types.attendanceReminders !== undefined) attendanceReminders.checked = types.attendanceReminders;
                    if (types.eventUpdates !== undefined) eventUpdates.checked = types.eventUpdates;
                    if (types.systemAnnouncements !== undefined) systemAnnouncements.checked = types.systemAnnouncements;
                    if (types.marketingUpdates !== undefined) marketingUpdates.checked = types.marketingUpdates;
                }
            }
            
            if (prefs.language) language.value = prefs.language;
            if (prefs.theme) theme.value = prefs.theme;
            
            if (prefs.accessibility) {
                if (prefs.accessibility.highContrast !== undefined) highContrast.checked = prefs.accessibility.highContrast;
                if (prefs.accessibility.largeText !== undefined) largeText.checked = prefs.accessibility.largeText;
                if (prefs.accessibility.reduceMotion !== undefined) reduceMotion.checked = prefs.accessibility.reduceMotion;
            }
        }
    }
    
    // Update the active step in the progress indicator
    function updateStepStatus(activeStep) {
        steps.forEach(step => {
            const stepNumber = parseInt(step.getAttribute('data-step'));
            step.classList.remove('active', 'completed');
            
            if (stepNumber === activeStep) {
                step.classList.add('active');
            } else if (stepNumber < activeStep) {
                step.classList.add('completed');
            }
        });
    }
    
    // Show cropper modal
    function showCropperModal(file) {
        // Create a URL for the image
        const imageUrl = URL.createObjectURL(file);
        
        // Set the image source
        cropperImage.src = imageUrl;
        
        // Show the modal
        cropperModal.style.display = 'flex';
        
        // Initialize cropper after the image is loaded
        cropperImage.onload = function() {
            if (cropper) {
                cropper.destroy();
            }
            
            cropper = new Cropper(cropperImage, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false
            });
        };
    }
    
    // Close cropper modal
    function closeCropModal() {
        cropperModal.style.display = 'none';
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
    }
    
    // Update profile photo preview
    function updateProfilePhotoPreview(imageUrl) {
        // Clear existing content
        profilePhotoPreview.innerHTML = '';
        
        // Create and add image element
        const img = document.createElement('img');
        img.src = imageUrl;
        img.alt = 'Profile Photo';
        profilePhotoPreview.appendChild(img);
    }
    
    // Populate countries dropdown
    function populateCountries() {
        const countries = [
            { code: 'US', name: 'United States' },
            { code: 'CA', name: 'Canada' },
            { code: 'UK', name: 'United Kingdom' },
            { code: 'AU', name: 'Australia' },
            { code: 'IN', name: 'India' },
            { code: 'AF', name: 'Afghanistan' },
            { code: 'AL', name: 'Albania' },
            { code: 'DZ', name: 'Algeria' },
            { code: 'AR', name: 'Argentina' },
            { code: 'AT', name: 'Austria' },
            { code: 'BD', name: 'Bangladesh' },
            { code: 'BE', name: 'Belgium' },
            { code: 'BR', name: 'Brazil' },
            { code: 'CN', name: 'China' },
            { code: 'CO', name: 'Colombia' },
            { code: 'CZ', name: 'Czech Republic' },
            { code: 'DK', name: 'Denmark' },
            { code: 'EG', name: 'Egypt' },
            { code: 'FI', name: 'Finland' },
            { code: 'FR', name: 'France' },
            { code: 'DE', name: 'Germany' },
            { code: 'GR', name: 'Greece' },
            { code: 'HK', name: 'Hong Kong' },
            { code: 'HU', name: 'Hungary' },
            { code: 'IS', name: 'Iceland' },
            { code: 'ID', name: 'Indonesia' },
            { code: 'IR', name: 'Iran' },
            { code: 'IQ', name: 'Iraq' },
            { code: 'IE', name: 'Ireland' },
            { code: 'IL', name: 'Israel' },
            { code: 'IT', name: 'Italy' },
            { code: 'JP', name: 'Japan' },
            { code: 'JO', name: 'Jordan' },
            { code: 'KE', name: 'Kenya' },
            { code: 'KR', name: 'South Korea' },
            { code: 'KW', name: 'Kuwait' },
            { code: 'LB', name: 'Lebanon' },
            { code: 'MY', name: 'Malaysia' },
            { code: 'MX', name: 'Mexico' },
            { code: 'MA', name: 'Morocco' },
            { code: 'NL', name: 'Netherlands' },
            { code: 'NZ', name: 'New Zealand' },
            { code: 'NG', name: 'Nigeria' },
            { code: 'NO', name: 'Norway' },
            { code: 'PK', name: 'Pakistan' },
            { code: 'PE', name: 'Peru' },
            { code: 'PH', name: 'Philippines' },
            { code: 'PL', name: 'Poland' },
            { code: 'PT', name: 'Portugal' },
            { code: 'QA', name: 'Qatar' },
            { code: 'RO', name: 'Romania' },
            { code: 'RU', name: 'Russia' },
            { code: 'SA', name: 'Saudi Arabia' },
            { code: 'SG', name: 'Singapore' },
            { code: 'ZA', name: 'South Africa' },
            { code: 'ES', name: 'Spain' },
            { code: 'SE', name: 'Sweden' },
            { code: 'CH', name: 'Switzerland' },
            { code: 'TW', name: 'Taiwan' },
            { code: 'TH', name: 'Thailand' },
            { code: 'TR', name: 'Turkey' },
            { code: 'AE', name: 'United Arab Emirates' },
            { code: 'VN', name: 'Vietnam' },
            { code: 'ZW', name: 'Zimbabwe' }
        ];
        
        // Sort countries by name
        countries.sort((a, b) => a.name.localeCompare(b.name));
        
        // Clear existing options except the placeholder
        while (country.options.length > 1) {
            country.remove(1);
        }
        
        // Add countries to the dropdown
        countries.forEach(countryData => {
            const option = document.createElement('option');
            option.value = countryData.code;
            option.textContent = countryData.name;
            country.appendChild(option);
        });
    }
    
    // Validation functions
    function validateStep1() {
        // No required fields in step 1, just validate the photo if one was selected
        photoError.textContent = '';
        
        if (profilePhotoFile && !croppedPhotoBlob) {
            photoError.textContent = 'Please crop your photo before proceeding';
            return false;
        }
        
        return true;
    }
    
    function validateStep2() {
        let isValid = true;
        
        // Reset error messages
        phoneNumberError.textContent = '';
        alternateEmailError.textContent = '';
        
        // Validate phone number (required)
        if (!phoneNumber.value.trim()) {
            phoneNumberError.textContent = 'Phone number is required';
            isValid = false;
        } else if (!/^\+?[0-9\s\-\(\)]{8,20}$/.test(phoneNumber.value.trim())) {
            phoneNumberError.textContent = 'Please enter a valid phone number';
            isValid = false;
        }
        
        // Validate alternate email (optional)
        if (alternateEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alternateEmail.value.trim())) {
            alternateEmailError.textContent = 'Please enter a valid email address';
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateStep3() {
        // No validation needed for step 3 as all fields are optional preferences
        return true;
    }
});

// Enhanced Student Signup Functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing enhanced student signup page');
    
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
    
    // Form elements
    const enhancedSignupForm = document.getElementById('enhancedSignupForm');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const toStep2Button = document.getElementById('toStep2');
    const toStep3Button = document.getElementById('toStep3');
    const backToStep1Button = document.getElementById('backToStep1');
    const backToStep2Button = document.getElementById('backToStep2');
    const progressBar = document.getElementById('signupProgress');
    const steps = document.querySelectorAll('.step');
    
    // Error and success messages
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    // Form field elements
    const firstName = document.getElementById('firstName');
    const middleName = document.getElementById('middleName');
    const lastName = document.getElementById('lastName');
    const email = document.getElementById('email');
    const collegeName = document.getElementById('collegeName');
    const branch = document.getElementById('branch');
    const otherBranchGroup = document.getElementById('otherBranchGroup');
    const otherBranch = document.getElementById('otherBranch');
    const prn = document.getElementById('prn');
    const startYear = document.getElementById('startYear');
    const endYear = document.getElementById('endYear');
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirmPassword');
    const newsletter = document.getElementById('newsletter');
    const cookieConsent = document.getElementById('cookieConsent');
    const termsConditions = document.getElementById('termsConditions');
    
    // Password strength elements
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');
    
    // Field error elements
    const firstNameError = document.getElementById('firstNameError');
    const lastNameError = document.getElementById('lastNameError');
    const emailError = document.getElementById('emailError');
    const collegeNameError = document.getElementById('collegeNameError');
    const branchError = document.getElementById('branchError');
    const prnError = document.getElementById('prnError');
    const validityPeriodError = document.getElementById('validityPeriodError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const cookieConsentError = document.getElementById('cookieConsentError');
    const termsConditionsError = document.getElementById('termsConditionsError');
    
    // Populate year dropdowns
    populateYearDropdowns();
    
    // Add event listeners for form navigation
    toStep2Button.addEventListener('click', () => {
        if (validateStep1()) {
            step1.style.display = 'none';
            step2.style.display = 'block';
            progressBar.style.width = '66.66%';
            updateStepStatus(2);
        }
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
    
    // Show/hide other branch field based on selection
    branch.addEventListener('change', () => {
        if (branch.value === 'Other') {
            otherBranchGroup.style.display = 'block';
            otherBranch.setAttribute('required', true);
        } else {
            otherBranchGroup.style.display = 'none';
            otherBranch.removeAttribute('required');
        }
    });
    
    // Password strength checker
    password.addEventListener('input', checkPasswordStrength);
    
    // Form submission
    enhancedSignupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Validate all steps before submission
        if (!validateStep1() || !validateStep2() || !validateStep3()) {
            return;
        }
        
        // Reset messages
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        
        // Disable submit button
        const submitButton = e.target.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        // Get form values
        const formData = {
            firstName: firstName.value.trim(),
            middleName: middleName.value.trim(),
            lastName: lastName.value.trim(),
            email: email.value.trim(),
            collegeName: collegeName.value.trim(),
            branch: branch.value === 'Other' ? otherBranch.value.trim() : branch.value,
            prn: prn.value.trim(),
            startYear: startYear.value,
            endYear: endYear.value,
            password: password.value,
            newsletter: newsletter.checked,
            cookieConsent: cookieConsent.checked,
            termsAccepted: termsConditions.checked
        };
        
        try {
            console.log('Creating user account');
            // Create user with email and password
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(formData.email, formData.password);
            const user = userCredential.user;
            console.log('User created successfully:', user.uid);
            
            try {
                // Prepare user data for Firestore
                const userData = {
                    firstName: formData.firstName,
                    middleName: formData.middleName,
                    lastName: formData.lastName,
                    fullName: `${formData.firstName} ${formData.middleName ? formData.middleName + ' ' : ''}${formData.lastName}`,
                    email: formData.email,
                    collegeName: formData.collegeName,
                    branch: formData.branch,
                    prn: formData.prn,
                    attendeeId: formData.prn, // For compatibility with existing code
                    enrollmentPeriod: {
                        start: formData.startYear,
                        end: formData.endYear
                    },
                    role: 'attendee',
                    newsletter: formData.newsletter,
                    termsAccepted: formData.termsAccepted,
                    profileComplete: false,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                };
                
                // Add user data to Firestore
                console.log('Attempting to write to Firestore...');
                await firebase.firestore().collection('attendees').doc(user.uid).set(userData);
                
                // Transfer cookie preferences to user account if they exist
                if (window.cookieManager) {
                    // Save cookie preferences based on user selections
                    const cookiePreferences = {
                        essential: true, // Always required
                        functional: formData.cookieConsent,
                        analytics: formData.cookieConsent,
                        marketing: formData.newsletter // Only enable marketing cookies if they opted into the newsletter
                    };
                    
                    // Save the consent and transfer to the user account
                    window.cookieManager.saveConsent(cookiePreferences);
                    await window.cookieManager.transferPreferencesToAccount();
                }
                console.log('User data added to Firestore');
                
                // Show success message
                successMessage.textContent = 'Account created successfully! Redirecting to profile setup...';
                successMessage.style.display = 'block';
                
                // Save user data to session storage
                const sessionData = {
                    uid: user.uid,
                    email: formData.email,
                    fullName: userData.fullName,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    attendeeId: formData.prn,
                    role: 'attendee',
                    newsletter: formData.newsletter,
                    profileComplete: false
                };
                sessionStorage.setItem('userData', JSON.stringify(sessionData));
                
                // Save auth data to cookie for auto-login if cookie manager exists
                if (window.cookieManager) {
                    window.cookieManager.saveAuthData(sessionData);
                    
                    // Save accessibility settings if they exist in localStorage
                    const accessibilitySettings = localStorage.getItem('accessibilitySettings');
                    if (accessibilitySettings && formData.cookieConsent) {
                        window.cookieManager.saveAccessibilitySettings(JSON.parse(accessibilitySettings));
                    }
                }
                
                // Redirect to profile setup page
                setTimeout(() => {
                    window.location.href = 'profile-setup.html';
                }, 2000);
                
            } catch (firestoreError) {
                console.error('Firestore error:', firestoreError);
                
                // If Firestore fails, we should still have a usable account
                // Just show a different success message
                successMessage.textContent = 'Account created but profile data could not be saved. Please try again later.';
                successMessage.style.display = 'block';
                
                // Redirect to login page after 4 seconds
                setTimeout(() => {
                    window.location.href = '../../components/login.html';
                }, 4000);
            }
        } catch (error) {
            console.error('Error creating account:', error);
            errorMessage.textContent = error.message || 'An error occurred. Please try again.';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
        }
    });
    
    // Helper Functions
    
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
    
    // Populate year dropdowns
    function populateYearDropdowns() {
        const currentYear = new Date().getFullYear();
        
        // Populate start year dropdown (current year - 10 to current year + 5)
        for (let year = currentYear - 10; year <= currentYear + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            startYear.appendChild(option);
        }
        
        // Set default to current year
        startYear.value = currentYear;
        
        // Populate end year dropdown (current year to current year + 10)
        for (let year = currentYear; year <= currentYear + 10; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            endYear.appendChild(option);
        }
        
        // Set default to current year + 4 (typical 4-year program)
        endYear.value = currentYear + 4;
    }
    
    // Check password strength
    function checkPasswordStrength() {
        const value = password.value;
        
        // Check requirements
        const hasLength = value.length >= 8;
        const hasUppercase = /[A-Z]/.test(value);
        const hasLowercase = /[a-z]/.test(value);
        const hasNumber = /[0-9]/.test(value);
        const hasSpecial = /[^A-Za-z0-9]/.test(value);
        
        // Update requirement indicators
        toggleRequirement(reqLength, hasLength);
        toggleRequirement(reqUppercase, hasUppercase);
        toggleRequirement(reqLowercase, hasLowercase);
        toggleRequirement(reqNumber, hasNumber);
        toggleRequirement(reqSpecial, hasSpecial);
        
        // Calculate strength score (0-4)
        let score = 0;
        if (hasLength) score++;
        if (hasUppercase && hasLowercase) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;
        
        // Update strength bar
        const percent = (score / 4) * 100;
        strengthBar.style.width = `${percent}%`;
        
        // Update color and text based on score
        if (value.length === 0) {
            strengthBar.style.backgroundColor = '#ccc';
            strengthText.textContent = 'Password strength';
        } else if (score < 2) {
            strengthBar.style.backgroundColor = '#ff3860';
            strengthText.textContent = 'Weak password';
        } else if (score < 3) {
            strengthBar.style.backgroundColor = '#ffdd57';
            strengthText.textContent = 'Moderate password';
        } else if (score < 4) {
            strengthBar.style.backgroundColor = '#ffaa00';
            strengthText.textContent = 'Good password';
        } else {
            strengthBar.style.backgroundColor = '#23d160';
            strengthText.textContent = 'Strong password';
        }
    }
    
    // Toggle requirement class
    function toggleRequirement(element, isValid) {
        if (isValid) {
            element.classList.add('valid');
        } else {
            element.classList.remove('valid');
        }
    }
    
    // Validation functions
    function validateStep1() {
        let isValid = true;
        
        // Reset error messages
        firstNameError.textContent = '';
        lastNameError.textContent = '';
        emailError.textContent = '';
        
        // Validate first name
        if (!firstName.value.trim()) {
            firstNameError.textContent = 'First name is required';
            isValid = false;
        }
        
        // Validate last name
        if (!lastName.value.trim()) {
            lastNameError.textContent = 'Last name is required';
            isValid = false;
        }
        
        // Validate email
        if (!email.value.trim()) {
            emailError.textContent = 'Email is required';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
            emailError.textContent = 'Please enter a valid email address';
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateStep2() {
        let isValid = true;
        
        // Reset error messages
        collegeNameError.textContent = '';
        branchError.textContent = '';
        prnError.textContent = '';
        validityPeriodError.textContent = '';
        
        // Validate college name
        if (!collegeName.value.trim()) {
            collegeNameError.textContent = 'College name is required';
            isValid = false;
        }
        
        // Validate branch
        if (branch.value === '' || branch.value === null) {
            branchError.textContent = 'Please select your branch/department';
            isValid = false;
        } else if (branch.value === 'Other' && !otherBranch.value.trim()) {
            branchError.textContent = 'Please specify your branch/department';
            isValid = false;
        }
        
        // Validate PRN
        if (!prn.value.trim()) {
            prnError.textContent = 'PRN is required';
            isValid = false;
        }
        
        // Validate enrollment period
        if (!startYear.value || !endYear.value) {
            validityPeriodError.textContent = 'Please select both start and end years';
            isValid = false;
        } else if (parseInt(startYear.value) >= parseInt(endYear.value)) {
            validityPeriodError.textContent = 'End year must be after start year';
            isValid = false;
        }
        
        return isValid;
    }
    
    function validateStep3() {
        let isValid = true;
        
        // Reset error messages
        passwordError.textContent = '';
        confirmPasswordError.textContent = '';
        cookieConsentError.textContent = '';
        termsConditionsError.textContent = '';
        
        // Validate password
        if (!password.value) {
            passwordError.textContent = 'Password is required';
            isValid = false;
        } else if (password.value.length < 8) {
            passwordError.textContent = 'Password must be at least 8 characters long';
            isValid = false;
        } else if (!/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || 
                  !/[0-9]/.test(password.value) || !/[^A-Za-z0-9]/.test(password.value)) {
            passwordError.textContent = 'Password must meet all requirements';
            isValid = false;
        }
        
        // Validate confirm password
        if (password.value !== confirmPassword.value) {
            confirmPasswordError.textContent = 'Passwords do not match';
            isValid = false;
        }
        
        // Validate cookie consent
        if (!cookieConsent.checked) {
            cookieConsentError.textContent = 'You must agree to the cookie policy';
            isValid = false;
        }
        
        // Validate terms and conditions
        if (!termsConditions.checked) {
            termsConditionsError.textContent = 'You must agree to the terms and conditions';
            isValid = false;
        }
        
        return isValid;
    }
});

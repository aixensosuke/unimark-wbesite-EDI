// Enhanced Student Signup Functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing enhanced student signup page');
    
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) {
        console.error('Signup form not found in the document');
        return;
    }
    
    console.log('Signup form found, initializing multi-step functionality');
    
    // Multi-step form elements
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const toStep2Button = document.getElementById('toStep2');
    const toStep3Button = document.getElementById('toStep3');
    const backToStep1Button = document.getElementById('backToStep1');
    const backToStep2Button = document.getElementById('backToStep2');
    const progressBar = document.getElementById('signupProgress');
    const steps = document.querySelectorAll('.step');
    
    // Field error elements
    const firstNameError = document.getElementById('firstNameError');
    const lastNameError = document.getElementById('lastNameError');
    const emailError = document.getElementById('emailError');
    const collegeNameError = document.getElementById('collegeNameError');
    const branchError = document.getElementById('branchError');
    const attendeeIdError = document.getElementById('attendeeIdError');
    const validityPeriodError = document.getElementById('validityPeriodError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const cookieConsentError = document.getElementById('cookieConsentError');
    const termsConditionsError = document.getElementById('termsConditionsError');
    
    // Password strength elements
    const password = document.getElementById('password');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    const reqLength = document.getElementById('req-length');
    const reqUppercase = document.getElementById('req-uppercase');
    const reqLowercase = document.getElementById('req-lowercase');
    const reqNumber = document.getElementById('req-number');
    const reqSpecial = document.getElementById('req-special');
    
    // Initialize year dropdowns
    populateYearDropdowns();
    
    // Show/hide other branch field based on selection
    const branch = document.getElementById('branch');
    const otherBranchGroup = document.getElementById('otherBranchGroup');
    const otherBranch = document.getElementById('otherBranch');
    
    if (branch) {
        branch.addEventListener('change', () => {
            if (branch.value === 'Other') {
                otherBranchGroup.style.display = 'block';
                otherBranch.setAttribute('required', true);
            } else {
                otherBranchGroup.style.display = 'none';
                otherBranch.removeAttribute('required');
            }
        });
    }
    
    // Add event listeners for form navigation
    if (toStep2Button) {
        toStep2Button.addEventListener('click', () => {
            if (validateStep1()) {
                step1.style.display = 'none';
                step2.style.display = 'block';
                progressBar.style.width = '66.66%';
                updateStepStatus(2);
            }
        });
    }
    
    if (toStep3Button) {
        toStep3Button.addEventListener('click', () => {
            if (validateStep2()) {
                step2.style.display = 'none';
                step3.style.display = 'block';
                progressBar.style.width = '100%';
                updateStepStatus(3);
            }
        });
    }
    
    if (backToStep1Button) {
        backToStep1Button.addEventListener('click', () => {
            step2.style.display = 'none';
            step1.style.display = 'block';
            progressBar.style.width = '33.33%';
            updateStepStatus(1);
        });
    }
    
    if (backToStep2Button) {
        backToStep2Button.addEventListener('click', () => {
            step3.style.display = 'none';
            step2.style.display = 'block';
            progressBar.style.width = '66.66%';
            updateStepStatus(2);
        });
    }
    
    // Password strength checker
    if (password) {
        password.addEventListener('input', checkPasswordStrength);
    }
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        // Validate all steps before submission
        if (!validateStep1() || !validateStep2() || !validateStep3()) {
            return;
        }
        
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // Reset messages
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        
        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        // Get form values
        const firstName = document.getElementById('firstName').value.trim();
        const middleName = document.getElementById('middleName')?.value.trim() || '';
        const lastName = document.getElementById('lastName').value.trim();
        const email = document.getElementById('email').value.trim();
        const collegeName = document.getElementById('collegeName')?.value.trim() || '';
        const branchValue = document.getElementById('branch')?.value || '';
        const otherBranchValue = document.getElementById('otherBranch')?.value.trim() || '';
        const branch = branchValue === 'Other' ? otherBranchValue : branchValue;
        const attendeeId = document.getElementById('attendeeId').value.trim();
        const startYear = document.getElementById('startYear')?.value || '';
        const endYear = document.getElementById('endYear')?.value || '';
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const newsletter = document.getElementById('newsletter').checked;
        const cookieConsent = document.getElementById('cookieConsent').checked;
        const termsConditions = document.getElementById('termsConditions')?.checked || false;
        
        // Create full name from parts
        const fullName = middleName 
            ? `${firstName} ${middleName} ${lastName}` 
            : `${firstName} ${lastName}`;
        
        console.log('Form data:', { email, fullName, attendeeId });
        
        // Final validation
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match!';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            return;
        }
        
        if (password.length < 8) {
            errorMessage.textContent = 'Password should be at least 8 characters long!';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            return;
        }
        
        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || 
            !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            errorMessage.textContent = 'Password must include uppercase, lowercase, number, and special character!';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            return;
        }
        
        try {
            console.log('Creating user account');
            // Create user with email and password
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            console.log('User created successfully:', user.uid);
            
            try {
                // Add additional user data to Firestore with error handling
                console.log('Attempting to write to Firestore...');
                await firebase.firestore().collection('attendees').doc(user.uid).set({
                    firstName: firstName,
                    middleName: middleName,
                    lastName: lastName,
                    fullName: fullName,
                    email: email,
                    collegeName: collegeName,
                    branch: branch,
                    attendeeId: attendeeId,
                    prn: attendeeId, // For compatibility with existing code
                    enrollmentPeriod: {
                        start: startYear,
                        end: endYear
                    },
                    role: 'attendee',
                    newsletter: newsletter,
                    termsAccepted: termsConditions,
                    profileComplete: false,
                    createdAt: new Date().toISOString(),
                    lastUpdated: new Date().toISOString()
                });
                
                // Transfer cookie preferences to user account if they exist
                if (window.cookieManager) {
                    // Save cookie preferences based on user selections
                    const cookiePreferences = {
                        essential: true, // Always required
                        functional: cookieConsent,
                        analytics: cookieConsent,
                        marketing: newsletter // Only enable marketing cookies if they opted into the newsletter
                    };
                    
                    // Save the consent and transfer to the user account
                    window.cookieManager.saveConsent(cookiePreferences);
                    await window.cookieManager.transferPreferencesToAccount();
                }
                console.log('User data added to Firestore');
                
                // Show success message
                successMessage.textContent = 'Account created successfully! Redirecting to login...';
                successMessage.style.display = 'block';
                
                // Save user data to session storage
                const userData = {
                    uid: user.uid,
                    email: email,
                    fullName: fullName,
                    attendeeId: attendeeId,
                    role: 'attendee',
                    newsletter: newsletter
                };
                sessionStorage.setItem('userData', JSON.stringify(userData));
                
                // Save auth data to cookie for auto-login if cookie manager exists
                if (window.cookieManager) {
                    window.cookieManager.saveAuthData(userData);
                    
                    // Save accessibility settings if they exist in localStorage
                    const accessibilitySettings = localStorage.getItem('accessibilitySettings');
                    if (accessibilitySettings && cookieConsent) {
                        window.cookieManager.saveAccessibilitySettings(JSON.parse(accessibilitySettings));
                    }
                }
                
                // Check if we should redirect to profile setup
                if (window.profileSetupUrl) {
                    // Redirect to profile setup page
                    setTimeout(() => {
                        window.location.href = window.profileSetupUrl;
                    }, 2000);
                } else {
                    // Fallback to dashboard
                    setTimeout(() => {
                        window.location.href = '../../users/at/at-dashboard.html';
                    }, 2000);
                }
            } catch (firestoreError) {
                console.error('Firestore error:', firestoreError);
                
                // If Firestore fails, we should still have a usable account
                // Just show a different success message
                successMessage.textContent = 'Account created but profile data could not be saved. Please contact admin.';
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
    console.log('Signup event listener added');
    
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
        const startYear = document.getElementById('startYear');
        const endYear = document.getElementById('endYear');
        
        if (!startYear || !endYear) return;
        
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
        if (!element) return;
        
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
        if (firstNameError) firstNameError.textContent = '';
        if (lastNameError) lastNameError.textContent = '';
        if (emailError) emailError.textContent = '';
        
        // Validate first name
        const firstName = document.getElementById('firstName');
        if (firstName && !firstName.value.trim()) {
            if (firstNameError) firstNameError.textContent = 'First name is required';
            isValid = false;
        }
        
        // Validate last name
        const lastName = document.getElementById('lastName');
        if (lastName && !lastName.value.trim()) {
            if (lastNameError) lastNameError.textContent = 'Last name is required';
            isValid = false;
        }
        
        // Validate email
        const email = document.getElementById('email');
        if (email) {
            if (!email.value.trim()) {
                if (emailError) emailError.textContent = 'Email is required';
                isValid = false;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
                if (emailError) emailError.textContent = 'Please enter a valid email address';
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    function validateStep2() {
        let isValid = true;
        
        // Reset error messages
        if (collegeNameError) collegeNameError.textContent = '';
        if (branchError) branchError.textContent = '';
        if (attendeeIdError) attendeeIdError.textContent = '';
        if (validityPeriodError) validityPeriodError.textContent = '';
        
        // Validate college name
        const collegeName = document.getElementById('collegeName');
        if (collegeName && !collegeName.value.trim()) {
            if (collegeNameError) collegeNameError.textContent = 'College name is required';
            isValid = false;
        }
        
        // Validate branch
        const branch = document.getElementById('branch');
        const otherBranch = document.getElementById('otherBranch');
        if (branch) {
            if (branch.value === '' || branch.value === null) {
                if (branchError) branchError.textContent = 'Please select your branch/department';
                isValid = false;
            } else if (branch.value === 'Other' && otherBranch && !otherBranch.value.trim()) {
                if (branchError) branchError.textContent = 'Please specify your branch/department';
                isValid = false;
            }
        }
        
        // Validate PRN/attendeeId
        const attendeeId = document.getElementById('attendeeId');
        if (attendeeId && !attendeeId.value.trim()) {
            if (attendeeIdError) attendeeIdError.textContent = 'PRN is required';
            isValid = false;
        }
        
        // Validate enrollment period
        const startYear = document.getElementById('startYear');
        const endYear = document.getElementById('endYear');
        if (startYear && endYear) {
            if (!startYear.value || !endYear.value) {
                if (validityPeriodError) validityPeriodError.textContent = 'Please select both start and end years';
                isValid = false;
            } else if (parseInt(startYear.value) >= parseInt(endYear.value)) {
                if (validityPeriodError) validityPeriodError.textContent = 'End year must be after start year';
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    function validateStep3() {
        let isValid = true;
        
        // Reset error messages
        if (passwordError) passwordError.textContent = '';
        if (confirmPasswordError) confirmPasswordError.textContent = '';
        if (cookieConsentError) cookieConsentError.textContent = '';
        if (termsConditionsError) termsConditionsError.textContent = '';
        
        // Validate password
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        if (password) {
            if (!password.value) {
                if (passwordError) passwordError.textContent = 'Password is required';
                isValid = false;
            } else if (password.value.length < 8) {
                if (passwordError) passwordError.textContent = 'Password must be at least 8 characters long';
                isValid = false;
            } else if (!/[A-Z]/.test(password.value) || !/[a-z]/.test(password.value) || 
                      !/[0-9]/.test(password.value) || !/[^A-Za-z0-9]/.test(password.value)) {
                if (passwordError) passwordError.textContent = 'Password must meet all requirements';
                isValid = false;
            }
        }
        
        // Validate confirm password
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            if (confirmPasswordError) confirmPasswordError.textContent = 'Passwords do not match';
            isValid = false;
        }
        
        // Validate cookie consent
        const cookieConsent = document.getElementById('cookieConsent');
        if (cookieConsent && !cookieConsent.checked) {
            if (cookieConsentError) cookieConsentError.textContent = 'You must agree to the cookie policy';
            isValid = false;
        }
        
        // Validate terms and conditions
        const termsConditions = document.getElementById('termsConditions');
        if (termsConditions && !termsConditions.checked) {
            if (termsConditionsError) termsConditionsError.textContent = 'You must agree to the terms and conditions';
            isValid = false;
        }
        
        return isValid;
    }
}); 
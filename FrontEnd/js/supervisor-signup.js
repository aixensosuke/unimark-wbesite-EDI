// Supervisor Signup Functionality

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing supervisor signup page');
    
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) {
        console.error('Signup form not found in the document');
        return;
    }
    
    console.log('Signup form found, adding event listener');
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('Form submitted');
        
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        const submitButton = e.target.querySelector('button[type="submit"]');
        
        // Reset messages
        if (errorMessage) errorMessage.style.display = 'none';
        if (successMessage) successMessage.style.display = 'none';
        
        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Creating Account...';
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const fullName = document.getElementById('fullName').value;
        const supervisorId = document.getElementById('supervisorId').value;
        
        console.log('Form data:', { email, fullName, supervisorId });
        
        // Basic validation
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match!';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Create Account';
            return;
        }
        
        if (password.length < 6) {
            errorMessage.textContent = 'Password should be at least 6 characters long!';
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
                await firebase.firestore().collection('supervisors').doc(user.uid).set({
                    fullName: fullName,
                    email: email,
                    supervisorId: supervisorId,
                    role: 'supervisor',
                    createdAt: new Date().toISOString()
                });
                console.log('User data added to Firestore');
                
                // Show success message
                successMessage.textContent = 'Account created successfully! Redirecting to login...';
                successMessage.style.display = 'block';
                
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    window.location.href = '../../components/login.html';
                }, 2000);
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
}); 
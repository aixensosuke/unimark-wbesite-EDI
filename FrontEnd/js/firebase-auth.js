// Import Firebase modules
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Handle Attendee Signup
export async function handleAttendeeSignup(email, password, fullName, attendeeId) {
    try {
        // Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Add additional user data to Firestore
        await setDoc(doc(db, 'attendees', user.uid), {
            fullName,
            email,
            attendeeId,
            role: 'attendee',
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Account created successfully! Redirecting to login...'
        };
    } catch (error) {
        console.error('Error in attendee signup:', error);
        return {
            success: false,
            message: getErrorMessage(error)
        };
    }
}

// Handle Supervisor Signup
export async function handleSupervisorSignup(email, password, fullName, supervisorId) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'supervisors', user.uid), {
            fullName,
            email,
            supervisorId,
            role: 'supervisor',
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Account created successfully! Redirecting to login...'
        };
    } catch (error) {
        console.error('Error in supervisor signup:', error);
        return {
            success: false,
            message: getErrorMessage(error)
        };
    }
}

// Handle Organization Signup
export async function handleOrganizationSignup(email, password, orgName, orgId) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, 'organizations', user.uid), {
            organizationName: orgName,
            email,
            orgId,
            role: 'organization',
            createdAt: new Date().toISOString()
        });

        return {
            success: true,
            message: 'Account created successfully! Redirecting to login...'
        };
    } catch (error) {
        console.error('Error in organization signup:', error);
        return {
            success: false,
            message: getErrorMessage(error)
        };
    }
}

// Handle Login
export async function handleLogin(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Get user role and data
        const collections = ['attendees', 'supervisors', 'organizations'];
        let userData = null;
        let userRole = null;
        let redirectUrl = '';

        for (const collection of collections) {
            const docRef = doc(db, collection, user.uid);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                userData = docSnap.data();
                userRole = collection.slice(0, -1); // Remove 's' from the end
                break;
            }
        }

        if (!userData) {
            throw new Error('User data not found');
        }

        // Set redirect URL based on role
        switch (userRole) {
            case 'attendee':
                redirectUrl = '/FrontEnd/users/at/at-dashboard.html';
                break;
            case 'supervisor':
                redirectUrl = '/FrontEnd/users/sup/sup-dashboard.html';
                break;
            case 'organization':
                redirectUrl = '/FrontEnd/users/org/org-dashboard.html';
                break;
            default:
                throw new Error('Invalid user role');
        }

        return {
            success: true,
            message: 'Login successful!',
            userData,
            redirectUrl
        };
    } catch (error) {
        console.error('Error in login:', error);
        return {
            success: false,
            message: getErrorMessage(error)
        };
    }
}

// Helper function to get user-friendly error messages
function getErrorMessage(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'This email is already registered. Please use a different email or login.';
        case 'auth/invalid-email':
            return 'Invalid email address. Please check your email format.';
        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled. Please contact support.';
        case 'auth/weak-password':
            return 'Password is too weak. Please use a stronger password.';
        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';
        case 'auth/user-not-found':
            return 'No account found with this email. Please sign up first.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        default:
            return 'An error occurred. Please try again later.';
    }
} 
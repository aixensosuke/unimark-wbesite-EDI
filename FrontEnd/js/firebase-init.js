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

// Initialize Firebase and get auth/db references
let auth;
let db;
try {
    firebase.initializeApp(firebaseConfig);
    console.log('Firebase initialized successfully');
    auth = firebase.auth();
    db = firebase.firestore();
} catch (error) {
    console.error('Error initializing Firebase:', error);
} 
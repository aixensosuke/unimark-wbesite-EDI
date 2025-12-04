const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let serviceAccount;

if (process.env.NODE_ENV === 'production') {
    // In production, use the environment variable
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (error) {
        console.error('Error parsing Firebase service account:', error);
        process.exit(1);
    }
} else {
    // In development, use the local file
    try {
        serviceAccount = require(path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    } catch (error) {
        console.error('Error loading Firebase service account file:', error);
        process.exit(1);
    }
}

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

module.exports = admin; 
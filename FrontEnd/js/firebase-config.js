// Firebase Configuration - Shared across all pages
export const firebaseConfig = {
    apiKey: "AIzaSyBzAJOsQoMYXAr_atquwY-1fMW8-g4xAa0",
    authDomain: "timelyremind-1d361.firebaseapp.com",
    projectId: "timelyremind-1d361",
    storageBucket: "timelyremind-1d361.firebasestorage.app",
    messagingSenderId: "257503539917",
    appId: "1:257503539917:web:cf6066d5d640725f706f84"
};

// Generate random 6-character attendance code
export function generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Format date for display
export function formatDate(date) {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time for display
export function formatTime(date) {
    if (!date) return '-';
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Calculate distance between two coordinates (Haversine formula) - OPTIONAL
export function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}
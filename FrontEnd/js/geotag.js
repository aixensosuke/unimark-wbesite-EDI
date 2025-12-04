let map, infoWindow, userMarker, targetMarker, radiusCircle;
let watchId = null;

// Target location configuration
const TARGET_LOCATION = {
    lat: 18.457437154048705, // Updated coordinates
    lng: 73.85064332149199,
    radius: 50 // meters
};

// Custom map style to match website theme
const mapStyle = [
    {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [{"color": "#242f3e"}]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [{"lightness": -80}]
    },
    {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#746855"}]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#d59563"}]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#d59563"}]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [{"color": "#263c3f"}]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#6b9a76"}]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{"color": "#38414e"}]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#212a37"}]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#9ca5b3"}]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{"color": "#746855"}]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [{"color": "#1f2835"}]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#f3d19c"}]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{"color": "#17263c"}]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{"color": "#515c6d"}]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [{"lightness": -20}]
    }
];

// Get DOM elements
const verifyButton = document.getElementById('verifyButton');
const loading = document.getElementById('loading');
const locationStatus = document.getElementById('locationStatus');
const coordinatesDisplay = document.getElementById('coordinatesDisplay');
const latitudeDisplay = document.getElementById('latitudeDisplay');
const longitudeDisplay = document.getElementById('longitudeDisplay');
const accuracyDisplay = document.getElementById('accuracyDisplay');

// Initialize map and location tracking
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: TARGET_LOCATION.lat, lng: TARGET_LOCATION.lng },
        zoom: 18,
        styles: mapStyle
    });

    infoWindow = new google.maps.InfoWindow();

    // Create target location marker
    targetMarker = new google.maps.Marker({
        position: { lat: TARGET_LOCATION.lat, lng: TARGET_LOCATION.lng },
        map: map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#27bba9",
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: "#ffffff"
        },
        title: "Target Location"
    });

    // Create radius ellipse
    radiusEllipse = new google.maps.Polygon({
        map: map,
        paths: calculateEllipsePath(TARGET_LOCATION.lat, TARGET_LOCATION.lng, 30, 60, 32),
        fillColor: "#27bba9",
        fillOpacity: 0.1,
        strokeColor: "#27bba9",
        strokeWeight: 2
    });

    // Add location button
    const locationButton = document.createElement("button");
    locationButton.textContent = "Pan to Current Location";
    locationButton.classList.add("custom-map-control-button");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(locationButton);

    locationButton.addEventListener("click", () => {
        getCurrentLocation();
    });

    // Start tracking location
    getCurrentLocation();
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        // Clear existing watch if any
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }

        // Update status to initializing
        const statusDiv = document.querySelector(".location-status");
        statusDiv.className = "location-status";
        statusDiv.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i><span>Getting your location...</span>';

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };

                // Update user marker
                if (!userMarker) {
                    userMarker = new google.maps.Marker({
                        position: pos,
                        map: map,
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: 8,
                            fillColor: "#4285F4",
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: "#ffffff"
                        },
                        title: "Your Location"
                    });
                } else {
                    userMarker.setPosition(pos);
                }

                // Update info window
                infoWindow.setPosition(pos);
                infoWindow.setContent(`
                    <div style="color: #333;">
                        <strong>Your Location</strong><br>
                        Accuracy: ±${Math.round(position.coords.accuracy)}m
                    </div>
                `);
                infoWindow.open(map);

                // Fit bounds to show both markers
                const bounds = new google.maps.LatLngBounds();
                bounds.extend(pos);
                bounds.extend({ lat: TARGET_LOCATION.lat, lng: TARGET_LOCATION.lng });
                map.fitBounds(bounds);

                // Update location details
                updateLocationDetails(position);
            },
            (error) => {
                handleLocationError(true, infoWindow, map.getCenter(), error);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    } else {
        handleLocationError(false, infoWindow, map.getCenter());
    }
}

function updateLocationDetails(position) {
    // Store coordinates in localStorage for verification
    localStorage.setItem('userLatitude', position.coords.latitude.toFixed(8));
    localStorage.setItem('userLongitude', position.coords.longitude.toFixed(8));
    localStorage.setItem('locationAccuracy', Math.round(position.coords.accuracy));
    
    document.getElementById("latitude").textContent = position.coords.latitude.toFixed(6);
    document.getElementById("longitude").textContent = position.coords.longitude.toFixed(6);
    document.getElementById("accuracy").textContent = `±${Math.round(position.coords.accuracy)}m`;

    // Calculate distance between coordinates in meters
    const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        TARGET_LOCATION.lat,
        TARGET_LOCATION.lng
    );

    document.getElementById("distance").textContent = `${distance.toFixed(2)}m`;
    
    // Store distance in localStorage
    localStorage.setItem('distanceToTarget', distance.toFixed(2));

    // Update status and button state
    const statusDiv = document.querySelector(".location-status");
    const verifyButton = document.getElementById("verifyButton");
    const isWithinRange = distance <= TARGET_LOCATION.radius;
    const isHighAccuracy = position.coords.accuracy <= 50;

    // Determine status class and message based on conditions
    let statusClass, statusMessage, statusIcon;
    
    if (isWithinRange) {
        if (isHighAccuracy) {
            statusClass = "success";
            statusIcon = "check-circle";
            statusMessage = "You are within the allowed area";
            verifyButton.disabled = false;
        } else {
            statusClass = "warning";
            statusIcon = "exclamation-circle";
            statusMessage = "You are within the allowed area (Note: Location accuracy is low)";
            verifyButton.disabled = false;
        }
    } else {
        if (isHighAccuracy) {
            statusClass = "error";
            statusIcon = "times-circle";
            statusMessage = "You are outside the allowed area";
            verifyButton.disabled = true;
        } else {
            statusClass = "warning";
            statusIcon = "exclamation-circle";
            statusMessage = "You are outside the allowed area (Note: Location accuracy is low)";
            verifyButton.disabled = true;
        }
    }

    statusDiv.className = `location-status ${statusClass}`;
    statusDiv.innerHTML = `<i class="fas fa-${statusIcon}"></i><span>${statusMessage}</span>`;
}

// Calculate distance between coordinates in meters
function calculateDistance(lat1, lon1, lat2, lon2) {
    // Use the Haversine formula to calculate the distance between two points on Earth
    const R = 6371000; // Radius of the Earth in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

function calculateEllipsePath(centerLat, centerLng, latRadius, lngRadius, points) {
    const path = [];
    for (let i = 0; i < points; i++) {
        const angle = (i * 2 * Math.PI) / points;
        const lat = centerLat + (latRadius / 111320) * Math.sin(angle); // 111320 meters per degree of latitude
        const lng = centerLng + (lngRadius / (111320 * Math.cos(centerLat * Math.PI/180))) * Math.cos(angle);
        path.push({lat: lat, lng: lng});
    }
    path.push(path[0]); // Close the path
    return path;
}

function handleLocationError(browserHasGeolocation, infoWindow, pos, error) {
    const statusDiv = document.querySelector(".location-status");
    statusDiv.className = "location-status error";
    
    let errorMessage = browserHasGeolocation
        ? (error ? `Error: ${getGeolocationErrorMessage(error)}` : "Error: The Geolocation service failed.")
        : "Error: Your browser doesn't support geolocation.";

    statusDiv.innerHTML = `<i class="fas fa-times-circle"></i><span>${errorMessage}</span>`;
    
    infoWindow.setPosition(pos);
    infoWindow.setContent(errorMessage);
    infoWindow.open(map);
}

function getGeolocationErrorMessage(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            return "Location permission denied. Please enable location services.";
        case error.POSITION_UNAVAILABLE:
            return "Location information unavailable. Please check your device settings.";
        case error.TIMEOUT:
            return "Location request timed out. Please try again.";
        default:
            return "An unknown error occurred while getting your location.";
    }
}

// Handle verify location button click
function initializeVerifyButton() {
    const button = document.getElementById("verifyButton");
    console.log("Looking for verify button:", button); // Debug log
    
    if (button) {
        button.addEventListener("click", () => {
            console.log("Button clicked"); // Debug log
            
            // Get latest location data
            const latitude = localStorage.getItem('userLatitude');
            const longitude = localStorage.getItem('userLongitude');
            const accuracy = localStorage.getItem('locationAccuracy');
            const distance = localStorage.getItem('distanceToTarget');
            
            // Validate location data
            if (!latitude || !longitude) {
                alert("Location data not available. Please wait for your location to be detected.");
                return;
            }
            
            // Store verification status in localStorage
            localStorage.setItem('locationVerificationStatus', 'completed');
            localStorage.setItem('locationTimestamp', new Date().toISOString());
            
            // Disable the button to prevent multiple clicks
            button.disabled = true;
            
            button.innerHTML = `
                <div class="checkmark-container">
                    <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                        <path class="checkmark-path" d="M14 27 L22 35 L38 15" />
                    </svg>
                </div>
            `;
            
            // Redirect back to attendance verification page after animation with success status
            setTimeout(() => {
                window.location.href = "attendance-verify.html?from=geotag&status=success";
            }, 2000);
        });
    } else {
        console.error("Verify button not found!"); // Debug log
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Don't clear sessionStorage here, let attendance-verify.js manage sessions
    console.log("Geotag page loaded");
    initializeVerifyButton();
    // Start tracking location
    getCurrentLocation();
});

// Cleanup on page unload
window.addEventListener('unload', () => {
    if (watchId) {
        navigator.geolocation.clearWatch(watchId);
    }
});

window.initMap = initMap; 
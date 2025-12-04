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
let firebaseInitialized = false;

// Function to safely initialize Firebase
function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.warn('Firebase SDK not loaded yet. Will retry initialization.');
        return false;
    }
    
    try {
        // Check if Firebase is already initialized
        if (!firebase.apps || !firebase.apps.length) {
            // For Firebase compat, we need to check a different property
            if (!window._firebaseInitialized) {
                firebase.initializeApp(firebaseConfig);
                window._firebaseInitialized = true;
                console.log('Firebase initialized successfully');
            } else {
                console.log('Firebase already initialized (via window._firebaseInitialized)');
            }
        } else {
            console.log('Firebase already initialized (via firebase.apps)');
        }
        
        auth = firebase.auth();
        db = firebase.firestore();
        firebaseInitialized = true;
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return false;
    }
}

// Initialize components
function initializeComponents() {
    console.log('Initializing components...');
    
    // Initialize Lucide icons first
    initializeLucideIcons();
    
    // Initialize forgot password functionality
    initializeForgotPassword();
    
    // Initialize theme
    initializeTheme();
    
    // Initialize cursor
    initializeCursor();
    
    // Initialize slider
    initializeSlider();
    
    // Initialize calendar if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        initializeCalendar();
    }
    
    // Initialize appropriate dashboard based on URL
    if (window.location.pathname.includes('/sup/sup-dashboard.html')) {
        initializeSupervisorDashboard();
    } else if (window.location.pathname.includes('/org/org-dashboard.html')) {
        initializeOrgDashboard();
    }
    
    // Initialize OTP verification if on OTP page
    if (document.querySelector('.otp-input')) {
        initializeOTPVerification();
    }
    
    // Initialize sidebar
    initializeSidebar();
}

// Apply accessibility settings on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing components');
    
    // Initialize Firebase if not already initialized
    initializeFirebase();
    
    // Load CookieManager script if not already loaded
    if (typeof window.cookieManager === 'undefined') {
        const script = document.createElement('script');
        script.src = '/FrontEnd/js/cookie-manager.js';
        script.onload = () => {
            console.log('CookieManager script loaded');
            window.cookieManager = new CookieManager();
            initializeComponents();
        };
        document.head.appendChild(script);
    } else {
        // Initialize other components
        initializeComponents();
    }
});

/**
 * Initialize accessibility settings from localStorage
 */
function initializeAccessibilitySettings() {
    try {
        // Load accessibility settings from localStorage
        const savedSettings = localStorage.getItem('accessibilitySettings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        
        // Apply settings to the page
        if (settings.dyslexiaFontEnabled) {
            document.body.classList.add('dyslexia-font');
        }
        
        // Apply font size if set
        if (settings.fontSize) {
            document.body.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
            document.body.classList.add(`font-size-${settings.fontSize}`);
        }
        
        // Apply letter spacing if set
        if (settings.letterSpacing) {
            document.body.classList.remove('letter-spacing-standard', 'letter-spacing-wider', 'letter-spacing-maximum');
            document.body.classList.add(`letter-spacing-${settings.letterSpacing}`);
        }
        
        // Apply simplified layout if enabled
        if (settings.simplifiedLayout) {
            document.body.classList.add('simplified-layout');
        }
        
        // Apply high contrast if enabled
        if (settings.highContrast) {
            document.body.classList.add('high-contrast');
        }
        
        // Apply color theme if set
        if (settings.colorTheme) {
            document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-yellowBlue');
            document.body.classList.add(`theme-${settings.colorTheme}`);
        }
        
        // Apply reduce animations if enabled
        if (settings.reduceAnimations) {
            document.body.classList.add('reduce-animations');
        }
        
        // Apply highlight links if enabled
        if (settings.highlightLinks) {
            document.body.classList.add('highlight-links');
        }
        
        // Apply simplified interface if enabled
        if (settings.simplifiedInterface) {
            document.body.classList.add('simplified-interface');
        }
        
        // Apply enhanced focus if enabled
        if (settings.enhancedFocus) {
            document.body.classList.add('enhanced-focus');
        }
        
        // Apply target size if set
        if (settings.targetSize) {
            document.body.classList.remove('target-size-standard', 'target-size-large', 'target-size-xlarge');
            document.body.classList.add(`target-size-${settings.targetSize}`);
        }
        
        // Apply content width if set
        if (settings.contentWidth) {
            document.body.classList.remove('content-width-standard', 'content-width-narrow', 'content-width-veryNarrow');
            document.body.classList.add(`content-width-${settings.contentWidth}`);
        }
    } catch (error) {
        console.error('Error applying accessibility settings:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () =>
{
    // Check if user is logged in
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    const isLoggedIn = !!userData;

    // Check if on login/signup pages and redirect if already logged in
    const currentPath = window.location.pathname;
    if (isLoggedIn && (currentPath.includes('login.html') || currentPath.includes('signup.html') || currentPath.includes('-su.html'))) {
        // Redirect based on user role
        const redirectMap = {
            'attendee': '/FrontEnd/users/at/at-dashboard.html',
            'supervisor': '/FrontEnd/users/sup/sup-dashboard.html',
            'organization': '/FrontEnd/users/org/org-dashboard.html'
        };
        window.location.href = redirectMap[userData.role] || '/FrontEnd/index.html';
        return;
    }

    // Load header and footer
    try {
        // Load appropriate header based on user role
        let headerPath = '/FrontEnd/components/header.html';
        if (isLoggedIn && userData.role) {
            // Map full role names to their 2-character prefixes
            const rolePrefix = {
                'attendee': 'at',
                'supervisor': 'sup',
                'organization': 'org'
            };
            const prefix = rolePrefix[userData.role];
            headerPath = `/FrontEnd/users/${prefix}/${prefix}-header.html`;
        }
        
        const headerResponse = await fetch(headerPath);
        const headerHtml = await headerResponse.text();
        const headerContainer = document.getElementById('header');
        if (headerContainer) {
            headerContainer.innerHTML = headerHtml;
            
            // Show appropriate header based on login status
            const defaultHeader = document.getElementById('defaultHeader');
            const loggedInHeader = document.getElementById('loggedInHeader');
            
            if (isLoggedIn) {
                if (defaultHeader) defaultHeader.style.display = 'none';
                if (loggedInHeader) {
                    loggedInHeader.style.display = 'flex';
                    loggedInHeader.setAttribute('data-role', userData.role);
                    
                    // Update profile name in header
                    const profileName = loggedInHeader.querySelector('.profile-name');
                    if (profileName) {
                        profileName.textContent = userData.fullName || userData.organizationName;
                    }

                    // Initialize menu toggle
                    const menuToggle = loggedInHeader.querySelector('.menu-toggle');
                    const sidebar = document.getElementById('slider');
                    const sidebarOverlay = document.querySelector('.sidebar-overlay');

                    if (menuToggle && sidebar) {
                        menuToggle.addEventListener('click', () => {
                            menuToggle.classList.toggle('active');
                            sidebar.classList.toggle('active');
                            if (sidebarOverlay) {
                                sidebarOverlay.classList.toggle('active');
                            }
                        });

                        if (sidebarOverlay) {
                            sidebarOverlay.addEventListener('click', () => {
                                menuToggle.classList.remove('active');
                                sidebar.classList.remove('active');
                                sidebarOverlay.classList.remove('active');
                            });
                        }
                    }

                    // Handle logout
                    const logoutButton = document.getElementById('headerLogoutBtn');
                    if (logoutButton) {
                        logoutButton.addEventListener('click', () => {
                            // Use cookie manager for logout if available
                            if (window.cookieManager) {
                                window.cookieManager.handleLogout();
                            } else {
                                // Fallback to basic logout - with safety check for Firebase
                                if (firebaseInitialized && firebase && firebase.auth) {
                                    firebase.auth().signOut().then(() => {
                                        console.log('User signed out');
                                        sessionStorage.removeItem('userData');
                                        window.location.href = '/FrontEnd/components/login.html';
                                    }).catch(error => {
                                        console.error('Error signing out:', error);
                                        // Still clear session and redirect even if Firebase fails
                                        sessionStorage.removeItem('userData');
                                        window.location.href = '/FrontEnd/components/login.html';
                                    });
                                } else {
                                    console.warn('Firebase not initialized, performing basic logout');
                                    sessionStorage.removeItem('userData');
                                    window.location.href = '/FrontEnd/components/login.html';
                                }
                            }
                        });
                    }

                    // Load role-specific slider for logged-in users
                    if (sidebar) {
                        const rolePrefix = {
                            'attendee': 'at',
                            'supervisor': 'sup',
                            'organization': 'org'
                        };
                        const prefix = rolePrefix[userData.role];
                        const sliderPath = `/FrontEnd/users/${prefix}/${prefix}-sidebar.html`;
                        const sliderResponse = await fetch(sliderPath);
                        const sliderHtml = await sliderResponse.text();
                        sidebar.innerHTML = sliderHtml;
                        
                        // Update profile name in slider
                        const sliderProfileName = document.getElementById('profileName');
                        if (sliderProfileName) {
                            sliderProfileName.textContent = userData.fullName || userData.organizationName;
                        }
                    }
                }
            } else {
                if (defaultHeader) defaultHeader.style.display = 'flex';
                if (loggedInHeader) loggedInHeader.style.display = 'none';
            }
        }

        const footerResponse = await fetch('/FrontEnd/components/footer.html');
        const footerHtml = await footerResponse.text();
        const footerContainer = document.getElementById('footer');
        if (footerContainer) {
            footerContainer.innerHTML = footerHtml;
        }
    } catch (error) {
        console.error('Error loading components:', error);
    }

    // Initialize dashboard if on dashboard page
    if (window.location.pathname.includes('dashboard.html')) {
        const path = window.location.pathname;
        if (path.includes('/org/')) {
            initializeOrgDashboard();
        } else {
            initializeDashboard();
        }
    }

    // Theme initialization
    initializeTheme();

    // Initialize cursor
    initializeCursor();

  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const headerContent = document.querySelector('.header-content');

  if (menuToggle && headerContent) {
    menuToggle.addEventListener('click', () => {
      headerContent.classList.toggle('active');
      document.body.classList.toggle('menu-open');
    });
  }

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Intersection Observer for fade-in animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  // Observe all sections and features
  document.querySelectorAll('section, .feature').forEach(element => {
    element.classList.add('fade-out');
    observer.observe(element);
  });

  // Handle video loading and fallback
  const heroVideo = document.querySelector('.hero-video');
  if (heroVideo) {
    heroVideo.addEventListener('loadeddata', () => {
      heroVideo.classList.add('loaded');
    });

    heroVideo.addEventListener('error', () => {
      heroVideo.style.display = 'none';
      document.querySelector('.hero').style.backgroundImage = 'url("/placeholder.jpg")';
    });
  }

    // Login form functionality
    const loginForm = document.getElementById('loginForm');
    if (loginForm)
    {
        loginForm.addEventListener('submit', async (e) =>
        {
            e.preventDefault();
            
            const errorMessage = document.getElementById('errorMessage');
            const successMessage = document.getElementById('successMessage');
            const submitButton = e.target.querySelector('button[type="submit"]');
            
            // Reset messages
            errorMessage.style.display = 'none';
            successMessage.style.display = 'none';
            
            // Show loading state
            updateButtonLoadingState(submitButton, true);

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try
            {
                const result = await handleLogin(email, password);
                if (result.success)
                {
                    successMessage.textContent = result.message || 'Login successful!';
                    successMessage.style.display = 'block';
                    
                    // Store user data in session storage
                    if (result.userData)
                    {
                        sessionStorage.setItem('userData', JSON.stringify(result.userData));
                    }
                    
                    // Show success state
                    updateButtonLoadingState(submitButton, false, true);
                    
                    // Redirect to dashboard based on user role
                    setTimeout(() =>
                    {
                        window.location.href = result.redirectUrl;
                    }, 2000);
                }
                else
                {
                    errorMessage.textContent = result.message || 'Login failed. Please check your credentials.';
                    errorMessage.style.display = 'block';
                    updateButtonLoadingState(submitButton, false);
                }
            }
            catch (error)
            {
                errorMessage.textContent = getErrorMessage(error);
                errorMessage.style.display = 'block';
                updateButtonLoadingState(submitButton, false);
            }
        });
    }

    // Update mark attendance button click handler
    document.getElementById("markAttendance")?.addEventListener("click", () => {
        const button = document.getElementById("markAttendance");
        updateButtonLoadingState(button, true);
        
        // Simulate attendance marking process
        setTimeout(() => {
            updateButtonLoadingState(button, false, true);
            setTimeout(() => {
                window.location.href = "temp-dashboard.html";
            }, 2000);
        }, 1000);
    });

    // OTP Verification Functionality
    initializeOTPVerification();

    // Sidebar functionality
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const closeBtn = document.querySelector('.sidebar .closebtn');

    function toggleSidebar() {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        const body = document.body;

        if (sidebar && overlay) {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
            body.classList.toggle('menu-open');

            // Add click event to overlay for closing
            overlay.onclick = () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                body.classList.remove('menu-open');
            };

            // Add escape key handler
            document.onkeydown = (e) => {
                if (e.key === 'Escape' && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                    body.classList.remove('menu-open');
                }
            };
        }
    }

    // Event listeners for sidebar toggle
    menuToggle?.addEventListener('click', toggleSidebar);
    closeBtn?.addEventListener('click', toggleSidebar);
    sidebarOverlay?.addEventListener('click', toggleSidebar);

    // Update active nav link based on current page
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    // Update header with user info if userData exists
    if (userData) {
        updateHeaderUserInfo(userData);
    }
});

// Language switcher (placeholder)
function switchLanguage(lang)
{
    console.log(`Switching to ${lang}`);
    // Implement language switching logic here
}

// Handle page transitions
window.addEventListener('load', () =>
{
    setTimeout(() =>
    {
        const transition = document.querySelector('.page-transition');
        if (transition)
        {
            transition.style.display = 'none';
        }
    }, 2000);
});

// Initialize Lucide icons
function initializeLucideIcons() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        console.warn('Lucide library not loaded');
        // Load Lucide dynamically if not available
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js';
        script.onload = () => {
            console.log('Lucide library loaded dynamically');
            lucide.createIcons();
        };
        document.head.appendChild(script);
    }
}

// Check if geolocation is available
function checkGeolocationSupport() {
    if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return false;
    }
    return true;
}

// Handle geolocation errors
function handleGeolocationError(error) {
    let errorMessage;
    switch(error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = "Location permission was denied.";
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
        case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        default:
            errorMessage = "An unknown error occurred.";
    }
    alert(errorMessage);
}

// Get geolocation
function getGeolocation(successCallback) {
    if (!checkGeolocationSupport()) {
        alert("Geolocation is only available in secure contexts (HTTPS or localhost). Please use HTTPS or run locally.");
        return;
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            successCallback,
            handleGeolocationError,
            { enableHighAccuracy: true }
        );
    } else {
        alert("Geolocation is not supported by your browser.");
    }
}

// Initialize slider functionality
function initializeSlider() {
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');
    const bottomNav = document.querySelector('.bottom-nav');

    if (menuToggle && sidebar && sidebarOverlay) {
        // Initially hide sidebar on mobile
        if (window.innerWidth <= 768) {
            sidebar.style.transform = 'translateX(-100%)';
        }

        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            sidebar.style.transform = sidebar.style.transform === 'translateX(0px)' ? 
                'translateX(-100%)' : 'translateX(0)';
            sidebarOverlay.classList.toggle('active');
            
            // Ensure bottom nav is visible when sidebar is open
            if (bottomNav) {
                bottomNav.style.visibility = sidebar.style.transform === 'translateX(0px)' ? 'visible' : 'hidden';
            }
        });

        sidebarOverlay.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            sidebar.style.transform = 'translateX(-100%)';
            sidebarOverlay.classList.remove('active');
            
            // Hide bottom nav when sidebar is closed
            if (bottomNav) {
                bottomNav.style.visibility = 'hidden';
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                sidebar.style.transform = 'translateX(0)';
                sidebarOverlay.classList.remove('active');
                
                // Show bottom nav on larger screens
                if (bottomNav) {
                    bottomNav.style.visibility = 'visible';
                }
            } else {
                if (!menuToggle.classList.contains('active')) {
                    sidebar.style.transform = 'translateX(-100%)';
                    
                    // Hide bottom nav on smaller screens when sidebar is closed
                    if (bottomNav) {
                        bottomNav.style.visibility = 'hidden';
                    }
                }
            }
        });

        // Handle logout
        const logoutBtn = document.getElementById('logoutBtn');
        const headerLogoutBtn = document.getElementById('headerLogoutBtn');
        
        const handleLogout = () => {
            sessionStorage.removeItem('userData');
            window.location.href = '/FrontEnd/components/login.html';
        };

        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        if (headerLogoutBtn) headerLogoutBtn.addEventListener('click', handleLogout);
    }
}

// Initialize dashboard functionality
function initializeDashboard() {
    const userData = JSON.parse(sessionStorage.getItem('userData'));
    if (!userData) {
        window.location.href = '../../components/login.html';
        return;
    }

    // Initialize calendar if on dashboard page
    if (document.getElementById('calendarDays')) {
        initializeCalendar();
    }

    // Generate attendance calendar
    const calendar = document.getElementById('attendanceCalendar');
    if (calendar) {
        const days = 52 * 7; // One year of days
        
        for (let i = 0; i < days; i++) {
            const day = document.createElement('div');
            day.className = 'calendar-day';
            
            // Randomly assign attendance for demo
            const random = Math.random();
            if (random > 0.8) {
                day.classList.add('absent');
            } else if (random > 0.3) {
                day.classList.add('present');
            }
            
            // Add tooltip with date
            const date = new Date();
            date.setDate(date.getDate() - (days - i));
            day.title = date.toLocaleDateString();
            
            calendar.appendChild(day);
        }
    }
}

// Theme initialization
function initializeTheme() {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    const currentTheme = localStorage.getItem('theme');
    
    if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
    } else if (currentTheme === 'dark') {
        document.body.classList.remove('light-theme');
    } else if (prefersDarkScheme.matches) {
        document.body.classList.remove('light-theme');
    }

    // Create and append theme toggle button
    const themeToggle = document.createElement('button');
    themeToggle.className = 'theme-toggle';
    themeToggle.setAttribute('aria-label', 'Toggle theme');
    themeToggle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
      </svg>
    `;
    document.body.appendChild(themeToggle);

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
        updateThemeIcon();
    });

    updateThemeIcon();
}

// Update theme icon
function updateThemeIcon() {
    const themeToggle = document.querySelector('.theme-toggle');
    if (!themeToggle) return;

    const isLight = document.body.classList.contains('light-theme');
    themeToggle.innerHTML = isLight ? `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
    ` : `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
        </svg>
    `;
}

// Initialize cursor
    function initializeCursor() {
        const cursor = document.querySelector('.cursor');
    if (!cursor) return;
    
    let isVisible = true;
        
    // Main cursor movement
        document.addEventListener('mousemove', (e) => {
        if (!isVisible) {
            cursor.style.opacity = '1';
            isVisible = true;
        }
        requestAnimationFrame(() => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        });

    // Handle cursor visibility
        document.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
        isVisible = false;
        });

        document.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
        isVisible = true;
        });

        // Add hover effect to all interactive elements
    const interactiveElements = document.querySelectorAll(`
        a, button, .signup-option, .alert-card, .class-card,
        .action-btn, .profile-trigger, .dropdown-item,
        .nav-link, .menu-toggle, .theme-toggle,
        input[type="submit"], input[type="button"],
        .department-item, .notification-item
    `);

        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1.5)';
            cursor.style.backgroundColor = 'var(--color-accent)';
            });
            
            el.addEventListener('mouseleave', () => {
                cursor.style.transform = 'translate(-50%, -50%) scale(1)';
            cursor.style.backgroundColor = '#27bba9';
        });
    });

    // Ensure cursor is visible after page transition
    setTimeout(() => {
        const transition = document.querySelector('.page-transition');
        if (transition) {
            transition.style.pointerEvents = 'none';
        }
        cursor.style.opacity = '1';
    }, 2000);
}

// Update button loading state
function updateButtonLoadingState(button, isLoading, success = false) {
    if (isLoading) {
        button.disabled = true;
        const originalText = button.textContent;
        button.dataset.originalText = originalText;
        button.innerHTML = `
            <div class="checkmark-container">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <path class="checkmark-path" d="M14 27 L22 35 L38 15" />
                </svg>
            </div>
        `;
    } else if (success) {
        button.innerHTML = `
            <div class="checkmark-container">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <path class="checkmark-path" d="M14 27 L22 35 L38 15" />
                </svg>
            </div>
        `;
        setTimeout(() => {
            button.textContent = button.dataset.originalText;
            button.disabled = false;
        }, 2000);
    } else {
        button.textContent = button.dataset.originalText;
        button.disabled = false;
    }
}

// OTP Verification Functionality
function initializeOTPVerification() {
    const inputs = document.querySelectorAll('.otp-input');
    const verifyBtn = document.getElementById('verifyBtn');
    const resendLink = document.getElementById('resendLink');
    const timerDisplay = document.getElementById('timer');
    let resendTimeout = 30;

    if (!inputs.length) return; // Return if not on OTP page

    // Auto-focus and move to next input
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1) {
                if (index < inputs.length - 1) {
                    inputs[index + 1].focus();
                }
            }
            checkComplete();
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });

    // Check if OTP is complete
    function checkComplete() {
        const complete = Array.from(inputs).every(input => input.value.length === 1);
        verifyBtn.disabled = !complete;
    }

    // Handle verification
    verifyBtn?.addEventListener('click', async () => {
        const otp = Array.from(inputs).map(input => input.value).join('');
        verifyBtn.disabled = true;
        
        // Show loading state
        verifyBtn.innerHTML = `
            <div class="checkmark-container">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <path class="checkmark-path" d="M14 27 L22 35 L38 15" />
                </svg>
            </div>
        `;

        // Simulate verification (replace with actual verification)
    setTimeout(() => {
            // Get user role from session storage
            const userData = JSON.parse(sessionStorage.getItem('userData'));
            let redirectUrl = '../users/at/at-dashboard.html'; // Default to attendee dashboard

            if (userData && userData.role) {
                switch (userData.role) {
                    case 'supervisor':
                        redirectUrl = '../users/sup/sup-dashboard.html';
                        break;
                    case 'organization':
                        redirectUrl = '../users/org/org-dashboard.html';
                        break;
                }
            }
            
            // Redirect to appropriate dashboard
            window.location.href = redirectUrl;
    }, 2000);
});

    // Handle resend timer
    function updateTimer() {
        if (resendTimeout > 0) {
            timerDisplay.textContent = `Resend available in ${resendTimeout}s`;
            resendTimeout--;
            setTimeout(updateTimer, 1000);
        } else {
            timerDisplay.textContent = '';
            resendLink.style.display = 'inline';
        }
    }

    // Handle resend
    resendLink?.addEventListener('click', (e) => {
        e.preventDefault();
        resendLink.style.display = 'none';
        resendTimeout = 30;
        updateTimer();
        
        // Simulate sending new OTP
        console.log('Resending OTP...');
    });

    // Start initial timer
    updateTimer();
}

// Update header with user info
function updateHeaderUserInfo(userData) {
    const headerUsername = document.getElementById('headerUsername');
    const dropdownProfileName = document.getElementById('dropdownProfileName');
    const dropdownProfileEmail = document.getElementById('dropdownProfileEmail');

    if (headerUsername) {
        headerUsername.textContent = userData.fullName || userData.organizationName || 'User';
    }
    if (dropdownProfileName) {
        dropdownProfileName.textContent = userData.fullName || userData.organizationName || 'User';
    }
    if (dropdownProfileEmail) {
        dropdownProfileEmail.textContent = userData.email || '';
    }
}

// Handle Login
async function handleLogin(email, password) {
    console.log('Attempting login for email:', email);
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Sign in successful:', userCredential);
        const user = userCredential.user;

        // Get user role and data
        const collections = ['attendees', 'supervisors', 'organizations'];
        let userData = null;
        let userRole = null;
        let redirectUrl = '';

        for (const collection of collections) {
            console.log('Checking collection:', collection);
            const docRef = db.collection(collection).doc(user.uid);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                userData = docSnap.data();
                userRole = collection.slice(0, -1); // Remove 's' from the end
                console.log('Found user data in collection:', collection);
                break;
            }
        }

        if (!userData) {
            console.error('No user data found in any collection');
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
                console.error('Invalid user role:', userRole);
                throw new Error('Invalid user role');
        }

        console.log('Login successful, redirecting to:', redirectUrl);
        return {
            success: true,
            message: 'Login successful!',
            userData,
            redirectUrl
        };
    } catch (error) {
        console.error('Detailed login error:', error);
        if (error.code) {
            console.error('Firebase error code:', error.code);
        }
        return {
            success: false,
            message: getErrorMessage(error)
        };
    }
}

// Helper function to get user-friendly error messages
function getErrorMessage(error) {
    console.log('Getting error message for:', error);
    if (!error.code && error.message) {
        return error.message;
    }
    
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
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection.';
        case 'auth/too-many-requests':
            return 'Too many failed attempts. Please try again later.';
        case 'auth/invalid-credential':
            return 'Invalid login credentials. Please check your email and password.';
        default:
            console.error('Unhandled error code:', error.code);
            return `Login error: ${error.message || 'Please try again.'}`;
    }
}

// Initialize login form handlers if on login page
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    const modal = document.getElementById('resetPasswordModal');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    const closeModal = document.querySelector('.close-modal');
    const resetForm = document.getElementById('resetPasswordForm');
    const resetErrorMessage = document.getElementById('resetErrorMessage');
    const resetSuccessMessage = document.getElementById('resetSuccessMessage');

    // Handle Login Form Submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitButton = e.target.querySelector('button[type="submit"]');
        const errorMessage = document.getElementById('errorMessage');
        const successMessage = document.getElementById('successMessage');
        
        // Reset messages
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        
        // Validate input
        if (!email || !password) {
            errorMessage.textContent = 'Please enter both email and password.';
            errorMessage.style.display = 'block';
            return;
        }
        
        // Disable submit button
        submitButton.disabled = true;
        submitButton.textContent = 'Logging in...';

        try {
            console.log('Starting login process...');
            const result = await handleLogin(email, password);
            console.log('Login result:', result);
            
            if (result.success) {
                successMessage.textContent = result.message;
                successMessage.style.display = 'block';
                // Store user data in sessionStorage
                sessionStorage.setItem('userData', JSON.stringify(result.userData));
                // Redirect to dashboard
                window.location.href = result.redirectUrl;
            } else {
                errorMessage.textContent = result.message;
                errorMessage.style.display = 'block';
                submitButton.disabled = false;
                submitButton.textContent = 'Login';
            }
        } catch (error) {
            console.error('Login submission error:', error);
            errorMessage.textContent = error.message || 'An error occurred during login. Please try again.';
            errorMessage.style.display = 'block';
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    });

    // Handle Forgot Password Link Click
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            if (modal) {
                // Pre-fill email if it's already entered in the login form
                const loginEmail = document.getElementById('email').value;
                if (loginEmail) {
                    document.getElementById('resetEmail').value = loginEmail;
                }
                modal.style.display = 'flex';
                setTimeout(() => modal.classList.add('active'), 10);
            }
        });
    }

    // Handle Modal Close Button Click
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    // Reset form and messages when closing
                    if (resetForm) {
                        resetForm.reset();
                        if (resetErrorMessage) resetErrorMessage.style.display = 'none';
                        if (resetSuccessMessage) resetSuccessMessage.style.display = 'none';
                    }
                }, 300);
            }
        });
    }

    // Handle Click Outside Modal to Close
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => {
                    modal.style.display = 'none';
                    // Reset form and messages when closing
                    if (resetForm) {
                        resetForm.reset();
                        if (resetErrorMessage) resetErrorMessage.style.display = 'none';
                        if (resetSuccessMessage) resetSuccessMessage.style.display = 'none';
                    }
                }, 300);
            }
        });
    }

    // Handle Reset Password Form Submit
    if (resetForm) {
        resetForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('resetEmail').value;
            const submitButton = resetForm.querySelector('button[type="submit"]');
            
            // Reset messages
            if (resetErrorMessage) resetErrorMessage.style.display = 'none';
            if (resetSuccessMessage) resetSuccessMessage.style.display = 'none';
            
            // Disable submit button and show loading state
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

            try {
                if (!auth) {
                    throw new Error('Firebase authentication is not initialized');
                }
                await auth.sendPasswordResetEmail(email);
                if (resetSuccessMessage) {
                    resetSuccessMessage.textContent = 'Password reset link sent! Please check your email (including spam folder).';
                    resetSuccessMessage.style.display = 'block';
                }
                
                // Close modal after 3 seconds
                setTimeout(() => {
                    if (modal) {
                        modal.classList.remove('active');
                        setTimeout(() => {
                            modal.style.display = 'none';
                            resetForm.reset();
                        }, 300);
                    }
                }, 3000);
            } catch (error) {
                console.error('Error sending reset email:', error);
                if (resetErrorMessage) {
                    resetErrorMessage.textContent = getErrorMessage(error);
                    resetErrorMessage.style.display = 'block';
                }
            } finally {
                submitButton.disabled = false;
                submitButton.innerHTML = 'Send Reset Link';
            }
        });
    }
}

// Custom cursor fix: smooth follow, touch detection, hover/click states
(function () {
  const cursorEl = document.querySelector('.cursor');
  if (!cursorEl) return;

  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (isTouch) {
    // On touch devices, remove visual custom cursor and keep native behavior
    cursorEl.style.display = 'none';
    document.body.classList.remove('has-custom-cursor');
    return;
  }

  document.body.classList.add('has-custom-cursor');

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let posX = mouseX;
  let posY = mouseY;
  const ease = 0.18; // lower = slower follow

  let rafId = null;

  function onMove(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    // ensure cursor visible when moving
    cursorEl.style.display = 'block';
  }

  function loop() {
    const dx = mouseX - posX;
    const dy = mouseY - posY;
    posX += dx * ease;
    posY += dy * ease;

    cursorEl.style.left = posX + 'px';
    cursorEl.style.top = posY + 'px';

    rafId = requestAnimationFrame(loop);
  }

  // Start loop
  if (!rafId) rafId = requestAnimationFrame(loop);
  window.addEventListener('mousemove', onMove, { passive: true });

  // Click states
  window.addEventListener('mousedown', () => cursorEl.classList.add('cursor--active'));
  window.addEventListener('mouseup', () => cursorEl.classList.remove('cursor--active'));

  // Hover states for interactive elements
  const interactiveSelector = 'a, button, input, textarea, select, [role="button"], .cta-button';
  function addHoverListeners() {
    document.querySelectorAll(interactiveSelector).forEach(el => {
      el.addEventListener('mouseenter', () => cursorEl.classList.add('cursor--hover'));
      el.addEventListener('mouseleave', () => {
        cursorEl.classList.remove('cursor--hover');
        cursorEl.classList.remove('cursor--active');
      });
      // Ensure keyboard focus also shows hover state
      el.addEventListener('focus', () => cursorEl.classList.add('cursor--hover'));
      el.addEventListener('blur', () => cursorEl.classList.remove('cursor--hover'));
    });
  }

  // Initially attach listeners, and re-attach if DOM changes (basic fallback)
  addHoverListeners();

  // Observe DOM for interactive elements added later (e.g. dynamic content)
  const observer = new MutationObserver(() => addHoverListeners());
  observer.observe(document.body, { childList: true, subtree: true });

  // Clean up when page unloads
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('mousemove', onMove);
  });
})();
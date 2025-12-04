/**
 * Cookie Management System for UniMark
 * Handles cookie consent, preferences, and integration with user accounts
 */

// Global initialization flag
let cookieManagerInitialized = false;

class CookieManager {
    constructor() {
        // Check if already initialized
        if (cookieManagerInitialized) {
            console.warn('CookieManager already initialized, skipping duplicate initialization');
            return;
        }
        
        this.cookieCategories = {
            essential: { name: 'Essential', description: 'Required for website functionality', required: true },
            functional: { name: 'Functional', description: 'Remembers your preferences and settings' },
            analytics: { name: 'Analytics', description: 'Tracks site usage and performance' },
            marketing: { name: 'Marketing', description: 'Enables targeted advertising' }
        };
        
        this.consentCookieName = 'unimark_cookie_consent';
        this.preferenceCookieName = 'unimark_preferences';
        this.accessibilityCookieName = 'unimark_accessibility';
        this.consentExpiryDays = 180; // 6 months
        
        // Mark as initialized
        cookieManagerInitialized = true;
        
        // Initialize the cookie manager
        this.init();
    }
    
    init() {
        console.log('Initializing CookieManager...');
        
        // Variable to track if initial check has completed
        this.initialCheckComplete = false;
        
        // Check if consent has been given
        if (!this.hasConsent()) {
            console.log('No cookie consent detected, showing popup');
            // Use a small delay to prevent multiple popups during page initialization
            setTimeout(() => {
                if (!this.initialCheckComplete && !this.hasConsent()) {
                    this.showConsentPopup();
                    this.initialCheckComplete = true;
                }
            }, 1000);
        } else {
            console.log('Cookie consent detected');
            this.initialCheckComplete = true;
            // Apply saved accessibility settings if they exist
            this.applyAccessibilitySettings();
        }
        
        // Add event listener for the cookie settings footer link
        document.addEventListener('DOMContentLoaded', () => {
            const cookieSettingsLinks = document.querySelectorAll('.cookie-settings-link');
            cookieSettingsLinks.forEach(link => {
                // Remove existing listener if any (to prevent duplicates)
                const newLink = link.cloneNode(true);
                link.parentNode.replaceChild(newLink, link);
                
                newLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showConsentPopup();
                });
            });
        });
    }
    
    hasConsent() {
        return this.getCookie(this.consentCookieName) !== null;
    }
    
    /**
     * Get cookie value by name
     */
    getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? decodeURIComponent(match[2]) : null;
    }
    
    /**
     * Set cookie with name, value and expiry days
     */
    setCookie(name, value, days, options = {}) {
        const secure = location.protocol === 'https:' ? '; secure' : '';
        const httpOnly = options.httpOnly ? '; httpOnly' : '';
        const sameSite = options.sameSite ? `; sameSite=${options.sameSite}` : '';
        
        let expires = '';
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = '; expires=' + date.toUTCString();
        }
        
        document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/' + secure + httpOnly + sameSite;
    }
    
    /**
     * Delete cookie by name
     */
    deleteCookie(name) {
        this.setCookie(name, '', -1);
    }
    
    /**
     * Save user consent preferences
     */
    saveConsent(preferences) {
        // Always include essential cookies
        preferences.essential = true;
        
        // Save consent in cookie with a secure setting
        this.setCookie(
            this.consentCookieName, 
            JSON.stringify(preferences), 
            this.consentExpiryDays,
            { sameSite: 'Lax' } // Improved security
        );
        
        // Save timestamp for GDPR compliance
        const consentData = {
            preferences: preferences,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
        
        // Save consent data to local storage as backup
        localStorage.setItem('unimark_cookie_preferences', JSON.stringify(consentData));
        
        // Apply the preferences right away
        this.applyConsentPreferences(preferences);
        
        console.log('Cookie consent preferences saved:', preferences);
        return consentData;
    }
    
    /**
     * Get current consent preferences
     */
    getConsentPreferences() {
        const consentCookie = this.getCookie(this.consentCookieName);
        if (consentCookie) {
            try {
                return JSON.parse(consentCookie);
            } catch (e) {
                console.error('Error parsing consent cookie:', e);
            }
        }
        
        // Default preferences (essential only)
        return {
            essential: true,
            functional: false,
            analytics: false,
            marketing: false
        };
    }
    
    /**
     * Apply consent preferences by enabling/disabling tracking
     */
    applyConsentPreferences(preferences) {
        // Apply functional cookies
        if (preferences.functional) {
            // Enable functional cookies (e.g., theme preferences)
            console.log('Functional cookies enabled');
            
            // If functional cookies are enabled, we can save accessibility settings
            this.applyAccessibilitySettings();
        } else {
            // Disable functional cookies
            console.log('Functional cookies disabled');
            // Remove accessibility cookies if functional cookies are disabled
            this.deleteCookie(this.accessibilityCookieName);
        }
        
        // Apply analytics cookies
        if (preferences.analytics) {
            // Enable analytics (e.g., Google Analytics)
            console.log('Analytics cookies enabled');
        } else {
            // Disable analytics
            console.log('Analytics cookies disabled');
        }
        
        // Apply marketing cookies
        if (preferences.marketing) {
            // Enable marketing cookies
            console.log('Marketing cookies enabled');
        } else {
            // Disable marketing cookies
            console.log('Marketing cookies disabled');
        }
    }
    
    /**
     * Save accessibility settings to cookies
     */
    saveAccessibilitySettings(settings) {
        // Get current consent preferences
        const preferences = this.getConsentPreferences();
        
        // Only save if functional cookies are enabled
        if (preferences.functional) {
            this.setCookie(
                this.accessibilityCookieName,
                JSON.stringify(settings),
                this.consentExpiryDays
            );
            console.log('Accessibility settings saved to cookie');
        } else {
            console.log('Cannot save accessibility settings: functional cookies disabled');
        }
    }
    
    /**
     * Apply saved accessibility settings from cookies
     */
    applyAccessibilitySettings() {
        const accessibilityCookie = this.getCookie(this.accessibilityCookieName);
        if (accessibilityCookie) {
            try {
                const settings = JSON.parse(accessibilityCookie);
                console.log('Applying saved accessibility settings:', settings);
                
                // Apply theme if it exists
                if (settings.theme) {
                    document.body.classList.toggle('light-theme', settings.theme === 'light');
                }
                
                // Apply font size if it exists
                if (settings.fontSize) {
                    document.documentElement.style.fontSize = settings.fontSize;
                }
                
                // Apply high contrast if it exists
                if (settings.highContrast) {
                    document.body.classList.toggle('high-contrast', settings.highContrast);
                }
                
                // Apply dyslexic font if it exists
                if (settings.dyslexicFont) {
                    document.body.classList.toggle('dyslexic-font', settings.dyslexicFont);
                }
                
                // Apply reduced motion if it exists
                if (settings.reducedMotion) {
                    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
                }
                
                // Dispatch event to notify the accessibility system
                document.dispatchEvent(new CustomEvent('accessibilitySettingsApplied', { detail: settings }));
            } catch (e) {
                console.error('Error parsing accessibility cookie:', e);
            }
        }
    }
    
    /**
     * Handle user logout
     */
    handleLogout() {
        // Clear ALL cookies related to authentication
        this.deleteAllCookies(false); // Don't keep any cookies, including essential ones
        
        // Clear all possible Firebase auth persistence data
        if (typeof firebase !== 'undefined') {
            // Clear any Firebase auth local storage data 
            // Loop through all storage to find all Firebase auth entries
            Object.keys(localStorage).forEach(key => {
                if (key.includes('firebase:authUser') || 
                    key.includes('firebase:previous') || 
                    key.includes('firebaseui') ||
                    key.includes('firebase-auth')) {
                    localStorage.removeItem(key);
                }
            });
            
            // Clear IndexedDB if possible
            try {
                const dbName = 'firebaseLocalStorageDb';
                const request = indexedDB.deleteDatabase(dbName);
                request.onsuccess = () => console.log('IndexedDB storage cleared');
                request.onerror = () => console.error('Error clearing IndexedDB');
            } catch (e) {
                console.error('Error accessing IndexedDB:', e);
            }
        }
        
        // Clear session storage - do this thoroughly
        Object.keys(sessionStorage).forEach(key => {
            sessionStorage.removeItem(key);
        });
        
        // Sign out from Firebase if available
        if (typeof firebase !== 'undefined' && firebase.auth) {
            try {
                firebase.auth().signOut()
                .then(() => {
                    console.log('User signed out successfully');
                    // Add a delay to ensure all cleanup is done before redirect
                    setTimeout(() => {
                        window.location.href = '/FrontEnd/components/login.html';
                    }, 200);
                })
                .catch(error => {
                    console.error('Error during signout process:', error);
                    // Still redirect even if there's an error
                    setTimeout(() => {
                        window.location.href = '/FrontEnd/components/login.html';
                    }, 200);
                });
            } catch (error) {
                console.error('Error during logout:', error);
                // Redirect anyway
                setTimeout(() => {
                    window.location.href = '/FrontEnd/components/login.html';
                }, 200);
            }
        } else {
            console.warn('Firebase not available, performing basic logout');
            setTimeout(() => {
                window.location.href = '/FrontEnd/components/login.html';
            }, 200);
        }
    }
    
    /**
     * Delete all cookies (except essential ones if specified)
     */
    deleteAllCookies(keepEssential = true) {
        const cookies = document.cookie.split(';');
        
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i];
            const eqPos = cookie.indexOf('=');
            const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
            
            // Skip essential cookies if keepEssential is true
            if (keepEssential && name === this.consentCookieName) {
                continue;
            }
            
            this.deleteCookie(name);
        }
    }
    
    /**
     * Create and show the consent popup
     */
    showConsentPopup() {
        // Check if consent popup already exists to prevent duplicates
        if (document.querySelector('.cookie-consent-modal')) {
            console.log('Cookie consent modal already open, not showing another one');
            return;
        }
        
        // Get current preferences
        const currentPreferences = this.getConsentPreferences();
        
        // Create modal container
        const modalContainer = document.createElement('div');
        modalContainer.className = 'cookie-consent-modal';
        modalContainer.id = 'cookieConsentModal'; // Add ID for easier tracking
        modalContainer.innerHTML = `
            <div class="cookie-consent-overlay"></div>
            <div class="cookie-consent-popup">
                <div class="cookie-consent-header">
                    <h2>Cookie Preferences</h2>
                    <button class="cookie-consent-close"><i class="fas fa-times"></i></button>
                </div>
                <div class="cookie-consent-content">
                    <p>We use cookies to enhance your experience, remember your preferences, and analyze site traffic.</p>
                    
                    <div class="cookie-categories">
                        ${this.generateCategoryHTML(currentPreferences)}
                    </div>
                    
                    <div class="cookie-consent-actions">
                        <button class="cookie-btn cookie-btn-primary cookie-accept-all">Accept All</button>
                        <button class="cookie-btn cookie-btn-secondary cookie-essential-only">Essential Only</button>
                        <button class="cookie-btn cookie-btn-secondary cookie-customize-toggle">Customize</button>
                    </div>
                    
                    <div class="cookie-customize-section" style="display: none;">
                        <div class="cookie-toggles">
                            ${this.generateToggleHTML(currentPreferences)}
                        </div>
                        <button class="cookie-btn cookie-btn-primary cookie-save-preferences">Save Preferences</button>
                    </div>
                    
                    <div class="cookie-learn-more">
                        <a href="/FrontEnd/components/cookie-policy.html">Learn More</a>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modalContainer);
        
        // Add event listeners
        this.addConsentPopupListeners(modalContainer);
        
        // Show the modal with animation
        setTimeout(() => {
            modalContainer.classList.add('active');
        }, 10);
    }
    
    /**
     * Generate HTML for cookie categories
     */
    generateCategoryHTML(preferences) {
        return Object.entries(this.cookieCategories).map(([key, category]) => {
            return `
                <div class="cookie-category">
                    <h3>${category.name}</h3>
                    <p>${category.description}</p>
                    ${category.required ? '<span class="cookie-required">Required</span>' : ''}
                </div>
            `;
        }).join('');
    }
    
    /**
     * Generate HTML for cookie toggles
     */
    generateToggleHTML(preferences) {
        return Object.entries(this.cookieCategories).map(([key, category]) => {
            const checked = preferences[key] ? 'checked' : '';
            const disabled = category.required ? 'disabled' : '';
            
            return `
                <div class="cookie-toggle">
                    <label for="cookie-${key}">
                        <span class="toggle-label">${category.name}</span>
                        <div class="toggle-switch">
                            <input type="checkbox" id="cookie-${key}" name="cookie-${key}" ${checked} ${disabled}>
                            <span class="toggle-slider"></span>
                        </div>
                    </label>
                    <p>${category.description}</p>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Add event listeners to the consent popup
     */
    addConsentPopupListeners(modalContainer) {
        // Close button
        const closeBtn = modalContainer.querySelector('.cookie-consent-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeConsentPopup(modalContainer);
            });
        }
        
        // Accept all button
        const acceptAllBtn = modalContainer.querySelector('.cookie-accept-all');
        if (acceptAllBtn) {
            acceptAllBtn.addEventListener('click', () => {
                const preferences = {
                    essential: true,
                    functional: true,
                    analytics: true,
                    marketing: true
                };
                
                this.saveConsent(preferences);
                this.closeConsentPopup(modalContainer);
                this.applyConsentPreferences(preferences);
            });
        }
        
        // Essential only button
        const essentialOnlyBtn = modalContainer.querySelector('.cookie-essential-only');
        if (essentialOnlyBtn) {
            essentialOnlyBtn.addEventListener('click', () => {
                const preferences = {
                    essential: true,
                    functional: false,
                    analytics: false,
                    marketing: false
                };
                
                this.saveConsent(preferences);
                this.closeConsentPopup(modalContainer);
                this.applyConsentPreferences(preferences);
            });
        }
        
        // Customize toggle
        const customizeBtn = modalContainer.querySelector('.cookie-customize-toggle');
        const customizeSection = modalContainer.querySelector('.cookie-customize-section');
        
        if (customizeBtn && customizeSection) {
            customizeBtn.addEventListener('click', () => {
                const isVisible = customizeSection.style.display !== 'none';
                customizeSection.style.display = isVisible ? 'none' : 'block';
                customizeBtn.textContent = isVisible ? 'Customize' : 'Hide Options';
            });
        }
        
        // Save preferences button
        const savePrefsBtn = modalContainer.querySelector('.cookie-save-preferences');
        if (savePrefsBtn) {
            savePrefsBtn.addEventListener('click', () => {
                const preferences = {
                    essential: true, // Always required
                    functional: modalContainer.querySelector('#cookie-functional').checked,
                    analytics: modalContainer.querySelector('#cookie-analytics').checked,
                    marketing: modalContainer.querySelector('#cookie-marketing').checked
                };
                
                this.saveConsent(preferences);
                this.closeConsentPopup(modalContainer);
                this.applyConsentPreferences(preferences);
            });
        }
    }
    
    /**
     * Close the consent popup
     */
    closeConsentPopup(modalContainer) {
        modalContainer.classList.remove('active');
        setTimeout(() => {
            document.body.removeChild(modalContainer);
        }, 300); // Match transition duration
    }
}

// Initialize cookie manager
const cookieManager = new CookieManager();

// Export for global use
window.cookieManager = cookieManager;

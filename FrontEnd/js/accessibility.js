/**
 * Accessibility Feature Manager
 * Handles all accessibility settings and applies them sitewide
 */

// Define default settings
const defaultSettings = {
    dyslexiaFontEnabled: false,
    fontSize: 'normal',
    letterSpacing: 'standard',
    simplifiedLayout: false,
    highContrast: false,
    colorTheme: 'default',
    reduceAnimations: false,
    highlightLinks: false,
    simplifiedInterface: false,
    enhancedFocus: false,
    targetSize: 'standard',
    contentWidth: 'standard'
};

// Store for current settings
let accessibilitySettings = {};

// Initialize settings on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeAccessibilitySettings();
    setupAccessibilityControls();
    setupModalFunctionality();
});

/**
 * Load saved accessibility settings and apply them
 */
function initializeAccessibilitySettings() {
    // Load settings from localStorage or use defaults
    accessibilitySettings = {
        ...defaultSettings,
        ...loadSettingsFromStorage()
    };

    // Apply all loaded settings
    applyAllSettings();

    // Update UI controls to match current settings
    updateUIControls();
}

/**
 * Load settings from localStorage
 */
function loadSettingsFromStorage() {
    try {
        const savedSettings = localStorage.getItem('accessibilitySettings');
        return savedSettings ? JSON.parse(savedSettings) : {};
    } catch (error) {
        console.error('Error loading accessibility settings:', error);
        return {};
    }
}

/**
 * Save current settings to localStorage
 */
function saveSettingsToStorage() {
    try {
        localStorage.setItem('accessibilitySettings', JSON.stringify(accessibilitySettings));
    } catch (error) {
        console.error('Error saving accessibility settings:', error);
    }
}

/**
 * Apply all accessibility settings to the page
 */
function applyAllSettings() {
    // Apply dyslexia font
    if (accessibilitySettings.dyslexiaFontEnabled) {
        document.body.classList.add('dyslexia-font');
    } else {
        document.body.classList.remove('dyslexia-font');
    }

    // Apply font size
    document.body.classList.remove('font-size-normal', 'font-size-large', 'font-size-xlarge');
    document.body.classList.add(`font-size-${accessibilitySettings.fontSize}`);

    // Apply letter spacing
    document.body.classList.remove('letter-spacing-standard', 'letter-spacing-wider', 'letter-spacing-maximum');
    document.body.classList.add(`letter-spacing-${accessibilitySettings.letterSpacing}`);

    // Apply simplified paragraph layout
    if (accessibilitySettings.simplifiedLayout) {
        document.body.classList.add('simplified-layout');
    } else {
        document.body.classList.remove('simplified-layout');
    }

    // Apply high contrast
    if (accessibilitySettings.highContrast) {
        document.body.classList.add('high-contrast');
    } else {
        document.body.classList.remove('high-contrast');
    }

    // Apply color theme
    document.body.classList.remove('theme-default', 'theme-dark', 'theme-light', 'theme-yellowBlue');
    document.body.classList.add(`theme-${accessibilitySettings.colorTheme}`);

    // Apply reduce animations
    if (accessibilitySettings.reduceAnimations) {
        document.body.classList.add('reduce-animations');
    } else {
        document.body.classList.remove('reduce-animations');
    }

    // Apply highlight links
    if (accessibilitySettings.highlightLinks) {
        document.body.classList.add('highlight-links');
    } else {
        document.body.classList.remove('highlight-links');
    }

    // Apply simplified interface
    if (accessibilitySettings.simplifiedInterface) {
        document.body.classList.add('simplified-interface');
    } else {
        document.body.classList.remove('simplified-interface');
    }

    // Apply enhanced focus indicators
    if (accessibilitySettings.enhancedFocus) {
        document.body.classList.add('enhanced-focus');
    } else {
        document.body.classList.remove('enhanced-focus');
    }

    // Apply target size
    document.body.classList.remove('target-size-standard', 'target-size-large', 'target-size-xlarge');
    document.body.classList.add(`target-size-${accessibilitySettings.targetSize}`);

    // Apply content width
    document.body.classList.remove('content-width-standard', 'content-width-narrow', 'content-width-veryNarrow');
    document.body.classList.add(`content-width-${accessibilitySettings.contentWidth}`);
}

/**
 * Update UI controls to match current settings
 */
function updateUIControls() {
    // Toggle switches
    const toggleControls = {
        dyslexiaFont: 'dyslexiaFontEnabled',
        simplifiedLayout: 'simplifiedLayout',
        highContrast: 'highContrast',
        reduceAnimations: 'reduceAnimations',
        highlightLinks: 'highlightLinks',
        simplifiedInterface: 'simplifiedInterface',
        enhancedFocus: 'enhancedFocus'
    };

    // Update toggle switches
    Object.entries(toggleControls).forEach(([controlId, settingKey]) => {
        const control = document.getElementById(controlId);
        if (control) {
            control.checked = accessibilitySettings[settingKey];
        }
    });

    // Radio button groups
    const radioGroups = {
        fontSize: 'fontSize',
        letterSpacing: 'letterSpacing',
        colorTheme: 'colorTheme',
        targetSize: 'targetSize',
        contentWidth: 'contentWidth'
    };

    // Update radio buttons
    Object.entries(radioGroups).forEach(([groupName, settingKey]) => {
        const value = accessibilitySettings[settingKey];
        const radioButton = document.getElementById(`${groupName}${capitalizeFirstLetter(value)}`);
        if (radioButton) {
            radioButton.checked = true;
        }
    });
}

/**
 * Helper function to capitalize first letter of a string
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Set up event listeners for all accessibility controls
 */
function setupAccessibilityControls() {
    // Only setup controls if we're on the accessibility page
    if (!document.querySelector('.accessibility-container')) {
        return;
    }

    // Toggle switches
    setupToggleSwitches();
    
    // Radio button groups
    setupRadioGroups();
    
    // Action buttons
    setupActionButtons();
}

/**
 * Set up toggle switch event listeners
 */
function setupToggleSwitches() {
    const toggleControls = {
        dyslexiaFont: 'dyslexiaFontEnabled',
        simplifiedLayout: 'simplifiedLayout',
        highContrast: 'highContrast',
        reduceAnimations: 'reduceAnimations',
        highlightLinks: 'highlightLinks',
        simplifiedInterface: 'simplifiedInterface',
        enhancedFocus: 'enhancedFocus'
    };

    Object.entries(toggleControls).forEach(([controlId, settingKey]) => {
        const control = document.getElementById(controlId);
        if (control) {
            control.addEventListener('change', () => {
                accessibilitySettings[settingKey] = control.checked;
                applyAllSettings();
                saveSettingsToStorage();
            });
        }
    });
}

/**
 * Set up radio button group event listeners
 */
function setupRadioGroups() {
    const radioGroups = {
        fontSize: ['normal', 'large', 'xlarge'],
        letterSpacing: ['standard', 'wider', 'maximum'],
        colorTheme: ['default', 'dark', 'light', 'yellowBlue'],
        targetSize: ['standard', 'large', 'xlarge'],
        contentWidth: ['standard', 'narrow', 'veryNarrow']
    };

    Object.entries(radioGroups).forEach(([groupName, values]) => {
        values.forEach(value => {
            const radioButton = document.getElementById(`${groupName}${capitalizeFirstLetter(value)}`);
            if (radioButton) {
                radioButton.addEventListener('change', () => {
                    if (radioButton.checked) {
                        accessibilitySettings[groupName] = value;
                        applyAllSettings();
                        saveSettingsToStorage();
                    }
                });
            }
        });
    });
}

/**
 * Set up action button event listeners
 */
function setupActionButtons() {
    // Save preferences button
    const saveButton = document.getElementById('saveAccessibilityPreferences');
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            saveSettingsToStorage();
            showNotification('Preferences saved successfully!');
        });
    }

    // Reset to defaults button
    const resetButton = document.getElementById('resetAccessibilityDefaults');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all accessibility settings to their defaults?')) {
                accessibilitySettings = { ...defaultSettings };
                applyAllSettings();
                updateUIControls();
                saveSettingsToStorage();
                showNotification('Settings have been reset to defaults.');
            }
        });
    }
}

/**
 * Show a temporary notification message
 */
function showNotification(message) {
    // Check if a notification container exists, or create one
    let notificationContainer = document.querySelector('.notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        document.body.appendChild(notificationContainer);
    }

    // Create and add the notification
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    notificationContainer.appendChild(notification);

    // Show the notification with animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Remove the notification after a delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

/**
 * Set up modal functionality for the help dialog
 */
function setupModalFunctionality() {
    const helpButton = document.getElementById('accessibilityHelp');
    const helpModal = document.getElementById('accessibilityHelpModal');
    
    if (helpButton && helpModal) {
        // Open modal when help button is clicked
        helpButton.addEventListener('click', () => {
            helpModal.style.display = 'block';
            setTimeout(() => {
                helpModal.classList.add('show');
            }, 10);
        });

        // Close modal when X is clicked
        const closeButton = helpModal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', closeHelpModal);
        }

        // Close modal when clicking outside the content
        helpModal.addEventListener('click', (event) => {
            if (event.target === helpModal) {
                closeHelpModal();
            }
        });

        // Close modal with ESC key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && helpModal.classList.contains('show')) {
                closeHelpModal();
            }
        });
    }

    function closeHelpModal() {
        const helpModal = document.getElementById('accessibilityHelpModal');
        if (helpModal) {
            helpModal.classList.remove('show');
            setTimeout(() => {
                helpModal.style.display = 'none';
            }, 300);
        }
    }
} 
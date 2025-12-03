// ==UserScript==
// @name         RF Enhance
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Dark mode, focus preservation, focus overlay, and enhancements for all RF screens
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/RFEnhance.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/RFEnhance.user.js
// @author       Blake
// @match        https://scaleqa.byjasco.com/RF/*
// @match        https://scale20.byjasco.com/RF/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Check if we're on a valid RF URL
    function isValidRFUrl() {
        const url = window.location.href;
        return url.startsWith('https://scale20.byjasco.com/RF/') || 
               url.startsWith('https://scaleqa.byjasco.com/RF/');
    }

    // Check if we're on the PalletCompleteRF page
    function isPalletCompleteRFPage() {
        return window.location.pathname.includes('/PalletCompleteRF.aspx');
    }

    // Check if dark mode should be enabled
    function isDarkModeEnabled() {
        // Only apply dark mode on valid RF URLs
        if (!isValidRFUrl()) {
            return false;
        }

        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('darkmode')) {
            // Save to sessionStorage for persistence
            sessionStorage.setItem('rfDarkMode', 'enabled');
            return true;
        }

        // Check sessionStorage
        const stored = sessionStorage.getItem('rfDarkMode');
        if (stored === 'enabled') {
            return true;
        }

        return false;
    }

    // Apply instant dark mode to prevent white flash during page loads/reloads
    function applyInstantDarkMode() {
        // Apply dark background IMMEDIATELY to html and body to prevent flash
        const instantStyle = document.createElement('style');
        instantStyle.id = 'rf-dark-mode-instant';
        instantStyle.textContent = `
            html, body {
                background-color: #161616 !important;
                transition: none !important;
            }
        `;
        // Insert at the very beginning of head to apply before any other styles
        if (document.head) {
            document.head.insertBefore(instantStyle, document.head.firstChild);
        }
    }

    // Apply overlay styles (always needed, not just for dark mode)
    function applyOverlayStyles() {
        if (!document.getElementById('rf-overlay-styles')) {
            const overlayStyle = document.createElement('style');
            overlayStyle.id = 'rf-overlay-styles';
            overlayStyle.textContent = `
                /* Focus Overlay Styles */
                #rf-focus-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.7);
                    z-index: 999999;
                    display: none;
                    justify-content: center;
                    align-items: center;
                    cursor: pointer;
                }

                #rf-focus-overlay.active {
                    display: flex;
                }

                #rf-focus-overlay-message {
                    padding: 30px 50px;
                    border-radius: 10px;
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    border: 2px solid #daa520;
                }

                body.rf-dark-mode #rf-focus-overlay {
                    background-color: rgba(0, 0, 0, 0.85);
                }

                /* Pulsing animation for overlay message */
                @keyframes rf-pulse-yellow {
                    0%, 100% {
                        background-color: #b8860b;
                        color: #1a1a1a;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 215, 0, 0.5);
                        border-color: #daa520;
                    }
                    50% {
                        background-color: #ffd700;
                        color: #000;
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 215, 0, 0.9);
                        border-color: #ffed4e;
                    }
                }

                #rf-focus-overlay-message {
                    background-color: #b8860b !important;
                    color: #1a1a1a !important;
                    border-color: #daa520 !important;
                    animation: rf-pulse-yellow 3s ease-in-out infinite;
                }
            `;
            document.head.appendChild(overlayStyle);
        }
    }

    // Apply dark mode styles
    function applyDarkMode() {
        // Apply instant dark mode first to prevent flash
        applyInstantDarkMode();

        // Add dark mode class to body
        document.body.classList.add('rf-dark-mode');

        // Inject CSS if not already present
        if (!document.getElementById('rf-dark-mode-styles')) {
            const style = document.createElement('style');
            style.id = 'rf-dark-mode-styles';
            style.textContent = `
                /* RF Dark Mode Styles */
                body.rf-dark-mode {
                    background-color: #161616 !important;
                    color: white !important;
                    transition: background-color 0.3s, color 0.3s;
                }

                /* Text elements - only override if no inline color is set */
                body.rf-dark-mode label:not([style*="color"]),
                body.rf-dark-mode td:not([style*="color"]),
                body.rf-dark-mode div:not([style*="color"]),
                body.rf-dark-mode .aspNetDisabled {
                    color: white !important;
                }

                /* Spans without inline color get white, but preserve inline colors */
                body.rf-dark-mode span:not([style*="color"]) {
                    color: white !important;
                }

                /* Make dark red more visible (standard red is too dark on black) */
                body.rf-dark-mode span[style*="color:red"],
                body.rf-dark-mode span[style*="color: red"],
                body.rf-dark-mode span[style*="color:Red"],
                body.rf-dark-mode span[style*="color: Red"] {
                    color: #ff6b6b !important; /* Lighter red for readability */
                }

                /* Make dark green more visible (standard green is too dark on black) */
                body.rf-dark-mode span[style*="color:green"],
                body.rf-dark-mode span[style*="color: green"],
                body.rf-dark-mode span[style*="color:Green"],
                body.rf-dark-mode span[style*="color: Green"] {
                    color: #51cf66 !important; /* Lighter green for readability */
                }

                /* Convert black text to white (hardcoded black labels/text) */
                body.rf-dark-mode span[style*="color:black"],
                body.rf-dark-mode span[style*="color: black"],
                body.rf-dark-mode span[style*="color:Black"],
                body.rf-dark-mode span[style*="color: Black"],
                body.rf-dark-mode label[style*="color:black"],
                body.rf-dark-mode label[style*="color: black"],
                body.rf-dark-mode label[style*="color:Black"],
                body.rf-dark-mode label[style*="color: Black"],
                body.rf-dark-mode div[style*="color:black"],
                body.rf-dark-mode div[style*="color: black"],
                body.rf-dark-mode div[style*="color:Black"],
                body.rf-dark-mode div[style*="color: Black"] {
                    color: white !important; /* Convert hardcoded black to white */
                }

                /* Links should be visible */
                body.rf-dark-mode a {
                    color: #58a6ff !important;
                }

                body.rf-dark-mode a:hover {
                    color: #79c0ff !important;
                }

                /* Input fields */
                body.rf-dark-mode input[type="text"],
                body.rf-dark-mode input[type="password"],
                body.rf-dark-mode textarea,
                body.rf-dark-mode select {
                    background-color: #2d2d2d !important;
                    color: white !important;
                    border: 1px solid #444 !important;
                }

                /* Buttons */
                body.rf-dark-mode input[type="button"],
                body.rf-dark-mode input[type="submit"],
                body.rf-dark-mode button {
                    background-color: #3a3a3a !important;
                    color: white !important;
                    border: 1px solid #555 !important;
                }

                body.rf-dark-mode input[type="button"]:hover,
                body.rf-dark-mode input[type="submit"]:hover,
                body.rf-dark-mode button:hover {
                    background-color: #4a4a4a !important;
                }

                /* Disabled controls - make them clearly inactive in dark mode */
                body.rf-dark-mode input[disabled],
                body.rf-dark-mode textarea[disabled],
                body.rf-dark-mode select[disabled],
                body.rf-dark-mode button[disabled],
                body.rf-dark-mode .aspNetDisabled,
                body.rf-dark-mode input.aspNetDisabled,
                body.rf-dark-mode button.aspNetDisabled {
                    background-color: #222 !important;      /* muted background */
                    color: #8b949e !important;               /* muted text color */
                    border-color: #333 !important;           /* muted border */
                    opacity: 0.6 !important;                 /* slightly faded */
                    cursor: not-allowed !important;         /* clearly not interactive */
                    box-shadow: none !important;            /* remove focus/active shadows */
                    text-shadow: none !important;
                }

                /* Prevent hover/active styles from making disabled controls look interactive */
                body.rf-dark-mode input[disabled]:hover,
                body.rf-dark-mode textarea[disabled]:hover,
                body.rf-dark-mode select[disabled]:hover,
                body.rf-dark-mode button[disabled]:hover,
                body.rf-dark-mode .aspNetDisabled:hover,
                body.rf-dark-mode input.aspNetDisabled:hover,
                body.rf-dark-mode button.aspNetDisabled:hover {
                    background-color: #222 !important;
                    color: #8b949e !important;
                }

                /* Tables */
                body.rf-dark-mode table {
                    background-color: #161616 !important;
                }

                body.rf-dark-mode td,
                body.rf-dark-mode th {
                    border-color: #444 !important;
                }

                /* Special labels (like the blue LP label) */
                body.rf-dark-mode [style*="background:#0094ff"],
                body.rf-dark-mode [style*="background: #0094ff"] {
                    background: #0094ff !important;
                    color: white !important;
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Remove dark mode
    function removeDarkMode() {
        document.body.classList.remove('rf-dark-mode');
        sessionStorage.removeItem('rfDarkMode');
    }

    // Toggle dark mode
    function toggleDarkMode() {
        if (document.body.classList.contains('rf-dark-mode')) {
            removeDarkMode();
        } else {
            sessionStorage.setItem('rfDarkMode', 'enabled');
            applyDarkMode();
        }
    }

    // Save currently focused element
    function saveFocusedElement() {
        const activeElement = document.activeElement;
        if (activeElement && activeElement !== document.body) {
            // Save the element's ID or name for restoration
            if (activeElement.id) {
                sessionStorage.setItem('rfLastFocusedId', activeElement.id);
            } else if (activeElement.name) {
                sessionStorage.setItem('rfLastFocusedName', activeElement.name);
            }
            // Also save cursor position if it's a text input
            if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
                sessionStorage.setItem('rfLastCursorPos', activeElement.selectionStart || 0);
            }
        }
    }

    // Restore previously focused element
    function restoreFocusedElement() {
        try {
            const focusedId = sessionStorage.getItem('rfLastFocusedId');
            const focusedName = sessionStorage.getItem('rfLastFocusedName');
            const cursorPos = sessionStorage.getItem('rfLastCursorPos');

            let elementToFocus = null;

            if (focusedId) {
                elementToFocus = document.getElementById(focusedId);
            } else if (focusedName) {
                elementToFocus = document.querySelector(`[name="${focusedName}"]`);
            }

            if (elementToFocus) {
                elementToFocus.focus();
                console.log('[RF Enhance] Focus restored to:', elementToFocus.id || elementToFocus.name);

                // Restore cursor position
                if (cursorPos && (elementToFocus.tagName === 'INPUT' || elementToFocus.tagName === 'TEXTAREA')) {
                    const pos = parseInt(cursorPos, 10);
                    elementToFocus.setSelectionRange(pos, pos);
                }
            }
        } catch (e) {
            console.warn('[RF Enhance] Could not restore focus:', e);
        }
    }

    // Set up beforeunload handler to save focus
    function setupFocusPreservation() {
        // Save focus before page unloads (e.g., during refresh)
        window.addEventListener('beforeunload', saveFocusedElement);
        
        // Also save focus periodically in case of unexpected reloads
        setInterval(saveFocusedElement, 1000);
    }

    // Track the currently focused input field
    let lastFocusedField = null;
    let windowHasFocus = true;

    // Create focus overlay
    function createFocusOverlay() {
        if (document.getElementById('rf-focus-overlay')) {
            return; // Already created
        }

        const overlay = document.createElement('div');
        overlay.id = 'rf-focus-overlay';
        overlay.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background-color: rgba(0, 0, 0, 0.7) !important;
            z-index: 999999 !important;
            display: none !important;
            justify-content: center !important;
            align-items: center !important;
            cursor: pointer !important;
        `;
        
        const message = document.createElement('div');
        message.id = 'rf-focus-overlay-message';
        message.textContent = 'Click anywhere to restore focus';
        
        overlay.appendChild(message);
        document.body.appendChild(overlay);

        // When user clicks the overlay, restore focus and hide overlay
        overlay.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            hideOverlay();
            restoreFocusToLastField();
        });
    }

    // Show overlay
    function showOverlay() {
        const overlay = document.getElementById('rf-focus-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
        }
    }

    // Hide overlay
    function hideOverlay() {
        const overlay = document.getElementById('rf-focus-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    // Track focus changes
    function setupFocusTracking() {
        document.addEventListener('focusin', function(e) {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
                lastFocusedField = e.target;
            }
        });

        // Also track clicks on input fields
        document.addEventListener('click', function(e) {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) {
                lastFocusedField = e.target;
            }
        }, true);
    }

    // Restore focus to the last focused field
    function restoreFocusToLastField() {
        if (lastFocusedField && document.body.contains(lastFocusedField)) {
            try {
                // Use setTimeout to ensure the overlay is hidden first
                setTimeout(function() {
                    lastFocusedField.focus();
                    
                    // Restore cursor position if it's a text input
                    if (lastFocusedField.tagName === 'INPUT' || lastFocusedField.tagName === 'TEXTAREA') {
                        const length = lastFocusedField.value.length;
                        lastFocusedField.setSelectionRange(length, length);
                    }
                }, 10);
            } catch (e) {
                // Silently handle focus restoration errors
            }
        }
        
        // Trigger a click on the hidden submit button to restart the timer
        setTimeout(function() {
            const submitBtn = document.querySelector('input[id*="btnSubmit"]');
            if (submitBtn && submitBtn.style.display === 'none') {
                submitBtn.click();
            }
        }, 100);
    }

    // Prevent auto-refresh when window is unfocused
    function preventAutoRefreshWhenUnfocused() {
        // Intercept all form submissions and button clicks
        document.addEventListener('submit', function(e) {
            if (!windowHasFocus) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
        }, true);

        document.addEventListener('click', function(e) {
            // Check if clicking a button that would cause refresh
            if (!windowHasFocus && e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT')) {
                const id = e.target.id || '';
                // Prevent auto-refresh button clicks when unfocused
                if (id.includes('btnSubmit') || e.target.style.display === 'none') {
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                }
            }
        }, true);
    }

    // Setup window focus/blur handlers
    function setupWindowFocusHandlers() {
        // Handle window blur (window loses focus)
        window.addEventListener('blur', function() {
            windowHasFocus = false;
            // Small delay to ensure we've captured the current focused field
            setTimeout(function() {
                if (!windowHasFocus) {
                    showOverlay();
                }
            }, 100);
        });

        // Handle window focus (window gains focus)
        window.addEventListener('focus', function() {
            windowHasFocus = true;
            // Don't hide overlay here - let user click to restore
        });

        // Also listen for visibility change (tab switching)
        document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
                windowHasFocus = false;
                setTimeout(function() {
                    if (!windowHasFocus && document.hidden) {
                        showOverlay();
                    }
                }, 100);
            } else {
                windowHasFocus = true;
            }
        });
    }

    // Initialize
    function init() {
        // Wait for body to be available
        if (document.body) {
            // Check if we should skip focus overlay features on this page
            const skipFocusOverlay = isPalletCompleteRFPage();
            
            // Apply overlay styles if not on PalletCompleteRF page (needed for both light and dark mode on other pages)
            if (!skipFocusOverlay) {
                applyOverlayStyles();
            }
            
            if (isDarkModeEnabled()) {
                applyDarkMode();
            }
            
            // Set up focus preservation for auto-refreshing pages
            setupFocusPreservation();
            
            // Only set up focus overlay features if not on PalletCompleteRF page
            if (!skipFocusOverlay) {
                // Create focus overlay
                createFocusOverlay();
                
                // Set up focus tracking
                setupFocusTracking();
                
                // Set up window focus handlers
                setupWindowFocusHandlers();
                
                // Prevent auto-refresh when unfocused
                preventAutoRefreshWhenUnfocused();
            }
            
            // Restore focus after a brief delay (to let page finish loading)
            setTimeout(restoreFocusedElement, 100);
        } else {
            setTimeout(init, 100);
        }
    }

    // Apply instant dark mode IMMEDIATELY if dark mode is enabled
    // This prevents white flash before the script fully initializes
    if (isDarkModeEnabled()) {
        applyInstantDarkMode();
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

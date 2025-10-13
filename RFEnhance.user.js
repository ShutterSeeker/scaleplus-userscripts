// ==UserScript==
// @name         RF Enhance
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Dark mode, focus preservation, and enhancements for all RF screens
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/RFEnhance.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/RFEnhance.user.js
// @author       Blake
// @match        https://scaleqa.byjasco.com/RF/*
// @match        https://scale20.byjasco.com/RF/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('[RF Enhance] Script loaded on:', window.location.href);

    // Check if dark mode should be enabled
    function isDarkModeEnabled() {
        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('darkmode')) {
            console.log('[RF Enhance] Dark mode enabled via URL parameter');
            // Save to sessionStorage for persistence
            sessionStorage.setItem('rfDarkMode', 'enabled');
            return true;
        }

        // Check sessionStorage
        const stored = sessionStorage.getItem('rfDarkMode');
        if (stored === 'enabled') {
            console.log('[RF Enhance] Dark mode enabled via sessionStorage');
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

    // Apply dark mode styles
    function applyDarkMode() {
        console.log('[RF Enhance] Applying dark mode styles');

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
            console.log('[RF Enhance] Styles injected');
        }
    }

    // Remove dark mode
    function removeDarkMode() {
        console.log('[RF Enhance] Removing dark mode');
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

    // Initialize
    function init() {
        console.log('[RF Enhance] Initializing...');

        // Wait for body to be available
        if (document.body) {
            if (isDarkModeEnabled()) {
                applyDarkMode();
            }
            
            // Set up focus preservation for auto-refreshing pages
            setupFocusPreservation();
            
            // Restore focus after a brief delay (to let page finish loading)
            setTimeout(restoreFocusedElement, 100);
        } else {
            console.log('[RF Enhance] Waiting for body...');
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

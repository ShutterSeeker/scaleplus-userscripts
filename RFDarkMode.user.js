// ==UserScript==
// @name         RF Dark Mode
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Dark mode for all RF screens with sessionStorage persistence
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/RFDarkMode.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/RFDarkMode.user.js
// @author       Blake
// @match        https://scaleqa.byjasco.com/RF/*
// @match        https://scale20.byjasco.com/RF/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('[RF Dark Mode] Script loaded on:', window.location.href);

    // Check if dark mode should be enabled
    function isDarkModeEnabled() {
        // Check URL parameter first
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('darkmode')) {
            console.log('[RF Dark Mode] Dark mode enabled via URL parameter');
            // Save to sessionStorage for persistence
            sessionStorage.setItem('rfDarkMode', 'enabled');
            return true;
        }

        // Check sessionStorage
        const stored = sessionStorage.getItem('rfDarkMode');
        if (stored === 'enabled') {
            console.log('[RF Dark Mode] Dark mode enabled via sessionStorage');
            return true;
        }

        return false;
    }

    // Apply dark mode styles
    function applyDarkMode() {
        console.log('[RF Dark Mode] Applying dark mode styles');

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

                /* Text elements */
                body.rf-dark-mode label,
                body.rf-dark-mode td,
                body.rf-dark-mode span,
                body.rf-dark-mode a,
                body.rf-dark-mode div,
                body.rf-dark-mode .aspNetDisabled {
                    color: white !important;
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
            console.log('[RF Dark Mode] Styles injected');
        }
    }

    // Remove dark mode
    function removeDarkMode() {
        console.log('[RF Dark Mode] Removing dark mode');
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

    // Initialize
    function init() {
        console.log('[RF Dark Mode] Initializing...');

        // Wait for body to be available
        if (document.body) {
            if (isDarkModeEnabled()) {
                applyDarkMode();
            }
        } else {
            console.log('[RF Dark Mode] Waiting for body...');
            setTimeout(init, 100);
        }
    }

    // Start initialization
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

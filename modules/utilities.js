// ==UserScript==
// @name         ScalePlus Utilities Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Utility functions for ScalePlus
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.ScalePlusUtilities = {
        init() {
            console.log('[ScalePlus Utilities] Module initialized');
        },

        // Helper: normalize spaces (convert &nbsp; → space, collapse whitespace)
        normalizeSpaces(text) {
            return text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
        },

        /**
         * Checks if an element is visible on the page
         * @param {Element} el - The element to check
         * @returns {boolean} - True if the element is visible
         */
        isVisible(el) {
            if (!el) return false;
            const parentLi = el.closest('li');
            const target = parentLi || el;
            const visible = target.offsetParent !== null &&
                  !target.classList.contains('disabled') &&
                  !target.className.includes('disabled') &&
                  getComputedStyle(target).pointerEvents !== 'none' &&
                  getComputedStyle(target).visibility !== 'hidden' &&
                  getComputedStyle(target).display !== 'none';
            return visible;
        },

        getFormIdFromUrl() {
            const match = window.location.pathname.match(/insights\/(\d+)/);
            return match ? match[1] : null;
        },

        extractFormIdFromUrl(url) {
            const match = url.match(/insights\/(\d+)/);
            return match ? match[1] : null;
        },

        getUsernameFromCookie() {
            // Extract username from cookie if available
            const cookies = document.cookie.split(';');
            for (const cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'username' || name === 'user') {
                    return decodeURIComponent(value);
                }
            }
            return '';
        }
    };

    // Initialize utilities module
    window.ScalePlusUtilities.init();
})();

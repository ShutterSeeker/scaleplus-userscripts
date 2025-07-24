// ==UserScript==
// @name         Tab Duplicator
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Duplicates the current tab with Ctrl+D (configurable with Ctrl+Shift+D toggle)
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/TabDuplicator.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/TabDuplicator.user.js
// @author       Blake
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TOGGLE_KEY = 'tabDuplicatorEnabled';

    // Default to enabled if not set
    if (localStorage.getItem(TOGGLE_KEY) === null) {
        localStorage.setItem(TOGGLE_KEY, 'true');
    }

    document.addEventListener('keydown', function (e) {
        const isCtrlD = e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'd';
        const isCtrlShiftD = e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd';

        if (isCtrlShiftD) {
            const current = localStorage.getItem(TOGGLE_KEY) === 'true';
            localStorage.setItem(TOGGLE_KEY, (!current).toString());
            alert(`Tab duplicator is now ${!current ? 'enabled' : 'disabled'}`);
            e.preventDefault();
        }

        if (isCtrlD) {
            const enabled = localStorage.getItem(TOGGLE_KEY) === 'true';
            if (enabled) {
                e.preventDefault();
                window.open(window.location.href, '_blank');
            }
        }
    });
})();

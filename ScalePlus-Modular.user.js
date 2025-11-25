// ==UserScript==
// @name         ScalePlus
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Custom enhancements for Scale application with toggleable features (Modular Version)
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus-Modular.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus-Modular.user.js
// @icon         https://scale20.byjasco.com/favicon.ico
// @author       Blake, Nash
// @match        https://scaleqa.byjasco.com/scale/*
// @match        https://scale20.byjasco.com/scale/*
// @match        https://scaleqa.byjasco.com/RF/*
// @match        https://scale20.byjasco.com/RF/*
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/settings.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/dark-mode.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/utilities.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/search-pane.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/favorites.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/context-menu.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/keyboard.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/environment-labels.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/advanced-criteria.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/tooltips.js
// @require      https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/modules/settings-ui.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    console.log('[ScalePlus] Main script initializing - Modular version 3.0');

    // Wait for all required modules to be loaded
    function waitForModules() {
        return new Promise((resolve) => {
            const checkModules = () => {
                if (window.ScalePlusSettings &&
                    window.ScalePlusDarkMode &&
                    window.ScalePlusUtilities &&
                    window.ScalePlusSearchPane &&
                    window.ScalePlusFavorites &&
                    window.ScalePlusContextMenu &&
                    window.ScalePlusKeyboard &&
                    window.ScalePlusEnvironmentLabels &&
                    window.ScalePlusAdvancedCriteria &&
                    window.ScalePlusTooltips &&
                    window.ScalePlusSettingsUI) {
                    resolve();
                } else {
                    setTimeout(checkModules, 50);
                }
            };
            checkModules();
        });
    }

    // Initialize all modules
    waitForModules().then(() => {
        console.log('[ScalePlus] All modules loaded successfully');

        // Modules are already initialized individually, but you can call
        // any additional initialization if needed

        console.log('[ScalePlus] Initialization complete');
    });

})();

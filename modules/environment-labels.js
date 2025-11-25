// ==UserScript==
// @name         ScalePlus Environment Labels Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  QA/Production environment labels
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.ScalePlusEnvironmentLabels = {
        init() {
            console.log('[ScalePlus Environment Labels] Module initialized');
            this.addEnvironmentLabel();
        },

        addEnvironmentLabel() {
            if (!window.ScalePlusSettings) {
                console.warn('[ScalePlus Environment Labels] Settings module not loaded');
                return;
            }

            const enabled = window.ScalePlusSettings.getSetting(window.ScalePlusSettings.SETTINGS.ENV_LABELS) === 'true';
            if (!enabled) return;

            const navBar = document.getElementById('topNavigationBar');
            if (!navBar) return;

            const label = document.createElement('div');
            const isProd = window.location.hostname === 'scale20.byjasco.com';
            
            const qaName = window.ScalePlusSettings.getSetting(window.ScalePlusSettings.SETTINGS.ENV_QA_NAME) || 
                          window.ScalePlusSettings.DEFAULTS[window.ScalePlusSettings.SETTINGS.ENV_QA_NAME];
            const prodName = window.ScalePlusSettings.getSetting(window.ScalePlusSettings.SETTINGS.ENV_PROD_NAME) || 
                            window.ScalePlusSettings.DEFAULTS[window.ScalePlusSettings.SETTINGS.ENV_PROD_NAME];
            
            const labelText = isProd ? prodName : qaName;
            const bgColor = isProd ? '#c0392b' : '#d0b132';
            const borderColor = bgColor;
            
            label.textContent = labelText;
            label.style.cssText = `
                color: white;
                background-color: ${bgColor};
                font-weight: bold;
                font-size: 16px;
                padding: 8px 12px;
                border-radius: 4px;
                position: fixed;
                top: 5px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 1040;
                white-space: nowrap;
                max-width: fit-content;
            `;

            document.body.insertBefore(label, document.body.firstChild);
            navBar.style.borderBottom = `6px solid ${borderColor}`;

            console.log(`[ScalePlus Environment Labels] Added ${isProd ? 'Production' : 'QA'} label`);
        }
    };

    // Initialize environment labels module
    window.ScalePlusEnvironmentLabels.init();
})();

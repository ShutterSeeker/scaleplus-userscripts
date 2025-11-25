// ==UserScript==
// @name         ScalePlus Settings Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Settings management for ScalePlus
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Export settings module to global scope
    window.ScalePlusSettings = {
        // Constants for localStorage keys and default values
        SETTINGS: {
            SHOW_SEARCH_PANE: 'scaleplus_show_search_pane',
            CUSTOM_ENTER: 'scaleplus_custom_enter',
            MIDDLE_CLICK: 'scaleplus_middle_click',
            RIGHT_CLICK_MENU: 'scaleplus_right_click_menu',
            ENV_LABELS: 'scaleplus_env_labels',
            TAB_DUPLICATOR: 'scaleplus_tab_duplicator',
            DEFAULT_FILTER: 'scaleplus_default_filter',
            ADV_CRITERIA_ENHANCEMENT: 'scaleplus_adv_criteria_enhancement',
            F5_BEHAVIOR: 'scaleplus_f5_behavior',
            ENV_QA_NAME: 'scaleplus_env_qa_name',
            ENV_PROD_NAME: 'scaleplus_env_prod_name',
            DARK_MODE: 'scaleplus_dark_mode'
        },

        DEFAULTS: {
            scaleplus_show_search_pane: 'true',
            scaleplus_custom_enter: 'true',
            scaleplus_middle_click: 'true',
            scaleplus_right_click_menu: 'true',
            scaleplus_tab_duplicator: 'false',
            scaleplus_default_filter: 'true',
            scaleplus_adv_criteria_enhancement: 'true',
            scaleplus_f5_behavior: 'false',
            scaleplus_env_qa_name: 'QA ENVIRONMENT',
            scaleplus_env_prod_name: 'PRODUCTION ENVIRONMENT',
            scaleplus_dark_mode: 'false'
        },

        init() {
            // Dynamically set ENV_LABELS default based on hostname if not already set
            if (localStorage.getItem(this.SETTINGS.ENV_LABELS) === null) {
                if (window.location.hostname.includes('scaleqa')) {
                    localStorage.setItem(this.SETTINGS.ENV_LABELS, 'true');
                } else if (window.location.hostname.includes('scale20')) {
                    localStorage.setItem(this.SETTINGS.ENV_LABELS, 'false');
                }
            }

            // Ensure advanced settings are false by default if not set
            if (localStorage.getItem(this.SETTINGS.F5_BEHAVIOR) === null) {
                localStorage.setItem(this.SETTINGS.F5_BEHAVIOR, 'false');
            }
            if (localStorage.getItem(this.SETTINGS.TAB_DUPLICATOR) === null) {
                localStorage.setItem(this.SETTINGS.TAB_DUPLICATOR, 'false');
            }

            console.log('[ScalePlus Settings] Module initialized');
        },

        getSetting(key) {
            return localStorage.getItem(key);
        },

        setSetting(key, value) {
            localStorage.setItem(key, value);
        },

        isEnabled(settingKey) {
            return localStorage.getItem(settingKey) !== 'false';
        }
    };

    // Initialize settings module
    window.ScalePlusSettings.init();
})();

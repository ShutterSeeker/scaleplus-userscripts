// ==UserScript==
// @name         ScalePlus Search Pane Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Auto-open search pane functionality
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.ScalePlusSearchPane = {
        init() {
            console.log('[ScalePlus Search Pane] Module initialized');
            this.clickSearchButtonIfNeeded();
        },

        clickSearchButtonIfNeeded() {
            if (!window.ScalePlusSettings) {
                console.warn('[ScalePlus Search Pane] Settings module not loaded');
                return;
            }

            const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.SHOW_SEARCH_PANE);
            if (!enabled) return;

            const tryClick = () => {
                const searchBtn = document.querySelector('li.navsearch.visible-sm.visible-md.visible-lg a.navimageanchor[data-toggle="search"]');
                if (searchBtn) {
                    if (!searchBtn.classList.contains('visiblepane')) {
                        searchBtn.click();
                        console.log('[ScalePlus Search Pane] Clicked search button to show search pane');
                    } else {
                        console.log('[ScalePlus Search Pane] Search pane already visible, not clicking');
                    }
                } else {
                    setTimeout(tryClick, 200);
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', tryClick);
            } else {
                tryClick();
            }
        }
    };

    // Initialize search pane module
    window.ScalePlusSearchPane.init();
})();

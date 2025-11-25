// ==UserScript==
// @name         ScalePlus Dark Mode Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Dark mode styling for ScalePlus
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.ScalePlusDarkMode = {
        init() {
            console.log('[ScalePlus Dark Mode] Module initialized');
            this.injectStyles();
            this.applyDarkMode();
        },

        injectStyles() {
            const darkModeStyles = `
        /* Dark mode for results grid area - Using custom dark theme colors */
        
        /* Main grid container and scroll area */
        body.scaleplus-dark-mode #ListPaneDataGrid_scroll {
            background-color: #181818 !important;
            border: none !important;
            outline: none !important;
            box-shadow: none !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_scroll.ui-widget-content {
            border: none !important;
        }
        
        body.scaleplus-dark-mode #ScreenPartDivContainer964 {
            background-color: #181818 !important;
            border-color: #181818 !important;
        }
        
        /* Scrollbars */
        body.scaleplus-dark-mode #ListPaneDataGrid_scroll::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_scroll::-webkit-scrollbar-track {
            background: #0f0f0f !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_scroll::-webkit-scrollbar-thumb {
            background: #2a2a2a !important;
            border-radius: 6px;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_scroll::-webkit-scrollbar-thumb:hover {
            background: #3a3a3a !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_hscroller {
            background-color: #0f0f0f !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_hscroller::-webkit-scrollbar {
            width: 12px;
            height: 12px;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_hscroller::-webkit-scrollbar-track {
            background: #0f0f0f !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_hscroller::-webkit-scrollbar-thumb {
            background: #2a2a2a !important;
            border-radius: 6px;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid_hscroller::-webkit-scrollbar-thumb:hover {
            background: #3a3a3a !important;
        }
        
        /* Main grid table */
        body.scaleplus-dark-mode #ListPaneDataGrid {
            background-color: #181818 !important;
            color: #ffffff !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid tbody.ui-widget-content {
            background-color: #181818 !important;
            color: #ffffff !important;
        }
        
        /* All table cells - single consistent background */
        body.scaleplus-dark-mode #ListPaneDataGrid td {
            background-color: #181818 !important;
            color: #ffffff !important;
            border-color: #2a2a2a !important;
        }
        
        /* Remove alternating row colors */
        body.scaleplus-dark-mode #ListPaneDataGrid tr:nth-child(even) td {
            background-color: #181818 !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid tr:nth-child(odd) td {
            background-color: #181818 !important;
        }
        
        /* Header cells: leave default theme (no dark mode applied) */
        
        /* Links in dark mode - scope to body cells only (do not affect header feature chooser) */
        body.scaleplus-dark-mode #ListPaneDataGrid tbody a {
            color: #5ba3e0 !important;
        }
        body.scaleplus-dark-mode #ListPaneDataGrid tbody a:hover {
            color: #7bb8ea !important;
        }
        body.scaleplus-dark-mode #ListPaneDataGrid tbody a:visited {
            color: #5ba3e0 !important;
        }
        
        /* Hovered rows - subtle highlight */
        body.scaleplus-dark-mode #ListPaneDataGrid tr:hover td {
            background-color: #252525 !important;
        }
        
        /* Selected rows */
        body.scaleplus-dark-mode #ListPaneDataGrid .ui-iggrid-selectedcell {
            background-color: #2d4a6b !important;
            color: #ffffff !important;
        }
        
        body.scaleplus-dark-mode #ListPaneDataGrid .ui-state-active {
            background-color: #2d4a6b !important;
            color: #ffffff !important;
            border-color: #4a7aab !important;
        }
        
        /* Ensure selected rows override other styles */
        body.scaleplus-dark-mode #ListPaneDataGrid tr[aria-selected="true"] td {
            background-color: #2d4a6b !important;
            color: #ffffff !important;
        }
        
        /* Row selector checkboxes - scope to body only (do not affect header checkbox) */
        body.scaleplus-dark-mode #ListPaneDataGrid tbody .ui-igcheckbox-normal {
            background-color: #2a2a2a !important;
            border-color: #3a3a3a !important;
        }
        body.scaleplus-dark-mode #ListPaneDataGrid tbody .ui-igcheckbox-normal:hover {
            background-color: #3a3a3a !important;
        }
        
        /* Custom loading spinner for dark mode */
        body.scaleplus-dark-mode .ui-igloadingmsg {
            background: transparent !important;
            color: transparent !important;
            text-indent: -9999px;
            overflow: visible !important;
        }
        
        body.scaleplus-dark-mode .ui-igloadingmsg::after {
            content: '';
            display: block;
            width: 60px;
            height: 60px;
            border: 5px solid rgba(255, 255, 255, 0.1);
            border-top-color: #5ba3e0;
            border-radius: 50%;
            animation: scaleplus-spin 0.8s linear infinite;
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            text-indent: 0;
        }
        
        @keyframes scaleplus-spin {
            to {
                transform: translate(-50%, -50%) rotate(360deg);
            }
        }
    `;

            if (!document.getElementById('scaleplus-dark-mode-styles')) {
                const darkStyle = document.createElement('style');
                darkStyle.id = 'scaleplus-dark-mode-styles';
                darkStyle.textContent = darkModeStyles;
                document.head.appendChild(darkStyle);
            }
        },

        applyDarkMode() {
            if (!window.ScalePlusSettings) {
                console.warn('[ScalePlus Dark Mode] Settings module not loaded');
                return;
            }

            const isDarkMode = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.DARK_MODE);
            if (isDarkMode) {
                document.body.classList.add('scaleplus-dark-mode');
                console.log('[ScalePlus Dark Mode] Applied dark mode');
            } else {
                document.body.classList.remove('scaleplus-dark-mode');
            }
        }
    };

    // Initialize dark mode module
    window.ScalePlusDarkMode.init();
})();

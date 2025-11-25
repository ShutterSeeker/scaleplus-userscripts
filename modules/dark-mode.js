// ==UserScript==
// @name         ScalePlus Dark Mode Module
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Dark mode styling for ScalePlus and RF pages
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

        isRFPage() {
            const url = window.location.href;
            return url.includes('/RF/');
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
        
        /* Row selector column (th with role=rowheader) should also get hover effect */
        body.scaleplus-dark-mode #ListPaneDataGrid tr:hover th.ui-iggrid-rowselector-class {
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
        
        /* Row selector column should also get selected row styling */
        body.scaleplus-dark-mode #ListPaneDataGrid tr[aria-selected="true"] th.ui-iggrid-rowselector-class {
            background-color: #2d4a6b !important;
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

            const rfDarkModeStyles = `
        /* RF Dark Mode Styles */
        body.scaleplus-dark-mode {
            background-color: #161616 !important;
            color: white !important;
            transition: background-color 0.3s, color 0.3s;
        }

        /* Text elements - only override if no inline color is set */
        body.scaleplus-dark-mode label:not([style*="color"]),
        body.scaleplus-dark-mode td:not([style*="color"]),
        body.scaleplus-dark-mode div:not([style*="color"]),
        body.scaleplus-dark-mode .aspNetDisabled {
            color: white !important;
        }

        /* Spans without inline color get white, but preserve inline colors */
        body.scaleplus-dark-mode span:not([style*="color"]) {
            color: white !important;
        }

        /* Make dark red more visible (standard red is too dark on black) */
        body.scaleplus-dark-mode span[style*="color:red"],
        body.scaleplus-dark-mode span[style*="color: red"],
        body.scaleplus-dark-mode span[style*="color:Red"],
        body.scaleplus-dark-mode span[style*="color: Red"] {
            color: #ff6b6b !important; /* Lighter red for readability */
        }

        /* Make dark green more visible (standard green is too dark on black) */
        body.scaleplus-dark-mode span[style*="color:green"],
        body.scaleplus-dark-mode span[style*="color: green"],
        body.scaleplus-dark-mode span[style*="color:Green"],
        body.scaleplus-dark-mode span[style*="color: Green"] {
            color: #51cf66 !important; /* Lighter green for readability */
        }

        /* Convert black text to white (hardcoded black labels/text) */
        body.scaleplus-dark-mode span[style*="color:black"],
        body.scaleplus-dark-mode span[style*="color: black"],
        body.scaleplus-dark-mode span[style*="color:Black"],
        body.scaleplus-dark-mode span[style*="color: Black"],
        body.scaleplus-dark-mode label[style*="color:black"],
        body.scaleplus-dark-mode label[style*="color: black"],
        body.scaleplus-dark-mode label[style*="color:Black"],
        body.scaleplus-dark-mode label[style*="color: Black"],
        body.scaleplus-dark-mode div[style*="color:black"],
        body.scaleplus-dark-mode div[style*="color: black"],
        body.scaleplus-dark-mode div[style*="color:Black"],
        body.scaleplus-dark-mode div[style*="color: Black"] {
            color: white !important; /* Convert hardcoded black to white */
        }

        /* Links should be visible */
        body.scaleplus-dark-mode a {
            color: #58a6ff !important;
        }

        body.scaleplus-dark-mode a:hover {
            color: #79c0ff !important;
        }

        /* Input fields */
        body.scaleplus-dark-mode input[type="text"],
        body.scaleplus-dark-mode input[type="password"],
        body.scaleplus-dark-mode textarea,
        body.scaleplus-dark-mode select {
            background-color: #2d2d2d !important;
            color: white !important;
            border: 1px solid #444 !important;
        }

        /* Buttons */
        body.scaleplus-dark-mode input[type="button"],
        body.scaleplus-dark-mode input[type="submit"],
        body.scaleplus-dark-mode button {
            background-color: #3a3a3a !important;
            color: white !important;
            border: 1px solid #555 !important;
        }

        body.scaleplus-dark-mode input[type="button"]:hover,
        body.scaleplus-dark-mode input[type="submit"]:hover,
        body.scaleplus-dark-mode button:hover {
            background-color: #4a4a4a !important;
        }

        /* Disabled controls - make them clearly inactive in dark mode */
        body.scaleplus-dark-mode input[disabled],
        body.scaleplus-dark-mode textarea[disabled],
        body.scaleplus-dark-mode select[disabled],
        body.scaleplus-dark-mode button[disabled],
        body.scaleplus-dark-mode .aspNetDisabled,
        body.scaleplus-dark-mode input.aspNetDisabled,
        body.scaleplus-dark-mode button.aspNetDisabled {
            background-color: #222 !important;      /* muted background */
            color: #8b949e !important;               /* muted text color */
            border-color: #333 !important;           /* muted border */
            opacity: 0.6 !important;                 /* slightly faded */
            cursor: not-allowed !important;         /* clearly not interactive */
            box-shadow: none !important;            /* remove focus/active shadows */
            text-shadow: none !important;
        }

        /* Prevent hover/active styles from making disabled controls look interactive */
        body.scaleplus-dark-mode input[disabled]:hover,
        body.scaleplus-dark-mode textarea[disabled]:hover,
        body.scaleplus-dark-mode select[disabled]:hover,
        body.scaleplus-dark-mode button[disabled]:hover,
        body.scaleplus-dark-mode .aspNetDisabled:hover,
        body.scaleplus-dark-mode input.aspNetDisabled:hover,
        body.scaleplus-dark-mode button.aspNetDisabled:hover {
            background-color: #222 !important;
            color: #8b949e !important;
        }

        /* Tables */
        body.scaleplus-dark-mode table {
            background-color: #161616 !important;
        }

        body.scaleplus-dark-mode td,
        body.scaleplus-dark-mode th {
            border-color: #444 !important;
        }

        /* Special labels (like the blue LP label) */
        body.scaleplus-dark-mode [style*="background:#0094ff"],
        body.scaleplus-dark-mode [style*="background: #0094ff"] {
            background: #0094ff !important;
            color: white !important;
        }
    `;

            if (!document.getElementById('scaleplus-dark-mode-styles')) {
                const darkStyle = document.createElement('style');
                darkStyle.id = 'scaleplus-dark-mode-styles';
                
                // Apply appropriate styles based on page type
                if (this.isRFPage()) {
                    darkStyle.textContent = rfDarkModeStyles;
                } else {
                    darkStyle.textContent = darkModeStyles;
                }
                
                document.head.appendChild(darkStyle);
            }
        },

        applyInstantDarkMode() {
            // Apply dark background IMMEDIATELY to html and body to prevent flash on RF pages
            if (this.isRFPage()) {
                const instantStyle = document.createElement('style');
                instantStyle.id = 'scaleplus-dark-mode-instant';
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
        },

        applyDarkMode() {
            if (!window.ScalePlusSettings) {
                console.warn('[ScalePlus Dark Mode] Settings module not loaded');
                return;
            }

            const isDarkMode = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.DARK_MODE);
            if (isDarkMode) {
                // Apply instant dark mode first if on RF page
                if (this.isRFPage()) {
                    this.applyInstantDarkMode();
                }
                
                document.body.classList.add('scaleplus-dark-mode');
                console.log(`[ScalePlus Dark Mode] Applied dark mode (${this.isRFPage() ? 'RF' : 'Scale'} page)`);
            } else {
                document.body.classList.remove('scaleplus-dark-mode');
                
                // Remove instant dark mode style if it exists
                const instantStyle = document.getElementById('scaleplus-dark-mode-instant');
                if (instantStyle) {
                    instantStyle.remove();
                }
            }
        },

        removeDarkMode() {
            document.body.classList.remove('scaleplus-dark-mode');
            
            // Remove instant dark mode style if it exists
            const instantStyle = document.getElementById('scaleplus-dark-mode-instant');
            if (instantStyle) {
                instantStyle.remove();
            }
        }
    };

    // Apply instant dark mode IMMEDIATELY if dark mode is enabled and on RF page
    // This prevents white flash before the script fully initializes
    if (window.ScalePlusDarkMode.isRFPage() && 
        window.ScalePlusSettings && 
        window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.DARK_MODE)) {
        window.ScalePlusDarkMode.applyInstantDarkMode();
    }

    // Initialize dark mode module
    window.ScalePlusDarkMode.init();
})();

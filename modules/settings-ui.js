// ==UserScript==
// @name         ScalePlus Settings UI Module
// @namespace    https://github.com/ShutterSeeker/scaleplus-userscripts
// @version      1.2
// @description  Settings modal interface for ScalePlus
// @author       ShutterSeeker
// @match        https://*/Scale/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const { SETTINGS, DEFAULTS } = window.ScalePlusSettings || {};
    
    if (!SETTINGS) {
        console.error('[ScalePlus Settings UI] Settings module not loaded');
        return;
    }

    const createSettingsModal = () => {
        const modal = document.createElement('div');
        modal.id = 'scaleplus-settings-modal';
        modal.className = 'modal fade';
        modal.setAttribute('tabindex', '-1');
        modal.setAttribute('role', 'dialog');
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <form class="form-horizontal" id="ScalePlusSettingsModalDialogForm" novalidate="novalidate" data-controltype="form">
                        <div class="modal-header" data-controltype="modalDialogHeader" data-resourcekey="SCALEPLUSSETTINGS" data-resourcevalue="ScalePlus Settings">
                            <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                            <h4 class="modal-title">ScalePlus Settings</h4>
                        </div>
                        <div class="modal-body" data-controltype="modalDialogBody">
                            <div class="scaleplus-basic-settings">
                            <div class="scaleplus-setting">
                                <label for="search-toggle">Always show search:</label>
                                <input type="checkbox" id="search-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Automatically show the search pane when the page loads</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="enter-toggle">Custom enter behavior:</label>
                                <input type="checkbox" id="enter-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">When enabled, Enter triggers Play/Stop</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="middle-click-toggle">Enhance middle click:</label>
                                <input type="checkbox" id="middle-click-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Middle click on grid items to copy text, middle click or Ctrl+click on favorites to open in new tab</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="right-click-toggle">Right-click menu:</label>
                                <input type="checkbox" id="right-click-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Right-click on grid items and favorites for additional options</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="adv-criteria-indicator-toggle">Enhance advanced criteria:</label>
                                <input type="checkbox" id="adv-criteria-indicator-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Show count in header and condition column in advanced criteria grid</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="default-filter-toggle">Enhance favorites:</label>
                                <input type="checkbox" id="default-filter-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Star defaults + relative date/time favorites & pending-filter tab restore</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="dark-mode-toggle">Dark mode:</label>
                                <input type="checkbox" id="dark-mode-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Apply dark theme to the results grid area</span>
                            </div>
                        </div>

                        <div class="scaleplus-divider">
                            <div class="scaleplus-advanced-label">Advanced settings</div>
                            <div class="scaleplus-divider-line"></div>
                        </div>

                        <div class="scaleplus-advanced-settings">
                            <div class="scaleplus-setting">
                                <label for="f5-toggle">Custom F5 behavior:</label>
                                <input type="checkbox" id="f5-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">When enabled, F5 triggers Play/Stop instead of page refresh</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="tab-duplicator-toggle">Tab duplicator:</label>
                                <input type="checkbox" id="tab-duplicator-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Ctrl+D to duplicate current tab</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="env-labels-toggle">Environment labels:</label>
                                <input type="checkbox" id="env-labels-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Show environment label in navbar</span>
                            </div>
                        </div>

                        <div class="scaleplus-env-names">
                            <div class="scaleplus-env-setting">
                                <label for="qa-name">QA Name:</label>
                                <input type="text" id="qa-name" placeholder="QA ENVIRONMENT">
                            </div>
                            <div class="scaleplus-env-setting">
                                <label for="prod-name">Prod Name:</label>
                                <input type="text" id="prod-name" placeholder="PRODUCTION ENVIRONMENT">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" data-controltype="modalDialogFooter">
                        <button id="scaleplus-close-btn" class="btn btn-default" data-dismiss="modal" data-resourcekey="BTN_CLOSE" data-resourcevalue="Close">Close</button>
                    </div>
                </form>
            </div>
        </div>
        `;
        document.body.appendChild(modal);

        // Sample colors from Scale's UI
        const headerBg = '#494e5e';
        const bodyBg = '#f4f4f8';
        const footerBg = '#494e5e';
        const textColor = '#ffffff';
        const buttonBg = '#4f93e4';
        const buttonColor = '#ffffff';

        // Apply sampled colors
        const modalContent = modal.querySelector('.modal-content');
        const modalHeader = modal.querySelector('.modal-header');
        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');
        const cancelBtn = modal.querySelector('#scaleplus-close-btn');
        const labels = modal.querySelectorAll('label');
        const inputs = modal.querySelectorAll('input[type="text"]');

        // Use light background for modal to ensure visibility
        const darkText = '#000000';
        if (modalContent) modalContent.style.backgroundColor = bodyBg;
        if (modalHeader) {
            modalHeader.style.backgroundColor = headerBg;
            modalHeader.style.color = textColor;
        }
        if (modalBody) {
            modalBody.style.backgroundColor = bodyBg;
            modalBody.style.color = darkText;
        }
        if (modalFooter) {
            modalFooter.style.backgroundColor = footerBg;
            modalFooter.style.color = textColor;
        }
        if (cancelBtn) {
            cancelBtn.style.backgroundColor = buttonBg;
            cancelBtn.style.color = buttonColor;
        }
        labels.forEach(label => {
            label.style.color = darkText;
        });

        // Add styles
        const style = document.createElement('style');
        style.setAttribute('data-scaleplus-modal', 'true');
        style.textContent = `
            #scaleplus-settings-modal .modal-dialog {
                margin: 50px auto;
                width: 800px;
                max-width: 90vw;
            }
            #scaleplus-settings-modal .modal-content {
                border-radius: 0;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                border: none;
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background-color: #494e5e !important;
                color: white;
                width: 100%;
                box-sizing: border-box;
                flex-shrink: 0;
                position: relative;
                z-index: 1;
                margin: 0;
                border-bottom: 1px solid #ddd;
            }
            .modal-header .close {
                margin: 0;
                color: white !important;
                opacity: 0.8;
                font-size: 28px;
                line-height: 1;
                cursor: pointer;
                background: none;
                border: none;
                padding: 0;
                width: 30px;
                height: 30px;
                display: flex;
                align-items: center;
                justify-content: center;
                position: absolute;
                right: 15px;
                top: 50%;
                transform: translateY(-50%);
            }
            .modal-header .close:hover {
                opacity: 1;
                color: white;
            }
            .modal-header h4 {
                margin: 0;
                flex: 1;
                text-align: center;
                color: white;
                font-size: 18px;
                font-weight: 500;
                padding-right: 30px;
            }
            .modal-body {
                padding: 20px !important;
                overflow-y: auto !important;
                flex: 1;
                background-color: #f4f4f8 !important;
                color: #000000 !important;
                position: relative;
                z-index: 0;
                max-height: calc(100vh - 200px) !important;
            }
            .modal-footer {
                padding: 10px 20px;
                display: flex;
                justify-content: flex-end;
                flex-shrink: 0;
                border-top: 1px solid #ddd;
                background-color: #494e5e !important;
                color: white;
                width: 100%;
                box-sizing: border-box;
                position: relative;
                z-index: 1;
                margin: 0;
            }
            .modal-footer .btn {
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                background-color: #4f93e4;
                color: white;
                border-radius: 0;
                margin-left: 10px;
            }
            .modal-footer .btn:hover {
                background-color: #3a7bc8;
            }
            .scaleplus-setting {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }
            .scaleplus-setting label {
                flex: 1;
                font-weight: bold;
                color: #000000;
            }
            .scaleplus-setting-desc {
                font-size: 12px;
                flex: 2;
                margin-left: 20px;
                color: #666666 !important;
            }
            .scaleplus-env-names {
                margin-left: 0;
            }
            .scaleplus-env-names .scaleplus-setting {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }
            .scaleplus-env-names .scaleplus-setting label {
                flex: 1;
                font-weight: bold;
                color: #000000;
                margin-bottom: 0;
            }
            .scaleplus-env-names input {
                padding: 5px;
                border-radius: 0 !important;
                width: 100%;
                max-width: 300px;
                display: inline-block;
                background-color: #ffffff !important;
                color: #666666 !important;
                border: 1px solid #999999 !important;
                flex: 2;
            }
            .scaleplus-divider {
                margin: 20px 0;
            }
            .scaleplus-advanced-label {
                font-weight: normal;
                font-size: 12px;
                margin-bottom: 10px;
                text-align: left;
                color: #666666 !important;
            }
            .scaleplus-divider-line {
                border-top: 1px solid #555;
                margin-bottom: 15px;
            }
            .scaleplus-env-setting {
                margin-bottom: 15px;
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }
            .scaleplus-env-setting label {
                font-weight: bold;
                margin-right: 10px;
                min-width: 120px;
                max-width: 200px;
                display: inline-block;
                color: #000000;
                flex: 0 0 auto;
            }
            .scaleplus-env-setting input {
                padding: 5px;
                border-radius: 0 !important;
                width: 100%;
                max-width: 300px;
                display: inline-block;
                background-color: #ffffff !important;
                color: #666666 !important;
                border: 1px solid #999999 !important;
                flex: 1 1 auto;
                min-width: 200px;
            }
            @media (max-width: 600px) {
                .scaleplus-env-names .scaleplus-setting,
                .scaleplus-env-setting {
                    flex-direction: column;
                    align-items: stretch;
                }
                .scaleplus-env-names .scaleplus-setting label,
                .scaleplus-env-setting label {
                    flex: none;
                    text-align: left;
                }
                .scaleplus-env-names input,
                .scaleplus-env-setting input {
                    flex: none;
                    min-width: 150px;
                }
            }
        `;
        document.head.appendChild(style);

        // Set initial toggle states
        const f5Toggle = modal.querySelector('#f5-toggle');
        const currentF5 = localStorage.getItem(SETTINGS.F5_BEHAVIOR);
        if (currentF5 !== 'false') {
            f5Toggle.checked = true;
        }

        const searchToggle = modal.querySelector('#search-toggle');
        const currentSearch = localStorage.getItem(SETTINGS.SHOW_SEARCH_PANE);
        if (currentSearch !== 'false') {
            searchToggle.checked = true;
        }

        const enterToggle = modal.querySelector('#enter-toggle');
        const currentEnter = localStorage.getItem(SETTINGS.CUSTOM_ENTER);
        if (currentEnter !== 'false') {
            enterToggle.checked = true;
        }

        const middleClickToggle = modal.querySelector('#middle-click-toggle');
        const currentMiddle = localStorage.getItem(SETTINGS.MIDDLE_CLICK);
        if (currentMiddle !== 'false') {
            middleClickToggle.checked = true;
        }

        const rightClickToggle = modal.querySelector('#right-click-toggle');
        const currentRightClick = localStorage.getItem(SETTINGS.RIGHT_CLICK_MENU);
        if (currentRightClick !== 'false') {
            rightClickToggle.checked = true;
        }

        const envLabelsToggle = modal.querySelector('#env-labels-toggle');
        const currentEnv = localStorage.getItem(SETTINGS.ENV_LABELS);
        if (currentEnv === 'true') {
            envLabelsToggle.checked = true;
        }

        const tabDuplicatorToggle = modal.querySelector('#tab-duplicator-toggle');
        const currentTab = localStorage.getItem(SETTINGS.TAB_DUPLICATOR);
        if (currentTab !== 'false') {
            tabDuplicatorToggle.checked = true;
        }

        const defaultFilterToggle = modal.querySelector('#default-filter-toggle');
        const currentDefaultFilter = localStorage.getItem(SETTINGS.DEFAULT_FILTER);
        if (currentDefaultFilter !== 'false') {
            defaultFilterToggle.checked = true;
        }

        const advCriteriaIndicatorToggle = modal.querySelector('#adv-criteria-indicator-toggle');
        const currentAdvCriteriaIndicator = localStorage.getItem(SETTINGS.ADV_CRITERIA_ENHANCEMENT);
        if (currentAdvCriteriaIndicator !== 'false') {
            advCriteriaIndicatorToggle.checked = true;
        }

        const darkModeToggle = modal.querySelector('#dark-mode-toggle');
        const currentDarkMode = localStorage.getItem(SETTINGS.DARK_MODE);
        if (currentDarkMode === 'true') {
            darkModeToggle.checked = true;
        }

        const qaNameInput = modal.querySelector('#qa-name');
        const prodNameInput = modal.querySelector('#prod-name');

        qaNameInput.value = localStorage.getItem(SETTINGS.ENV_QA_NAME) || DEFAULTS[SETTINGS.ENV_QA_NAME];
        prodNameInput.value = localStorage.getItem(SETTINGS.ENV_PROD_NAME) || DEFAULTS[SETTINGS.ENV_PROD_NAME];

        // Handle toggle changes
        $('#search-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.SHOW_SEARCH_PANE, state.toString());
            console.log(`[ScalePlus] Show search pane set to: ${state}`);
        });

        $('#enter-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.CUSTOM_ENTER, state.toString());
            console.log(`[ScalePlus] Custom Enter set to: ${state}`);
        });

        $('#middle-click-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.MIDDLE_CLICK, state.toString());
            console.log(`[ScalePlus] Middle click copy set to: ${state}`);
        });

        $('#right-click-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.RIGHT_CLICK_MENU, state.toString());
            console.log(`[ScalePlus] Right-click menu set to: ${state}`);
        });

        $('#f5-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.F5_BEHAVIOR, state.toString());
            console.log(`[ScalePlus] F5 behavior set to: ${state}`);
        });

        $('#env-labels-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.ENV_LABELS, state.toString());
            console.log(`[ScalePlus] Environment labels set to: ${state}`);
            
            // Apply or remove environment label immediately
            if (state) {
                // Add the label if it doesn't exist
                if (window.ScalePlusEnvironmentLabels && window.ScalePlusEnvironmentLabels.addEnvironmentLabel) {
                    window.ScalePlusEnvironmentLabels.addEnvironmentLabel();
                }
            } else {
                // Remove the label if it exists
                if (window.ScalePlusEnvironmentLabels && window.ScalePlusEnvironmentLabels.removeEnvironmentLabel) {
                    window.ScalePlusEnvironmentLabels.removeEnvironmentLabel();
                }
            }
        });

        $('#tab-duplicator-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.TAB_DUPLICATOR, state.toString());
            console.log(`[ScalePlus] Tab duplicator set to: ${state}`);
        });

        $('#default-filter-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.DEFAULT_FILTER, state.toString());
            console.log(`[ScalePlus] Default filter set to: ${state}`);
            // Call favorites module's update function if available
            if (window.ScalePlusFavorites && window.ScalePlusFavorites.updateFavoritesStarIcon) {
                window.ScalePlusFavorites.updateFavoritesStarIcon();
            }
        });

        $('#dark-mode-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.DARK_MODE, state.toString());
            console.log(`[ScalePlus] Dark mode set to: ${state}`);
            
            // Apply or remove dark mode immediately
            if (state) {
                if (window.ScalePlusDarkMode && window.ScalePlusDarkMode.applyDarkMode) {
                    window.ScalePlusDarkMode.applyDarkMode();
                } else {
                    document.body.classList.add('scaleplus-dark-mode');
                }
            } else {
                if (window.ScalePlusDarkMode && window.ScalePlusDarkMode.removeDarkMode) {
                    window.ScalePlusDarkMode.removeDarkMode();
                } else {
                    document.body.classList.remove('scaleplus-dark-mode');
                }
            }
        });

        $('#adv-criteria-indicator-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.ADV_CRITERIA_ENHANCEMENT, state.toString());
            console.log(`[ScalePlus] Advanced criteria enhancement set to: ${state}`);

            // Update the counter immediately when toggled
            if (state && window.ScalePlusAdvancedCriteria && window.ScalePlusAdvancedCriteria.updateAdvancedCriteriaCount) {
                window.ScalePlusAdvancedCriteria.updateAdvancedCriteriaCount();
            } else {
                // Reset to original text when disabled
                const headers = document.querySelectorAll('h3.ui-accordion-header');
                headers.forEach(header => {
                    const link = header.querySelector('a[data-resourcekey="ADVANCEDCRITERIA"]');
                    if (link) {
                        const baseText = link.getAttribute('data-resourcevalue') || 'Advanced criteria';
                        link.textContent = baseText;
                    }
                });
            }

            // Update grid columns immediately
            setTimeout(() => {
                const $grid = $('#SearchPaneAdvCritAdvCritGrid');
                if ($grid.length && $grid.data('igGrid')) {
                    try {
                        const columns = $grid.igGrid('option', 'columns');
                        const conditionColumn = columns.find(col => col.key === 'Condition');
                        if (conditionColumn) {
                            conditionColumn.hidden = !state;
                            if (state) {
                                conditionColumn.headerText = 'Condition';
                                conditionColumn.width = '15%';
                                // Adjust other columns when showing condition
                                const fieldColumn = columns.find(col => col.key === 'Field');
                                const operandColumn = columns.find(col => col.key === 'Operand');
                                const valueColumn = columns.find(col => col.key === 'Value');
                                if (fieldColumn) fieldColumn.width = '30%';
                                if (operandColumn) operandColumn.width = '15%';
                                if (valueColumn) valueColumn.width = '30%';
                            } else {
                                // Reset to original widths when hiding condition
                                const fieldColumn = columns.find(col => col.key === 'Field');
                                const operandColumn = columns.find(col => col.key === 'Operand');
                                const valueColumn = columns.find(col => col.key === 'Value');
                                if (fieldColumn) fieldColumn.width = '40%';
                                if (operandColumn) operandColumn.width = '20%';
                                if (valueColumn) valueColumn.width = '40%';
                            }
                            $grid.igGrid('option', 'columns', columns);
                            $grid.igGrid('dataBind');
                        }
                    } catch (err) {
                        console.warn('[ScalePlus] Could not update grid columns on toggle:', err);
                    }
                }
            }, 100);
        });

        qaNameInput.addEventListener('input', () => {
            localStorage.setItem(SETTINGS.ENV_QA_NAME, qaNameInput.value);
        });

        prodNameInput.addEventListener('input', () => {
            localStorage.setItem(SETTINGS.ENV_PROD_NAME, prodNameInput.value);
        });

        // Initialize bootstrap toggles
        $('#search-toggle, #enter-toggle, #middle-click-toggle, #right-click-toggle, #f5-toggle, #tab-duplicator-toggle, #default-filter-toggle, #env-labels-toggle, #adv-criteria-indicator-toggle, #dark-mode-toggle').bootstrapToggle();

        // Set initial states explicitly
        $(searchToggle).bootstrapToggle(searchToggle.checked ? 'on' : 'off');
        $(enterToggle).bootstrapToggle(enterToggle.checked ? 'on' : 'off');
        $(middleClickToggle).bootstrapToggle(middleClickToggle.checked ? 'on' : 'off');
        $(rightClickToggle).bootstrapToggle(rightClickToggle.checked ? 'on' : 'off');
        $(f5Toggle).bootstrapToggle(f5Toggle.checked ? 'on' : 'off');
        $(envLabelsToggle).bootstrapToggle(envLabelsToggle.checked ? 'on' : 'off');
        $(tabDuplicatorToggle).bootstrapToggle(tabDuplicatorToggle.checked ? 'on' : 'off');
        $(defaultFilterToggle).bootstrapToggle(defaultFilterToggle.checked ? 'on' : 'off');
        $(advCriteriaIndicatorToggle).bootstrapToggle(advCriteriaIndicatorToggle.checked ? 'on' : 'off');
        $(darkModeToggle).bootstrapToggle(darkModeToggle.checked ? 'on' : 'off');
    };

    const addConfigureButton = () => {
        const targetButton = document.getElementById('ConfigureWorkStation');
        
        if (targetButton && !targetButton.hasAttribute('data-scaleplus-intercepted')) {
            // Intercept the native Configure Workstation button
            targetButton.setAttribute('data-scaleplus-intercepted', 'true');
            targetButton.addEventListener('click', (e) => {
                e.preventDefault();
                const existingModal = document.getElementById('scaleplus-settings-modal');
                if (existingModal) {
                    existingModal.remove();
                    const existingStyle = document.querySelector('style[data-scaleplus-modal]');
                    if (existingStyle) existingStyle.remove();
                }
                createSettingsModal();
                $('#scaleplus-settings-modal').modal('show');
            });
            console.log('[ScalePlus Settings UI] Configure Workstation button intercepted');
        }
    };

    const init = () => {
        console.log('[ScalePlus Settings UI] Initializing...');
        
        // Wait for the page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', addConfigureButton);
        } else {
            addConfigureButton();
        }
        
        // Also watch for the button to appear dynamically
        const observer = new MutationObserver(() => {
            const targetButton = document.getElementById('ConfigureWorkStation');
            if (targetButton && !targetButton.hasAttribute('data-scaleplus-intercepted')) {
                addConfigureButton();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    };

    // Export module
    window.ScalePlusSettingsUI = {
        init,
        createSettingsModal,
        addConfigureButton
    };

    console.log('[ScalePlus Settings UI] Module loaded');
})();

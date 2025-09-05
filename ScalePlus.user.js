// ==UserScript==
// @name         ScalePlus
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Custom enhancements for Scale application with toggleable features
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @author       Blake, Nash
// @match        https://scaleqa.byjasco.com/scale/*
// @match        https://scale20.byjasco.com/scale/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Helper: normalize spaces (convert &nbsp; → space, collapse whitespace)
    const normalizeSpaces = (text) => text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

    // On page load, click the search button if not already active
    function clickSearchButtonIfNeeded() {
        const enabled = localStorage.getItem('scaleplus_show_search_pane') !== 'false';
        if (!enabled) return;
        function tryClick() {
            var searchBtn = document.querySelector('li.navsearch.visible-sm.visible-md.visible-lg a.navimageanchor[data-toggle="search"]');
            if (searchBtn) {
                if (!searchBtn.classList.contains('visiblepane')) {
                    searchBtn.click();
                    console.log('[ScalePlus] Clicked search button to show search pane.');
                } else {
                    console.log('[ScalePlus] Search pane already visible, not clicking.');
                }
            } else {
                setTimeout(tryClick, 200);
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryClick);
        } else {
            tryClick();
        }
    }
    clickSearchButtonIfNeeded();

    const STORAGE_KEY = 'scaleplus_f5_behavior';

    // Set defaults
    if (localStorage.getItem('scaleplus_show_search_pane') === null) localStorage.setItem('scaleplus_show_search_pane', 'true');
    if (localStorage.getItem('scaleplus_custom_enter') === null) localStorage.setItem('scaleplus_custom_enter', 'true');
    if (localStorage.getItem('scaleplus_middle_click_copy') === null) localStorage.setItem('scaleplus_middle_click_copy', 'true');
    if (localStorage.getItem('scaleplus_env_labels') === null) localStorage.setItem('scaleplus_env_labels', 'false');
    if (localStorage.getItem('scaleplus_tab_duplicator') === null) localStorage.setItem('scaleplus_tab_duplicator', 'false');
    if (localStorage.getItem('scaleplus_default_filter') === null) localStorage.setItem('scaleplus_default_filter', 'true');

    const isVisible = (el) => {
        if (!el) return false;
        const parentLi = el.closest('li');
        const target = parentLi || el;
        const visible = target.offsetParent !== null &&
              !target.classList.contains('disabled') &&
              !target.className.includes('disabled') &&
              getComputedStyle(target).pointerEvents !== 'none' &&
              getComputedStyle(target).visibility !== 'hidden' &&
              getComputedStyle(target).display !== 'none';
        console.log(`[ScalePlus] isVisible(${el.id}):`, visible);
        return visible;
    };

    let firstTrigger = true;

    const triggerAction = () => {
        const stopBtn = document.getElementById('InsightMenuActionStopSearch');
        const applyBtn = document.getElementById('InsightMenuApply');

        if (firstTrigger) {
            firstTrigger = false;
            if (isVisible(applyBtn)) {
                console.log('[ScalePlus] First trigger - Clicking Apply');
                applyBtn.click();
            } else {
                console.log('[ScalePlus] First trigger - Apply button not visible');
            }
        } else {
            if (isVisible(stopBtn)) {
                console.log('[ScalePlus] Clicking Stop Search');
                stopBtn.click();
            } else if (isVisible(applyBtn)) {
                console.log('[ScalePlus] Clicking Apply');
                applyBtn.click();
            } else {
                console.log('[ScalePlus] No visible button to click');
            }
        }
    };

    const getF5Behavior = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            console.log(`[ScalePlus] Using stored F5 behavior: ${stored}`);
            return stored;
        }
        // Default to normal behavior if not set (users can change via Configure workstation button)
        const defaultBehavior = 'normal';
        localStorage.setItem(STORAGE_KEY, defaultBehavior);
        console.log(`[ScalePlus] Default F5 behavior set to: ${defaultBehavior}`);
        return defaultBehavior;
    };

    const clearF5Preference = () => {
        localStorage.removeItem(STORAGE_KEY);
        console.log('[ScalePlus] F5 behavior preference cleared');
        alert('ScalePlus: F5 behavior preference has been cleared.');
    };

    const copyToClipboard = (text, x, y) => {
        navigator.clipboard.writeText(text).then(() => {
            console.log('[ScalePlus] Copied to clipboard:', text);
            showTooltip(x, y, `Copied: "${text}"`);
        }).catch(err => {
            console.error('[ScalePlus] Clipboard copy failed:', err);
        });
    };

    const showTooltip = (x, y, text) => {
        const tooltip = document.createElement('div');
        tooltip.textContent = text;
        Object.assign(tooltip.style, {
            position: 'absolute',
            top: `${y}px`,
            left: `${x}px`,
            background: '#333',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 9999,
            pointerEvents: 'none',
            opacity: 0,
            transition: 'opacity 0.3s ease'
        });
        document.body.appendChild(tooltip);
        requestAnimationFrame(() => {
            tooltip.style.opacity = 1;
        });
        setTimeout(() => {
            tooltip.style.opacity = 0;
            setTimeout(() => tooltip.remove(), 300);
        }, 1500);
    };

    // Create settings modal
    const createSettingsModal = () => {
        const modal = document.createElement('div');
        modal.id = 'scaleplus-settings-modal';
        modal.innerHTML = `
            <div class="scaleplus-modal-backdrop"></div>
            <div class="scaleplus-modal-content">
                <div class="scaleplus-modal-header">
                    <h3>ScalePlus Settings</h3>
                    <button class="scaleplus-close-btn">&times;</button>
                </div>
                <div class="scaleplus-modal-body">
                    <div class="scaleplus-basic-settings">
                        <div class="scaleplus-setting">
                            <label for="search-toggle">Always show search:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="search-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
                            <span class="scaleplus-setting-desc">Automatically show the search pane when the page loads</span>
                        </div>
                        <div class="scaleplus-setting">
                            <label for="enter-toggle">Custom Enter behavior:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="enter-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
                            <span class="scaleplus-setting-desc">When enabled, Enter triggers Play/Stop</span>
                        </div>
                        <div class="scaleplus-setting">
                            <label for="middle-click-toggle">Middle click to copy:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="middle-click-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
                            <span class="scaleplus-setting-desc">Middle click on grid items to copy text</span>
                        </div>
                    </div>
                    
                    <div class="scaleplus-divider">
                        <div class="scaleplus-advanced-label">Advanced Settings</div>
                        <div class="scaleplus-divider-line"></div>
                    </div>
                    
                    <div class="scaleplus-advanced-settings">
                        <div class="scaleplus-setting">
                            <label for="f5-toggle">Custom F5 Behavior:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="f5-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
                            <span class="scaleplus-setting-desc">When enabled, F5 triggers Play/Stop instead of page refresh</span>
                        </div>
                        <div class="scaleplus-setting">
                            <label for="tab-duplicator-toggle">Tab Duplicator:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="tab-duplicator-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
                            <span class="scaleplus-setting-desc">Ctrl+D to duplicate current tab</span>
                        </div>
                        <div class="scaleplus-setting">
                            <label for="default-filter-toggle">Default Filter:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="default-filter-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
                            <span class="scaleplus-setting-desc">Enable default filter selection with star icons</span>
                        </div>
                        <div class="scaleplus-setting">
                            <label for="env-labels-toggle">Environment Labels:</label>
                            <div class="scaleplus-toggle">
                                <input type="checkbox" id="env-labels-toggle">
                                <div class="scaleplus-toggle-container">
                                    <div class="scaleplus-toggle-slider"></div>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-off">Off</span>
                                    <span class="scaleplus-toggle-text scaleplus-toggle-on">On</span>
                                </div>
                            </div>
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
                <div class="scaleplus-modal-footer">
                    <button class="scaleplus-cancel-btn">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .scaleplus-modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                z-index: 10000;
            }
            .scaleplus-modal-content {
                position: fixed;
                top: 40%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #333a45;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                min-width: 800px;
                max-width: 700px;
            }
            .scaleplus-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #ddd;
                background: #494e5e;
            }
            .scaleplus-modal-header h3 {
                margin: 0;
                color: white;
                flex: 1;
                text-align: center;
            }
            .scaleplus-close-btn {
                background: none;
                border: none;
                font-size: 16px;
                cursor: pointer;
                color: white;
                padding: 0;
                width: 16px;
                height: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .scaleplus-modal-body {
                padding: 20px;
                background: #333a45;
            }
            .scaleplus-modal-footer {
                padding: 10px 20px;
                background: #494e5e;
                display: flex;
                justify-content: flex-end;
            }
            .scaleplus-cancel-btn {
                background: #4f93e4;
                color: white;
                border: none;
                padding: 10px 20px;
                cursor: pointer;
                font-size: 14px;
            }
            .scaleplus-setting {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
            }
            .scaleplus-setting label {
                flex: 1;
                font-weight: bold;
                color: white;
            }
            .scaleplus-toggle {
                position: relative;
                margin: 0 10px;
                width: 80px;
                height: 34px;
            }
            .scaleplus-toggle input {
                opacity: 0;
                width: 0;
                height: 0;
                position: absolute;
            }
            .scaleplus-toggle-container {
                display: flex;
                background: #6f6f6f;
                cursor: pointer;
                position: relative;
                overflow: hidden;
                transition: background 0.3s ease;
                border-radius: 17px;
                width: 100%;
                height: 100%;
                align-items: center;
                justify-content: center;
            }
            .scaleplus-toggle-slider {
                position: absolute;
                top: 2px;
                left: 2px;
                width: 30px;
                height: 30px;
                background: white;
                border-radius: 50%;
                transition: transform 0.3s ease;
                z-index: 2;
            }
            .scaleplus-toggle-text {
                padding: 0;
                font-size: 12px;
                font-weight: bold;
                color: white;
                transition: all 0.3s ease;
                z-index: 3;
                position: absolute;
                background: transparent;
                text-align: center;
                width: 40px;
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none;
            }
            .scaleplus-toggle-off {
                background: transparent;
                right: 5px;
            }
            .scaleplus-toggle-on {
                background: transparent;
                left: 5px;
            }
            .scaleplus-toggle input:checked ~ .scaleplus-toggle-container {
                background: #4f93e4;
            }
            .scaleplus-toggle input:checked ~ .scaleplus-toggle-container .scaleplus-toggle-slider {
                transform: translateX(46px);
            }
            .scaleplus-toggle input:checked ~ .scaleplus-toggle-container .scaleplus-toggle-off {
                opacity: 0;
            }
            .scaleplus-toggle input:checked ~ .scaleplus-toggle-container .scaleplus-toggle-on {
                opacity: 1;
            }
            .scaleplus-toggle input:not(:checked) ~ .scaleplus-toggle-container .scaleplus-toggle-off {
                opacity: 1;
            }
            .scaleplus-toggle input:not(:checked) ~ .scaleplus-toggle-container .scaleplus-toggle-on {
                opacity: 0;
            }
            .scaleplus-setting-desc {
                font-size: 12px;
                color: #ccc;
                flex: 2;
            }
            .scaleplus-env-names {
                margin-left: 0;
            }
            .scaleplus-env-names .scaleplus-setting {
                display: flex;
                align-items: center;
            }
            .scaleplus-env-names .scaleplus-setting label {
                display: inline-block;
                margin-bottom: 0;
                margin-right: 10px;
                min-width: 200px;
            }
            .scaleplus-env-names input {
                background: #555;
                color: white;
                border: 1px solid #777;
                padding: 5px;
                border-radius: 4px;
                width: 300px;
                display: inline-block;
            }
            .scaleplus-divider {
                margin: 20px 0;
            }
            .scaleplus-advanced-label {
                color: #ccc;
                font-weight: normal;
                font-size: 12px;
                margin-bottom: 10px;
                text-align: left;
            }
            .scaleplus-divider-line {
                border-top: 1px solid #555;
                margin-bottom: 15px;
            }
            .scaleplus-env-setting {
                margin-bottom: 15px;
            }
            .scaleplus-env-setting label {
                font-weight: bold;
                color: white;
                margin-right: 10px;
                width: 200px;
                display: inline-block;
            }
            .scaleplus-env-setting input {
                background: #555;
                color: white;
                border: 1px solid #777;
                padding: 5px;
                border-radius: 4px;
                width: 300px;
                display: inline-block;
            }
        `;
        document.head.appendChild(style);

        // Set initial toggle states
        const f5Toggle = modal.querySelector('#f5-toggle');
        const currentF5 = localStorage.getItem(STORAGE_KEY);
        if (currentF5 === 'custom') {
            f5Toggle.checked = true;
        }

        const searchToggle = modal.querySelector('#search-toggle');
        const currentSearch = localStorage.getItem('scaleplus_show_search_pane');
        if (currentSearch !== 'false') {
            searchToggle.checked = true;
        }

        const enterToggle = modal.querySelector('#enter-toggle');
        const currentEnter = localStorage.getItem('scaleplus_custom_enter');
        if (currentEnter !== 'false') {
            enterToggle.checked = true;
        }

        const middleClickToggle = modal.querySelector('#middle-click-toggle');
        const currentMiddle = localStorage.getItem('scaleplus_middle_click_copy');
        if (currentMiddle !== 'false') {
            middleClickToggle.checked = true;
        }

        const envLabelsToggle = modal.querySelector('#env-labels-toggle');
        const currentEnv = localStorage.getItem('scaleplus_env_labels');
        if (currentEnv === 'true') {
            envLabelsToggle.checked = true;
        }

        const tabDuplicatorToggle = modal.querySelector('#tab-duplicator-toggle');
        const currentTab = localStorage.getItem('scaleplus_tab_duplicator');
        if (currentTab !== 'false') {
            tabDuplicatorToggle.checked = true;
        }

        const defaultFilterToggle = modal.querySelector('#default-filter-toggle');
        const currentDefaultFilter = localStorage.getItem('scaleplus_default_filter');
        if (currentDefaultFilter !== 'false') {
            defaultFilterToggle.checked = true;
        }

        const qaNameInput = modal.querySelector('#qa-name');
        const prodNameInput = modal.querySelector('#prod-name');

        qaNameInput.value = localStorage.getItem('scaleplus_env_qa_name') || 'QA ENVIRONMENT';
        prodNameInput.value = localStorage.getItem('scaleplus_env_prod_name') || 'PRODUCTION ENVIRONMENT';

        // Handle toggle changes
        const toggleContainerSearch = searchToggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerSearch.addEventListener('click', () => {
            searchToggle.checked = !searchToggle.checked;
            localStorage.setItem('scaleplus_show_search_pane', searchToggle.checked.toString());
            console.log(`[ScalePlus] Show search pane set to: ${searchToggle.checked}`);
        });

        const toggleContainerEnter = enterToggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerEnter.addEventListener('click', () => {
            enterToggle.checked = !enterToggle.checked;
            localStorage.setItem('scaleplus_custom_enter', enterToggle.checked.toString());
            console.log(`[ScalePlus] Custom Enter set to: ${enterToggle.checked}`);
        });

        const toggleContainerMiddle = middleClickToggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerMiddle.addEventListener('click', () => {
            middleClickToggle.checked = !middleClickToggle.checked;
            localStorage.setItem('scaleplus_middle_click_copy', middleClickToggle.checked.toString());
            console.log(`[ScalePlus] Middle click copy set to: ${middleClickToggle.checked}`);
        });

        const toggleContainerF5 = f5Toggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerF5.addEventListener('click', () => {
            f5Toggle.checked = !f5Toggle.checked;
            const behavior = f5Toggle.checked ? 'custom' : 'normal';
            localStorage.setItem(STORAGE_KEY, behavior);
            console.log(`[ScalePlus] F5 behavior set to: ${behavior}`);
        });

        const toggleContainerEnv = envLabelsToggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerEnv.addEventListener('click', () => {
            envLabelsToggle.checked = !envLabelsToggle.checked;
            localStorage.setItem('scaleplus_env_labels', envLabelsToggle.checked.toString());
            console.log(`[ScalePlus] Environment labels set to: ${envLabelsToggle.checked}`);
        });

        const toggleContainerTab = tabDuplicatorToggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerTab.addEventListener('click', () => {
            tabDuplicatorToggle.checked = !tabDuplicatorToggle.checked;
            localStorage.setItem('scaleplus_tab_duplicator', tabDuplicatorToggle.checked.toString());
            console.log(`[ScalePlus] Tab duplicator set to: ${tabDuplicatorToggle.checked}`);
        });

        const toggleContainerDefaultFilter = defaultFilterToggle.closest('.scaleplus-setting').querySelector('.scaleplus-toggle-container');
        toggleContainerDefaultFilter.addEventListener('click', () => {
            defaultFilterToggle.checked = !defaultFilterToggle.checked;
            localStorage.setItem('scaleplus_default_filter', defaultFilterToggle.checked.toString());
            console.log(`[ScalePlus] Default filter set to: ${defaultFilterToggle.checked}`);
        });

        qaNameInput.addEventListener('input', () => {
            localStorage.setItem('scaleplus_env_qa_name', qaNameInput.value);
        });

        prodNameInput.addEventListener('input', () => {
            localStorage.setItem('scaleplus_env_prod_name', prodNameInput.value);
        });

        // Handle close
        const closeBtn = modal.querySelector('.scaleplus-close-btn');
        const backdrop = modal.querySelector('.scaleplus-modal-backdrop');
        const cancelBtn = modal.querySelector('.scaleplus-cancel-btn');
        const closeModal = () => {
            modal.remove();
            style.remove();
        };
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
        cancelBtn.addEventListener('click', closeModal);
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'F5' || e.keyCode === 116) {
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                clearF5Preference();
                return;
            }
            const behavior = getF5Behavior();
            if (behavior === 'custom') {
                e.preventDefault();
                console.log('[ScalePlus] F5 custom behavior triggered');
                triggerAction();
            } else {
                console.log('[ScalePlus] F5 normal behavior - allowing page refresh');
            }
        } else if (e.key === 'Enter' || e.keyCode === 13) {
            // Check if settings modal is open
            const settingsModal = document.getElementById('scaleplus-settings-modal');
            if (settingsModal) {
                e.preventDefault();
                settingsModal.querySelector('.scaleplus-close-btn').click();
                return;
            }
            // Check for any visible modal dialogs (display: block)
            const modals = document.querySelectorAll('.modal');
            let modalVisible = false;
            modals.forEach(modal => {
                if (getComputedStyle(modal).display === 'block') {
                    modalVisible = true;
                }
            });
            if (modalVisible) {
                // Let Enter act as normal if any modal is visible
                return;
            } else {
                const enabled = localStorage.getItem('scaleplus_custom_enter') !== 'false';
                if (enabled) {
                    e.preventDefault();
                    console.log('[ScalePlus] Enter key triggered');
                    triggerAction();
                }
            }
        } else if (e.key.toLowerCase() === 'd' && e.ctrlKey && !e.shiftKey) {
            const enabled = localStorage.getItem('scaleplus_tab_duplicator') !== 'false';
            if (enabled) {
                e.preventDefault();
                window.open(window.location.href, '_blank');
            }
        } else if (e.key.toLowerCase() === 'g' && e.altKey) {
            e.preventDefault();
            const formId = getFormIdFromUrl();
            const defaultFilter = getDefaultFilter(formId);

            if (defaultFilter) {
                // Try to find and click the default filter
                const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                let found = false;

                for (const item of savedSearchItems) {
                    const filterText = item.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                    if (filterText === defaultFilter) {
                        item.click();
                        console.log(`[ScalePlus] Alt+G pressed - clicking default filter: ${defaultFilter}`);
                        found = true;
                        break;
                    }
                }

                if (!found) {
                    console.log(`[ScalePlus] Alt+G pressed - default filter "${defaultFilter}" not found, clearing it`);
                    clearDefaultFilter(formId);
                }
            } else {
                // No default set, click first available
                const savedSearchBtn = document.querySelector('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                if (savedSearchBtn) {
                    savedSearchBtn.click();
                    console.log('[ScalePlus] Alt+G pressed - clicking first available saved search (no default set)');
                } else {
                    console.log('[ScalePlus] Alt+G pressed - no saved search buttons found');
                }
            }

            // Refresh icons after action
            setTimeout(addDefaultFilterIcons, 500);
        }
    });

    // Add event listener for Configure workstation button
    const configBtn = document.getElementById('ConfigureWorkStation');
    if (configBtn) {
        configBtn.addEventListener('click', (e) => {
            e.preventDefault();
            createSettingsModal();
        });
    }

    function copyInnerText(e) {
        let el = e.target;
        while (el && (!el.getAttribute || !el.getAttribute('aria-describedby') || !el.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
            el = el.parentElement;
        }
        if (!el) {
            console.log('[ScalePlus] Triggered element does not have aria-describedby starting with ListPaneDataGrid');
            return;
        }
        e.preventDefault();
        let value = '';
        if (el.tagName === 'A') {
            value = normalizeSpaces(el.textContent);
        } else if (el.tagName === 'TD') {
            const link = el.querySelector('a');
            value = link ? normalizeSpaces(link.textContent) : normalizeSpaces(el.textContent);
        } else {
            const link = el.querySelector('a');
            value = link ? normalizeSpaces(link.textContent) : normalizeSpaces(el.textContent);
        }
        copyToClipboard(value, e.pageX || 0, e.pageY || 0);
    }

    document.addEventListener('mousedown', function (e) {
        if (e.button === 1) {
            const enabled = localStorage.getItem('scaleplus_middle_click_copy') !== 'false';
            if (enabled) {
                e.preventDefault();
                copyInnerText(e);
            }
        }
    });

    // Environment Labels
    function addEnvironmentLabel() {
        const enabled = localStorage.getItem('scaleplus_env_labels') === 'true';
        if (!enabled) return;

        const navBar = document.getElementById('topNavigationBar');
        if (!navBar) return;

        // Create a label element
        const label = document.createElement('div');
        const isProd = window.location.hostname === 'scale20.byjasco.com';
        const qaName = localStorage.getItem('scaleplus_env_qa_name') || 'QA ENVIRONMENT';
        const prodName = localStorage.getItem('scaleplus_env_prod_name') || 'PRODUCTION ENVIRONMENT';
        const labelText = isProd ? prodName : qaName;
        const bgColor = isProd ? '#c0392b' : '#d0b132';
        const borderColor = bgColor;
        label.textContent = labelText;
        label.style.cssText = `
            color: white;
            background-color: ${bgColor};
            font-weight: bold;
            font-size: 16px;
            padding: 8px 8px;
            border-radius: 4px;
            margin: 2px 800px;
            display: inline-block;
            white-space: nowrap;
        `;

        // Insert it at the beginning of the navbar
        const header = navBar.querySelector('.navbar-header');
        if (header) {
            header.insertBefore(label, header.firstChild);
        }

        navBar.style.borderBottom = `6px solid ${borderColor}`;
    }
    addEnvironmentLabel();

    // Default Filter Management
    function getFormIdFromUrl() {
        const match = window.location.pathname.match(/insights\/(\d+)/);
        return match ? match[1] : null;
    }

    // Alternative function name for compatibility
    function extractFormIdFromUrl(url) {
        const match = url.match(/insights\/(\d+)/);
        return match ? match[1] : null;
    }

    // Check if default filter feature is enabled
    function isDefaultFilterEnabled() {
        return localStorage.getItem('scaleplus_default_filter') !== 'false';
    }

    function getDefaultFilterKey(formId) {
        return `${formId}DefaultFilter`;
    }

    function setDefaultFilter(formId, filterText) {
        const key = getDefaultFilterKey(formId);
        localStorage.setItem(key, filterText);
        console.log(`[ScalePlus] Set default filter for form ${formId}: ${filterText}`);
    }

    function getDefaultFilter(formId) {
        const key = getDefaultFilterKey(formId);
        return localStorage.getItem(key);
    }

    function clearDefaultFilter(formId) {
        const key = getDefaultFilterKey(formId);
        localStorage.removeItem(key);
        console.log(`[ScalePlus] Cleared default filter for form ${formId}`);
    }

    function addDefaultFilterIcons() {
        const enabled = localStorage.getItem('scaleplus_default_filter') !== 'false';
        if (!enabled) return;

        const formId = getFormIdFromUrl();
        if (!formId) return;

        // Add global styles for better layout
        if (!document.getElementById('scaleplus-dropdown-styles')) {
            const style = document.createElement('style');
            style.id = 'scaleplus-dropdown-styles';
            style.textContent = `
                .dropdown-menu li a {
                    min-height: 24px !important;
                    padding: 6px 12px !important;
                    display: flex !important;
                    align-items: center !important;
                }
                .scaleplus-default-icon {
                    transition: color 0.2s ease;
                }
                .scaleplus-default-icon:hover {
                    filter: brightness(0.7) !important;
                }
                .deletesavedsearchbutton:hover {
                    filter: brightness(0.7) !important;
                }
                .deletesavedsearchtext {
                    flex: 1 !important;
                    margin-right: 10px !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
            `;
            document.head.appendChild(style);
        }

        const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
        const currentDefault = getDefaultFilter(formId);

        savedSearchItems.forEach(item => {
            // Skip if already processed
            if (item.querySelector('.scaleplus-default-icon')) return;

            const filterText = item.querySelector('.deletesavedsearchtext')?.textContent?.trim();
            if (!filterText) return;

            // Create default icon
            const defaultIcon = document.createElement('span');
            defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon';
            defaultIcon.title = 'Click to change default state'; // Add tooltip
            defaultIcon.style.cssText = `
                cursor: pointer;
                margin-right: 8px;
                color: ${currentDefault === filterText ? 'white' : '#ccc'};
                font-size: 16px;
                padding: 2px;
                vertical-align: middle;
                flex-shrink: 0;
            `;

            // Use filled star for selected, outline star for unselected
            defaultIcon.classList.add(currentDefault === filterText ? 'glyphicon-star' : 'glyphicon-star-empty');

            // Add click handler
            defaultIcon.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Get current default dynamically (not from closure)
                const currentDefaultNow = getDefaultFilter(formId);

                if (currentDefaultNow === filterText) {
                    // Unset as default
                    clearDefaultFilter(formId);
                    defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star-empty';
                    defaultIcon.style.color = '#ccc';
                    defaultIcon.style.verticalAlign = 'middle';
                    console.log(`[ScalePlus] Unset ${filterText} as default for form ${formId}`);
                } else {
                    // Set as default
                    setDefaultFilter(formId, filterText);
                    defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star';
                    defaultIcon.style.color = 'white';
                    defaultIcon.style.verticalAlign = 'middle';

                    // Update other icons to be unselected
                    document.querySelectorAll('.scaleplus-default-icon').forEach(icon => {
                        if (icon !== defaultIcon) {
                            icon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star-empty';
                            icon.style.color = '#ccc';
                            icon.style.verticalAlign = 'middle';
                        }
                    });

                    console.log(`[ScalePlus] Set ${filterText} as default for form ${formId}`);
                }
            });

            // Insert before the delete button
            const deleteBtn = item.querySelector('.deletesavedsearchbutton');
            if (deleteBtn) {
                deleteBtn.title = 'Click to delete this favorite'; // Add tooltip
                deleteBtn.parentNode.insertBefore(defaultIcon, deleteBtn);
                
                // Add flex-shrink to delete button too
                deleteBtn.style.flexShrink = '0';
                deleteBtn.style.marginLeft = '5px';

                // Remove any existing width restrictions from text span
                const textSpan = item.querySelector('.deletesavedsearchtext');
                if (textSpan) {
                    textSpan.style.removeProperty('width');
                    textSpan.style.removeProperty('max-width');
                }
            }
        });
    }

    // Run initially and then periodically to catch dynamically loaded content
    addDefaultFilterIcons();
    setInterval(addDefaultFilterIcons, 1000);
    
    // Auto-click default filter for form URLs without arguments
    function checkAutoClickDefault() {
        // Only for URLs like "https://scaleqa.byjasco.com/scale/insights/2723" (no ? parameters)
        if (location.pathname.includes('/insights/') && !location.search) {
            const formId = extractFormIdFromUrl(location.href);
            if (formId) {
                const defaultFilter = getDefaultFilter(formId);
                if (defaultFilter) {
                    console.log('[ScalePlus] Looking for default filter:', defaultFilter);
                    // Find the default filter in the saved searches and click it
                    const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                    for (const item of savedSearchItems) {
                        const textSpan = item.querySelector('.deletesavedsearchtext');
                        if (textSpan && textSpan.textContent.trim() === defaultFilter) {
                            console.log('[ScalePlus] Auto-clicking default filter:', defaultFilter);
                            item.click();
                            
                            // Click stop button after a short delay (using same logic as Enter key)
                            setTimeout(() => {
                                const stopBtn = document.getElementById('InsightMenuActionStopSearch');
                                if (isVisible(stopBtn)) {
                                    console.log('[ScalePlus] Auto-clicking stop button');
                                    stopBtn.click();
                                } else {
                                    console.log('[ScalePlus] Stop button not visible for auto-click');
                                }
                            }, 500);
                            return true;
                        }
                    }
                    console.log('[ScalePlus] Default filter not found in saved searches');
                }
            }
        }
        return false;
    }

    // Monitor for saved searches dropdown to appear for auto-click
    let hasAutoClicked = false;
    let hasLoggedNoDefault = false;
    setInterval(() => {
        if (isDefaultFilterEnabled()) {
            // Check for page load auto-click
            if (!hasAutoClicked && document.readyState === 'complete') {
                const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                if (savedSearchItems.length > 0) {
                    const formId = extractFormIdFromUrl(location.href);
                    const defaultFilter = formId ? getDefaultFilter(formId) : null;
                    
                    if (defaultFilter) {
                        console.log('[ScalePlus] Page loaded, checking for auto-click');
                        if (checkAutoClickDefault()) {
                            hasAutoClicked = true;
                        }
                    } else if (!hasLoggedNoDefault) {
                        console.log('[ScalePlus] Page loaded - no default filter set');
                        hasLoggedNoDefault = true;
                    }
                }
            }
        }
    }, 1000);

    // Add auto-click to clear filters button
    function enhanceClearFiltersButton() {
        const clearBtn = document.querySelector('#InsightMenuActionClearFilters');
        if (clearBtn && !clearBtn.hasAttribute('data-enhanced')) {
            clearBtn.setAttribute('data-enhanced', 'true');
            console.log('[ScalePlus] Enhanced clear filters button');
            
            // Store original click handler
            const originalOnclick = clearBtn.onclick;
            
            // Add our enhanced click handler
            clearBtn.addEventListener('click', function(e) {
                console.log('[ScalePlus] Clear filters clicked - will apply default filter after clearing');
                
                // Apply default filter after a delay to let the clear operation complete
                setTimeout(() => {
                    const formId = getFormIdFromUrl();
                    if (formId && isDefaultFilterEnabled()) {
                        const defaultFilter = getDefaultFilter(formId);
                        if (defaultFilter) {
                            console.log('[ScalePlus] Applying default filter after clear:', defaultFilter);
                            const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                            for (const item of savedSearchItems) {
                                const textSpan = item.querySelector('.deletesavedsearchtext');
                                if (textSpan && textSpan.textContent.trim() === defaultFilter) {
                                    console.log('[ScalePlus] Clicking default filter:', defaultFilter);
                                    item.click();
                                    
                                    // Click stop button after applying filter (using same logic as Enter key)
                                    setTimeout(() => {
                                        const stopBtn = document.getElementById('InsightMenuActionStopSearch');
                                        if (isVisible(stopBtn)) {
                                            console.log('[ScalePlus] Clicking stop button after applying default');
                                            stopBtn.click();
                                        } else {
                                            console.log('[ScalePlus] Stop button not visible after applying default');
                                        }
                                    }, 500);
                                    break;
                                }
                            }
                        }
                    }
                }, 1000); // Wait 1 second for clear to complete
            });
        }
    }

    // Monitor for clear filters button
    setInterval(() => {
        if (isDefaultFilterEnabled()) {
            enhanceClearFiltersButton();
        }
    }, 500);
})();

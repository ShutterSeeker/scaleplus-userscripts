// ==UserScript==
// @name         ScalePlus
// @namespace    http://tampermonkey.net/
// @version      2.7
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

    // Constants for localStorage keys and default values
    const SETTINGS = {
        SHOW_SEARCH_PANE: 'scaleplus_show_search_pane',
        CUSTOM_ENTER: 'scaleplus_custom_enter',
        MIDDLE_CLICK_COPY: 'scaleplus_middle_click_copy',
        ENV_LABELS: 'scaleplus_env_labels',
        TAB_DUPLICATOR: 'scaleplus_tab_duplicator',
        DEFAULT_FILTER: 'scaleplus_default_filter',
        ADV_CRITERIA_ENHANCEMENT: 'scaleplus_adv_criteria_enhancement',
        F5_BEHAVIOR: 'scaleplus_f5_behavior',
        ENV_QA_NAME: 'scaleplus_env_qa_name',
        ENV_PROD_NAME: 'scaleplus_env_prod_name'
    };

    const DEFAULTS = {
        [SETTINGS.SHOW_SEARCH_PANE]: 'true',
        [SETTINGS.CUSTOM_ENTER]: 'true',
        [SETTINGS.MIDDLE_CLICK_COPY]: 'true',
        [SETTINGS.ENV_LABELS]: 'false',
        [SETTINGS.TAB_DUPLICATOR]: 'false',
        [SETTINGS.DEFAULT_FILTER]: 'true',
        [SETTINGS.ADV_CRITERIA_ENHANCEMENT]: 'true',
        [SETTINGS.F5_BEHAVIOR]: 'false',
        [SETTINGS.ENV_QA_NAME]: 'QA ENVIRONMENT',
        [SETTINGS.ENV_PROD_NAME]: 'PRODUCTION ENVIRONMENT'
    };

    // Helper: normalize spaces (convert &nbsp; → space, collapse whitespace)
    const normalizeSpaces = (text) => text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

    // Function to extract current filter criteria from the page
    function extractCurrentFilterCriteria() {
        const criteria = [];

        // Try to get values from regular input fields
        try {
            const inputs = document.querySelectorAll('input[id*="Criteria"], input[name*="Criteria"], input[id*="Date"], input[name*="Date"]');
            inputs.forEach(input => {
                if (input.value && input.value.trim()) {
                    criteria.push({
                        name: input.id || input.name,
                        value: input.value.trim()
                    });
                    console.log(`[ScalePlus] Added input criteria: ${input.id || input.name} = ${input.value.trim()}`);
                }
            });
        } catch (e) {
            console.warn('[ScalePlus] Could not extract input values:', e);
        }

        // Try to get values from igTextEditor widgets
        try {
            const textEditors = $('[data-controltype="igTextEditor"]');
            console.log('[ScalePlus] Found', textEditors.length, 'igTextEditor widgets');
            textEditors.each(function() {
                const editor = $(this);
                const id = editor.attr('id');
                if (id && (id.includes('Date') || id.includes('Criteria'))) {
                    const value = editor.igTextEditor('value');
                    if (value) {
                        criteria.push({
                            name: id,
                            value: value
                        });
                        console.log(`[ScalePlus] Added IG text criteria: ${id} = ${value}`);
                    }
                }
            });
        } catch (e) {
            console.warn('[ScalePlus] Could not extract igTextEditor values:', e);
        }

        // Try to get values from igDatePicker widgets
        try {
            const datePickers = $('[data-controltype="igDatePicker"]');
            console.log('[ScalePlus] Found', datePickers.length, 'igDatePicker widgets');
            datePickers.each(function() {
                const picker = $(this);
                const id = picker.attr('id');
                if (id && (id.includes('Date') || id.includes('Criteria'))) {
                    const value = picker.igDatePicker('value');
                    if (value) {
                        criteria.push({
                            name: id,
                            value: value.toISOString()
                        });
                        console.log(`[ScalePlus] Added IG date criteria: ${id} = ${value.toISOString()}`);
                    }
                }
            });
        } catch (e) {
            console.warn('[ScalePlus] Could not extract igDatePicker values:', e);
        }

        console.log('[ScalePlus] Total extracted criteria:', criteria.length, criteria);
        return criteria;
    }

    // Function to check if criteria contain date fields
    function checkForDateCriteria(filterData) {
        if (!filterData || !filterData.inSearch) return false;

        const datePatterns = [
            /date/i,
            /time/i,
            /created/i,
            /modified/i,
            /updated/i,
            /start/i,
            /end/i,
            /from/i,
            /to/i,
            /begin/i,
            /finish/i
        ];

        for (const criterion of filterData.inSearch) {
            const fieldName = criterion.name || '';
            const fieldValue = criterion.value || '';

            // Check if field name matches date patterns
            const nameMatches = datePatterns.some(pattern => pattern.test(fieldName));

            // Check if value looks like a date
            const valueLooksLikeDate = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(fieldValue) ||
                                      /^\d{4}-\d{2}-\d{2}/.test(fieldValue) ||
                                      /today|yesterday|tomorrow/i.test(fieldValue);

            if (nameMatches || valueLooksLikeDate) {
                console.log(`[ScalePlus] Date criteria detected: ${fieldName} = ${fieldValue}`);
                return true;
            }
        }

        console.log('[ScalePlus] No date criteria found');
        return false;
    }

    // Common function to handle save dialog submission (used by both button clicks and Enter key)
    function handleSaveDialogSubmission(saveBtn, originalHandler, e) {
        // Check if this is a re-triggered save (avoid infinite loops)
        if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
            console.log('[ScalePlus] Re-triggered save detected, proceeding normally');
            return true; // Allow the save to proceed
        }

        // Extract information immediately
        const filterNameInput = document.querySelector('#SaveSearchNameEditor');
        console.log('[ScalePlus] Filter name input found:', !!filterNameInput);
        const filterName = filterNameInput ? filterNameInput.value?.trim() : null;
        console.log('[ScalePlus] Filter name extracted:', filterName);

        if (filterName) {
            const formId = getFormIdFromUrl();
            console.log('[ScalePlus] Form ID:', formId);
            const currentFilters = extractCurrentFilterCriteria();
            const hasDateCriteria = checkForDateCriteria({ inSearch: currentFilters });

            if (hasDateCriteria && formId) {
                // Check if favorites enhancement is enabled
                const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';

                if (isFavoritesEnabled) {
                    console.log(`[ScalePlus] Save dialog submission: Filter "${filterName}" contains date criteria`);

                    // Prevent original save
                    if (e) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    // Show our modal
                    showDateModeModal(formId, filterName, { inSearch: currentFilters }, () => {
                        // After modal closes, trigger original save
                        setTimeout(() => {
                            console.log('[ScalePlus] Re-triggering original save after modal');
                            // Mark as re-triggered so we don't intercept it again
                            saveBtn.setAttribute('data-scaleplus-retrigger', 'true');
                            console.log('[ScalePlus] Set data-scaleplus-retrigger attribute for re-triggering');
                            // Remove our interception marker temporarily
                            saveBtn.removeAttribute('data-scaleplus-enhanced');

                            try {
                                // Simple approach: Just click the same save button with re-trigger flag
                                console.log('[ScalePlus] Re-triggering by clicking the same save button');

                                // Click the same button that was originally intercepted
                                saveBtn.click();
                            } catch (error) {
                                console.error('[ScalePlus] Error during re-trigger:', error);
                            } finally {
                                // Clean up the re-trigger marker
                                setTimeout(() => {
                                    saveBtn.removeAttribute('data-scaleplus-retrigger');
                                }, 1000);
                            }
                        }, 100);
                    });

                    return false;
                } else {
                    console.log(`[ScalePlus] Favorites enhancement disabled, proceeding with normal save`);
                }
            }
        }

        // No date criteria or couldn't extract info, proceed normally
        console.log('[ScalePlus] Save dialog submission: Proceeding with normal save');
        return true;
    }

    // Alternative approach: Watch for save dialog creation and hook into the save process
    function setupSaveDialogObserver() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping save dialog observer setup');
            return; // Favorites enhancement disabled, don't set up observer
        }

        console.log('[ScalePlus] Setting up save dialog observer');

        // Function to enhance a save dialog with our functionality
        const enhanceSaveDialog = (saveDialog) => {
            console.log('[ScalePlus] Enhancing save dialog');

            // Look for the save button in the dialog using multiple methods
            let saveBtn = null;

            // Try standard CSS selectors first
            saveBtn = saveBtn || saveDialog.querySelector('button[type="submit"]');
            saveBtn = saveBtn || saveDialog.querySelector('.ui-button');
            saveBtn = saveBtn || saveDialog.querySelector('button[class*="save"]');

            // If still not found, look for any button containing "Save" text
            if (!saveBtn) {
                const buttons = saveDialog.querySelectorAll('button');
                for (const button of buttons) {
                    if (button.textContent && button.textContent.toLowerCase().includes('save')) {
                        saveBtn = button;
                        break;
                    }
                }
            }

            if (saveBtn && !saveBtn.hasAttribute('data-scaleplus-enhanced')) {
                console.log('[ScalePlus] Save button found in dialog');

                // Mark as enhanced to avoid duplicate enhancement
                saveBtn.setAttribute('data-scaleplus-enhanced', 'true');

                // Store original handler
                const originalHandler = saveBtn.onclick || null;

                // Remove any existing onclick handler to prevent conflicts
                saveBtn.onclick = null;

                // Add our click handler with capture phase to intercept before other listeners
                const clickHandler = function(e) {
                    console.log('[ScalePlus] Save button clicked in dialog (captured)');

                    // Check if this is a re-triggered save (avoid infinite loops)
                    if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                        console.log('[ScalePlus] Re-triggered save detected, allowing original save logic to run');
                        // Don't prevent default or stop propagation - let the original save happen
                        return; // Exit immediately, don't process further
                    }

                    // Ensure the input field value is committed before processing
                    const filterNameInput = document.querySelector('#SaveSearchNameEditor');
                    if (filterNameInput) {
                        // For save button, ensure the typed value is captured
                        let currentValue = filterNameInput.value?.trim();
                        console.log('[ScalePlus] Current input value before commit (save button):', currentValue);

                        // If value is empty, try to force commit by focusing/blurring
                        if (!currentValue) {
                            // Temporarily focus and blur to ensure value is committed
                            const activeElement = document.activeElement;
                            filterNameInput.focus();
                            filterNameInput.blur();
                            // Restore focus to original element
                            if (activeElement && activeElement !== filterNameInput) {
                                activeElement.focus();
                            }
                            currentValue = filterNameInput.value?.trim();
                            console.log('[ScalePlus] Input value after focus/blur commit (save button):', currentValue);
                        }

                        console.log('[ScalePlus] Final input value for save button processing:', currentValue);
                    }

                    // Small delay to allow input field to update
                    setTimeout(() => {
                        // Double-check re-trigger flag in case it was set during the delay
                        if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                            console.log('[ScalePlus] Re-trigger flag detected in timeout, skipping processing');
                            return;
                        }

                        // Handle the save submission
                        const shouldProceed = handleSaveDialogSubmission(saveBtn, originalHandler, e);

                        // If handleSaveDialogSubmission returns true, it means no date modal was shown
                        // and we should proceed with the normal save
                        if (shouldProceed) {
                            console.log('[ScalePlus] Save button: Proceeding with normal save');
                            try {
                                if (originalHandler) {
                                    console.log('[ScalePlus] Save button: Using original handler');
                                    originalHandler.call(saveBtn, e);
                                } else {
                                    console.log('[ScalePlus] Save button: Using button click fallback');
                                    // For button clicks, we need to temporarily remove our override
                                    // to allow the original click to work
                                    e.stopImmediatePropagation();
                                    saveBtn.click();
                                }
                            } catch (error) {
                                console.error('[ScalePlus] Save button: Error during save:', error);
                            }
                        } else {
                            // Prevent the event from bubbling to other listeners
                            e.stopImmediatePropagation();
                        }
                    }, 10); // Small delay to allow input field to update

                    return false;
                };

                // Store reference to the handler for potential removal
                saveBtn._scaleplusClickHandler = clickHandler;
                saveBtn.addEventListener('click', clickHandler, true); // Use capture phase

                // Add Enter key handling to the dialog
                const dialogContent = saveDialog.querySelector('.ui-dialog-content, .ui-widget-content') || saveDialog;
                if (dialogContent && !dialogContent.hasAttribute('data-scaleplus-enter-enhanced')) {
                    dialogContent.setAttribute('data-scaleplus-enter-enhanced', 'true');

                    // Add keydown listener with capture phase for better reliability
                    dialogContent.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.repeat) {
                            console.log('[ScalePlus] Enter key pressed in save dialog');

                            // Check if this is a re-triggered save (avoid infinite loops)
                            if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                                console.log('[ScalePlus] Re-triggered save detected in Enter handler, allowing original save logic to run');
                                // Don't prevent default or stop propagation - let the original save happen
                                return;
                            }

                            e.preventDefault();
                            e.stopPropagation();

                            // Ensure the input field value is committed before processing
                            const filterNameInput = document.querySelector('#SaveSearchNameEditor');
                            if (filterNameInput) {
                                // For Enter key, we need to ensure the typed value is captured
                                // First try to get the current value directly
                                let currentValue = filterNameInput.value?.trim();
                                console.log('[ScalePlus] Current input value before commit:', currentValue);

                                // If value is empty but user might have typed, force commit by focusing/blurring
                                if (!currentValue) {
                                    // Temporarily focus and blur to ensure value is committed
                                    const activeElement = document.activeElement;
                                    filterNameInput.focus();
                                    filterNameInput.blur();
                                    // Restore focus to original element
                                    if (activeElement && activeElement !== filterNameInput) {
                                        activeElement.focus();
                                    }
                                    currentValue = filterNameInput.value?.trim();
                                    console.log('[ScalePlus] Input value after focus/blur commit:', currentValue);
                                }

                                console.log('[ScalePlus] Final input value for Enter key processing:', currentValue);
                            }

                            // Small delay to allow input field to update
                            setTimeout(() => {
                                // Double-check re-trigger flag in case it was set during the delay
                                if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                                    console.log('[ScalePlus] Re-trigger flag detected in Enter timeout, skipping processing');
                                    return;
                                }

                                // Handle the save submission
                                const shouldProceed = handleSaveDialogSubmission(saveBtn, originalHandler, e);

                                // If handleSaveDialogSubmission returns true, it means no date modal was shown
                                // and we should proceed with the normal save
                                if (shouldProceed) {
                                    console.log('[ScalePlus] Enter key: Proceeding with normal save');
                                    try {
                                        if (originalHandler) {
                                            console.log('[ScalePlus] Enter key: Using original handler');
                                            originalHandler.call(saveBtn, e);
                                        } else {
                                            console.log('[ScalePlus] Enter key: Using button click');
                                            saveBtn.click();
                                        }
                                    } catch (error) {
                                        console.error('[ScalePlus] Enter key: Error during save:', error);
                                    }
                                } else {
                                    // Prevent the event from bubbling to other listeners
                                    e.stopImmediatePropagation();
                                }
                            }, 10); // Small delay to allow input field to update

                            return false;
                        }
                    }, true); // Use capture phase

                    // Also add to the dialog itself as backup
                    saveDialog.addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' && !e.repeat) {
                            console.log('[ScalePlus] Enter key pressed in save dialog (backup handler)');

                            // Check if this is a re-triggered save (avoid infinite loops)
                            if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                                console.log('[ScalePlus] Re-triggered save detected in Enter backup handler, allowing original save logic to run');
                                // Don't prevent default or stop propagation - let the original save happen
                                return;
                            }

                            e.preventDefault();
                            e.stopPropagation();

                            // Ensure the input field value is committed before processing
                            const filterNameInput = document.querySelector('#SaveSearchNameEditor');
                            if (filterNameInput) {
                                // For Enter key, we need to ensure the typed value is captured
                                // First try to get the current value directly
                                let currentValue = filterNameInput.value?.trim();
                                console.log('[ScalePlus] Current input value before commit (backup):', currentValue);

                                // If value is empty but user might have typed, force commit by focusing/blurring
                                if (!currentValue) {
                                    // Temporarily focus and blur to ensure value is committed
                                    const activeElement = document.activeElement;
                                    filterNameInput.focus();
                                    filterNameInput.blur();
                                    // Restore focus to original element
                                    if (activeElement && activeElement !== filterNameInput) {
                                        activeElement.focus();
                                    }
                                    currentValue = filterNameInput.value?.trim();
                                    console.log('[ScalePlus] Input value after focus/blur commit (backup):', currentValue);
                                }

                                console.log('[ScalePlus] Final input value for Enter key processing (backup):', currentValue);
                            }

                            // Small delay to allow input field to update
                            setTimeout(() => {
                                // Double-check re-trigger flag in case it was set during the delay
                                if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                                    console.log('[ScalePlus] Re-trigger flag detected in backup Enter timeout, skipping processing');
                                    return;
                                }

                                // Handle the save submission
                                const shouldProceed = handleSaveDialogSubmission(saveBtn, originalHandler, e);

                                // If handleSaveDialogSubmission returns true, it means no date modal was shown
                                // and we should proceed with the normal save
                                if (shouldProceed) {
                                    console.log('[ScalePlus] Enter key backup: Proceeding with normal save');
                                    try {
                                        if (originalHandler) {
                                            console.log('[ScalePlus] Enter key backup: Using original handler');
                                            originalHandler.call(saveBtn, e);
                                        } else {
                                            console.log('[ScalePlus] Enter key backup: Using button click');
                                            saveBtn.click();
                                        }
                                    } catch (error) {
                                        console.error('[ScalePlus] Enter key backup: Error during save:', error);
                                    }
                                } else {
                                    // Prevent the event from bubbling to other listeners
                                    e.stopImmediatePropagation();
                                }
                            }, 10); // Small delay to allow input field to update

                            return false;
                        }
                    }, true);
                }
            } else if (!saveBtn) {
                console.log('[ScalePlus] No save button found in dialog');
            }
        };

        // Check for existing save dialogs first
        const existingDialogs = document.querySelectorAll('.ui-dialog, [role="dialog"]');
        existingDialogs.forEach(dialog => {
            if (dialog.textContent?.includes('Save')) {
                console.log('[ScalePlus] Found existing save dialog');
                enhanceSaveDialog(dialog);
            }
        });

        // Set up observer for new dialogs
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Check the node itself
                            if ((node.classList?.contains('ui-dialog') || node.getAttribute('role') === 'dialog') &&
                                node.textContent?.includes('Save')) {
                                enhanceSaveDialog(node);
                            }

                            // Check for dialogs within the added node
                            const saveDialog = node.querySelector ? node.querySelector('.ui-dialog, [role="dialog"]') : null;
                            if (saveDialog && saveDialog.textContent?.includes('Save')) {
                                enhanceSaveDialog(saveDialog);
                            }
                        }
                    });
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('[ScalePlus] Save dialog observer active');
    }

    // On page load, click the search button if not already active
    function clickSearchButtonIfNeeded() {
        const enabled = localStorage.getItem(SETTINGS.SHOW_SEARCH_PANE) !== 'false';
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

    /**
     * Checks if an element is visible on the page
     * @param {Element} el - The element to check
     * @returns {boolean} - True if the element is visible
     */
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
        // Removed console.log to prevent spam - uncomment for debugging if needed
        // console.log(`[ScalePlus] isVisible(${el.id}):`, visible);
        return visible;
    };

    let firstTrigger = true;

    /**
     * Triggers the search action (Apply/Stop) based on current state
     * @returns {boolean} - True if an action was triggered
     */
    const triggerAction = () => {
        const stopBtn = document.getElementById('InsightMenuActionStopSearch');
        const applyBtn = document.getElementById('InsightMenuApply');

        if (firstTrigger) {
            firstTrigger = false;
            if (isVisible(applyBtn)) {
                console.log('[ScalePlus] First trigger - Clicking Apply');
                applyBtn.click();
            } else {
                console.log('[ScalePlus] First trigger - Apply button not visible, allowing normal Enter behavior');
                // Reset firstTrigger so next Enter press will try again
                firstTrigger = true;
                return false; // Indicate that we didn't handle the action
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
                return false; // Indicate that we didn't handle the action
            }
        }
        return true; // Indicate that we handled the action
    };

    const getF5Behavior = () => {
        const stored = localStorage.getItem(SETTINGS.F5_BEHAVIOR);
        if (stored) {
            console.log(`[ScalePlus] Using stored F5 behavior: ${stored}`);
            return stored;
        }
        // Default to normal behavior if not set (users can change via Configure workstation button)
        const defaultBehavior = DEFAULTS[SETTINGS.F5_BEHAVIOR];
        localStorage.setItem(SETTINGS.F5_BEHAVIOR, defaultBehavior);
        console.log(`[ScalePlus] Default F5 behavior set to: ${defaultBehavior}`);
        return defaultBehavior;
    };

    const clearF5Preference = () => {
        localStorage.removeItem(SETTINGS.F5_BEHAVIOR);
        console.log('[ScalePlus] F5 behavior preference cleared');
        alert('ScalePlus: F5 behavior preference has been cleared.');
    };

    /**
     * Copies text to clipboard and shows a tooltip
     * @param {string} text - The text to copy
     * @param {number} x - X coordinate for tooltip
     * @param {number} y - Y coordinate for tooltip
     */
    const copyToClipboard = (text, x, y) => {
        navigator.clipboard.writeText(text).then(() => {
            console.log('[ScalePlus] Copied to clipboard:', text);
            showTooltip(x, y, `Copied: "${text}"`);
        }).catch(err => {
            console.error('[ScalePlus] Clipboard copy failed:', err);
        });
    };

    /**
     * Shows a temporary tooltip at the specified coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} text - Tooltip text to display
     */
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
                <form class="form-horizontal" id="ScalePlusSettingsModalDialogForm" novalidate="novalidate" data-controltype="form">
                    <div class="modal-header" data-controltype="modalDialogHeader" data-resourcekey="SCALEPLUSSETTINGS" data-resourcevalue="ScalePlus Settings">
                        <button type="button" class="close scaleplus-modal-close" data-dismiss="modal" aria-hidden="true">×</button>
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
                                <label for="enter-toggle">Custom Enter behavior:</label>
                                <input type="checkbox" id="enter-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">When enabled, Enter triggers Play/Stop</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="middle-click-toggle">Middle click to copy:</label>
                                <input type="checkbox" id="middle-click-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Middle click on grid items to copy text</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="adv-criteria-indicator-toggle">Enhance Advanced criteria:</label>
                                <input type="checkbox" id="adv-criteria-indicator-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Show count in header and condition column in advanced criteria grid</span>
                            </div>
                        </div>

                        <div class="scaleplus-divider">
                            <div class="scaleplus-advanced-label">Advanced Settings</div>
                            <div class="scaleplus-divider-line"></div>
                        </div>

                        <div class="scaleplus-advanced-settings">
                            <div class="scaleplus-setting">
                                <label for="f5-toggle">Custom F5 Behavior:</label>
                                <input type="checkbox" id="f5-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">When enabled, F5 triggers Play/Stop instead of page refresh</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="tab-duplicator-toggle">Tab Duplicator:</label>
                                <input type="checkbox" id="tab-duplicator-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Ctrl+D to duplicate current tab</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="default-filter-toggle">Enhance Favorites:</label>
                                <input type="checkbox" id="default-filter-toggle" data-toggle="toggle" data-on="On" data-off="Off" data-width="100">
                                <span class="scaleplus-setting-desc">Add star icons to favorites for default filter selection</span>
                            </div>
                            <div class="scaleplus-setting">
                                <label for="env-labels-toggle">Environment Labels:</label>
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
                        <button id="scaleplus-close-btn" class="btn btn-default" data-resourcekey="BTN_CLOSE" data-resourcevalue="Close">Close</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Sample colors from Scale's UI
        const navBar = document.querySelector('#topNavigationBar') || document.querySelector('.navbar');
        const bodyStyles = getComputedStyle(document.body);
        const headerBg = '#494e5e';
        const bodyBg = '#f4f4f8';
        const footerBg = '#494e5e';
        const textColor = '#ffffff';
        const borderColor = '#ddd';
        const buttonBg = '#4f93e4';
        const buttonColor = '#ffffff';

        // Apply sampled colors
        const modalContent = modal.querySelector('.scaleplus-modal-content');
        const modalHeader = modal.querySelector('.modal-header');
        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');
        const closeBtn = modal.querySelector('.scaleplus-modal-close');
        const cancelBtn = modal.querySelector('#scaleplus-close-btn');
        const backdrop = modal.querySelector('.scaleplus-modal-backdrop');
        const labels = modal.querySelectorAll('label');
        const descs = modal.querySelectorAll('.scaleplus-setting-desc, .scaleplus-advanced-label');
        const inputs = modal.querySelectorAll('input[type="text"]');

        // Use light background for modal to ensure visibility
        const lightBg = '#f4f4f8';
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
        if (closeBtn) {
            // closeBtn.style.color = buttonBg; // Removed to let CSS handle it
        }
        if (cancelBtn) {
            cancelBtn.style.backgroundColor = buttonBg;
            cancelBtn.style.color = buttonColor;
        }
        labels.forEach(label => {
            label.style.color = darkText;
        });
        descs.forEach(desc => {
            // desc.style.color = darkText; // Removed to let CSS handle it
        });
        inputs.forEach(input => {
            // input.style.backgroundColor = lightBg;
            // input.style.color = darkText;
            // input.style.borderColor = borderColor;
        });

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
                opacity: 0;
                animation: scaleplus-fade-in 0.2s ease-out forwards;
            }
            .scaleplus-modal-content {
                position: fixed;
                top: -100px;
                left: 50%;
                transform: translateX(-50%);
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10001;
                min-width: 800px;
                max-width: 700px;
                max-height: calc(100vh - 100px);
                display: flex;
                flex-direction: column;
                border-radius: 0;
                background-color: #f4f4f8;
                overflow: hidden;
                animation: scaleplus-drop-in 0.3s ease-out forwards;
            }
            @keyframes scaleplus-fade-in {
                to {
                    opacity: 1;
                }
            }
            @keyframes scaleplus-drop-in {
                to {
                    top: 50px;
                }
            }
            @media (max-width: 850px) {
                .scaleplus-modal-content {
                    min-width: calc(100vw - 40px);
                    max-width: calc(100vw - 40px);
                    left: 20px;
                    transform: none;
                    background-color: #f4f4f8;
                }
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
            }
            .scaleplus-env-names .scaleplus-setting label {
                display: inline-block;
                margin-bottom: 0;
                margin-right: 10px;
                min-width: 200px;
            }
            .scaleplus-env-names input {
                padding: 5px;
                border-radius: 0 !important;
                width: 300px;
                display: inline-block;
                background-color: #ffffff !important;
                color: #666666 !important;
                border: 1px solid #999999 !important;
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
            }
            .scaleplus-env-setting label {
                font-weight: bold;
                margin-right: 10px;
                width: 200px;
                display: inline-block;
                color: #000000;
            }
            .scaleplus-env-setting input {
                padding: 5px;
                border-radius: 0 !important;
                width: 300px;
                display: inline-block;
                background-color: #ffffff !important;
                color: #666666 !important;
                border: 1px solid #999999 !important;
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
        const currentMiddle = localStorage.getItem(SETTINGS.MIDDLE_CLICK_COPY);
        if (currentMiddle !== 'false') {
            middleClickToggle.checked = true;
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

        const qaNameInput = modal.querySelector('#qa-name');
        const prodNameInput = modal.querySelector('#prod-name');

        qaNameInput.value = localStorage.getItem('scaleplus_env_qa_name') || 'QA ENVIRONMENT';
        prodNameInput.value = localStorage.getItem('scaleplus_env_prod_name') || 'PRODUCTION ENVIRONMENT';

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
            localStorage.setItem(SETTINGS.MIDDLE_CLICK_COPY, state.toString());
            console.log(`[ScalePlus] Middle click copy set to: ${state}`);
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
            updateFavoritesStarIcon(); // Update star icon when feature is toggled
        });

        $('#adv-criteria-indicator-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.ADV_CRITERIA_ENHANCEMENT, state.toString());
            console.log(`[ScalePlus] Advanced criteria enhancement set to: ${state}`);

            // Update the counter immediately when toggled
            if (state) {
                updateAdvancedCriteriaCount();
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
            localStorage.setItem('scaleplus_env_qa_name', qaNameInput.value);
        });

        prodNameInput.addEventListener('input', () => {
            localStorage.setItem('scaleplus_env_prod_name', prodNameInput.value);
        });

        // Initialize bootstrap toggles
        $('#search-toggle, #enter-toggle, #middle-click-toggle, #f5-toggle, #tab-duplicator-toggle, #default-filter-toggle, #env-labels-toggle, #adv-criteria-indicator-toggle').bootstrapToggle();

        // Set initial states explicitly
        $(searchToggle).bootstrapToggle(searchToggle.checked ? 'on' : 'off');
        $(enterToggle).bootstrapToggle(enterToggle.checked ? 'on' : 'off');
        $(middleClickToggle).bootstrapToggle(middleClickToggle.checked ? 'on' : 'off');
        $(f5Toggle).bootstrapToggle(f5Toggle.checked ? 'on' : 'off');
        $(envLabelsToggle).bootstrapToggle(envLabelsToggle.checked ? 'on' : 'off');
        $(tabDuplicatorToggle).bootstrapToggle(tabDuplicatorToggle.checked ? 'on' : 'off');
        $(defaultFilterToggle).bootstrapToggle(defaultFilterToggle.checked ? 'on' : 'off');
        $(advCriteriaIndicatorToggle).bootstrapToggle(advCriteriaIndicatorToggle.checked ? 'on' : 'off');

        // Handle close
        const closeModal = () => {
            modal.remove();
            style.remove();
        };
        backdrop.addEventListener('click', closeModal);
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    };

    document.addEventListener('keydown', function (e) {
        if (e.key === 'F5' || e.keyCode === 116) {
            if (e.ctrlKey && e.shiftKey) {
                e.preventDefault();
                clearF5Preference();
                return;
            }
            const behavior = getF5Behavior();
            if (behavior !== 'false') {
                console.log('[ScalePlus] F5 custom behavior triggered');
                const actionHandled = triggerAction();
                if (actionHandled) {
                    e.preventDefault();
                } else {
                    console.log('[ScalePlus] Allowing normal F5 behavior');
                }
            } else {
                console.log('[ScalePlus] F5 normal behavior - allowing page refresh');
            }
        } else if (e.key === 'Enter' || e.keyCode === 13) {
            // Check if settings modal is open
            const settingsModal = document.getElementById('scaleplus-settings-modal');
            if (settingsModal) {
                e.preventDefault();
                settingsModal.querySelector('.scaleplus-cancel-btn').click();
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
                const enabled = localStorage.getItem(SETTINGS.CUSTOM_ENTER) !== 'false';
                if (enabled) {
                    const actionHandled = triggerAction();
                    if (!actionHandled) {
                        // triggerAction returned false, allow normal Enter behavior
                        console.log('[ScalePlus] Allowing normal Enter behavior');
                        return;
                    }
                    e.preventDefault();
                    console.log('[ScalePlus] Enter key triggered');
                }
            }
        } else if (e.key.toLowerCase() === 'd' && e.ctrlKey && !e.shiftKey) {
            const enabled = localStorage.getItem(SETTINGS.TAB_DUPLICATOR) !== 'false';
            if (enabled) {
                e.preventDefault();
                window.open(window.location.href, '_blank');
            }
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

    // Intercept Save Search button to handle date criteria
    function setupSaveButtonInterception() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping save button interception setup');
            return; // Favorites enhancement disabled, don't set up interception
        }

        console.log('[ScalePlus] Setting up save button interception');

        // Use event delegation to catch dynamically created save buttons
        document.addEventListener('click', function(e) {
            const saveBtn = e.target.closest('#SaveSearchSaveButton');
            if (saveBtn) {
                console.log('[ScalePlus] Save button clicked, intercepted:', saveBtn);

                // Check if this is a re-triggered save after modal interaction
                if (saveBtn.hasAttribute('data-scaleplus-retrigger')) {
                    console.log('[ScalePlus] This is a re-triggered save after modal, allowing it to proceed normally');
                    // Don't remove the attribute here - let the specific handlers handle it
                    return; // Don't intercept re-triggered saves
                }

                // Check if we're already processing this click to prevent double handling
                if (saveBtn.hasAttribute('data-scaleplus-processing')) {
                    return; // Already processing this click
                }

                // Mark as currently being processed to prevent double handling
                saveBtn.setAttribute('data-scaleplus-processing', 'true');
                console.log('[ScalePlus] Processing save button interception');

                    // Extract filter name and criteria IMMEDIATELY before anything else happens
                    const filterNameInput = document.querySelector('#SaveSearchNameEditor');
                    console.log('[ScalePlus] Filter name input found:', !!filterNameInput);

                    if (!filterNameInput) {
                        console.warn('[ScalePlus] Could not find filter name input (#SaveSearchNameEditor)');
                        // Try alternative selectors
                        const altInputs = document.querySelectorAll('input[id*="SaveSearch"], input[name*="SaveSearch"]');
                        console.log('[ScalePlus] Alternative inputs found:', altInputs.length);

                        // Remove processing flag and re-trigger the original save
                        saveBtn.removeAttribute('data-scaleplus-processing');
                        return;
                    }

                    const filterName = filterNameInput.value?.trim();
                    console.log('[ScalePlus] Filter name extracted:', filterName);

                    if (!filterName) {
                        console.warn('[ScalePlus] Filter name is empty');
                        // Remove processing flag and re-trigger the original save
                        saveBtn.removeAttribute('data-scaleplus-processing');
                        return;
                    }

                    const formId = getFormIdFromUrl();
                    console.log('[ScalePlus] Form ID:', formId);

                    if (!formId) {
                        console.warn('[ScalePlus] Could not determine form ID');
                        // Remove processing flag and re-trigger the original save
                        saveBtn.removeAttribute('data-scaleplus-processing');
                        return;
                    }

                    // Extract current filter criteria immediately
                    const currentFilters = extractCurrentFilterCriteria();
                    const hasDateCriteria = checkForDateCriteria({ inSearch: currentFilters });

                    console.log('[ScalePlus] Date criteria detected:', hasDateCriteria);

                    if (hasDateCriteria) {
                        // Check if favorites enhancement is enabled
                        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';

                        if (isFavoritesEnabled) {
                            console.log(`[ScalePlus] Filter "${filterName}" contains date criteria, showing date mode modal`);

                            // Prevent the original save from happening
                            e.preventDefault();
                            e.stopPropagation();

                            // Show the date mode modal
                            showDateModeModal(formId, filterName, { inSearch: currentFilters }, () => {
                                // After modal is closed, trigger the original save
                                setTimeout(() => {
                                    console.log('[ScalePlus] Re-triggering original save after modal');
                                    // Mark as re-triggered so we don't intercept it again
                                    saveBtn.setAttribute('data-scaleplus-retrigger', 'true');
                                    // Remove our processing marker
                                    saveBtn.removeAttribute('data-scaleplus-processing');
                                    saveBtn.click();
                                    // Clean up the re-trigger marker
                                    setTimeout(() => {
                                        saveBtn.removeAttribute('data-scaleplus-retrigger');
                                    }, 1000);
                                }, 100);
                            });
                        } else {
                            console.log(`[ScalePlus] Favorites enhancement disabled, proceeding with normal save`);
                            // No date criteria or favorites disabled, remove our processing marker and let the original save proceed
                            saveBtn.removeAttribute('data-scaleplus-processing');
                            // Don't prevent default - let the original save happen
                        }
                    } else {
                        console.log(`[ScalePlus] Filter "${filterName}" has no date criteria, proceeding with normal save`);
                        // No date criteria, remove our processing marker and let the original save proceed
                        saveBtn.removeAttribute('data-scaleplus-processing');
                        // Don't prevent default - let the original save happen
                    }
            }
        }, true); // Use capture phase to intercept before other handlers
    }

    // Extract current filter criteria from the search form
    function extractCurrentFilterCriteria() {
        console.log('[ScalePlus] Extracting current filter criteria');
        const criteria = [];

        // Get all input fields that might contain filter values
        const inputs = document.querySelectorAll('#SearchPane input[type="text"], #SearchPane input[type="hidden"], #SearchPane select, #SearchPane textarea');
        console.log('[ScalePlus] Found', inputs.length, 'input elements in SearchPane');

        inputs.forEach(input => {
            const name = input.name || input.id;
            let value = input.value;

            // Skip empty values and certain system fields
            if (!name || !value || value.trim() === '' ||
                name.includes('Editor') ||
                name.includes('Button') ||
                name.includes('clear')) {
                return;
            }

            // Handle different input types
            if (input.type === 'checkbox') {
                value = input.checked ? 'true' : 'false';
            }

            // Only include fields that look like actual filter criteria
            if (name.includes('Criteria') || name.includes('Search') || name.includes('Filter')) {
                criteria.push({
                    name: name,
                    value: value
                });
                console.log(`[ScalePlus] Added criteria: ${name} = ${value}`);
            }
        });

        // Also try to get values from igTextEditor widgets
        try {
            const igEditors = $('[data-controltype="igTextEditor"]');
            console.log('[ScalePlus] Found', igEditors.length, 'igTextEditor widgets');
            igEditors.each(function() {
                const editor = $(this);
                const id = editor.attr('id');
                if (id && (id.includes('Criteria') || id.includes('Search'))) {
                    const value = editor.igTextEditor('value');
                    if (value) {
                        criteria.push({
                            name: id,
                            value: value
                        });
                        console.log(`[ScalePlus] Added IG text criteria: ${id} = ${value}`);
                    }
                }
            });
        } catch (e) {
            console.warn('[ScalePlus] Could not extract igTextEditor values:', e);
        }

        // Try to get values from igDatePicker widgets
        try {
            const datePickers = $('[data-controltype="igDatePicker"]');
            console.log('[ScalePlus] Found', datePickers.length, 'igDatePicker widgets');
            datePickers.each(function() {
                const picker = $(this);
                const id = picker.attr('id');
                if (id && (id.includes('Date') || id.includes('Criteria'))) {
                    const value = picker.igDatePicker('value');
                    if (value) {
                        criteria.push({
                            name: id,
                            value: value.toISOString()
                        });
                        console.log(`[ScalePlus] Added IG date criteria: ${id} = ${value.toISOString()}`);
                    }
                }
            });
        } catch (e) {
            console.warn('[ScalePlus] Could not extract igDatePicker values:', e);
        }

        console.log('[ScalePlus] Total extracted criteria:', criteria.length, criteria);
        return criteria;
    }

    // Set up the save button interception if favorites enhancement is enabled
    const isFavoritesEnabled1 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    if (isFavoritesEnabled1) {
        setupSaveButtonInterception();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping save button interception setup');
    }

    // Set up the save dialog observer immediately when script loads if favorites enhancement is enabled
    if (isFavoritesEnabled1) {
        setupSaveDialogObserver();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping save dialog observer setup');
    }
    function setupScaleSaveHook() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping Scale save hook setup');
            return; // Favorites enhancement disabled, don't set up hooks
        }

        // Common Scale function names that might handle saving
        const possibleSaveFunctions = [
            '_webUi.insightSearchPaneActions.saveSearch',
            '_webUi.insightSearchPaneActions.SaveSearch',
            'window.saveSearch',
            'window.SaveSearch'
        ];

        // Override these functions if they exist
        possibleSaveFunctions.forEach(funcPath => {
            try {
                const funcParts = funcPath.split('.');
                let obj = window;
                for (let i = 0; i < funcParts.length - 1; i++) {
                    obj = obj[funcParts[i]];
                    if (!obj) break;
                }

                if (obj) {
                    const funcName = funcParts[funcParts.length - 1];
                    const originalFunc = obj[funcName];

                    if (originalFunc && typeof originalFunc === 'function') {
                        console.log(`[ScalePlus] Hooking into Scale save function: ${funcPath}`);

                        obj[funcName] = function(...args) {
                            // Extract filter information before calling original function
                            const filterNameInput = document.querySelector('#SaveSearchNameEditor');
                            const filterName = filterNameInput ? filterNameInput.value?.trim() : null;

                            if (filterName) {
                                const formId = getFormIdFromUrl();
                                const currentFilters = extractCurrentFilterCriteria();
                                const hasDateCriteria = checkForDateCriteria({ inSearch: currentFilters });

                                if (hasDateCriteria && formId) {
                                    // Check if favorites enhancement is enabled
                                    const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';

                                    if (isFavoritesEnabled) {
                                        console.log(`[ScalePlus] Scale hook: Filter "${filterName}" contains date criteria`);

                                        // Show modal and delay the save
                                        showDateModeModal(formId, filterName, { inSearch: currentFilters }, () => {
                                            // After modal closes, call original function
                                            setTimeout(() => {
                                                originalFunc.apply(this, args);
                                            }, 100);
                                        });

                                        return; // Don't call original function yet
                                    } else {
                                        console.log(`[ScalePlus] Scale hook: Favorites enhancement disabled, proceeding with normal save`);
                                    }
                                }
                            }

                            // No date criteria, call original function
                            return originalFunc.apply(this, args);
                        };
                    }
                }
            } catch (e) {
                // Function doesn't exist or can't be hooked, continue
            }
        });
    }

    // Try to set up Scale save hook
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupScaleSaveHook);
    } else {
        setupScaleSaveHook();
    }

    // Intercept favorite filter selection to apply cached date settings
    function setupFavoriteClickInterception() {
        document.addEventListener('click', function(e) {
            // Check if favorites enhancement is enabled
            const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
            if (!isFavoritesEnabled) {
                return; // Favorites enhancement disabled, don't intercept clicks
            }

            const favoriteLink = e.target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
            if (favoriteLink) {
                // Don't intercept clicks on star or delete buttons
                const clickedElement = e.target.closest('.scaleplus-default-icon, .deletesavedsearchbutton');
                if (clickedElement) {
                    console.log('[ScalePlus] Click on star/delete button, allowing normal behavior');
                    return; // Let star and delete buttons work normally
                }

                // Check if we're already processing this click to prevent double handling
                if (favoriteLink.hasAttribute('data-scaleplus-processing')) {
                    return; // Already processing this click
                }

                const filterName = favoriteLink.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                const formId = getFormIdFromUrl();

                if (filterName && formId) {
                    // Mark as currently being processed to prevent double handling
                    favoriteLink.setAttribute('data-scaleplus-processing', 'true');

                    // Check if this filter has cached date settings
                    const dateCache = getFilterDateCache(formId, filterName);
                    if (dateCache) {
                        console.log(`[ScalePlus] Favorite "${filterName}" has cached date settings (mode: ${dateCache.dateMode}), applying custom date handling`);

                        // Fetch the saved filter and apply with date adjustments (always apply cached settings)
                        fetchSavedFilter(filterName)
                            .then(savedFilters => {
                                const modifiedFilters = applyCachedDateSettings(savedFilters, filterName, formId);
                                console.log(`[ScalePlus] Applied cached date settings to favorite "${filterName}" with mode: ${dateCache.dateMode}`);
                                applySavedFilters(modifiedFilters, filterName, formId);
                                // Remove processing flag after completion
                                favoriteLink.removeAttribute('data-scaleplus-processing');
                            })
                            .catch(err => {
                                console.warn('[ScalePlus] Failed to fetch and apply cached filter:', err);
                                // Remove processing flag and let the original click proceed
                                favoriteLink.removeAttribute('data-scaleplus-processing');
                                favoriteLink.click();
                            });

                        e.preventDefault();
                        e.stopPropagation();
                        return false;
                    } else {
                        console.log(`[ScalePlus] Favorite "${filterName}" has no cached date settings, using default behavior`);
                        // Remove processing flag
                        favoriteLink.removeAttribute('data-scaleplus-processing');
                    }
                }
            }
        }, true); // Use capture phase
    }

    // Set up the favorite click interception if favorites enhancement is enabled
    const isFavoritesEnabled3 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    if (isFavoritesEnabled3) {
        setupFavoriteClickInterception();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping favorite click interception setup');
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
            const enabled = localStorage.getItem(SETTINGS.MIDDLE_CLICK_COPY) !== 'false';
            if (enabled) {
                e.preventDefault();
                copyInnerText(e);
            }
        }
    });

    // Environment Labels
    function addEnvironmentLabel() {
        const enabled = localStorage.getItem(SETTINGS.ENV_LABELS) === 'true';
        if (!enabled) return;

        const navBar = document.getElementById('topNavigationBar');
        if (!navBar) return;

        // Create a label element
        const label = document.createElement('div');
        const isProd = window.location.hostname === 'scale20.byjasco.com';
        const qaName = localStorage.getItem(SETTINGS.ENV_QA_NAME) || DEFAULTS[SETTINGS.ENV_QA_NAME];
        const prodName = localStorage.getItem(SETTINGS.ENV_PROD_NAME) || DEFAULTS[SETTINGS.ENV_PROD_NAME];
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
        console.log(`[ScalePlus] Current URL: ${window.location.href}`);

        // Primary pattern: extract form ID from /insights/{number} in URL path
        const match = window.location.pathname.match(/insights\/(\d+)/);
        if (match) {
            const formId = match[1];
            console.log(`[ScalePlus] Found form ID: ${formId}`);
            return formId;
        }

        // Fallback: check URL search parameters (less common)
        const urlParams = new URLSearchParams(window.location.search);
        const paramFormId = urlParams.get('formId') || urlParams.get('FormID');
        if (paramFormId) {
            console.log(`[ScalePlus] Found form ID from URL parameters: ${paramFormId}`);
            return paramFormId;
        }

        console.log(`[ScalePlus] No form ID found in URL`);
        return null;
    }

    // Alternative function name for compatibility
    function extractFormIdFromUrl(url) {
        const match = url.match(/insights\/(\d+)/);
        return match ? match[1] : null;
    }

    // Check if default filter feature is enabled
    function isDefaultFilterEnabled() {
        return localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    }

    // Helper to get username from UserInformation cookie
    function getUsernameFromCookie() {
        const allCookies = document.cookie;
        const cookie = allCookies.split('; ').find(row => row.startsWith('UserInformation='));
        if (!cookie) {
            return '';
        }
        const value = decodeURIComponent(cookie.substring(cookie.indexOf('=') + 1));
        // Match UserName (case-sensitive, as in the cookie)
        const match = value.match(/(?:^|&)UserName=([^&]*)/);
        return match ? match[1] : '';
    }

    function getDefaultFilterKey(formId) {
        const username = getUsernameFromCookie();
        return `${formId}DefaultFilter${username}`;
    }

    function setDefaultFilter(formId, filterText) {
        const key = getDefaultFilterKey(formId);
        const username = getUsernameFromCookie();
        localStorage.setItem(key, filterText);
        console.log(`[ScalePlus] Set default filter for form ${formId} and user ${username}: ${filterText}`);
        updateFavoritesStarIcon();
    }

    function getDefaultFilter(formId) {
        const key = getDefaultFilterKey(formId);
        return localStorage.getItem(key);
    }

    function clearDefaultFilter(formId) {
        const key = getDefaultFilterKey(formId);
        const username = getUsernameFromCookie();
        localStorage.removeItem(key);
        console.log(`[ScalePlus] Cleared default filter for form ${formId} and user ${username}`);
        updateFavoritesStarIcon();
    }

    // Check if saved filters contain date/time criteria
    function checkForDateCriteria(savedFilters) {
        console.log('[ScalePlus] Checking for date criteria in filters:', savedFilters);
        if (!savedFilters || !savedFilters.inSearch) {
            console.log('[ScalePlus] No savedFilters or inSearch property found');
            return false;
        }

        // Check basic search filters for date fields
        const dateFields = savedFilters.inSearch.filter(filter => {
            const name = filter.name || '';
            const value = filter.value || '';

            console.log(`[ScalePlus] Checking filter: ${name} = ${value}`);

            // More specific date field detection
            const isDateField = (
                name.toLowerCase().includes('date') ||
                name.includes('Date') ||
                name.includes('DATE') ||
                name.includes('ReceivedDate') ||
                name.includes('CreatedDate') ||
                name.includes('ModifiedDate') ||
                name.includes('FromDate') ||
                name.includes('ToDate') ||
                name.includes('StartDate') ||
                name.includes('EndDate')
            );

            // Check if value looks like a date (ISO format or common date patterns)
            const isDateValue = (
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) || // ISO format
                /^\d{4}-\d{2}-\d{2}/.test(value) || // Date only
                /\d{1,2}\/\d{1,2}\/\d{4}/.test(value) || // MM/DD/YYYY
                /\d{1,2}-\d{1,2}-\d{4}/.test(value) // MM-DD-YYYY
            );

            const result = isDateField && isDateValue && value.trim() !== '';
            console.log(`[ScalePlus] Filter ${name}: isDateField=${isDateField}, isDateValue=${isDateValue}, result=${result}`);
            return result;
        });

        console.log(`[ScalePlus] Found ${dateFields.length} date fields:`, dateFields.map(f => f.name));
        return dateFields.length > 0;
    }

    // Generate unique key for filter date cache
    function getFilterDateCacheKey(formId, filterName) {
        const username = getUsernameFromCookie();
        // Sanitize filter name to make it safe for localStorage key
        const safeFilterName = filterName.replace(/[^a-zA-Z0-9]/g, '_');
        return `${formId}Filter${safeFilterName}${username}`;
    }

    // Get cached date settings for a specific filter
    function getFilterDateCache(formId, filterName) {
        const key = getFilterDateCacheKey(formId, filterName);
        const stored = localStorage.getItem(key);

        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch (e) {
            console.warn('[ScalePlus] Could not parse filter date cache:', e);
            return null;
        }
    }

    // Set cached date settings for a specific filter
    function setFilterDateCache(formId, filterName, dateMode, dateOffsets) {
        const key = getFilterDateCacheKey(formId, filterName);
        const cacheData = {
            dateMode: dateMode,
            dateOffsets: dateOffsets,
            savedAt: new Date().toISOString()
        };

        localStorage.setItem(key, JSON.stringify(cacheData));
        console.log(`[ScalePlus] Saved date cache for filter "${filterName}":`, cacheData);
    }

    // Calculate date offsets from current time
    function calculateDateOffsets(savedFilters, savedAt) {
        const offsets = {};
        const savedTime = new Date(savedAt);
        const now = new Date();

        if (!savedFilters || !savedFilters.inSearch) return offsets;

        savedFilters.inSearch.forEach(filter => {
            if (filter.name && filter.name.includes('Date') && filter.value) {
                try {
                    const filterDate = new Date(filter.value);
                    if (!isNaN(filterDate.getTime())) {
                        // Calculate difference in milliseconds
                        const diffMs = filterDate.getTime() - savedTime.getTime();
                        offsets[filter.name] = diffMs;
                    }
                } catch (e) {
                    console.warn(`[ScalePlus] Could not parse date for ${filter.name}:`, filter.value);
                }
            }
        });

        return offsets;
    }

    // Apply cached date settings to saved filters
    function applyCachedDateSettings(savedFilters, filterName, formId) {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping cached date settings application');
            return savedFilters;
        }

        if (!savedFilters) return savedFilters;

        const cache = getFilterDateCache(formId, filterName);
        if (!cache || cache.dateMode === 'normal') {
            return savedFilters;
        }

        // Clone the filters to avoid modifying the original
        const modifiedFilters = JSON.parse(JSON.stringify(savedFilters));

        modifiedFilters.inSearch.forEach(filter => {
            if (filter.name && cache.dateOffsets[filter.name] !== undefined) {
                const offsetMs = cache.dateOffsets[filter.name];
                let newDate;

                if (cache.dateMode === 'relative_date') {
                    // Keep the time from original filter, but adjust the date
                    const originalDate = new Date(filter.value);
                    const daysDiff = Math.floor(offsetMs / (1000 * 60 * 60 * 24));
                    newDate = new Date();
                    newDate.setDate(newDate.getDate() + daysDiff);
                    // Keep original time
                    newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), originalDate.getSeconds(), originalDate.getMilliseconds());
                } else if (cache.dateMode === 'relative_date_time') {
                    // Adjust both date and time
                    newDate = new Date(new Date().getTime() + offsetMs);
                }

                if (newDate) {
                    filter.value = newDate.toISOString();
                    console.log(`[ScalePlus] Applied ${cache.dateMode} offset to ${filter.name}: ${filter.value}`);
                }
            }
        });

        return modifiedFilters;
    }    // Update favorites dropdown star icon based on default filter status
    function updateFavoritesStarIcon() {
        const formId = getFormIdFromUrl();
        if (!formId) {
            console.log(`[ScalePlus] No form ID found, skipping star icon update`);
            return;
        }

        const hasDefaultFilter = !!getDefaultFilter(formId);
        const isFeatureEnabled = isDefaultFilterEnabled();
        const starIcon = document.querySelector('#InsightMenuFavoritesDropdown .fas.fa-star.starIcon');

        console.log(`[ScalePlus] Updating star icon - formId: ${formId}, hasDefault: ${hasDefaultFilter}, featureEnabled: ${isFeatureEnabled}, starIcon found: ${!!starIcon}`);

        if (starIcon) {
            const shouldBeYellow = hasDefaultFilter && isFeatureEnabled;
            const currentColor = starIcon.style.color;
            const isCurrentlyYellow = currentColor === '#f1c40f' || currentColor === 'rgb(241, 196, 15)';

            console.log(`[ScalePlus] Star icon state - shouldBeYellow: ${shouldBeYellow}, isCurrentlyYellow: ${isCurrentlyYellow}, currentColor: "${currentColor}"`);

            if (shouldBeYellow && !isCurrentlyYellow) {
                starIcon.style.color = '#f1c40f'; // Yellow when default filter exists and feature is enabled
                console.log(`[ScalePlus] Favorites star set to yellow - default filter active for form ${formId}`);
            } else if (!shouldBeYellow && isCurrentlyYellow) {
                starIcon.style.color = ''; // Reset to default color
                console.log(`[ScalePlus] Favorites star reset to default for form ${formId}`);
            } else {
                console.log(`[ScalePlus] Star icon already in correct state`);
            }
        } else {
            console.log(`[ScalePlus] Star icon element not found`);
        }
    }

    // Clean up old ScalePlus cache entries from previous versions
    function cleanupOldCacheEntries() {
        const currentSettingsKeys = Object.values(SETTINGS);
        const knownKeys = new Set([
            ...currentSettingsKeys,
            // Add any other known keys that should be preserved
            'scaleplus_env_qa_name',
            'scaleplus_env_prod_name'
        ]);

        let cleanedCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('scaleplus') && !knownKeys.has(key)) {
                // Check if it's a default filter key pattern (formId + DefaultFilter + username)
                if (!key.includes('DefaultFilter')) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                    console.log(`[ScalePlus] Cleaned up old cache entry: ${key}`);
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`[ScalePlus] Cleaned up ${cleanedCount} old cache entries`);
        }
    }

    // Monitor for favorite deletions and clean up related cache
    function monitorFavoriteDeletions() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping favorite deletion monitoring');
            return;
        }

        // Monitor the favorites dropdown for changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if any favorites were removed
                    mutation.removedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const deletedFavorite = node.querySelector('.deletesavedsearchtext');
                            if (deletedFavorite) {
                                const filterName = deletedFavorite.textContent?.trim();
                                if (filterName) {
                                    cleanupDeletedFavoriteCache(filterName);
                                }
                            }
                        }
                    });
                }
            });
        });

        // Start observing the favorites dropdown
        const favoritesDropdown = document.querySelector('#InsightMenuFavoritesDropdown');
        if (favoritesDropdown) {
            observer.observe(favoritesDropdown, {
                childList: true,
                subtree: true
            });
        }

        // Monitor the confirmation dialog Yes button instead of periodic checks
        const monitorConfirmationDialog = () => {
            const yesButton = document.querySelector('#confirmPositive');
            if (yesButton && !yesButton.hasAttribute('data-scaleplus-monitored')) {
                yesButton.setAttribute('data-scaleplus-monitored', 'true');
                yesButton.addEventListener('click', () => {
                    // Wait a bit for the deletion to complete, then clean up orphaned cache
                    setTimeout(() => {
                        cleanupOrphanedDefaultFilters();
                        // Also clean up any date cache for deleted filters
                        cleanupOrphanedDateCache();
                    }, 500);
                });
            }
        };

        // Monitor for the confirmation dialog appearing
        const dialogObserver = new MutationObserver(() => {
            monitorConfirmationDialog();
        });

        dialogObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        monitorConfirmationDialog();

        // Also monitor for AJAX calls that might delete filters if favorites enhancement is enabled
        const isFavoritesEnabled5 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (isFavoritesEnabled5) {
            monitorFilterDeletionAjax();
        } else {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping AJAX filter deletion monitoring');
        }
    }

    // Monitor AJAX calls for filter deletions
    function monitorFilterDeletionAjax() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping AJAX filter deletion monitoring setup');
            return;
        }

        // Intercept XMLHttpRequest to catch filter deletions
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
            // Store the URL for later inspection
            this._url = url;
            this._method = method;
            return originalOpen.apply(this, arguments);
        };

        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function(data) {
            // Check if this is a filter deletion request
            if (this._url && this._url.includes('ScreenPartSearchApi') && this._method === 'DELETE') {
                // Try to extract filter name from the request data
                let deletedFilterName = null;
                if (data) {
                    try {
                        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
                        if (parsedData && parsedData.searchName) {
                            deletedFilterName = parsedData.searchName;
                        }
                    } catch (e) {
                        // Try to extract from URL parameters
                        const urlParams = new URLSearchParams(this._url.split('?')[1]);
                        deletedFilterName = urlParams.get('searchName');
                    }
                }

                if (deletedFilterName) {
                    console.log(`[ScalePlus] Detected filter deletion via AJAX: ${deletedFilterName}`);
                    // Clean up cache after a short delay to ensure deletion completes
                    setTimeout(() => {
                        cleanupDeletedFavoriteCache(deletedFilterName);
                    }, 1000);
                }
            }

            return originalSend.apply(this, arguments);
        };

        // Also intercept fetch calls
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
            const method = options?.method || 'GET';

            // Check if this is a filter deletion request
            if (url && typeof url === 'string' && url.includes('ScreenPartSearchApi') && method === 'DELETE') {
                let deletedFilterName = null;

                // Try to extract filter name from URL or body
                if (options?.body) {
                    try {
                        const bodyData = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
                        if (bodyData && bodyData.searchName) {
                            deletedFilterName = bodyData.searchName;
                        }
                    } catch (e) {
                        // Ignore parsing errors
                    }
                }

                // Try URL parameters
                if (!deletedFilterName && typeof url === 'string') {
                    const urlParams = new URLSearchParams(url.split('?')[1]);
                    deletedFilterName = urlParams.get('searchName');
                }

                if (deletedFilterName) {
                    console.log(`[ScalePlus] Detected filter deletion via fetch: ${deletedFilterName}`);
                    // Clean up cache after a short delay
                    setTimeout(() => {
                        cleanupDeletedFavoriteCache(deletedFilterName);
                    }, 1000);
                }
            }

            return originalFetch.apply(this, arguments);
        };
    }

    // Clean up cache when a favorite is deleted
    function cleanupDeletedFavoriteCache(deletedFilterName) {
        const username = getUsernameFromCookie();
        let cleanedCount = 0;

        // Find and remove any default filter cache entries for this favorite
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('DefaultFilter') && key.includes(username)) {
                const storedFilterName = localStorage.getItem(key);
                if (storedFilterName === deletedFilterName) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                    console.log(`[ScalePlus] Cleaned up default filter cache for deleted favorite: ${deletedFilterName}`);
                }
            }
        }

        // Also clean up any date cache for this filter
        const formId = getFormIdFromUrl();
        if (formId) {
            const dateCacheKey = getFilterDateCacheKey(formId, deletedFilterName);
            if (localStorage.getItem(dateCacheKey)) {
                localStorage.removeItem(dateCacheKey);
                console.log(`[ScalePlus] Cleaned up date cache for deleted favorite: ${deletedFilterName}`);
            }
        }

        // Update the star icon since we may have removed a default filter
        setTimeout(() => {
            updateFavoritesStarIcon();
        }, 100);
    }

    // Periodic cleanup of orphaned cache entries (safety net)
    function schedulePeriodicCacheCleanup() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping periodic cache cleanup scheduling');
            return;
        }

        // Run cleanup every 5 minutes to catch any missed orphaned entries
        setInterval(() => {
            console.log('[ScalePlus] Running periodic cache cleanup');
            cleanupOrphanedDefaultFilters();
            cleanupOrphanedDateCache();
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Clean up orphaned default filters (filters that reference favorites that no longer exist)
    function cleanupOrphanedDefaultFilters() {
        const username = getUsernameFromCookie();
        const currentFavorites = new Set();

        // Get all current favorite names
        const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"] .deletesavedsearchtext');
        savedSearchItems.forEach(item => {
            const filterName = item.textContent?.trim();
            if (filterName) {
                currentFavorites.add(filterName);
            }
        });

        let cleanedCount = 0;

        // Check all default filter cache entries
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('DefaultFilter') && key.includes(username)) {
                const storedFilterName = localStorage.getItem(key);
                if (storedFilterName && !currentFavorites.has(storedFilterName)) {
                    localStorage.removeItem(key);
                    cleanedCount++;
                    console.log(`[ScalePlus] Cleaned up orphaned default filter cache: ${storedFilterName}`);
                }
            }
        }

        if (cleanedCount > 0) {
            // Delay the star icon update to ensure DOM is updated
            setTimeout(() => {
                updateFavoritesStarIcon();
            }, 100);
        }
    }

    // Clean up orphaned date cache entries (date cache for filters that no longer exist)
    function cleanupOrphanedDateCache() {
        const username = getUsernameFromCookie();
        const currentFavorites = new Set();

        // Get all current favorite names
        const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"] .deletesavedsearchtext');
        savedSearchItems.forEach(item => {
            const filterName = item.textContent?.trim();
            if (filterName) {
                currentFavorites.add(filterName);
            }
        });

        let cleanedCount = 0;

        // Check all date cache entries
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('Filter') && key.includes(username) && !key.includes('DefaultFilter')) {
                // Extract filter name from the key
                // Key format: formIdFilterSafeFilterNameUsername
                const keyParts = key.split('Filter');
                if (keyParts.length >= 2) {
                    const filterPart = keyParts[1];
                    // Remove username from the end to get the safe filter name
                    const safeFilterName = filterPart.replace(username, '');
                    // Try to decode the safe filter name back to original
                    const originalFilterName = safeFilterName.replace(/_/g, ' ');

                    // Check if this filter still exists
                    if (originalFilterName && !currentFavorites.has(originalFilterName)) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                        console.log(`[ScalePlus] Cleaned up orphaned date cache for deleted favorite: ${originalFilterName}`);
                    }
                }
            }
        }

        if (cleanedCount > 0) {
            console.log(`[ScalePlus] Cleaned up ${cleanedCount} orphaned date cache entries`);
        }
    }

    function fetchSavedFilter(defaultFilterName) {
        return new Promise((resolve, reject) => {
            const screenPartId = _webUi.insightSearchPaneActions.getSearchPartId();
            const username     = _webSession.UserName();
            $.ajax({
                url: '/general/scaleapi/ScreenPartSearchApi',
                method: 'GET',
                data: {
                    ScreenPartId: screenPartId,
                    UserName: username,
                    searchName: defaultFilterName
                },
                success: data => {
                    if (data && data.SearchValue) {
                        resolve(JSON.parse(data.SearchValue));
                    } else {
                        reject('No SearchValue in response');
                    }
                },
                error: err => reject(err)
            });
        });
    }

    function addDefaultFilterIcons() {
        const enabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!enabled) return;

        const formId = getFormIdFromUrl();
        if (!formId) return;

        // Add global styles for better layout
        if (!document.getElementById('scaleplus-dropdown-styles')) {
            const style = document.createElement('style');
            style.id = 'scaleplus-dropdown-styles';
            style.textContent = `
                .dropdown-menu li a {
                    display: flex !important;
                    align-items: center !important;
                }
                .scaleplus-default-icon {
                    transition: color 0.2s ease;
                    cursor: pointer;
                    margin-right: 5px;
                    font-size: 16px;
                    padding: 2px;
                    vertical-align: middle;
                    flex-shrink: 0;
                }
                .scaleplus-default-icon.glyphicon-star-empty:hover {
                    color: #f1c40f !important;
                }
                .scaleplus-default-icon.glyphicon-star:hover {
                    color: #f39c12 !important;
                }
                .deletesavedsearchbutton {
                    vertical-align: middle !important;
                    cursor: pointer !important;
                    margin: 0 0 0 0px !important;
                    padding: 0 !important;
                    border: none !important;
                    background: none !important;
                    line-height: 1 !important;
                }
                .deletesavedsearchbutton:hover {
                    color: #e74c3c !important;
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
                color: ${currentDefault === filterText ? '#f1c40f' : '#ccc'};
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

                const username = getUsernameFromCookie();
                if (currentDefaultNow === filterText) {
                    // Unset as default
                    clearDefaultFilter(formId);
                    defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star-empty';
                    defaultIcon.style.color = '#ccc';
                    defaultIcon.style.verticalAlign = 'middle';
                    console.log(`[ScalePlus] Unset ${filterText} as default for form ${formId} and user ${username}`);
                } else {
                    // Set as default
                    setDefaultFilter(formId, filterText);
                    defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star';
                    defaultIcon.style.color = '#f1c40f';
                    defaultIcon.style.verticalAlign = 'middle';

                    // Update other icons to be unselected
                    document.querySelectorAll('.scaleplus-default-icon').forEach(icon => {
                        if (icon !== defaultIcon) {
                            icon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star-empty';
                            icon.style.color = '#ccc';
                            icon.style.verticalAlign = 'middle';
                        }
                    });

                    console.log(`[ScalePlus] Set ${filterText} as default for form ${formId} and user ${username}`);
                }
            });

            // Insert before the delete button
            const deleteBtn = item.querySelector('.deletesavedsearchbutton');
            if (deleteBtn) {
                deleteBtn.title = 'Click to delete this favorite'; // Add tooltip
                deleteBtn.parentNode.insertBefore(defaultIcon, deleteBtn);

                // Add flex-shrink to delete button too
                deleteBtn.style.flexShrink = '0';
                deleteBtn.style.marginLeft = '25px';

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
    // Polling interval: 1000ms (1 second) to balance responsiveness with performance
    addDefaultFilterIcons();
    // Remove constant polling - use event-driven approach instead
    // setInterval(addDefaultFilterIcons, 1000);

    // Add event-driven approach to handle dynamically loaded content
    function setupDynamicContentObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldCheck = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Check if any new elements were added that might need default filter icons
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const hasSavedSearchItems = node.querySelectorAll && node.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]').length > 0;
                            const isSavedSearchItem = node.id === 'SearchPaneMenuFavoritesChooseSearch';
                            if (hasSavedSearchItems || isSavedSearchItem) {
                                shouldCheck = true;
                            }
                        }
                    });
                }
            });
            if (shouldCheck && isDefaultFilterEnabled()) {
                // Small delay to ensure DOM is fully updated
                setTimeout(() => {
                    addDefaultFilterIcons();
                }, 100);
            }
        });

        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Set up the dynamic content observer if favorites enhancement is enabled
    const isFavoritesEnabled6 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    if (isFavoritesEnabled6) {
        setupDynamicContentObserver();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping dynamic content observer setup');
    }

    // Clean up old ScalePlus cache entries on startup
    cleanupOldCacheEntries();

    // Clean up any orphaned cache entries that may exist
    setTimeout(() => {
        cleanupOrphanedDefaultFilters();
        cleanupOrphanedDateCache();
    }, 2000); // Wait 2 seconds for page to fully load

    // Monitor for favorite deletions and clean up cache if favorites enhancement is enabled
    const isFavoritesEnabled4 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    if (isFavoritesEnabled4) {
        monitorFavoriteDeletions();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping favorite deletion monitoring setup');
    }

    // Schedule periodic cleanup of orphaned cache entries
    schedulePeriodicCacheCleanup();

    // Auto-apply default filter for form URLs without arguments
    function checkAutoApplyDefault() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            return false; // Favorites enhancement disabled
        }

        // Only for URLs like "https://scaleqa.byjasco.com/scale/insights/2723" (no ? parameters)
        if (location.pathname.includes('/insights/') && !location.search) {
            const formId = extractFormIdFromUrl(location.href);
            if (formId) {
                const defaultFilter = getDefaultFilter(formId);
                if (defaultFilter) {
                    const username = getUsernameFromCookie();
                    console.log(`[ScalePlus] Looking for default filter: ${defaultFilter} for user ${username}`);

                    fetchSavedFilter(defaultFilter)
                        .then(savedFilters => {
                            console.log(`[ScalePlus] Applying default filter: ${defaultFilter} (user: ${username})`);

                            // Apply date offsets if the filter has cached date settings
                            const modifiedFilters = applyCachedDateSettings(savedFilters, defaultFilter, formId);

                            applySavedFilters(modifiedFilters, defaultFilter, formId);
                        })
                        .catch(err => {
                            console.warn('[ScalePlus] Failed to fetch or apply saved filter:', err);
                            console.log(`[ScalePlus] Default filter not found in saved searches for user ${username}`);
                        });

                    return true;
                }
            }
        }
        return false;
    }

    // Monitor for saved searches dropdown to appear for auto-apply
    let hasAutoApplied = false;
    let hasLoggedNoDefault = false;

    function checkForAutoApply() {
        if (isDefaultFilterEnabled()) {
            // Check for page load auto-apply (only once)
            if (!hasAutoApplied && document.readyState === 'complete') {
                const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                if (savedSearchItems.length > 0) {
                    const formId = extractFormIdFromUrl(location.href);
                    const defaultFilter = formId ? getDefaultFilter(formId) : null;

                    if (defaultFilter) {
                        console.log('[ScalePlus] Page loaded, checking for auto-apply default filter');
                        if (checkAutoApplyDefault()) {
                            hasAutoApplied = true;
                        }
                    } else if (!hasLoggedNoDefault) {
                        console.log('[ScalePlus] Page loaded - no default filter set');
                        hasLoggedNoDefault = true;
                    }
                }
            }
        }
    }

    // Check once when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            checkForAutoApply();
            updateFavoritesStarIcon(); // Update star icon when DOM is ready
        });
    } else {
        checkForAutoApply();
        updateFavoritesStarIcon(); // Update star icon immediately if DOM is already ready
    }

    // Check again when page is fully loaded (as backup)
    window.addEventListener('load', () => {
        setTimeout(() => {
            checkForAutoApply();
            updateFavoritesStarIcon(); // Update star icon on page load
        }, 100);
    });

    // Custom clear filters functionality
    function clearAllFilters() {
        console.log('[ScalePlus] Starting comprehensive filter clearing');

        // Clear Infragistics text editors using their API
        try {
            clearIgTextEditors();
        } catch (err) {
            console.warn('[ScalePlus] Could not clear igTextEditor fields:', err);
        }

        // Clear Infragistics date pickers using their API
        try {
            clearIgDatePickers();
        } catch (err) {
            console.warn('[ScalePlus] Could not clear igDatePicker fields:', err);
        }

        // Clear igCombo fields properly
        try {
            clearIgComboFields();
        } catch (err) {
            console.warn('[ScalePlus] Could not clear igCombo fields:', err);
        }

        // Clear advanced criteria grid
        try {
            clearAdvancedCriteriaGrid();
        } catch (err) {
            console.warn('[ScalePlus] Could not clear advanced criteria grid:', err);
        }

        // Clear basic search filters (fallback for any remaining fields)
        const basicFilters = document.querySelectorAll('#SearchPane input, #SearchPane select, #SearchPane textarea');
        basicFilters.forEach(input => {
            if (input.type === 'text' || input.type === 'textarea') {
                input.value = '';
                // Trigger change event to notify Scale's UI
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (input.type === 'checkbox') {
                input.checked = false;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Clear advanced filters (fallback for any remaining fields)
        const advancedFilters = document.querySelectorAll('#ScreenGroupSubAccordion4794 input, #ScreenGroupSubAccordion4794 select, #ScreenGroupSubAccordion4794 textarea');
        advancedFilters.forEach(input => {
            if (input.type === 'text' || input.type === 'textarea') {
                input.value = '';
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (input.type === 'checkbox') {
                input.checked = false;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            } else if (input.tagName === 'SELECT') {
                input.selectedIndex = 0;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // Clear toggle switches
        try {
            const toggles = document.querySelectorAll('#SearchPane input[data-toggle="toggle"], #ScreenGroupSubAccordion4794 input[data-toggle="toggle"]');
            toggles.forEach(toggle => {
                if (typeof $(toggle).bootstrapToggle === 'function') {
                    $(toggle).bootstrapToggle('off');
                }
            });
        } catch (err) {
            console.warn('[ScalePlus] Could not clear toggle switches:', err);
        }

        console.log('[ScalePlus] Cleared all filters');
    }

    function resetCombo(comboName) {
        const comboEl = $('#' + comboName);
        if (!comboEl.length || !comboEl.data('igCombo')) {
            return;
        }

        console.log(`[ScalePlus] Resetting combo: ${comboName}`);

        // Step 1: use the API to clear selection and value
        comboEl.igCombo('deselectAll');
        comboEl.igCombo('value', []);

        // Step 2: clear the hidden field and the visible input
        const wrapper = comboEl.closest('.ui-igcombo-wrapper');
        wrapper.find('.ui-igcombo-hidden-field').val('');
        wrapper.find('.ui-igcombo-field').val('').trigger('input').trigger('change');

        // Step 3: simulate a click on the built-in clear button
        const clearBtn = wrapper.find('.ui-igcombo-clear');
        if (clearBtn.length) {
            clearBtn[0].click(); // use native click to invoke widget logic
        }
    }

    function applyComboFilters(comboFilters) {
        // Step 1: Clear ALL multi-select combo boxes first to start with clean slate
        console.log('[ScalePlus] Clearing all multi-select combos first');
        const allMultiSelectCombos = $('[data-controltype="igComboMultiSelectWithCheckBox"]');
        allMultiSelectCombos.each(function () {
            const wrapper = $(this);
            const comboId = wrapper.attr('id');
            if (comboId) {
                const comboEl = $('#' + comboId);
                if (comboEl.length && comboEl.data('igCombo')) {
                    console.log('[ScalePlus] Clearing combo', comboId);
                    comboEl.igCombo('value', []); // clear all selections
                }
            }
        });

        // Step 2: Apply the values from the combo filters (using old working method)
        if (!comboFilters) return;
        console.log('[ScalePlus] Applying', comboFilters.length, 'saved combo values');
        comboFilters.forEach(combo => {
            const values = Array.isArray(combo.value) ? combo.value : [];
            if (values.length > 0) {
                // set the new values normally
                console.log(`[ScalePlus] Setting combo ${combo.name} to`, values);
                const el = $('#' + combo.name);
                if (el.length && el.data('igCombo')) {
                    el.igCombo('value', values);
                }
            }
        });
    }

    function clearIgComboFields() {
        // Clear all igCombo widgets unconditionally using the comprehensive reset
        $('#SearchPane .ui-igcombo-wrapper, #ScreenGroupSubAccordion4794 .ui-igcombo-wrapper').each(function () {
            const wrapper = $(this);
            const comboEl = wrapper.find('.ui-igcombo');
            if (comboEl.length) {
                const comboId = comboEl.attr('id');
                if (comboId) {
                    resetCombo(comboId);
                }
            }
        });
    }

    function clearIgTextEditors() {
        // Clear all igTextEditor widgets using their API
        console.log('[ScalePlus] Clearing igTextEditor widgets');

        const textEditors = $('[data-controltype="igTextEditor"], .ui-igtexteditor');
        textEditors.each(function() {
            const el = $(this);
            const id = el.attr('id');

            if (id && el.data('igTextEditor')) {
                console.log(`[ScalePlus] Clearing igTextEditor: ${id}`);
                try {
                    // Use the igTextEditor API to clear the value
                    el.igTextEditor('value', '');

                    // Also clear the underlying input field
                    const inputField = el.find('input').first();
                    if (inputField.length) {
                        inputField.val('').trigger('change');
                    }
                } catch (err) {
                    console.warn(`[ScalePlus] Failed to clear igTextEditor ${id}:`, err);
                    // Fallback: clear the input directly
                    const inputField = el.find('input').first();
                    if (inputField.length) {
                        inputField.val('').trigger('change');
                    }
                }
            }
        });
    }

    function clearIgDatePickers() {
        // Clear all igDatePicker widgets using their API
        console.log('[ScalePlus] Clearing igDatePicker widgets');

        const datePickers = $('[data-controltype="igDatePicker"], .ui-igdatepicker');
        datePickers.each(function() {
            const el = $(this);
            const id = el.attr('id');

            if (id && el.data('igDatePicker')) {
                console.log(`[ScalePlus] Clearing igDatePicker: ${id}`);
                try {
                    // Use the igDatePicker API to clear the value
                    el.igDatePicker('value', null);

                    // Also clear the underlying input field
                    const inputField = el.find('input').first();
                    if (inputField.length) {
                        inputField.val('').trigger('change');
                    }
                } catch (err) {
                    console.warn(`[ScalePlus] Failed to clear igDatePicker ${id}:`, err);
                    // Fallback: clear the input directly
                    const inputField = el.find('input').first();
                    if (inputField.length) {
                        inputField.val('').trigger('change');
                    }
                }
            }
        });
    }

    function clearAdvancedCriteriaGrid() {
        // Clear the advanced criteria grid
        console.log('[ScalePlus] Clearing advanced criteria grid');

        const gridId = 'SearchPaneAdvCritAdvCritGrid';
        const grid = $('#' + gridId);

        if (grid.length && grid.data('igGrid')) {
            try {
                // Get the current data source
                const dataSource = grid.igGrid('option', 'dataSource');

                // If there are records, clear them
                if (dataSource && dataSource.Records && dataSource.Records.length > 0) {
                    console.log(`[ScalePlus] Clearing ${dataSource.Records.length} advanced criteria records`);

                    // Clear the data source
                    const emptyDataSource = {
                        Records: [],
                        TotalRecordsCount: 0,
                        Metadata: dataSource.Metadata || {}
                    };

                    // Update the grid with empty data
                    grid.igGrid('option', 'dataSource', emptyDataSource);
                    grid.igGrid('dataBind');
                }
            } catch (err) {
                console.warn('[ScalePlus] Failed to clear advanced criteria grid:', err);
            }
        }
    }

    function toggleAdvancedPanel(visible) {
        const panel = document.getElementById('ScreenGroupSubAccordion4794');
        if (panel) {
            // remove focus from any element inside the panel
            const active = panel.contains(document.activeElement) ? document.activeElement : null;
            if (active) active.blur();

            if (visible) {
                panel.removeAttribute('aria-hidden');
                panel.removeAttribute('inert');
                panel.style.display = 'block';
            } else {
                // use inert instead of aria-hidden to prevent focus
                panel.setAttribute('inert', '');
                panel.style.display = 'none';
            }
        }
    }

    function applyAdvancedCriteria(savedFilters, formId) {
        if (!savedFilters.advSearch || !Array.isArray(savedFilters.advSearch)) {
            console.log('[ScalePlus] No advanced search filters to apply');
            return;
        }

        const adv = savedFilters.advSearch[0];
        const gridId = adv.name || 'SearchPaneAdvCritAdvCritGrid'; // fallback to default grid ID
        const records = (adv.value && adv.value.Records) ? adv.value.Records : [];

        console.log(`[ScalePlus] Applying advanced criteria to grid ${gridId}:`, records);

        const grid = $('#' + gridId);
        if (grid.data('igGrid')) {
            // Clear existing rows
            try {
                console.log('[ScalePlus] Clearing existing advanced criteria rows');
                const rows = grid.igGrid('rows');
                rows.each(function () {
                    const rowId = $(this).attr('data-id');
                    grid.igGridUpdating('deleteRow', rowId);
                });
            } catch (err) {
                console.warn('[ScalePlus] Could not delete rows individually, trying data source reset:', err);
                // fall back: reset the data source
                try {
                    grid.igGrid('option', 'dataSource', { Records: [] });
                } catch (err2) {
                    console.warn('[ScalePlus] Could not reset data source:', err2);
                }
            }
        }

        // Now insert the new records if any
        if (records.length > 0) {
            setTimeout(() => {
                if (_webUi &&
                    _webUi.insightSearchPaneActions &&
                    typeof _webUi.insightSearchPaneActions.applyInputAdvanceFilterCriteria === 'function') {
                    console.log('[ScalePlus] Applying advanced criteria using Scale helper:', records);
                    _webUi.insightSearchPaneActions.applyInputAdvanceFilterCriteria(
                        records,
                        formId || extractFormIdFromUrl(location.href)
                    );
                } else {
                    console.log('[ScalePlus] Scale helper not available, applying manually');
                    records.forEach(rec => {
                        grid.igGridUpdating('addRow', {
                            ConditionIdentifier: rec.ConditionIdentifier,
                            Condition: rec.Condition,
                            FieldIdentifier: rec.FieldIdentifier,
                            Field: rec.Field,
                            OperandIdentifier: rec.OperandIdentifier,
                            Operand: rec.Operand,
                            ValueIdentifier: rec.ValueIdentifier,
                            Value: rec.Value,
                            DataType: rec.DataType,
                            PrimaryKey: _webUi.createGuid()
                        });
                    });
                }
            }, 50);
        } else {
            console.log('[ScalePlus] No advanced criteria records to apply');
        }
    }

    // Apply both basic and advanced criteria using Scale's internal helpers
    function applySavedFilters(savedFilters, filterName, formId) {
        console.log('[ScalePlus] Applying saved filters using Scale\'s internal functions:', savedFilters);

        // Make sure the search pane is visible
        clickSearchButtonIfNeeded();

        // Apply date adjustments if this filter has cached date settings
        let filtersToApply = savedFilters;
        if (filterName && formId) {
            filtersToApply = applyCachedDateSettings(savedFilters, filterName, formId);
        }

        // Apply basic filters (simple editors, date pickers, combos, etc.)
        if (filtersToApply.inSearch &&
            _webUi &&
            _webUi.insightSearchPaneActions &&
            typeof _webUi.insightSearchPaneActions.applyInputFilterCriteria === 'function') {
            console.log('[ScalePlus] Applying basic filters:', filtersToApply.inSearch);
            _webUi.insightSearchPaneActions.applyInputFilterCriteria(filtersToApply.inSearch);
        } else {
            console.log('[ScalePlus] Cannot apply basic filters - missing function or data');
        }

        // Apply toggle filters manually
        if (Array.isArray(filtersToApply.togSearch)) {
            console.log('[ScalePlus] Applying toggle filters:', filtersToApply.togSearch);
            filtersToApply.togSearch.forEach(tog => {
                const el = document.getElementById(tog.name);
                if (el && typeof $(el).bootstrapToggle === 'function') {
                    console.log('[ScalePlus] Setting toggle ' + tog.name + ' to ' + (tog.value ? 'on' : 'off'));
                    $(el).bootstrapToggle(tog.value ? 'on' : 'off');
                }
            });
        }

        // Apply combo-checked-list filters
        applyComboFilters(filtersToApply.comboChkbxSearch);

        // Apply advanced criteria correctly
        applyAdvancedCriteria(filtersToApply, extractFormIdFromUrl(location.href));

        // You intentionally **do not** call the internal searchButtonClicked() here,
        // because you want to set the filters without running the search.
    }

    // Replace clear filters button functionality
    function enhanceClearFiltersButton() {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping clear filters enhancement');
            return;
        }

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
                            fetchSavedFilter(defaultFilter)
                                .then(savedFilters => {
                                    console.log(`[ScalePlus] Applying default filter: ${defaultFilter} after clear`);

                                    // Apply date offsets if the filter has cached date settings
                                    const modifiedFilters = applyCachedDateSettings(savedFilters, defaultFilter, formId);

                                    applySavedFilters(modifiedFilters, defaultFilter, formId);
                                })
                                .catch(err => {
                                    console.warn('[ScalePlus] Failed to fetch or apply saved filter after clear:', err);
                                });
                        }
                    }
                }, 10); // Wait 10ms for clear to complete
            });
        }
    }

    // Monitor for clear filters button - use event-driven approach instead of polling
    // setInterval(() => {
    //     if (isDefaultFilterEnabled()) {
    //         enhanceClearFiltersButton();
    //     }
    // }, 500);

    // Add event-driven approach for clear filters button
    function setupClearFiltersObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            const clearBtn = node.id === 'InsightMenuActionClearFilters' ? node :
                                           node.querySelector && node.querySelector('#InsightMenuActionClearFilters');
                            if (clearBtn && isDefaultFilterEnabled()) {
                                setTimeout(() => {
                                    enhanceClearFiltersButton();
                                }, 100);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Initial check
        if (isDefaultFilterEnabled()) {
            enhanceClearFiltersButton();
        }
    }

    // Set up the clear filters observer if favorites enhancement is enabled
    const isFavoritesEnabled7 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    if (isFavoritesEnabled7) {
        setupClearFiltersObserver();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping clear filters observer setup');
    }

    // Show date mode selection modal
    function showDateModeModal(formId, filterName, savedFilters, onSaveCallback) {
        // Check if favorites enhancement is enabled
        const isFavoritesEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
        if (!isFavoritesEnabled) {
            console.log('[ScalePlus] Favorites enhancement disabled, skipping date mode modal');
            return;
        }

        // Prevent multiple modals
        const existingModal = document.getElementById('scaleplus-date-mode-modal');
        if (existingModal) {
            console.log('[ScalePlus] Modal already exists, removing it first');
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'scaleplus-date-mode-modal';
        modal.innerHTML = `
            <div class="scaleplus-modal-backdrop"></div>
            <div class="scaleplus-modal-content">
                <div class="modal-header">
                    <button type="button" class="close scaleplus-modal-close" data-dismiss="modal" aria-hidden="true">×</button>
                    <h4 class="modal-title">Date/Time Filter Options</h4>
                </div>
                <div class="modal-body">
                    <p>The filter "<strong>${filterName}</strong>" contains date/time criteria.</p>
                    <p>How would you like to handle these dates when applying the filter?</p>

                    <div class="scaleplus-date-options">
                        <div class="radio">
                            <label>
                                <input type="radio" name="dateMode" value="normal" checked>
                                <strong>Normal:</strong> Use the exact dates and times as saved
                            </label>
                        </div>
                        <div class="radio">
                            <label>
                                <input type="radio" name="dateMode" value="relative_date">
                                <strong>Relative Date:</strong> Adjust dates relative to today, keep original times
                                <br><small>Example: "1 day ago from 9 AM - 5 PM" becomes "yesterday from 9 AM - 5 PM"</small>
                            </label>
                        </div>
                        <div class="radio">
                            <label>
                                <input type="radio" name="dateMode" value="relative_date_time">
                                <strong>Relative Date & Time:</strong> Adjust both dates and times relative to now
                                <br><small>Example: "1 day ago at 2 PM" becomes "yesterday at 2 PM"</small>
                            </label>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button id="scaleplus-date-cancel-btn" class="btn btn-default">Cancel</button>
                    <button id="scaleplus-date-save-btn" class="btn btn-primary">Save Filter</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Apply Scale-like styling
        const modalContent = modal.querySelector('.scaleplus-modal-content');
        const modalHeader = modal.querySelector('.modal-header');
        const modalBody = modal.querySelector('.modal-body');
        const modalFooter = modal.querySelector('.modal-footer');
        const closeBtn = modal.querySelector('.scaleplus-modal-close');
        const cancelBtn = modal.querySelector('#scaleplus-date-cancel-btn');
        const saveBtn = modal.querySelector('#scaleplus-date-save-btn');
        const backdrop = modal.querySelector('.scaleplus-modal-backdrop');

        // Use same styling as settings modal
        Object.assign(modalContent.style, {
            position: 'fixed',
            top: '-100px',
            left: '50%',
            transform: 'translateX(-50%)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            zIndex: '10001',
            minWidth: '600px',
            maxWidth: '600px',
            maxHeight: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '0',
            backgroundColor: '#f4f4f8',
            overflow: 'hidden',
            animation: 'scaleplus-drop-in 0.3s ease-out forwards'
        });

        Object.assign(modalHeader.style, {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px 20px',
            backgroundColor: '#494e5e',
            color: 'white',
            width: '100%',
            boxSizing: 'border-box',
            flexShrink: '0',
            position: 'relative',
            zIndex: '1',
            margin: '0'
        });

        Object.assign(modalBody.style, {
            padding: '20px',
            overflowY: 'auto',
            flex: '1',
            backgroundColor: '#f4f4f8',
            color: '#000000',
            position: 'relative',
            zIndex: '0',
            maxHeight: 'calc(100vh - 200px)'
        });

        Object.assign(modalFooter.style, {
            padding: '10px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: '0',
            borderTop: '1px solid #ddd',
            backgroundColor: '#494e5e',
            color: 'white',
            width: '100%',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: '1',
            margin: '0'
        });

        // Style buttons
        [cancelBtn, saveBtn].forEach(btn => {
            Object.assign(btn.style, {
                border: 'none',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                backgroundColor: '#4f93e4',
                color: 'white',
                borderRadius: '0',
                marginLeft: '10px'
            });
        });

        saveBtn.style.backgroundColor = '#4f93e4';
        cancelBtn.style.backgroundColor = '#6c757d';

        saveBtn.onmouseover = () => saveBtn.style.backgroundColor = '#3a7bc8';
        saveBtn.onmouseout = () => saveBtn.style.backgroundColor = '#4f93e4';
        cancelBtn.onmouseover = () => cancelBtn.style.backgroundColor = '#5a6268';
        cancelBtn.onmouseout = () => cancelBtn.style.backgroundColor = '#6c757d';

        // Style close button
        Object.assign(closeBtn.style, {
            margin: '0',
            color: 'white',
            opacity: '0.8',
            fontSize: '28px',
            lineHeight: '1',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: '0',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'absolute',
            right: '15px',
            top: '50%',
            transform: 'translateY(-50%)'
        });

        closeBtn.onmouseover = () => closeBtn.style.opacity = '1';
        closeBtn.onmouseout = () => closeBtn.style.opacity = '0.8';

        // Style radio options
        const radioLabels = modal.querySelectorAll('.radio label');
        radioLabels.forEach(label => {
            Object.assign(label.style, {
                display: 'block',
                marginBottom: '15px',
                cursor: 'pointer',
                color: '#000000'
            });
        });

        const radios = modal.querySelectorAll('input[type="radio"]');
        radios.forEach(radio => {
            Object.assign(radio.style, {
                marginRight: '10px'
            });
        });

        // Add backdrop styling
        Object.assign(backdrop.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            zIndex: '10000',
            opacity: '0',
            animation: 'scaleplus-fade-in 0.2s ease-out forwards'
        });

        // Handle save button
        saveBtn.addEventListener('click', () => {
            const selectedMode = modal.querySelector('input[name="dateMode"]:checked').value;
            const savedAt = new Date().toISOString();
            const dateOffsets = calculateDateOffsets(savedFilters, savedAt);

            // Save the date cache for this specific filter
            setFilterDateCache(formId, filterName, selectedMode, dateOffsets);

            console.log(`[ScalePlus] Saved date mode "${selectedMode}" for filter "${filterName}"`);
            console.log('[ScalePlus] Removing modal after save');

            // Call the callback if provided (for save button interception)
            if (onSaveCallback) {
                console.log('[ScalePlus] Calling onSaveCallback');
                onSaveCallback();
            }

            modal.remove();
        });

        // Handle cancel/close
        const closeModal = () => {
            console.log('[ScalePlus] Closing modal (cancel/close)');
            modal.remove();
            // Note: Don't call onSaveCallback for cancel/close - only for save
        };
        cancelBtn.addEventListener('click', closeModal);
        closeBtn.addEventListener('click', closeModal);
        backdrop.addEventListener('click', closeModal);
    }

    // Advanced Criteria Counter
    function updateAdvancedCriteriaCount() {
        // Check if advanced criteria indicator is enabled
        const isEnabled = localStorage.getItem(SETTINGS.ADV_CRITERIA_ENHANCEMENT) !== 'false';
        if (!isEnabled) return;

        // Find the advanced criteria accordion header
        const headers = document.querySelectorAll('h3.ui-accordion-header');
        let advancedHeader = null;

        headers.forEach(header => {
            const link = header.querySelector('a[data-resourcekey="ADVANCEDCRITERIA"]');
            if (link) {
                advancedHeader = header;
            }
        });

        if (!advancedHeader) return;

        // Get the current count of advanced criteria rows
        const grid = $('#SearchPaneAdvCritAdvCritGrid');
        let count = 0;

        if (grid.length && grid.data('igGrid')) {
            try {
                const dataSource = grid.igGrid('option', 'dataSource');
                if (dataSource && dataSource.Records) {
                    count = dataSource.Records.length;
                } else {
                    // Fallback: count visible rows
                    count = grid.find('tbody tr').length;
                }
            } catch (err) {
                console.warn('[ScalePlus] Could not get advanced criteria count from grid:', err);
                // Fallback: count visible rows
                count = grid.find('tbody tr').length;
            }
        }

        // Update the header text
        const link = advancedHeader.querySelector('a[data-resourcekey="ADVANCEDCRITERIA"]');
        if (link) {
            const baseText = link.getAttribute('data-resourcevalue') || 'Advanced criteria';
            link.textContent = count > 0 ? `${baseText} (${count})` : baseText;
        }
    }

    function setupAdvancedCriteriaObserver() {
        // Check if advanced criteria indicator is enabled
        const isEnabled = localStorage.getItem(SETTINGS.ADV_CRITERIA_ENHANCEMENT) !== 'false';
        if (!isEnabled) return;

        const grid = document.getElementById('SearchPaneAdvCritAdvCritGrid');
        if (!grid) return;

        // Flag to prevent duplicate logging
        let gridColumnsModified = false;

        // Function to modify grid columns to show condition
        function modifyGridColumns() {
            const $grid = $('#SearchPaneAdvCritAdvCritGrid');
            if ($grid.length && $grid.data('igGrid')) {
                try {
                    // Check if advanced criteria enhancement is enabled
                    const isEnabled = localStorage.getItem(SETTINGS.ADV_CRITERIA_ENHANCEMENT) !== 'false';

                    // Get current columns
                    const columns = $grid.igGrid('option', 'columns');

                    // Find and modify the Condition column
                    const conditionColumn = columns.find(col => col.key === 'Condition');
                    if (conditionColumn) {
                        conditionColumn.hidden = !isEnabled; // Show only if enabled
                        conditionColumn.headerText = 'Condition';
                        conditionColumn.width = '14%';

                        // Add formatter to show just AND/OR instead of longer text
                        conditionColumn.formatter = function (val) {
                            if (val && typeof val === 'string') {
                                // Extract just AND or OR from the value
                                const upperVal = val.toUpperCase();
                                if (upperVal.includes('AND')) return 'AND';
                                if (upperVal.includes('OR')) return 'OR';
                                return val; // fallback to original value
                            }
                            return val || '';
                        };

                        // Adjust other column widths based on condition column visibility
                        const fieldColumn = columns.find(col => col.key === 'Field');
                        const operandColumn = columns.find(col => col.key === 'Operand');
                        const valueColumn = columns.find(col => col.key === 'Value');

                        if (isEnabled) {
                            // Condition column is visible - adjust widths
                            if (fieldColumn) fieldColumn.width = '30%';
                            if (operandColumn) operandColumn.width = '15%';
                            if (valueColumn) valueColumn.width = '30%';
                        } else {
                            // Condition column is hidden - use original widths
                            if (fieldColumn) fieldColumn.width = '40%';
                            if (operandColumn) operandColumn.width = '20%';
                            if (valueColumn) valueColumn.width = '40%';
                        }

                        // Update the grid with modified columns
                        $grid.igGrid('option', 'columns', columns);
                        $grid.igGrid('dataBind');

                        // Only log once per session to avoid duplicates
                        if (!gridColumnsModified) {
                            console.log('[ScalePlus] Modified advanced criteria grid to show condition column with AND/OR only');
                            gridColumnsModified = true;
                        }
                    }
                } catch (err) {
                    console.warn('[ScalePlus] Could not modify grid columns:', err);
                }
            }
        }

        // Initial update
        updateAdvancedCriteriaCount();

        // Try to modify columns immediately and after delays to ensure grid is ready
        modifyGridColumns();
        setTimeout(modifyGridColumns, 1000); // Wait 1s for grid initialization
        setTimeout(modifyGridColumns, 3000); // Wait 3s for any dynamic loading

        // Set up MutationObserver to watch for changes to the grid
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && mutation.target.tagName === 'TBODY') {
                    shouldUpdate = true;
                }
            });
            if (shouldUpdate) {
                updateAdvancedCriteriaCount();
            }
        });

        // Observe changes to the tbody (where rows are added/removed)
        const tbody = grid.querySelector('tbody');
        if (tbody) {
            observer.observe(tbody, {
                childList: true,
                subtree: true
            });
        }

        // Also observe the entire grid for other changes
        observer.observe(grid, {
            childList: true,
            subtree: true,
            attributes: true
        });

        console.log('[ScalePlus] Advanced criteria counter observer set up');
    }

    // Set up the observer when the page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupAdvancedCriteriaObserver);
    } else {
        setupAdvancedCriteriaObserver();
    }

    // Set up the save dialog observer immediately when script loads if favorites enhancement is enabled
    const isFavoritesEnabled2 = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    if (isFavoritesEnabled2) {
        setupSaveDialogObserver();
    } else {
        console.log('[ScalePlus] Favorites enhancement disabled, skipping save dialog observer setup');
    }

})();

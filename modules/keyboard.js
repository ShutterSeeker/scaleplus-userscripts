// ==UserScript==
// @name         ScalePlus Keyboard Module  
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Keyboard shortcuts and mouse interactions
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Check if we're on a Scale page (not RF page)
    function isScalePage() {
        const url = window.location.href;
        return url.includes('/scale/') || url.includes('/Scale/');
    }

    let firstTrigger = true;

    window.ScalePlusKeyboard = {
        init() {
            if (!isScalePage()) {
                console.log('[ScalePlus Keyboard] Not on Scale page, skipping initialization');
                return;
            }
            console.log('[ScalePlus Keyboard] Module initialized');
            this.setupKeyboardHandlers();
            this.setupMouseHandlers();
        },

        triggerAction() {
            const stopBtn = document.getElementById('InsightMenuActionStopSearch');
            const applyBtn = document.getElementById('InsightMenuApply');

            if (firstTrigger) {
                firstTrigger = false;
                if (applyBtn && window.ScalePlusUtilities?.isVisible(applyBtn)) {
                    console.log('[ScalePlus Keyboard] First trigger - Clicking Apply');
                    applyBtn.click();
                } else {
                    console.log('[ScalePlus Keyboard] First trigger - Apply button not visible, allowing normal Enter behavior');
                    // Reset firstTrigger so next Enter press will try again
                    firstTrigger = true;
                    return false; // Indicate that we didn't handle the action
                }
            } else {
                if (stopBtn && window.ScalePlusUtilities?.isVisible(stopBtn)) {
                    console.log('[ScalePlus Keyboard] Clicking Stop Search');
                    stopBtn.click();
                } else if (applyBtn && window.ScalePlusUtilities?.isVisible(applyBtn)) {
                    console.log('[ScalePlus Keyboard] Clicking Apply');
                    applyBtn.click();
                } else {
                    console.log('[ScalePlus Keyboard] No visible button to click');
                    return false; // Indicate that we didn't handle the action
                }
            }
            return true; // Indicate that we handled the action
        },

        getF5Behavior() {
            if (!window.ScalePlusSettings) return 'false';
            const stored = localStorage.getItem(window.ScalePlusSettings.SETTINGS.F5_BEHAVIOR);
            if (stored === null || stored === 'null' || stored === '') {
                const defaultBehavior = window.ScalePlusSettings.DEFAULTS[window.ScalePlusSettings.SETTINGS.F5_BEHAVIOR];
                localStorage.setItem(window.ScalePlusSettings.SETTINGS.F5_BEHAVIOR, defaultBehavior);
                return defaultBehavior;
            }
            if (stored === 'disabled') {
                localStorage.removeItem(window.ScalePlusSettings.SETTINGS.F5_BEHAVIOR);
                return 'false';
            }
            return stored;
        },

        clearF5Preference() {
            if (!window.ScalePlusSettings) return;
            localStorage.removeItem(window.ScalePlusSettings.SETTINGS.F5_BEHAVIOR);
            console.log('[ScalePlus Keyboard] F5 preference cleared');
        },

        setupKeyboardHandlers() {
            document.addEventListener('keydown', (e) => {
                // F5 key handling
                if (e.key === 'F5' || e.keyCode === 116) {
                    if (e.ctrlKey && e.shiftKey) {
                        e.preventDefault();
                        this.clearF5Preference();
                        return;
                    }
                    const behavior = this.getF5Behavior();
                    if (behavior !== 'false') {
                        console.log('[ScalePlus Keyboard] F5 custom behavior triggered');
                        const actionHandled = this.triggerAction();
                        if (actionHandled) {
                            e.preventDefault();
                        } else {
                            console.log('[ScalePlus Keyboard] Allowing normal F5 behavior');
                        }
                    } else {
                        console.log('[ScalePlus Keyboard] F5 normal behavior - allowing page refresh');
                    }
                }
                // Enter key handling
                else if (e.key === 'Enter' || e.keyCode === 13) {
                    // Only handle Enter if no modal is visible
                    const modals = document.querySelectorAll('.modal');
                    let modalVisible = false;
                    modals.forEach(modal => {
                        if (getComputedStyle(modal).display === 'block') {
                            modalVisible = true;
                        }
                    });
                    if (modalVisible) {
                        return;
                    }
                    
                    if (!window.ScalePlusSettings) return;
                    const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.CUSTOM_ENTER);
                    if (enabled) {
                        const actionHandled = this.triggerAction();
                        if (!actionHandled) {
                            console.log('[ScalePlus Keyboard] Allowing normal Enter behavior');
                            return;
                        }
                        e.preventDefault();
                        console.log('[ScalePlus Keyboard] Enter key triggered');
                    }
                }
                // Ctrl+D for tab duplication
                else if (e.key && e.key.toLowerCase() === 'd' && e.ctrlKey && !e.shiftKey) {
                    if (!window.ScalePlusSettings) return;
                    const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.TAB_DUPLICATOR);
                    if (enabled) {
                        e.preventDefault();
                        window.open(window.location.href, '_blank');
                    }
                }
            });
        },

        copyInnerText(e) {
            let el = e.target;
            while (el && (!el.getAttribute || !el.getAttribute('aria-describedby') || !el.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
                el = el.parentElement;
            }
            if (!el) {
                console.log('[ScalePlus Keyboard] Triggered element does not have aria-describedby starting with ListPaneDataGrid');
                return;
            }
            e.preventDefault();
            let value = '';
            if (el.tagName === 'A') {
                value = window.ScalePlusUtilities?.normalizeSpaces(el.textContent) || el.textContent.trim();
            } else if (el.tagName === 'TD') {
                const link = el.querySelector('a');
                value = link ? 
                    (window.ScalePlusUtilities?.normalizeSpaces(link.textContent) || link.textContent.trim()) : 
                    (window.ScalePlusUtilities?.normalizeSpaces(el.textContent) || el.textContent.trim());
            } else {
                const link = el.querySelector('a');
                value = link ? 
                    (window.ScalePlusUtilities?.normalizeSpaces(link.textContent) || link.textContent.trim()) : 
                    (window.ScalePlusUtilities?.normalizeSpaces(el.textContent) || el.textContent.trim());
            }
            this.copyToClipboard(value, e.pageX || 0, e.pageY || 0);
        },

        copyToClipboard(text, x, y) {
            navigator.clipboard.writeText(text).then(() => {
                console.log(`[ScalePlus Keyboard] Copied to clipboard: ${text}`);
                this.showCopiedTooltip(text, x, y);
            }).catch(err => {
                console.error('[ScalePlus Keyboard] Failed to copy:', err);
            });
        },

        showCopiedTooltip(text, x, y) {
            const tooltip = document.createElement('div');
            tooltip.textContent = `Copied: ${text}`;
            tooltip.style.cssText = `
                position: fixed;
                left: ${x}px;
                top: ${y}px;
                background: #333;
                color: #fff;
                padding: 8px 12px;
                border-radius: 4px;
                font-size: 12px;
                z-index: 100000;
                pointer-events: none;
                max-width: 300px;
                word-wrap: break-word;
            `;
            document.body.appendChild(tooltip);
            setTimeout(() => tooltip.remove(), 2000);
        },

        handleFavoriteClick(e, filterText) {
            if (!filterText) {
                console.warn('[ScalePlus Keyboard] Could not extract filter name from favorite link');
                return;
            }

            console.log('[ScalePlus Keyboard] Opening favorite filter in new tab:', filterText);
            const baseUrl = `${location.origin}${location.pathname}`;
            const url = `${baseUrl}#pendingFilter=${encodeURIComponent(filterText)}`;
            const newTab = window.open(url, '_blank');
            if (newTab) {
                newTab.blur();
                window.focus();
            }
        },

        setupMouseHandlers() {
            // Middle-click handler (mousedown)
            document.addEventListener('mousedown', (e) => {
                if (e.button === 1) {
                    console.log('[ScalePlus Keyboard] Middle-click detected');
                    if (!window.ScalePlusSettings) return;
                    const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.MIDDLE_CLICK);
                    if (!enabled) return;
                    
                    // Check for favorite filter link
                    let target = e.target;
                    while (target && target !== document.body) {
                        if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                            e.preventDefault();
                            e.stopPropagation();
                            const link = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                            if (link) {
                                const filterText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                                this.handleFavoriteClick(e, filterText);
                            }
                            return;
                        }
                        target = target.parentElement;
                    }

                    // Check for regular link
                    target = e.target;
                    while (target && target !== document.body) {
                        if (target.tagName === 'A' && target.href) {
                            console.log('[ScalePlus Keyboard] Regular link detected, allowing normal middle-click');
                            return;
                        }
                        target = target.parentElement;
                    }

                    // Check for grid item to copy
                    target = e.target;
                    while (target && (!target.getAttribute || !target.getAttribute('aria-describedby') || !target.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
                        target = target.parentElement;
                    }
                    
                    if (target) {
                        console.log('[ScalePlus Keyboard] Grid item detected for copying');
                        e.preventDefault();
                        this.copyInnerText(e);
                    }
                }
            });

            // Auxclick handler (backup for middle-click)
            document.addEventListener('auxclick', (e) => {
                if (e.button === 1) {
                    console.log('[ScalePlus Keyboard] Aux-click detected');
                    if (!window.ScalePlusSettings) return;
                    const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.MIDDLE_CLICK);
                    if (!enabled) return;
                    
                    // Check for favorite filter link
                    let target = e.target;
                    while (target && target !== document.body) {
                        if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                            e.preventDefault();
                            e.stopPropagation();
                            const link = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                            if (link) {
                                const filterText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                                this.handleFavoriteClick(e, filterText);
                            }
                            return;
                        }
                        target = target.parentElement;
                    }

                    // Check for regular link
                    target = e.target;
                    while (target && target !== document.body) {
                        if (target.tagName === 'A' && target.href) {
                            console.log('[ScalePlus Keyboard] Regular link detected in auxclick');
                            return;
                        }
                        target = target.parentElement;
                    }

                    // Check for grid item to copy
                    target = e.target;
                    while (target && (!target.getAttribute || !target.getAttribute('aria-describedby') || !target.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
                        target = target.parentElement;
                    }
                    
                    if (target) {
                        console.log('[ScalePlus Keyboard] Grid item detected for copying via auxclick');
                        e.preventDefault();
                        this.copyInnerText(e);
                    }
                }
            });

            // Ctrl+Left click handler for favorites
            document.addEventListener('click', (e) => {
                if (e.ctrlKey && e.button === 0) {
                    console.log('[ScalePlus Keyboard] Ctrl+left click detected');
                    if (!window.ScalePlusSettings) return;
                    const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.MIDDLE_CLICK);
                    if (!enabled) return;
                    
                    let target = e.target;
                    while (target && target !== document.body) {
                        if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.stopImmediatePropagation();
                            const link = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                            if (link) {
                                const filterText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                                this.handleFavoriteClick(e, filterText);
                            }
                            return;
                        }
                        target = target.parentElement;
                    }
                }
            }, true); // Use capture phase for priority
        }
    };

    // Initialize keyboard module
    window.ScalePlusKeyboard.init();
})();

// ==UserScript==
// @name         ScalePlus
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  F5/Enter triggers Stop or Apply; Middle-click copies text from .screenpartcontainer; Alt+Shift+Delete clears form cache
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @author       Blake
// @match        https://scaleqa.byjasco.com/scale/insights/*
// @match        https://scale20.byjasco.com/scale/insights/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // On page load, click the search button if not already active
    function clickSearchButtonIfNeeded() {
        // Wait for DOM to be ready
        function tryClick() {
            // Find the anchor inside the navsearch li
            var searchBtn = document.querySelector('li.navsearch.visible-sm.visible-md.visible-lg a.navimageanchor[data-toggle="search"]');
            if (searchBtn) {
                // Only click if it does NOT have class 'visiblepane navimageanchor'
                if (!searchBtn.classList.contains('visiblepane')) {
                    searchBtn.click();
                    console.log('[ScalePlus] Clicked search button to show search pane.');
                } else {
                    console.log('[ScalePlus] Search pane already visible, not clicking.');
                }
            } else {
                // Try again in a bit if not found (in case of slow load)
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

    const promptForF5Behavior = () => {
        const choice = confirm(
            'Click OK for ScalePlus custom behavior (triggers Play/Stop buttons)\n' +
            'Click Cancel for normal F5 behavior (page refresh)\n\n' +
            'This choice will be remembered.\n' +
            'Press Ctrl+Shift+F5 to clear preference'
        );

        const behavior = choice ? 'custom' : 'normal';
        localStorage.setItem(STORAGE_KEY, behavior);
        console.log(`[ScalePlus] F5 behavior set to: ${behavior}`);
        return behavior;
    };

    const getF5Behavior = () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            console.log(`[ScalePlus] Using stored F5 behavior: ${stored}`);
            return stored;
        }
        return promptForF5Behavior();
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

    document.addEventListener('keydown', function (e) {
        // Alt+Shift+Delete: Clear ListPaneDataGridgridColumnPreference cache for current form
        if (e.altKey && e.shiftKey && (e.key === 'Delete' || e.keyCode === 46)) {
            e.preventDefault();
            try {
                // Extract form ID from URL (e.g., .../insights/10087?...)
                const match = window.location.pathname.match(/insights\/(\d+)/);
                if (match) {
                    const formId = match[1];
                    const prefix = formId + 'ListPaneDataGridgridColumnPreference';
                    let foundKeys = [];
                    // Find all matching keys (username part is variable)
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(prefix)) {
                            foundKeys.push(key);
                        }
                    }
                    if (foundKeys.length > 0) {
                        if (confirm('Are you sure you want to clear grid column preference cache for form ' + formId + '?')) {
                            foundKeys.forEach(key => {
                                localStorage.removeItem(key);
                                console.log('[ScalePlus] Cleared cache key:', key);
                            });
                            alert('ScalePlus: Cleared grid column preference cache for form ' + formId);
                        } else {
                            alert('ScalePlus: Cache clear cancelled.');
                        }
                    } else {
                        alert('ScalePlus: No grid column preference cache found for this form.');
                    }
                } else {
                    alert('ScalePlus: Could not determine form ID from URL.');
                }
            } catch (err) {
                alert('ScalePlus: Error clearing cache: ' + err);
            }
            return;
        }

        if (e.key === 'F5' || e.keyCode === 116) {
            // Check for Ctrl+Shift+F5 to reset preference
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
                // Don't prevent default, let normal refresh happen
            }
        } else if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            console.log('[ScalePlus] Enter key triggered');
            triggerAction();
        }
    });

    function copyInnerText(e) {
        let el = e.target;

        // Walk up the DOM to find the relevant element
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
            value = el.textContent.trim();
        } else if (el.tagName === 'TD') {
            const link = el.querySelector('a');
            value = link ? link.textContent.trim() : el.textContent.trim();
        } else {
            const link = el.querySelector('a');
            value = link ? link.textContent.trim() : el.textContent.trim();
        }

        copyToClipboard(value, e.pageX || 0, e.pageY || 0);
    }

    // Middle-click listener
    document.addEventListener('mousedown', function (e) {
        if (e.button === 1) {
            e.preventDefault();
            copyInnerText(e);
        }
    });
})();

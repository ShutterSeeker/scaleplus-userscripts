
// ==UserScript==
// @name         onContainerCloseCopy
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Copies last container as you close
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/onContainerCloseCopy.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/onContainerCloseCopy.user.js
// @author       Blake
// @match        https://scaleqa.byjasco.com/scale/trans/packing*
// @match        https://scaleqa.byjasco.com/scale/trans/closecontainer*
// @match        https://scale20.byjasco.com/scale/trans/packing*
// @match        https://scale20.byjasco.com/scale/trans/closecontainer*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Check if we're on a matching URL
    const currentUrl = window.location.href;
    const validUrls = [
        'https://scaleqa.byjasco.com/scale/trans/packing',
        'https://scaleqa.byjasco.com/scale/trans/closecontainer',
        'https://scale20.byjasco.com/scale/trans/packing',
        'https://scale20.byjasco.com/scale/trans/closecontainer'
    ];
    
    const isValidUrl = validUrls.some(url => currentUrl.startsWith(url));
    if (!isValidUrl) {
        console.log('[ScalePlus] Skipping - not on a matching URL:', currentUrl);
        return;
    }

    // Copy logic for both click and Enter, always show tooltip relative to the button
    function copyContainerIdAndShowTooltip(e) {
        var input = document.querySelector('input[type="hidden"][name="ContainerInfoContainerIdValue"]');
        var btn = document.getElementById('CloseContainerActionClose');
        if (input && input.value && btn) {
            const containerValue = input.value; // Capture value before async operation
            navigator.clipboard.writeText(containerValue).then(() => {
                var rect = btn.getBoundingClientRect();
                var x = rect.left + window.scrollX - 200;
                var y = rect.top + window.scrollY + 40;
                showTooltip(x, y, `Copied: "${containerValue}"`);
                console.log('[ScalePlus] Copied container ID:', containerValue);
            }).catch(err => {
                console.error('[ScalePlus] Failed to copy:', err);
            });
        } else {
            console.warn('[ScalePlus] Could not find hidden input, button, or value to copy.');
        }
    }

    // Tooltip function (copied from ScalePlus)
    function showTooltip(x, y, text) {
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
    }

    // Attach click handler for Close button to copy container ID value
    function addCloseButtonCopyHandler() {
        let attachAttempts = 0;
        function tryAttach() {
            var btn = document.getElementById('CloseContainerActionClose');
            if (btn) {
                btn.addEventListener('click', copyContainerIdAndShowTooltip);
                console.log('[ScalePlus] Attached Close button copy handler.');
            } else {
                attachAttempts++;
                if (attachAttempts < 20) {
                    setTimeout(tryAttach, 200);
                } else {
                    console.error('[ScalePlus] Could not find Close button after multiple attempts.');
                }
            }
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', tryAttach);
        } else {
            tryAttach();
        }
    }
    addCloseButtonCopyHandler();

    // Global Enter key handler
    document.addEventListener('keydown', function(e) {
        if ((e.key === 'Enter' || e.keyCode === 13)) {
            var btn = document.getElementById('CloseContainerActionClose');
            if (btn) {
                // Only trigger if button is visible/enabled
                var style = window.getComputedStyle(btn);
                var isVisible = style.display !== 'none' && style.visibility !== 'hidden' && btn.offsetParent !== null;
                var isDisabled = btn.disabled || btn.classList.contains('disabled');
                if (isVisible && !isDisabled) {
                    copyContainerIdAndShowTooltip(e);
                }
            }
        }
    });

})();

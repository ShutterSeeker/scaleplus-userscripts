// ==UserScript==
// @name         ScalePlus
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  F5/Enter triggers Stop or Apply; Middle-click copies text from .screenpartcontainer
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @match        https://scaleqa.byjasco.com/scale/insights/*
// @match        https://scale20.byjasco.com/scale/insights/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

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

    const triggerAction = () => {
        const stopBtn = document.getElementById('InsightMenuActionStopSearch');
        const applyBtn = document.getElementById('InsightMenuApply');

        if (isVisible(stopBtn)) {
            console.log('[ScalePlus] Clicking Stop Search');
            stopBtn.click();
        } else if (isVisible(applyBtn)) {
            console.log('[ScalePlus] Clicking Apply');
            applyBtn.click();
        } else {
            console.log('[ScalePlus] No visible button to click');
        }
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
        if (e.key === 'F5' || e.keyCode === 116 || e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            console.log('[ScalePlus] Key triggered:', e.key);
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

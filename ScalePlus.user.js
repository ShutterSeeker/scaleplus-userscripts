
// ==UserScript==
// @name         ScalePlus
// @namespace    http://tampermonkey.net/
// @version      2.13
// @description  Custom enhancements for Scale application with toggleable features
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/ScalePlus.user.js
// @icon         https://scale20.byjasco.com/favicon.ico
// @author       Blake, Nash
// @match        https://scaleqa.byjasco.com/scale/*
// @match        https://scale20.byjasco.com/scale/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ===== SETTINGS =====
    // Constants for localStorage keys and default values
    const SETTINGS = {
        SHOW_SEARCH_PANE: 'scaleplus_show_search_pane',
        CUSTOM_ENTER: 'scaleplus_custom_enter',
        MIDDLE_CLICK: 'scaleplus_middle_click',
        RIGHT_CLICK_MENU: 'scaleplus_right_click_menu',
        ENV_LABELS: 'scaleplus_env_labels',
        TAB_DUPLICATOR: 'scaleplus_tab_duplicator',
        DEFAULT_FILTER: 'scaleplus_default_filter',
        ADV_CRITERIA_ENHANCEMENT: 'scaleplus_adv_criteria_enhancement',
        F5_BEHAVIOR: 'scaleplus_f5_behavior',
        ENV_QA_NAME: 'scaleplus_env_qa_name',
        ENV_PROD_NAME: 'scaleplus_env_prod_name',
        DARK_MODE: 'scaleplus_dark_mode'
    };

    const DEFAULTS = {
        [SETTINGS.SHOW_SEARCH_PANE]: 'true',
        [SETTINGS.CUSTOM_ENTER]: 'true',
        [SETTINGS.MIDDLE_CLICK]: 'true',
        [SETTINGS.RIGHT_CLICK_MENU]: 'true',
        // ENV_LABELS is set dynamically below
        [SETTINGS.TAB_DUPLICATOR]: 'false',
        [SETTINGS.DEFAULT_FILTER]: 'true',
        [SETTINGS.ADV_CRITERIA_ENHANCEMENT]: 'true',
        [SETTINGS.F5_BEHAVIOR]: 'false',
        [SETTINGS.ENV_QA_NAME]: 'QA ENVIRONMENT',
        [SETTINGS.ENV_PROD_NAME]: 'PRODUCTION ENVIRONMENT',
        [SETTINGS.DARK_MODE]: 'false'
    };

    // Dynamically set ENV_LABELS default based on hostname if not already set
    if (localStorage.getItem(SETTINGS.ENV_LABELS) === null) {
        if (window.location.hostname.includes('scaleqa')) {
            localStorage.setItem(SETTINGS.ENV_LABELS, 'true');
        } else if (window.location.hostname.includes('scale20')) {
            localStorage.setItem(SETTINGS.ENV_LABELS, 'false');
        }
    }

    // Ensure advanced settings are false by default if not set
    if (localStorage.getItem(SETTINGS.F5_BEHAVIOR) === null) {
        localStorage.setItem(SETTINGS.F5_BEHAVIOR, 'false');
    }
    if (localStorage.getItem(SETTINGS.TAB_DUPLICATOR) === null) {
        localStorage.setItem(SETTINGS.TAB_DUPLICATOR, 'false');
    }

    // Helper: normalize spaces (convert &nbsp; → space, collapse whitespace)
    const normalizeSpaces = (text) => text.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

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
        return visible;
    };

    // Feature gate for favorites enhancements (default star + relative date behavior + pending filter support)
    function enhanceFavoritesEnabled() {
        return localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';
    }

    // ===== RELATIVE DATE / TIME FEATURE =====
    function getFilterDateCacheKey(formId, filterName) {
        const username = (typeof getUsernameFromCookie === 'function') ? getUsernameFromCookie() : '';
        const safeFilterName = (filterName || '').replace(/[^a-zA-Z0-9]/g, '_');
        return `${formId}Filter${safeFilterName}${username}`;
    }
    function setFilterDateCache(formId, filterName, dateMode, dateOffsets) {
        try {
            const key = getFilterDateCacheKey(formId, filterName);
            const cacheData = { dateMode, dateOffsets, savedAt: new Date().toISOString() };
            localStorage.setItem(key, JSON.stringify(cacheData));
            console.log(`[ScalePlus] Saved relative date settings for "${filterName}"`, cacheData);
        } catch (e) { console.warn('[ScalePlus] Failed to save date cache', e); }
    }
    function getFilterDateCache(formId, filterName) {
        try {
            const key = getFilterDateCacheKey(formId, filterName);
            const cache = localStorage.getItem(key);
            return cache ? JSON.parse(cache) : null;
        } catch (e) { return null; }
    }
    function calculateDateOffsets(savedFilters, savedAt) {
        const offsets = {};
        const savedTime = new Date(savedAt);
        if (!savedFilters || !savedFilters.inSearch) return offsets;
        savedFilters.inSearch.forEach(crit => {
            if (crit._isDate && crit.value) {
                try {
                    const critDate = new Date(crit.value);
                    if (!isNaN(critDate.getTime())) offsets[crit.name] = critDate.getTime() - savedTime.getTime();
                } catch (_) {}
            }
        });
        return offsets;
    }
    function checkForDateCriteria(filterData) {
        if (!filterData || !filterData.inSearch) return false;
        return filterData.inSearch.some(c => c._isDate);
    }
    function extractCurrentFilterCriteria() {
        const criteria = [];
        // Text editors
        try {
            const textEditors = $('[data-controltype="igTextEditor"], .ui-igtexteditor');
            textEditors.each(function() {
                const el = $(this); const id = el.attr('id');
                if (id && el.data('igTextEditor')) {
                    const value = el.igTextEditor('value');
                    if (value) criteria.push({ name: id, value });
                }
            });
        } catch(_){ }
        // Date pickers via API
        try {
            const datePickers = $('[data-controltype="igDatePicker"], .ui-igdatepicker');
            datePickers.each(function() {
                const el = $(this); const id = el.attr('id');
                if (!id) return;
                if (id.toLowerCase().includes('date') || id.toLowerCase().includes('time')) {
                    let value = null;
                    try { value = el.igDatePicker('value'); } catch(_){ }
                    if (value) criteria.push({ name: id, value: value.toISOString(), _isDate: true });
                }
            });
        } catch(_){ }
        // Fallback: plain inputs whose id hints at date/time and have a value parsable as date
        try {
            document.querySelectorAll('input[id*="Date" i], input[id*="Time" i]').forEach(inp=>{
                if (!inp.id) return;
                // Skip if already captured
                if (criteria.some(c=>c.name===inp.id)) return;
                const raw = inp.value && inp.value.trim();
                if (!raw) return;
                const parsed = new Date(raw);
                if (!isNaN(parsed.getTime())) {
                    criteria.push({ name: inp.id, value: parsed.toISOString(), _isDate: true });
                }
            });
        } catch(_){ }
        return criteria;
    }
    function showDateModeModal(formId, filterName, savedFilters, onSaveCallback) {
        const old = document.getElementById('scaleplus-date-mode-modal');
        if (old) { try { old.remove(); } catch(_){} }
        const modal = document.createElement('div');
        modal.id='scaleplus-date-mode-modal';
        modal.className='modal fade';
        modal.setAttribute('tabindex','-1');
        modal.setAttribute('role','dialog');
        modal.innerHTML = `
            <div class="modal-dialog"><div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                    <h4 class="modal-title">Date/Time Filter Options</h4>
                </div>
                <div class="modal-body">
                    <p>The filter "<strong>${filterName}</strong>" contains date/time criteria.</p>
                    <p>How would you like to handle these dates when applying the filter?</p>
                    <div class="radio"><label><input type="radio" name="dateMode" value="relative_date" checked> <strong>Relative Date</strong></label></div>
                    <div class="radio"><label><input type="radio" name="dateMode" value="relative_date_time"> <strong>Relative Date & Time</strong></label></div>
                    <div class="radio"><label><input type="radio" name="dateMode" value="normal"> <strong>Absolute</strong></label></div>
                </div>
                <div class="modal-footer">
                    <button id="scaleplus-date-save-btn" class="btn btn-primary" style="background-color:#4f93e4 !important;border-color:#2e6da4 !important;color:#fff !important;">Save</button>
                    <button id="scaleplus-date-cancel-btn" class="btn btn-default" data-dismiss="modal">Cancel</button>
                </div>
            </div></div>`;
        document.body.appendChild(modal);
        if (typeof $ !== 'undefined' && $(modal).modal) { $(modal).modal('show'); } else { modal.style.display='block'; }
        // Always clear Save button processing attribute on close
        const clearProcessing = () => {
            const saveBtn = document.getElementById('SaveSearchSaveButton');
            if (saveBtn && saveBtn.hasAttribute('data-scaleplus-processing')) {
                saveBtn.removeAttribute('data-scaleplus-processing');
            }
        };
        const closeModal = () => {
            clearProcessing();
            if (typeof $ !== 'undefined' && $(modal).modal) { $(modal).modal('hide'); setTimeout(()=>modal.remove(),300);} else { modal.remove(); }
        };
        modal.querySelector('.close').onclick = closeModal;
        modal.querySelector('#scaleplus-date-cancel-btn').onclick = () => { closeModal(); };
        const saveBtn = modal.querySelector('#scaleplus-date-save-btn');
        saveBtn.onclick = () => {
            const selectedMode = modal.querySelector('input[name="dateMode"]:checked').value;
            const savedAt = new Date().toISOString();
            const dateOffsets = calculateDateOffsets(savedFilters, savedAt);
            setFilterDateCache(formId, filterName, selectedMode, dateOffsets);
            if (onSaveCallback) onSaveCallback();
            closeModal();
        };
        modal.addEventListener('keydown', e=>{ if(e.key==='Enter' || e.keyCode===13){ e.preventDefault(); saveBtn.click(); }});
        setTimeout(()=>{ modal.focus && modal.focus(); },100);
    }
    function adjustRelativeDates(savedFilters, formId, filterName) {
        if (!savedFilters) return savedFilters;
        if (savedFilters._relativeApplied) {
            console.log('[ScalePlus] adjustRelativeDates skipped: already applied for', filterName);
            return savedFilters;
        }
        // If favorites enhancement (which governs relative mode) is disabled, skip adjustments entirely
        if (!enhanceFavoritesEnabled()) {
            return savedFilters;
        }
        if (!savedFilters.inSearch) {
            console.log('[ScalePlus] adjustRelativeDates: no inSearch array present');
            return savedFilters;
        }
        const dateCache = (formId && filterName) ? getFilterDateCache(formId, filterName) : null;
        if (!dateCache) {
            console.log('[ScalePlus] adjustRelativeDates: no cache found for', formId, filterName);
            return savedFilters;
        }
        if (!dateCache.dateMode || !dateCache.dateOffsets) {
            console.log('[ScalePlus] adjustRelativeDates: cache incomplete', dateCache);
            return savedFilters;
        }
        if (dateCache.dateMode === 'normal') {
            console.log('[ScalePlus] adjustRelativeDates: mode normal – no change');
            return savedFilters;
        }
        const mode = dateCache.dateMode;
        const now = new Date();
        console.log('[ScalePlus] adjustRelativeDates start', {filterName, formId, mode, now: now.toISOString(), offsets: dateCache.dateOffsets});
        savedFilters.inSearch = savedFilters.inSearch.map(crit => {
            if (crit && crit.name && dateCache.dateOffsets[crit.name] !== undefined && crit.value) {
                const original = crit.value;
                const newDate = new Date(now.getTime() + dateCache.dateOffsets[crit.name]);
                if (mode === 'relative_date') newDate.setHours(0,0,0,0);
                crit.value = newDate.toISOString();
                console.log('[ScalePlus] adjustRelativeDates crit updated', {name: crit.name, before: original, after: crit.value, offset: dateCache.dateOffsets[crit.name]});
            }
            return crit;
        });
        savedFilters._relativeApplied = true;
        console.log('[ScalePlus] adjustRelativeDates complete for', filterName);
        return savedFilters;
    }
    // Helper to safely trigger native save without re-opening modal
    function triggerNativeSave(saveBtn){
        if(!saveBtn) return;
        saveBtn.setAttribute('data-scaleplus-processing','true');
        saveBtn.click(); // programmatic click; listener will ignore due to attribute
        setTimeout(()=> saveBtn.removeAttribute('data-scaleplus-processing'), 250);
    }
    // Intercept favorite save (Save button)
    document.addEventListener('click', function(e){
        const saveBtn = e.target.closest('#SaveSearchSaveButton');
        if(!saveBtn) {
            console.log('[ScalePlus] Save button click: not a save button');
            return;
        }
        if (saveBtn.hasAttribute('data-scaleplus-processing')) {
            console.log('[ScalePlus] Save button click ignored due to data-scaleplus-processing');
            return; // bypass recursion
        }
        // If favorites enhancements are disabled, do not intercept for custom date modal
        if (!enhanceFavoritesEnabled()) {
            return; // allow native behavior (absolute save)
        }
            // Always defer reading the filter name to after the event loop so value is up-to-date
            setTimeout(() => {
                let filterNameInput = document.querySelector('#SaveSearchNameEditor');
                if(!filterNameInput){
                    console.log('[ScalePlus] Save button: #SaveSearchNameEditor not found (deferred)');
                    return;
                }
                let filterName = filterNameInput.value;
                console.log('[ScalePlus] Save button: filterNameInput.value (deferred):', filterName);
                if(!filterName || !filterName.replace(/\s/g,'')) {
                    console.log('[ScalePlus] Blank filter name on Save (deferred)');
                    return;
                }
                // Continue with save logic
                const formIdMatch = window.location.pathname.match(/insights\/(\d+)/);
                const formId = (typeof getFormIdFromUrl==='function'?getFormIdFromUrl():null) || (formIdMatch?formIdMatch[1]:null);
                if(!formId) {
                    console.log('[ScalePlus] No formId found on Save');
                    return;
                }
                const currentFilters = { inSearch: extractCurrentFilterCriteria() };
                if(!checkForDateCriteria(currentFilters)) {
                    console.log('[ScalePlus] No date fields found in criteria on Save');
                    return; // no date fields
                }
                console.log('[ScalePlus] Intercepting Save button for custom date modal. filterName:', filterName, 'formId:', formId, 'criteria:', currentFilters);
                e.preventDefault(); e.stopPropagation();
                showDateModeModal(formId, filterName, currentFilters, ()=>{ triggerNativeSave(saveBtn); });
            }, 10);
        const formIdMatch = window.location.pathname.match(/insights\/(\d+)/);
        const formId = (typeof getFormIdFromUrl==='function'?getFormIdFromUrl():null) || (formIdMatch?formIdMatch[1]:null);
        if(!formId) {
            console.log('[ScalePlus] No formId found on Save');
            return;
        }
        const currentFilters = { inSearch: extractCurrentFilterCriteria() };
        if(!checkForDateCriteria(currentFilters)) {
            console.log('[ScalePlus] No date fields found in criteria on Save');
            return; // no date fields
        }
        console.log('[ScalePlus] Intercepting Save button for custom date modal. filterName:', filterName, 'formId:', formId, 'criteria:', currentFilters);
        e.preventDefault(); e.stopPropagation();
        showDateModeModal(formId, filterName, currentFilters, ()=>{ triggerNativeSave(saveBtn); });
    }, true);
    // Removed earlier duplicate favorite click interception block (now consolidated below)
    function getCurrentFavoriteNames(){
        const names = [];
        document.querySelectorAll('a#SearchPaneMenuFavoritesChooseSearch .deletesavedsearchtext').forEach(el=>{
            const t = el.textContent && el.textContent.trim();
            if(t) names.push(t);
        });
        return names;
    }
    // Cleanup orphaned relative date cache entries after a delete
    function cleanupOrphanedRelativeCache(formId){
        if(!formId) return;
        const existing = new Set(getCurrentFavoriteNames());
        const prefix = `${formId}Filter`;
        const toDelete = [];
        for(let i=0;i<localStorage.length;i++){
            const k = localStorage.key(i);
            if(k && k.startsWith(prefix)){
                // Extract filterName portion between prefix and username (last segment after username may vary). We'll attempt splitting by current username first.
                const username = (typeof getUsernameFromCookie==='function')?getUsernameFromCookie():'';
                let filterSegment = k.substring(prefix.length);
                if(username && filterSegment.endsWith(username)){
                    filterSegment = filterSegment.substring(0, filterSegment.length-username.length);
                }
                filterSegment = filterSegment.replace(/_+$/,'');
                if(filterSegment && !existing.has(filterSegment)){
                    toDelete.push(k);
                }
            }
        }
        if(toDelete.length){
            toDelete.forEach(k=>{ try { localStorage.removeItem(k); console.log('[ScalePlus] Removed orphaned relative date cache', k); } catch(_){} });
        }
    }
    // Observe favorite list for deletions to trigger cleanup
    const favoriteDeletionObserver = new MutationObserver(muts=>{
        let deleted = false;
        muts.forEach(m=>{
            if(m.removedNodes && m.removedNodes.length){
                m.removedNodes.forEach(n=>{
                    if(n.nodeType===1 && n.querySelector && (n.id==='SearchPaneMenuFavoritesChooseSearch' || n.querySelector('a#SearchPaneMenuFavoritesChooseSearch'))){
                        deleted = true;
                    }
                });
            }
        });
        if(deleted){
            const formId = (typeof getFormIdFromUrl==='function'?getFormIdFromUrl():null);
            cleanupOrphanedRelativeCache(formId);
        }
    });
    try { favoriteDeletionObserver.observe(document.body,{childList:true,subtree:true}); } catch(_){ }

    // Intercept favorite clicks ONLY when the text span itself is clicked (avoid star/delete interference)
    document.addEventListener('click', function(e){
        const textSpan = e.target.closest('span.deletesavedsearchtext');
        if(!textSpan) return; // must originate from the text span
        const favLink = textSpan.closest('a#SearchPaneMenuFavoritesChooseSearch');
        if(!favLink) return;
        // Ignore star or delete icon clicks
        if(e.target.closest('.scaleplus-default-icon')) return;
        if(e.target.closest('.deletesavedsearchbutton') || e.target.classList.contains('deletesavedsearchicon')) return;
        if(e.button !== 0) return; // primary only
        if(!e.isTrusted) return; // ignore synthetic
        if(!enhanceFavoritesEnabled()) return;
        const filterName = textSpan.textContent ? textSpan.textContent.trim() : null;
        if(!filterName) return;
        const formId = (typeof getFormIdFromUrl==='function'?getFormIdFromUrl():null);
        const cache = formId ? getFilterDateCache(formId, filterName) : null;
        let forceRelative = window._scaleplusForceRelative;
        if (forceRelative) {
            console.log('[ScalePlus] Force-relative flag detected for favorite', filterName);
            window._scaleplusForceRelative = false;
        }
        // If forced, or if cache is set to relative, apply relative logic
        if(!(forceRelative || (cache && cache.dateMode && cache.dateMode !== 'normal'))) return; // nothing relative to apply
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
        fetchSavedFilter(filterName).then(sf => {
            if (forceRelative) {
                try {
                    setFilterDateCache(formId, filterName, 'relative_date', calculateDateOffsets(sf, new Date()));
                    console.log('[ScalePlus] Forced relative cache seeded for', filterName);
                } catch(err) { console.warn('[ScalePlus] Failed to seed forced relative cache', err); }
            }
            console.log('[ScalePlus] Applying favorite with potential relative adjustment', {filterName, formId});
            adjustRelativeDates(sf, formId, filterName);
            applySavedFilters(sf, filterName);
            const applyBtn = document.getElementById('InsightMenuApply');
            if (applyBtn && isVisible(applyBtn)) applyBtn.click();
        }).catch(err => console.warn('[ScalePlus] Failed to fetch favorite for relative date', err));
    }, true);
    // ===== END RELATIVE DATE / TIME FEATURE =====


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
        const closeBtn = modal.querySelector('.close');
        const cancelBtn = modal.querySelector('#scaleplus-close-btn');
        const labels = modal.querySelectorAll('label');
        const descs = modal.querySelectorAll('.scaleplus-setting-desc, .scaleplus-advanced-label');
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

        $('#dark-mode-toggle').on('change', function(event) {
            const state = this.checked;
            localStorage.setItem(SETTINGS.DARK_MODE, state.toString());
            console.log(`[ScalePlus] Dark mode set to: ${state}`);
            
            // Apply or remove dark mode class immediately
            if (state) {
                document.body.classList.add('scaleplus-dark-mode');
            } else {
                document.body.classList.remove('scaleplus-dark-mode');
            }
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

        // Handle close
        // Bootstrap handles modal closing automatically with data-dismiss="modal"
        // No custom closeModal function needed
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
            // Only handle Enter if no modal is visible
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
        } else if (e.key && e.key.toLowerCase() === 'd' && e.ctrlKey && !e.shiftKey) {
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
            const existingModal = document.getElementById('scaleplus-settings-modal');
            if (existingModal) {
                existingModal.remove();
                const existingStyle = document.querySelector('style[data-scaleplus-modal]');
                if (existingStyle) existingStyle.remove();
            }
            createSettingsModal();
            $('#scaleplus-settings-modal').modal('show');
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
            console.log('[ScalePlus] Middle-click detected at:', { pageX: e.pageX, pageY: e.pageY, target: e.target });
            const enabled = localStorage.getItem(SETTINGS.MIDDLE_CLICK) !== 'false';
            if (enabled) {
                console.log('[ScalePlus] Middle-click enhancement enabled, checking for targets...');
                
                // Check if this is a favorite filter link
                let target = e.target;
                while (target && target !== document.body) {
                    if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                        // This is a favorite filter link - open in new tab with base URL
                        e.preventDefault();
                        e.stopPropagation();
                        const link = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                        if (link) {
                            // Extract filter name from the link
                            const filterText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                            if (filterText) {
                                console.log('[ScalePlus] Opening favorite filter in new tab:', filterText);

                                // Put the filter name directly in the URL hash
                                const baseUrl = `${location.origin}${location.pathname}`;
                                const url = `${baseUrl}#pendingFilter=${encodeURIComponent(filterText)}`;
                                const newTab = window.open(url, '_blank');
                                if (newTab) {
                                    newTab.blur();
                                    window.focus();
                                }
                            } else {
                                console.warn('[ScalePlus] Could not extract filter name from favorite link');
                            }
                        }
                        return;
                    }
                    target = target.parentElement;
                }

                // Check if this is a regular link (anchor tag with href)
                target = e.target;
                while (target && target !== document.body) {
                    if (target.tagName === 'A' && target.href) {
                        // This is a regular link - let the browser handle it normally
                        console.log('[ScalePlus] Regular link detected, allowing normal middle-click behavior:', target.href);
                        return; // Don't prevent default, let browser open in new tab
                    }
                    target = target.parentElement;
                }

                // Check if this is a grid item for copying
                target = e.target;
                while (target && (!target.getAttribute || !target.getAttribute('aria-describedby') || !target.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
                    target = target.parentElement;
                }
                
                if (target) {
                    // This is a grid item - use copy functionality
                    console.log('[ScalePlus] Grid item detected for copying');
                    e.preventDefault();
                    copyInnerText(e);
                } else {
                    console.log('[ScalePlus] No special target found for middle-click');
                }
            }
        }
    });

    // Add auxclick handler as backup for middle-click
    document.addEventListener('auxclick', function (e) {
        if (e.button === 1) {
            console.log('[ScalePlus] Aux-click (middle) detected at:', { pageX: e.pageX, pageY: e.pageY, target: e.target });
            const enabled = localStorage.getItem(SETTINGS.MIDDLE_CLICK) !== 'false';
            if (enabled) {
                console.log('[ScalePlus] Aux-click enhancement enabled, checking for targets...');
                
                // Check if this is a favorite filter link
                let target = e.target;
                while (target && target !== document.body) {
                    if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                        // This is a favorite filter link - open in new tab with base URL
                        e.preventDefault();
                        e.stopPropagation();
                        const link = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                        if (link) {
                            // Extract filter name from the link
                            const filterText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                            if (filterText) {
                                console.log('[ScalePlus] Opening favorite filter in new tab via auxclick:', filterText);

                                // Put the filter name directly in the URL hash
                                const baseUrl = `${location.origin}${location.pathname}`;
                                const url = `${baseUrl}#pendingFilter=${encodeURIComponent(filterText)}`;
                                const newTab = window.open(url, '_blank');
                                if (newTab) {
                                    newTab.blur();
                                    window.focus();
                                }
                            } else {
                                console.warn('[ScalePlus] Could not extract filter name from favorite link');
                            }
                        }
                        return;
                    }
                    target = target.parentElement;
                }

                // Check if this is a regular link (anchor tag with href)
                target = e.target;
                while (target && target !== document.body) {
                    if (target.tagName === 'A' && target.href) {
                        // This is a regular link - let the browser handle it normally
                        console.log('[ScalePlus] Regular link detected in auxclick, allowing normal behavior:', target.href);
                        return; // Don't prevent default, let browser open in new tab
                    }
                    target = target.parentElement;
                }

                // Check if this is a grid item for copying
                target = e.target;
                while (target && (!target.getAttribute || !target.getAttribute('aria-describedby') || !target.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
                    target = target.parentElement;
                }
                
                if (target) {
                    // This is a grid item - use copy functionality
                    console.log('[ScalePlus] Grid item detected for copying via auxclick');
                    e.preventDefault();
                    copyInnerText(e);
                } else {
                    console.log('[ScalePlus] No special target found for auxclick');
                }
            }
        }
    });

    // Add Ctrl+left click handler for favorites (using capture phase for priority)
    document.addEventListener('click', function (e) {
        if (e.ctrlKey && e.button === 0) { // Left click with Ctrl
            console.log('[ScalePlus] Ctrl+left click detected at:', { pageX: e.pageX, pageY: e.pageY, target: e.target });
            const enabled = localStorage.getItem(SETTINGS.MIDDLE_CLICK) !== 'false';
            if (enabled) {
                // Check if this is a favorite filter link
                let target = e.target;
                while (target && target !== document.body) {
                    if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                        // This is a favorite filter link - open in new tab with base URL
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        const link = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                        if (link) {
                            // Extract filter name from the link
                            const filterText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                            if (filterText) {
                                console.log('[ScalePlus] Opening favorite filter in new tab via Ctrl+click:', filterText);

                                // Put the filter name directly in the URL hash
                                const baseUrl = `${location.origin}${location.pathname}`;
                                const url = `${baseUrl}#pendingFilter=${encodeURIComponent(filterText)}`;
                                const newTab = window.open(url, '_blank');
                                if (newTab) {
                                    newTab.blur();
                                    window.focus();
                                }
                            } else {
                                console.warn('[ScalePlus] Could not extract filter name from favorite link');
                            }
                        }
                        return;
                    }
                    target = target.parentElement;
                }
                console.log('[ScalePlus] No favorite link found for Ctrl+click');
            }
        }
    }, true); // Use capture phase
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
            padding: 8px 12px;
            border-radius: 4px;
            position: fixed;
            top: 5px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1040;
            white-space: nowrap;
            max-width: fit-content;
        `;

        // Insert it into the body (not navbar) to avoid affecting navbar layout
        document.body.insertBefore(label, document.body.firstChild);

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

    // Update favorites dropdown star icon based on default filter status
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

        // NOTE: Removed automatic orphaned filter cleanup on delete confirmation
        // Reason: Too risky - false positives can delete valid cache due to DOM timing issues
        // Cache is cleaned up immediately when user explicitly deletes a favorite (via cleanupDeletedFavoriteCache)
        // or when user un-stars a default (via clearDefaultFilter), so no need for this check
    }

    // Clean up cache when a favorite is deleted
    function cleanupDeletedFavoriteCache(deletedFilterName) {
        const username = getUsernameFromCookie();
        
        // ENHANCED SAFETY: Wait a moment and verify the favorite is truly gone
        // before deleting cache (protects against transient DOM changes)
        setTimeout(() => {
            // Double-check that the favorite is actually deleted, not just temporarily removed from DOM
            const allFavorites = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"] .deletesavedsearchtext');
            const stillExists = Array.from(allFavorites).some(item => item.textContent?.trim() === deletedFilterName);
            
            if (stillExists) {
                console.log(`[ScalePlus] False alarm - "${deletedFilterName}" still exists, NOT deleting cache`);
                return;
            }
            
            // Confirmed deleted, now safe to clean up cache
            let cleanedCount = 0;

            // Find and remove any default filter cache entries for this favorite
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('DefaultFilter') && key.includes(username)) {
                    const storedFilterName = localStorage.getItem(key);
                    if (storedFilterName === deletedFilterName) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                        console.log(`[ScalePlus] Cleaned up default filter cache for confirmed deleted favorite: ${deletedFilterName}`);
                    }
                }
            }

            // Update the star icon since we may have removed a default filter
            if (cleanedCount > 0) {
                setTimeout(() => {
                    updateFavoritesStarIcon();
                }, 100);
            }
        }, 1000); // Wait 1 second to verify deletion is permanent
    }

    // NOTE: Removed cleanupOrphanedDefaultFilters() function entirely
    // Cache cleanup happens directly when user deletes a favorite (cleanupDeletedFavoriteCache)
    // or un-stars a default (clearDefaultFilter). No need for automatic orphan detection.

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
                    // Add date mode tooltip to text span
                    let dateTooltip = 'No date criteria in this favorite';
                    try {
                        const formId = getFormIdFromUrl();
                        const cache = formId ? getFilterDateCache(formId, filterText) : null;
                        if (cache && cache.dateMode && cache.dateMode !== 'normal') {
                            let modeLabel = '';
                            if (cache.dateMode === 'relative_date') modeLabel = 'Relative Date';
                            else if (cache.dateMode === 'relative_date_time') modeLabel = 'Relative Date & Time';
                            else if (cache.dateMode === 'normal') modeLabel = 'Absolute';
                            else modeLabel = cache.dateMode;
                            dateTooltip = `Date mode: ${modeLabel}`;
                        } else if (cache && cache.dateMode === 'normal') {
                            dateTooltip = 'Date mode: Absolute';
                        }
                    } catch(_){}
                    textSpan.title = dateTooltip;
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

    // Set up the dynamic content observer
    setupDynamicContentObserver();

    // Clean up old ScalePlus cache entries on startup
    cleanupOldCacheEntries();

    // Monitor for favorite deletions and clean up cache
    monitorFavoriteDeletions();

    // Auto-apply default filter for form URLs without arguments
    function checkAutoApplyDefault() {
        // Only apply default filter if no filters are present in URL (neither query params nor hash fragment)
        // and no pending filter was just processed
        const hasQueryFilters = location.search.includes('filters=');
        const hasHashFilters = location.hash.includes('filters=');
        const hasPendingFilter = location.hash.includes('pendingFilter=');

        if (location.pathname.includes('/insights/') && !hasQueryFilters && !hasHashFilters && !hasPendingFilter && !hasProcessedPendingFilter) {
            const formId = extractFormIdFromUrl(location.href);
            if (formId) {
                const defaultFilter = getDefaultFilter(formId);
                if (defaultFilter) {
                    const username = getUsernameFromCookie();
                    console.log(`[ScalePlus] Looking for default filter: ${defaultFilter} for user ${username}`);

                    fetchSavedFilter(defaultFilter)
                        .then(savedFilters => {
                            console.log(`[ScalePlus] Applying default filter: ${defaultFilter} (user: ${username})`);
                            applySavedFilters(savedFilters);
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
    let hasProcessedPendingFilter = false;

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

    // Check for pending filter to click from middle-click
    function checkForPendingFilter() {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const pendingFilterName = hashParams.get('pendingFilter');

        if (pendingFilterName) {
            const filterName = decodeURIComponent(pendingFilterName);
            console.log('[ScalePlus] Found pending filter to click:', filterName);

            // Clean up the URL by removing the pendingFilter parameter from hash
            const newHash = window.location.hash.replace(/[&#]pendingFilter=[^&]*/, '');
            window.history.replaceState({}, '', window.location.pathname + window.location.search + newHash);

            let retryCount = 0;
            const maxRetries = 10;

            // Wait for favorites to load and then click the matching one
            const clickPendingFilter = () => {
                // First, make sure the favorites dropdown is visible
                const favoritesDropdown = document.querySelector('#InsightMenuFavoritesDropdown');
                if (favoritesDropdown && !favoritesDropdown.classList.contains('open')) {
                    console.log('[ScalePlus] Opening favorites dropdown for pending filter');
                    const dropdownToggle = favoritesDropdown.querySelector('[data-toggle="dropdown"]');
                    if (dropdownToggle) {
                        dropdownToggle.click();
                        // Wait a bit for the dropdown to open
                        setTimeout(() => findAndClickFavorite(), 200);
                        return;
                    }
                }

                findAndClickFavorite();
            };

            const findAndClickFavorite = () => {
                const favoriteLinks = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                console.log(`[ScalePlus] Looking for favorite "${filterName}" among ${favoriteLinks.length} favorites`);

                for (const link of favoriteLinks) {
                    const linkText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                    console.log(`[ScalePlus] Checking favorite: "${linkText}"`);
                    if (linkText === filterName) {
                        console.log('[ScalePlus] Found pending favorite, fetching directly (no synthetic click):', filterName);
                        const formId = getFormIdFromUrl();
                        if (!formId) {
                            console.log('[ScalePlus] Pending favorite early path: no formId');
                            return;
                        }
                        setTimeout(() => {
                            fetchSavedFilter(filterName).then(sf => {
                                console.log('[ScalePlus] Pending direct path fetched favorite', {filterName, formId, criteriaCount: sf?.inSearch?.length});
                                const featuresOn = enhanceFavoritesEnabled();
                                if (featuresOn) {
                                    const hasDate = checkForDateCriteria(sf);
                                    const dateCache = getFilterDateCache(formId, filterName);
                                    console.log('[ScalePlus] Pending direct relative evaluation', {hasDate, cache: dateCache});
                                    if (hasDate && (!dateCache || !dateCache.dateMode || dateCache.dateMode === 'relative_date' || dateCache.dateMode === 'relative_date_time')) {
                                        setFilterDateCache(formId, filterName, 'relative_date', calculateDateOffsets(sf, new Date()));
                                        console.log('[ScalePlus] Pending direct seeded relative cache for', filterName);
                                    }
                                    adjustRelativeDates(sf, formId, filterName);
                                    console.log('[ScalePlus] Pending direct applying filters (post-adjust) for', filterName);
                                } else {
                                    console.log('[ScalePlus] Pending direct applying filters (enhance favorites disabled - absolute) for', filterName);
                                }
                                applySavedFilters(sf, filterName);
                                const applyBtn = document.getElementById('InsightMenuApply');
                                if (applyBtn && isVisible(applyBtn)) applyBtn.click();
                                hasProcessedPendingFilter = true;
                            }).catch(err => console.warn('[ScalePlus] Pending direct failed to fetch favorite', err));
                        }, 800); // small delay to let Scale finish initial UI wiring
                        return;
                    }
                }

                retryCount++;
                if (retryCount < maxRetries) {
                    // If not found yet, try again in a moment (favorites might still be loading)
                    if (favoriteLinks.length > 0) {
                        console.log('[ScalePlus] Pending filter not found, will retry');
                        setTimeout(clickPendingFilter, 500);
                    } else {
                        console.log('[ScalePlus] No favorites found yet, will retry');
                        setTimeout(clickPendingFilter, 1000);
                    }
                } else {
                    // Fallback: fetch and apply the filter directly with relative date logic
                    console.log('[ScalePlus] Pending favorite not found after retries, applying filter directly:', filterName);
                    const formId = getFormIdFromUrl();
                    if (!formId) return;
                    fetchSavedFilter(filterName).then(sf => {
                        const featuresOn = enhanceFavoritesEnabled();
                        console.log('[ScalePlus] Fallback fetched favorite for pending filter', {filterName, formId, criteriaCount: sf?.inSearch?.length, featuresOn});
                        if (featuresOn) {
                            // If filter has date fields and cache is missing or not 'normal', force relative mode
                            const hasDate = checkForDateCriteria(sf);
                            const dateCache = getFilterDateCache(formId, filterName);
                            console.log('[ScalePlus] Fallback relative evaluation', {hasDate, cache: dateCache});
                            if (hasDate && (!dateCache || !dateCache.dateMode || dateCache.dateMode === 'relative_date' || dateCache.dateMode === 'relative_date_time')) {
                                // Default to relative_date if not set
                                setFilterDateCache(formId, filterName, 'relative_date', calculateDateOffsets(sf, new Date()));
                                console.log('[ScalePlus] Fallback seeded relative cache for', filterName);
                            }
                            adjustRelativeDates(sf, formId, filterName);
                            console.log('[ScalePlus] Fallback applying filters (post-adjust) for', filterName);
                        } else {
                            console.log('[ScalePlus] Fallback applying filters (enhance favorites disabled - absolute) for', filterName);
                        }
                        applySavedFilters(sf, filterName);
                        // Optionally trigger search
                        const applyBtn = document.getElementById('InsightMenuApply');
                        if (applyBtn && isVisible(applyBtn)) {
                            applyBtn.click();
                        }
                    }).catch(err => console.warn('[ScalePlus] Failed to fetch pending filter', err));
                }
            };

            clickPendingFilter();
        }
    }

    // Check once when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            checkForAutoApply();
            checkForPendingFilter();
            updateFavoritesStarIcon(); // Update star icon when DOM is ready
        });
    } else {
        checkForAutoApply();
        checkForPendingFilter();
        updateFavoritesStarIcon(); // Update star icon immediately if DOM is already ready
    }

    // Check again when page is fully loaded (as backup)
    window.addEventListener('load', () => {
        setTimeout(() => {
            checkForAutoApply();
            checkForPendingFilter();
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
                // Clearing existing advanced criteria rows (log removed)
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
                    // Applying advanced criteria using Scale helper (log removed)
                    _webUi.insightSearchPaneActions.applyInputAdvanceFilterCriteria(
                        records,
                        formId || extractFormIdFromUrl(location.href)
                    );
                } else {
                    // Scale helper not available, applying manually (log removed)
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
            // No advanced criteria records to apply (log removed)
        }
    }

    // Apply both basic and advanced criteria using Scale's internal helpers
    function applySavedFilters(savedFilters, explicitFilterName) {
        // Applying saved filters using Scale's internal functions (log removed)

        // Make sure the search pane is visible
        clickSearchButtonIfNeeded();

        // Inject relative date adjustments if applicable
        try {
            const formId = (typeof getFormIdFromUrl === 'function' ? getFormIdFromUrl() : null) || (window.location.pathname.match(/insights\/(\d+)/) || [])[1];
            let filterName = explicitFilterName;
            if (!filterName) {
                // Try pendingFilter hash
                if (location.hash.includes('pendingFilter=')) {
                    try { filterName = decodeURIComponent(location.hash.split('pendingFilter=')[1].split('&')[0]); } catch(_){}
                }
                // Fallback to default filter if none
                if (!filterName && typeof getDefaultFilter === 'function' && formId) {
                    filterName = getDefaultFilter(formId);
                }
            }
            adjustRelativeDates(savedFilters, formId, filterName);
        } catch(e){ console.warn('[ScalePlus] Relative date adjust failed', e); }

        // Apply basic filters (simple editors, date pickers, combos, etc.)
        if (savedFilters.inSearch &&
            _webUi &&
            _webUi.insightSearchPaneActions &&
            typeof _webUi.insightSearchPaneActions.applyInputFilterCriteria === 'function') {
            // Applying basic filters (log removed)
            _webUi.insightSearchPaneActions.applyInputFilterCriteria(savedFilters.inSearch);
        } else {
            // Cannot apply basic filters - missing function or data (log removed)
        }

        // Apply toggle filters manually
        if (Array.isArray(savedFilters.togSearch)) {
            // Applying toggle filters (log removed)
            savedFilters.togSearch.forEach(tog => {
                const el = document.getElementById(tog.name);
                if (el && typeof $(el).bootstrapToggle === 'function') {
                    // Setting toggle (log removed)
                    $(el).bootstrapToggle(tog.value ? 'on' : 'off');
                }
            });
        }

        // Apply combo-checked-list filters
        applyComboFilters(savedFilters.comboChkbxSearch);

        // Apply advanced criteria correctly
        applyAdvancedCriteria(savedFilters, extractFormIdFromUrl(location.href));

        // You intentionally **do not** call the internal searchButtonClicked() here,
        // because you want to set the filters without running the search.
    }

    // Replace clear filters button functionality
    function enhanceClearFiltersButton() {
        const clearBtn = document.querySelector('#InsightMenuActionClearFilters');
        if (clearBtn && !clearBtn.hasAttribute('data-enhanced')) {
            clearBtn.setAttribute('data-enhanced', 'true');
            // Enhanced clear filters button (log removed)

            // Store original click handler
            const originalOnclick = clearBtn.onclick;

            // Add our enhanced click handler
            clearBtn.addEventListener('click', function(e) {
                // Clear filters clicked - will apply default filter after clearing (log removed)

                // Apply default filter after a delay to let the clear operation complete
                setTimeout(() => {
                    const formId = getFormIdFromUrl();
                    if (formId && isDefaultFilterEnabled()) {
                        const defaultFilter = getDefaultFilter(formId);
                        // Don't apply default filter if there's still a pending filter that hasn't been processed
                        // or if a pending filter was just processed
                        const hasPendingFilter = location.hash.includes('pendingFilter=');
                        if (defaultFilter && !hasPendingFilter && !hasProcessedPendingFilter) {
                            // Applying default filter after clear (log removed)
                            fetchSavedFilter(defaultFilter)
                                .then(savedFilters => {
                                    // Applying default filter after clear (log removed)
                                    applySavedFilters(savedFilters);
                                })
                                .catch(err => {
                                    console.warn('[ScalePlus] Failed to fetch or apply saved filter after clear:', err);
                                });
                        } else if (hasPendingFilter) {
                            // Skipping default filter application after clear - pending filter exists (log removed)
                        } else if (hasProcessedPendingFilter) {
                            // Skipping default filter application after clear - pending filter was just processed (log removed)
                        }
                    }
                }, 10); // Wait 10ms for clear to complete
            });
        }
    }

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

    // Set up the clear filters observer
    setupClearFiltersObserver();

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

    // ===== RIGHT-CLICK CONTEXT MENU SYSTEM =====

    // Create context menu styles
    const contextMenuStyles = `
        .scaleplus-context-menu {
            position: fixed;
            background: #fff;
            border: 1px solid #ccc;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 100000;
            min-width: 150px;
            padding: 4px 0;
            font-family: Arial, sans-serif;
            font-size: 14px;
            pointer-events: auto;
        }
        .scaleplus-context-menu-item {
            display: flex;
            align-items: center;
            padding: 8px 12px;
            cursor: pointer;
            color: #333;
            text-decoration: none;
            border: none;
            background: none;
            width: 100%;
            text-align: left;
            font-size: 14px;
        }
        .scaleplus-context-menu-item:hover {
            background-color: #f5f5f5;
        }
        .scaleplus-context-menu-item:active {
            background-color: #e8e8e8;
        }
        .scaleplus-context-menu-item.disabled {
            color: #999;
            cursor: not-allowed;
        }
        .scaleplus-context-menu-item.disabled:hover {
            background-color: transparent;
        }
        .scaleplus-context-menu-icon {
            margin-right: 8px;
            width: 16px;
            height: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
        }
        .scaleplus-context-menu-separator {
            height: 1px;
            background-color: #e0e0e0;
            margin: 4px 0;
        }
    `;

    // Add styles to document
    if (!document.getElementById('scaleplus-context-menu-styles')) {
        const style = document.createElement('style');
        style.id = 'scaleplus-context-menu-styles';
        style.textContent = contextMenuStyles;
        document.head.appendChild(style);
    }

    // ===== DARK MODE STYLES =====
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

    // Context menu class
    class ScalePlusContextMenu {
        constructor() {
            this.menu = null;
            this.currentTarget = null;
            this.createMenu();
            this.attachGlobalHandlers();
        }

        createMenu() {
            this.menu = document.createElement('div');
            this.menu.className = 'scaleplus-context-menu';
            this.menu.style.display = 'none';
            document.body.appendChild(this.menu);
        }

        attachGlobalHandlers() {
            // Hide menu on click outside
            document.addEventListener('click', (e) => {
                if (!this.menu.contains(e.target)) {
                    this.hide();
                }
            });

            // Hide menu on escape
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hide();
                }
            });

            // Prevent context menu on our custom menu
            this.menu.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }

        show(x, y, items, target = null) {
            this.currentTarget = target;
            this.menu.innerHTML = '';

            items.forEach(item => {
                if (item.separator) {
                    const separator = document.createElement('div');
                    separator.className = 'scaleplus-context-menu-separator';
                    this.menu.appendChild(separator);
                    return;
                }

                const menuItem = document.createElement('button');
                menuItem.className = 'scaleplus-context-menu-item';
                if (item.disabled) {
                    menuItem.classList.add('disabled');
                }

                // Add icon if provided
                if (item.icon) {
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'scaleplus-context-menu-icon';
                    if (item.icon.includes(' ')) {
                        // Handle icons with prefixes like "fas fa-star"
                        iconSpan.innerHTML = `<i class="${item.icon}"></i>`;
                    } else if (item.icon.startsWith('fa-')) {
                        iconSpan.innerHTML = `<i class="fa ${item.icon}"></i>`;
                    } else if (item.icon.startsWith('glyphicon-')) {
                        iconSpan.innerHTML = `<span class="glyphicon ${item.icon}"></span>`;
                    } else {
                        iconSpan.textContent = item.icon;
                    }
                    menuItem.appendChild(iconSpan);
                }

                // Add text
                const textSpan = document.createElement('span');
                textSpan.textContent = item.label;
                menuItem.appendChild(textSpan);

                // Add click handler
                if (!item.disabled && item.action) {
                    menuItem.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.action(this.currentTarget);
                        this.hide();
                    });
                }

                this.menu.appendChild(menuItem);
            });

        // Position menu at cursor with better viewport handling
        const menuX = Math.max(10, Math.min(x, window.innerWidth - 200));
        const menuY = Math.max(10, Math.min(y, window.innerHeight - 100));

        this.menu.style.left = `${menuX}px`;
        this.menu.style.top = `${menuY}px`;
        this.menu.style.display = 'block';

        // Force a reflow to ensure positioning is applied
        this.menu.offsetHeight;

        // Adjust position if menu goes off screen after display
        const rect = this.menu.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (rect.right > viewportWidth) {
            this.menu.style.left = `${Math.max(10, viewportWidth - rect.width - 10)}px`;
        }
        if (rect.bottom > viewportHeight) {
            this.menu.style.top = `${Math.max(10, viewportHeight - rect.height - 10)}px`;
        }
        }

        hide() {
            if (this.menu) {
                this.menu.style.display = 'none';
            }
            this.currentTarget = null;
        }
    }

    // Create global context menu instance
    const contextMenu = new ScalePlusContextMenu();

    // ===== RIGHT-CLICK HANDLERS =====

    // Right-click handler for results grid
    function handleGridRightClick(e) {
        if (e.button !== 2) return; // Only right-click

        // Check if right-click menu is enabled
        const enabled = localStorage.getItem(SETTINGS.RIGHT_CLICK_MENU) !== 'false';
        if (!enabled) return;

        // Check if this is a grid item (similar to middle click logic)
        let el = e.target;
        while (el && (!el.getAttribute || !el.getAttribute('aria-describedby') || !el.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
            el = el.parentElement;
        }

        if (!el) return; // Not a grid item

        e.preventDefault();

        // Capture the original event coordinates for the copy function
        const originalX = e.pageX;
        const originalY = e.pageY;

        const menuItems = [
            {
                label: 'Copy',
                icon: 'fas fa-copy',
                action: (target) => {
                    // Create a synthetic event object for copyInnerText
                    const syntheticEvent = {
                        target: target,
                        pageX: originalX,
                        pageY: originalY,
                        preventDefault: () => {}
                    };
                    copyInnerText(syntheticEvent);
                }
            }
        ];

        contextMenu.show(e.pageX, e.pageY, menuItems, el);
    }



    // Right-click handler for favorites
    function handleFavoritesRightClick(e) {
        if (e.button !== 2) return; // Only right-click

        // Check if right-click menu is enabled
        const enabled = localStorage.getItem(SETTINGS.RIGHT_CLICK_MENU) !== 'false';
        if (!enabled) return;

        // Check if this is a favorite item
        let target = e.target;
        let favoriteLink = null;

        while (target && target !== document.body) {
            if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                favoriteLink = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                break;
            }
            target = target.parentElement;
        }

        if (!favoriteLink) return; // Not a favorite item

        e.preventDefault();

        const filterText = favoriteLink.querySelector('.deletesavedsearchtext')?.textContent?.trim();
        if (!filterText) return;

        const formId = getFormIdFromUrl();
        const currentDefault = getDefaultFilter(formId);
        const isDefault = currentDefault === filterText;
        const isDefaultFilterEnabled = localStorage.getItem(SETTINGS.DEFAULT_FILTER) !== 'false';

        const menuItems = [
            {
                label: 'Open in New Tab',
                icon: 'fas fa-external-link',
                action: (target) => {
                    // Same logic as middle click for favorites
                    const baseUrl = `${location.origin}${location.pathname}`;
                    const url = `${baseUrl}#pendingFilter=${encodeURIComponent(filterText)}`;
                    const newTab = window.open(url, '_blank');
                    if (newTab) {
                        newTab.blur();
                        window.focus();
                    }
                }
            }
        ];

        // Only add default filter options if the feature is enabled
        if (isDefaultFilterEnabled) {
            menuItems.push({ separator: true });
            menuItems.push({
                label: isDefault ? 'Remove Default' : 'Set as Default',
                icon: isDefault ? 'far fa-star' : 'fas fa-star',
                action: (target) => {
                    if (isDefault) {
                        clearDefaultFilter(formId);
                    } else {
                        setDefaultFilter(formId, filterText);
                    }
                    // Update star icons immediately
                    setTimeout(() => {
                        updateFavoritesStarIcon();
                        // Force refresh of individual star icons
                        const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                        savedSearchItems.forEach(item => {
                            const itemFilterText = item.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                            if (itemFilterText) {
                                const existingIcon = item.querySelector('.scaleplus-default-icon');
                                if (existingIcon) {
                                    const newDefault = getDefaultFilter(formId);
                                    const isNowDefault = newDefault === itemFilterText;
                                    existingIcon.className = `scaleplus-default-icon navbar-right glyphicon ${isNowDefault ? 'glyphicon-star' : 'glyphicon-star-empty'}`;
                                    existingIcon.style.color = isNowDefault ? '#f1c40f' : '#ccc';
                                }
                            }
                        });
                    }, 100);
                }
            });
        }

        menuItems.push({
            label: 'Delete',
            icon: 'fas fa-trash',
            action: (target) => {
                // Click the delete button
                const deleteBtn = favoriteLink.querySelector('.deletesavedsearchbutton');
                if (deleteBtn) {
                    deleteBtn.click();
                }
            }
        });

        contextMenu.show(e.pageX, e.pageY, menuItems, favoriteLink);
    }

    // Attach right-click handlers
    document.addEventListener('contextmenu', (e) => {
        // Try favorites
        if (!e.defaultPrevented) {
            handleFavoritesRightClick(e);
        }

        // If not handled by favorites, try grid
        if (!e.defaultPrevented) {
            handleGridRightClick(e);
        }
    });

    // Add tooltips to menu buttons
    function addMenuTooltips() {
        const tooltips = {
            'InsightMenuApply': 'Apply search',
            'InsightMenuActionStopSearch': 'Stop search',
            'InsightMenuActionClearFilters': 'Clear filters',
            'InsightMenuActionSaveSearch': 'Save search',
            'InsightMenuActionToggleSummary': 'Toggle summary',
            'InsightMenuActionToggleGroupBy': 'Toggle group by',
            'InsightMenuActionCollapse': 'Collapse groups',
            'MenuExportToExcel': 'Export to Excel',
            'InsightMenuFavoritesDropdown': 'Favorites'
        };

        // Set tooltips for buttons
        Object.entries(tooltips).forEach(([id, tooltip]) => {
            const element = document.getElementById(id);
            if (element) {
                element.title = tooltip;
                // Also set tooltip on the link inside if it exists
                const link = element.querySelector('a');
                if (link) {
                    link.title = tooltip;
                }
            }
        });
    }

    // Add tooltips to navigation bar elements
    function addNavigationTooltips() {
        // Only target main navigation trigger elements, not dropdown items
        const navElements = [
            { selector: '#menutoggle', tooltip: 'Main menu' },
            { selector: '#portraitmenu-toggle', tooltip: 'Main menu' },
            { selector: '#goToHomePage a', tooltip: 'Go to home page' },
            { selector: '#navHistory a.dropdown-toggle', tooltip: 'Navigation history' },
            { selector: '#navHelp a.dropdown-toggle', tooltip: 'Help and documentation' },
            { selector: '#navUser a.dropdown-toggle', tooltip: 'User menu' },
            { selector: 'a[data-toggle="search"]', tooltip: 'Toggle search pane' },
            { selector: 'a[data-toggle="detailpane"]', tooltip: 'Toggle detail pane' },
            { selector: '.navbarWhs a.dropdown-toggle', tooltip: 'Select warehouse' }
        ];

        // Set tooltips for main navigation elements only
        navElements.forEach(({ selector, tooltip }) => {
            const element = document.querySelector(selector);
            if (element && !element.closest('.dropdown-menu')) {
                element.title = tooltip;
            }
        });
    }

    // Add tooltips when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            addMenuTooltips();
            addNavigationTooltips();
        });
    } else {
        addMenuTooltips();
        addNavigationTooltips();
    }

    // Initialize dark mode on page load
    function initializeDarkMode() {
        const darkModeEnabled = localStorage.getItem(SETTINGS.DARK_MODE) === 'true';
        if (darkModeEnabled) {
            document.body.classList.add('scaleplus-dark-mode');
            console.log('[ScalePlus] Dark mode applied on page load');
        }
    }

    // Apply dark mode immediately
    initializeDarkMode();

    // Also add tooltips when menu is dynamically loaded
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.id === 'InsightMenu') {
                            setTimeout(addMenuTooltips, 100);
                        }
                        if (node.id === 'topNavigationBar') {
                            setTimeout(addNavigationTooltips, 100);
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

})();
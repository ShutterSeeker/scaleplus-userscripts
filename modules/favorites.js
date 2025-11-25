// ==UserScript==
// @name         ScalePlus Favorites Module
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Default filter favorites management
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    window.ScalePlusFavorites = {
        hasAutoApplied: false,
        hasLoggedNoDefault: false,
        hasProcessedPendingFilter: false,

        init() {
            console.log('[ScalePlus Favorites] Module initialized');
            this.injectStyles();
            this.setupObservers();
            this.cleanupOldCache();
            this.monitorFavoriteDeletions();
            this.checkForAutoApply();
            this.checkForPendingFilter();
            this.updateFavoritesStarIcon();
            
            // Setup event listeners for DOMContentLoaded and load
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.checkForAutoApply();
                    this.checkForPendingFilter();
                    this.updateFavoritesStarIcon();
                });
            }
            
            window.addEventListener('load', () => {
                setTimeout(() => {
                    this.checkForAutoApply();
                    this.checkForPendingFilter();
                    this.updateFavoritesStarIcon();
                }, 100);
            });
        },

        isEnabled() {
            return window.ScalePlusSettings?.isEnabled(window.ScalePlusSettings.SETTINGS.DEFAULT_FILTER) ?? true;
        },

        getUsernameFromCookie() {
            const allCookies = document.cookie;
            const cookie = allCookies.split('; ').find(row => row.startsWith('UserInformation='));
            if (!cookie) return '';
            const value = decodeURIComponent(cookie.substring(cookie.indexOf('=') + 1));
            const match = value.match(/(?:^|&)UserName=([^&]*)/);
            return match ? match[1] : '';
        },

        getDefaultFilterKey(formId) {
            const username = this.getUsernameFromCookie();
            return `${formId}DefaultFilter${username}`;
        },

        setDefaultFilter(formId, filterText) {
            const key = this.getDefaultFilterKey(formId);
            const username = this.getUsernameFromCookie();
            localStorage.setItem(key, filterText);
            console.log(`[ScalePlus Favorites] Set default filter for form ${formId} and user ${username}: ${filterText}`);
            this.updateFavoritesStarIcon();
        },

        getDefaultFilter(formId) {
            const key = this.getDefaultFilterKey(formId);
            return localStorage.getItem(key);
        },

        clearDefaultFilter(formId) {
            const key = this.getDefaultFilterKey(formId);
            const username = this.getUsernameFromCookie();
            localStorage.removeItem(key);
            console.log(`[ScalePlus Favorites] Cleared default filter for form ${formId} and user ${username}`);
            this.updateFavoritesStarIcon();
        },

        updateFavoritesStarIcon() {
            const formId = window.ScalePlusUtilities?.getFormIdFromUrl();
            if (!formId) {
                console.log(`[ScalePlus Favorites] No form ID found, skipping star icon update`);
                return;
            }

            const hasDefaultFilter = !!this.getDefaultFilter(formId);
            const isFeatureEnabled = this.isEnabled();
            const starIcon = document.querySelector('#InsightMenuFavoritesDropdown .fas.fa-star.starIcon');

            if (starIcon) {
                const shouldBeYellow = hasDefaultFilter && isFeatureEnabled;
                const currentColor = starIcon.style.color;
                const isCurrentlyYellow = currentColor === '#f1c40f' || currentColor === 'rgb(241, 196, 15)';

                if (shouldBeYellow && !isCurrentlyYellow) {
                    starIcon.style.color = '#f1c40f';
                    console.log(`[ScalePlus Favorites] Star set to yellow - default filter active for form ${formId}`);
                } else if (!shouldBeYellow && isCurrentlyYellow) {
                    starIcon.style.color = '';
                    console.log(`[ScalePlus Favorites] Star reset to default for form ${formId}`);
                }
            }
        },

        injectStyles() {
            if (document.getElementById('scaleplus-dropdown-styles')) return;
            
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
        },

        addDefaultFilterIcons() {
            if (!this.isEnabled()) return;

            const formId = window.ScalePlusUtilities?.getFormIdFromUrl();
            if (!formId) return;

            const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
            const currentDefault = this.getDefaultFilter(formId);

            savedSearchItems.forEach(item => {
                if (item.querySelector('.scaleplus-default-icon')) return;

                const filterText = item.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                if (!filterText) return;

                const defaultIcon = document.createElement('span');
                defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon';
                defaultIcon.title = 'Click to set as default filter';
                defaultIcon.style.cssText = `
                    cursor: pointer;
                    margin-right: 8px;
                    color: ${currentDefault === filterText ? '#f1c40f' : '#ccc'};
                    font-size: 16px;
                    padding: 2px;
                    vertical-align: middle;
                    flex-shrink: 0;
                `;

                defaultIcon.classList.add(currentDefault === filterText ? 'glyphicon-star' : 'glyphicon-star-empty');

                defaultIcon.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const currentDefaultNow = this.getDefaultFilter(formId);

                    if (currentDefaultNow === filterText) {
                        this.clearDefaultFilter(formId);
                        defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star-empty';
                        defaultIcon.style.color = '#ccc';
                        defaultIcon.style.verticalAlign = 'middle';
                    } else {
                        this.setDefaultFilter(formId, filterText);
                        defaultIcon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star';
                        defaultIcon.style.color = '#f1c40f';
                        defaultIcon.style.verticalAlign = 'middle';

                        document.querySelectorAll('.scaleplus-default-icon').forEach(icon => {
                            if (icon !== defaultIcon) {
                                icon.className = 'scaleplus-default-icon navbar-right glyphicon glyphicon-star-empty';
                                icon.style.color = '#ccc';
                                icon.style.verticalAlign = 'middle';
                            }
                        });
                    }
                });

                const deleteBtn = item.querySelector('.deletesavedsearchbutton');
                if (deleteBtn) {
                    deleteBtn.title = 'Click to delete this favorite';
                    deleteBtn.parentNode.insertBefore(defaultIcon, deleteBtn);
                    deleteBtn.style.flexShrink = '0';
                    deleteBtn.style.marginLeft = '25px';

                    const textSpan = item.querySelector('.deletesavedsearchtext');
                    if (textSpan) {
                        textSpan.style.removeProperty('width');
                        textSpan.style.removeProperty('max-width');
                    }
                }
            });
        },

        setupObservers() {
            const observer = new MutationObserver((mutations) => {
                let shouldCheck = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
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
                if (shouldCheck && this.isEnabled()) {
                    setTimeout(() => this.addDefaultFilterIcons(), 100);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
            
            // Initial call
            this.addDefaultFilterIcons();
        },

        cleanupOldCache() {
            const currentSettingsKeys = Object.values(window.ScalePlusSettings?.SETTINGS || {});
            const knownKeys = new Set([
                ...currentSettingsKeys,
                'scaleplus_env_qa_name',
                'scaleplus_env_prod_name'
            ]);

            let cleanedCount = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.includes('scaleplus') && !knownKeys.has(key)) {
                    if (!key.includes('DefaultFilter')) {
                        localStorage.removeItem(key);
                        cleanedCount++;
                    }
                }
            }

            if (cleanedCount > 0) {
                console.log(`[ScalePlus Favorites] Cleaned up ${cleanedCount} old cache entries`);
            }
        },

        monitorFavoriteDeletions() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList') {
                        mutation.removedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                const deletedFavorite = node.querySelector('.deletesavedsearchtext');
                                if (deletedFavorite) {
                                    const filterName = deletedFavorite.textContent?.trim();
                                    if (filterName) {
                                        this.cleanupDeletedFavoriteCache(filterName);
                                    }
                                }
                            }
                        });
                    }
                });
            });

            const favoritesDropdown = document.querySelector('#InsightMenuFavoritesDropdown');
            if (favoritesDropdown) {
                observer.observe(favoritesDropdown, { childList: true, subtree: true });
            }
        },

        cleanupDeletedFavoriteCache(deletedFilterName) {
            const username = this.getUsernameFromCookie();
            
            setTimeout(() => {
                const allFavorites = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"] .deletesavedsearchtext');
                const stillExists = Array.from(allFavorites).some(item => item.textContent?.trim() === deletedFilterName);
                
                if (stillExists) {
                    console.log(`[ScalePlus Favorites] False alarm - "${deletedFilterName}" still exists`);
                    return;
                }
                
                let cleanedCount = 0;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.includes('DefaultFilter') && key.includes(username)) {
                        const storedFilterName = localStorage.getItem(key);
                        if (storedFilterName === deletedFilterName) {
                            localStorage.removeItem(key);
                            cleanedCount++;
                            console.log(`[ScalePlus Favorites] Cleaned up default filter cache for deleted favorite: ${deletedFilterName}`);
                        }
                    }
                }

                if (cleanedCount > 0) {
                    setTimeout(() => this.updateFavoritesStarIcon(), 100);
                }
            }, 1000);
        },

        fetchSavedFilter(defaultFilterName) {
            return new Promise((resolve, reject) => {
                if (!window._webUi || !window._webSession) {
                    reject('Scale web objects not available');
                    return;
                }

                const screenPartId = _webUi.insightSearchPaneActions.getSearchPartId();
                const username = _webSession.UserName();
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
        },

        applySavedFilters(savedFilters, explicitFilterName) {
            window.ScalePlusSearchPane?.clickSearchButtonIfNeeded();

            if (savedFilters.inSearch && window._webUi?.insightSearchPaneActions?.applyInputFilterCriteria) {
                _webUi.insightSearchPaneActions.applyInputFilterCriteria(savedFilters.inSearch);
            }

            if (Array.isArray(savedFilters.togSearch)) {
                savedFilters.togSearch.forEach(tog => {
                    const el = document.getElementById(tog.name);
                    if (el && typeof $(el).bootstrapToggle === 'function') {
                        $(el).bootstrapToggle(tog.value ? 'on' : 'off');
                    }
                });
            }

            // Apply combo filters if available
            if (savedFilters.comboChkbxSearch && window._webUi) {
                this.applyComboFilters(savedFilters.comboChkbxSearch);
            }

            // Apply advanced criteria if available
            if (savedFilters.advSearch && window._webUi) {
                this.applyAdvancedCriteria(savedFilters, window.ScalePlusUtilities?.extractFormIdFromUrl(location.href));
            }
        },

        applyComboFilters(comboFilters) {
            const allMultiSelectCombos = $('[data-controltype="igComboMultiSelectWithCheckBox"]');
            allMultiSelectCombos.each(function () {
                const wrapper = $(this);
                const comboId = wrapper.attr('id');
                if (comboId) {
                    const comboEl = $('#' + comboId);
                    if (comboEl.length && comboEl.data('igCombo')) {
                        comboEl.igCombo('value', []);
                    }
                }
            });

            if (!comboFilters) return;
            comboFilters.forEach(combo => {
                const values = Array.isArray(combo.value) ? combo.value : [];
                if (values.length > 0) {
                    const el = $('#' + combo.name);
                    if (el.length && el.data('igCombo')) {
                        el.igCombo('value', values);
                    }
                }
            });
        },

        applyAdvancedCriteria(savedFilters, formId) {
            if (!savedFilters.advSearch || !Array.isArray(savedFilters.advSearch)) return;

            const adv = savedFilters.advSearch[0];
            const gridId = adv.name || 'SearchPaneAdvCritAdvCritGrid';
            const records = (adv.value && adv.value.Records) ? adv.value.Records : [];

            const grid = $('#' + gridId);
            if (grid.data('igGrid')) {
                try {
                    const rows = grid.igGrid('rows');
                    rows.each(function () {
                        const rowId = $(this).attr('data-id');
                        grid.igGridUpdating('deleteRow', rowId);
                    });
                } catch (err) {
                    try {
                        grid.igGrid('option', 'dataSource', { Records: [] });
                    } catch (err2) {
                        console.warn('[ScalePlus Favorites] Could not reset data source:', err2);
                    }
                }
            }

            if (records.length > 0 && window._webUi?.insightSearchPaneActions) {
                setTimeout(() => {
                    if (typeof _webUi.insightSearchPaneActions.applyInputAdvanceFilterCriteria === 'function') {
                        _webUi.insightSearchPaneActions.applyInputAdvanceFilterCriteria(
                            records,
                            formId || window.ScalePlusUtilities?.extractFormIdFromUrl(location.href)
                        );
                    }
                }, 50);
            }
        },

        checkForAutoApply() {
            const hasQueryFilters = location.search.includes('filters=');
            const hasHashFilters = location.hash.includes('filters=');
            const hasPendingFilter = location.hash.includes('pendingFilter=');

            if (location.pathname.includes('/insights/') && !hasQueryFilters && !hasHashFilters && !hasPendingFilter && !this.hasProcessedPendingFilter) {
                const formId = window.ScalePlusUtilities?.extractFormIdFromUrl(location.href);
                if (formId) {
                    const defaultFilter = this.getDefaultFilter(formId);
                    if (defaultFilter) {
                        const username = this.getUsernameFromCookie();
                        console.log(`[ScalePlus Favorites] Looking for default filter: ${defaultFilter} for user ${username}`);

                        this.fetchSavedFilter(defaultFilter)
                            .then(savedFilters => {
                                console.log(`[ScalePlus Favorites] Applying default filter: ${defaultFilter}`);
                                this.applySavedFilters(savedFilters);
                            })
                            .catch(err => {
                                console.warn('[ScalePlus Favorites] Failed to fetch or apply saved filter:', err);
                            });

                        return true;
                    }
                }
            }
            return false;
        },

        checkForPendingFilter() {
            if (!location.hash.includes('pendingFilter=')) return;

            let filterName;
            try {
                filterName = decodeURIComponent(location.hash.split('pendingFilter=')[1].split('&')[0]);
            } catch (e) {
                console.warn('[ScalePlus Favorites] Could not parse pending filter from hash:', e);
                return;
            }

            if (!filterName || this.hasProcessedPendingFilter) return;

            console.log('[ScalePlus Favorites] Pending filter detected:', filterName);

            let retryCount = 0;
            const maxRetries = 10;

            const clickPendingFilter = () => {
                const formId = window.ScalePlusUtilities?.getFormIdFromUrl();
                if (!formId) {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        setTimeout(clickPendingFilter, 500);
                    }
                    return;
                }

                const findAndClickFavorite = () => {
                    const favoriteLinks = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');

                    for (const link of favoriteLinks) {
                        const linkText = link.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                        if (linkText === filterName) {
                            setTimeout(() => {
                                this.fetchSavedFilter(filterName).then(sf => {
                                    this.applySavedFilters(sf, filterName);
                                    const applyBtn = document.getElementById('InsightMenuApply');
                                    if (applyBtn && window.ScalePlusUtilities?.isVisible(applyBtn)) {
                                        applyBtn.click();
                                    }
                                    this.hasProcessedPendingFilter = true;
                                }).catch(err => console.warn('[ScalePlus Favorites] Failed to fetch pending filter', err));
                            }, 800);
                            return;
                        }
                    }

                    retryCount++;
                    if (retryCount < maxRetries) {
                        setTimeout(clickPendingFilter, favoriteLinks.length > 0 ? 500 : 1000);
                    } else {
                        this.fetchSavedFilter(filterName).then(sf => {
                            this.applySavedFilters(sf, filterName);
                            const applyBtn = document.getElementById('InsightMenuApply');
                            if (applyBtn && window.ScalePlusUtilities?.isVisible(applyBtn)) {
                                applyBtn.click();
                            }
                        }).catch(err => console.warn('[ScalePlus Favorites] Failed to fetch pending filter', err));
                    }
                };

                findAndClickFavorite();
            };

            clickPendingFilter();
        }
    };

    // Initialize favorites module
    window.ScalePlusFavorites.init();
})();

// ==UserScript==
// @name         ScalePlus Tooltips Module
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Tooltip system for menu and navigation elements
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

    window.ScalePlusTooltips = {
        init() {
            if (!isScalePage()) {
                console.log('[ScalePlus Tooltips] Not on Scale page, skipping initialization');
                return;
            }
            console.log('[ScalePlus Tooltips] Module initialized');
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.addMenuTooltips();
                    this.addNavigationTooltips();
                });
            } else {
                this.addMenuTooltips();
                this.addNavigationTooltips();
            }

            this.setupObserver();
        },

        addMenuTooltips() {
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

            Object.entries(tooltips).forEach(([id, tooltip]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.title = tooltip;
                    const link = element.querySelector('a');
                    if (link) {
                        link.title = tooltip;
                    }
                }
            });
        },

        addNavigationTooltips() {
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

            navElements.forEach(({ selector, tooltip }) => {
                const element = document.querySelector(selector);
                if (element && !element.closest('.dropdown-menu')) {
                    element.title = tooltip;
                }
            });
        },

        setupObserver() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                                if (node.id === 'InsightMenu') {
                                    setTimeout(() => this.addMenuTooltips(), 100);
                                }
                                if (node.id === 'topNavigationBar') {
                                    setTimeout(() => this.addNavigationTooltips(), 100);
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
        }
    };

    // Initialize tooltips module
    window.ScalePlusTooltips.init();
})();

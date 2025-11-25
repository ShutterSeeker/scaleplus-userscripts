// ==UserScript==
// @name         ScalePlus Advanced Criteria Module
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Advanced criteria counter and enhancements
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

    window.ScalePlusAdvancedCriteria = {
        gridColumnsModified: false,

        init() {
            if (!isScalePage()) {
                console.log('[ScalePlus Advanced Criteria] Not on Scale page, skipping initialization');
                return;
            }
            console.log('[ScalePlus Advanced Criteria] Module initialized');
            
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setupAdvancedCriteriaObserver());
            } else {
                this.setupAdvancedCriteriaObserver();
            }
        },

        updateAdvancedCriteriaCount() {
            if (!window.ScalePlusSettings) return;
            
            const isEnabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.ADV_CRITERIA_ENHANCEMENT);
            if (!isEnabled) return;

            const headers = document.querySelectorAll('h3.ui-accordion-header');
            let advancedHeader = null;

            headers.forEach(header => {
                const link = header.querySelector('a[data-resourcekey="ADVANCEDCRITERIA"]');
                if (link) {
                    advancedHeader = header;
                }
            });

            if (!advancedHeader) return;

            const grid = $('#SearchPaneAdvCritAdvCritGrid');
            let count = 0;

            if (grid.length && grid.data('igGrid')) {
                try {
                    const dataSource = grid.igGrid('option', 'dataSource');
                    if (dataSource && dataSource.Records) {
                        count = dataSource.Records.length;
                    } else {
                        count = grid.find('tbody tr').length;
                    }
                } catch (err) {
                    console.warn('[ScalePlus Advanced Criteria] Could not get count from grid:', err);
                    count = grid.find('tbody tr').length;
                }
            }

            const link = advancedHeader.querySelector('a[data-resourcekey="ADVANCEDCRITERIA"]');
            if (link) {
                const baseText = link.getAttribute('data-resourcevalue') || 'Advanced criteria';
                link.textContent = count > 0 ? `${baseText} (${count})` : baseText;
            }
        },

        modifyGridColumns() {
            const $grid = $('#SearchPaneAdvCritAdvCritGrid');
            if (!$grid.length || !$grid.data('igGrid')) return;

            try {
                if (!window.ScalePlusSettings) return;
                
                const isEnabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.ADV_CRITERIA_ENHANCEMENT);
                const columns = $grid.igGrid('option', 'columns');

                const conditionColumn = columns.find(col => col.key === 'Condition');
                if (conditionColumn) {
                    conditionColumn.hidden = !isEnabled;
                    conditionColumn.headerText = 'Condition';
                    conditionColumn.width = '14%';

                    conditionColumn.formatter = function (val) {
                        if (val && typeof val === 'string') {
                            const upperVal = val.toUpperCase();
                            if (upperVal.includes('AND')) return 'AND';
                            if (upperVal.includes('OR')) return 'OR';
                            return val;
                        }
                        return val || '';
                    };

                    const fieldColumn = columns.find(col => col.key === 'Field');
                    const operandColumn = columns.find(col => col.key === 'Operand');
                    const valueColumn = columns.find(col => col.key === 'Value');

                    if (isEnabled) {
                        if (fieldColumn) fieldColumn.width = '30%';
                        if (operandColumn) operandColumn.width = '15%';
                        if (valueColumn) valueColumn.width = '30%';
                    } else {
                        if (fieldColumn) fieldColumn.width = '40%';
                        if (operandColumn) operandColumn.width = '20%';
                        if (valueColumn) valueColumn.width = '40%';
                    }

                    $grid.igGrid('option', 'columns', columns);
                    $grid.igGrid('dataBind');

                    if (!this.gridColumnsModified) {
                        console.log('[ScalePlus Advanced Criteria] Modified grid to show condition column');
                        this.gridColumnsModified = true;
                    }
                }
            } catch (err) {
                console.warn('[ScalePlus Advanced Criteria] Could not modify grid columns:', err);
            }
        },

        setupAdvancedCriteriaObserver() {
            if (!window.ScalePlusSettings) {
                console.warn('[ScalePlus Advanced Criteria] Settings module not loaded');
                return;
            }

            const isEnabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.ADV_CRITERIA_ENHANCEMENT);
            if (!isEnabled) return;

            const grid = document.getElementById('SearchPaneAdvCritAdvCritGrid');
            if (!grid) return;

            this.updateAdvancedCriteriaCount();
            this.modifyGridColumns();

            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.target.tagName === 'TBODY') {
                        shouldUpdate = true;
                    }
                });
                if (shouldUpdate) {
                    this.updateAdvancedCriteriaCount();
                }
            });

            const tbody = grid.querySelector('tbody');
            if (tbody) {
                observer.observe(tbody, {
                    childList: true,
                    subtree: true
                });
            }

            observer.observe(grid, {
                childList: true,
                subtree: true,
                attributes: true
            });

            console.log('[ScalePlus Advanced Criteria] Observer set up');
        }
    };

    // Initialize advanced criteria module
    window.ScalePlusAdvancedCriteria.init();
})();

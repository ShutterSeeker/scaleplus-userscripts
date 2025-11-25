// ==UserScript==
// @name         ScalePlus Context Menu Module
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Right-click context menu system
// @author       Blake, Nash
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    class ScalePlusContextMenuClass {
        constructor() {
            this.menu = null;
            this.currentTarget = null;
        }

        init() {
            console.log('[ScalePlus Context Menu] Module initialized');
            this.injectStyles();
            this.createMenu();
            this.attachGlobalHandlers();
            this.attachRightClickHandlers();
        }

        injectStyles() {
            if (document.getElementById('scaleplus-context-menu-styles')) return;

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
                
                /* Dark mode styles for context menu */
                body.scaleplus-dark-mode .scaleplus-context-menu {
                    background: #2a2a2a !important;
                    border: 1px solid #3a3a3a !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4) !important;
                }
                body.scaleplus-dark-mode .scaleplus-context-menu-item {
                    color: #e0e0e0 !important;
                }
                body.scaleplus-dark-mode .scaleplus-context-menu-item:hover {
                    background-color: #3a3a3a !important;
                }
                body.scaleplus-dark-mode .scaleplus-context-menu-item:active {
                    background-color: #4a4a4a !important;
                }
                body.scaleplus-dark-mode .scaleplus-context-menu-item.disabled {
                    color: #666 !important;
                }
                body.scaleplus-dark-mode .scaleplus-context-menu-item.disabled:hover {
                    background-color: transparent !important;
                }
                body.scaleplus-dark-mode .scaleplus-context-menu-separator {
                    background-color: #3a3a3a !important;
                }
                
                /* Right-click cell highlight - normal and hover states */
                #ListPaneDataGrid td.scaleplus-context-highlight,
                #ListPaneDataGrid tr:hover td.scaleplus-context-highlight {
                    box-shadow: inset 0 0 0 2px #4f93e4 !important;
                    background-color: rgba(79, 147, 228, 0.2) !important;
                    position: relative !important;
                }
                
                /* Right-click cell highlight - selected row (keep light, just add border) */
                #ListPaneDataGrid tr[aria-selected="true"] td.scaleplus-context-highlight,
                #ListPaneDataGrid .ui-iggrid-selectedcell.scaleplus-context-highlight,
                #ListPaneDataGrid .ui-state-active.scaleplus-context-highlight {
                    box-shadow: inset 0 0 0 2px #4f93e4 !important;
                    background-color: rgba(173, 216, 230, 0.5) !important;
                    position: relative !important;
                }
                
                /* Dark mode - normal and hover states */
                body.scaleplus-dark-mode #ListPaneDataGrid td.scaleplus-context-highlight,
                body.scaleplus-dark-mode #ListPaneDataGrid tr:hover td.scaleplus-context-highlight {
                    box-shadow: inset 0 0 0 2px #5ba3e0 !important;
                    background-color: rgba(91, 163, 224, 0.25) !important;
                }
                
                /* Dark mode - selected row */
                body.scaleplus-dark-mode #ListPaneDataGrid tr[aria-selected="true"] td.scaleplus-context-highlight,
                body.scaleplus-dark-mode #ListPaneDataGrid .ui-iggrid-selectedcell.scaleplus-context-highlight,
                body.scaleplus-dark-mode #ListPaneDataGrid .ui-state-active.scaleplus-context-highlight {
                    box-shadow: inset 0 0 0 2px #5ba3e0 !important;
                    background-color: rgba(91, 163, 224, 0.4) !important;
                }
            `;

            const style = document.createElement('style');
            style.id = 'scaleplus-context-menu-styles';
            style.textContent = contextMenuStyles;
            document.head.appendChild(style);
        }

        createMenu() {
            this.menu = document.createElement('div');
            this.menu.className = 'scaleplus-context-menu';
            this.menu.style.display = 'none';
            document.body.appendChild(this.menu);
        }

        attachGlobalHandlers() {
            document.addEventListener('click', (e) => {
                if (!this.menu.contains(e.target)) {
                    this.hide();
                }
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.hide();
                }
            });

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

                if (item.icon) {
                    const iconSpan = document.createElement('span');
                    iconSpan.className = 'scaleplus-context-menu-icon';
                    if (item.icon.includes(' ')) {
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

                const textSpan = document.createElement('span');
                textSpan.textContent = item.label;
                menuItem.appendChild(textSpan);

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

            const menuX = Math.max(10, Math.min(x, window.innerWidth - 200));
            const menuY = Math.max(10, Math.min(y, window.innerHeight - 100));

            this.menu.style.left = `${menuX}px`;
            this.menu.style.top = `${menuY}px`;
            this.menu.style.display = 'block';

            this.menu.offsetHeight;

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
            // Remove highlight from previously highlighted cell
            this.removeHighlight();
            this.currentTarget = null;
        }

        removeHighlight() {
            const highlighted = document.querySelectorAll('.scaleplus-context-highlight');
            highlighted.forEach(el => el.classList.remove('scaleplus-context-highlight'));
        }

        highlightCell(cell) {
            // Remove any existing highlights first
            this.removeHighlight();
            // Add highlight to the clicked cell
            if (cell) {
                cell.classList.add('scaleplus-context-highlight');
            }
        }

        handleGridRightClick(e) {
            if (e.button !== 2) return;

            if (!window.ScalePlusSettings) return;
            const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.RIGHT_CLICK_MENU);
            if (!enabled) return;

            let el = e.target;
            while (el && (!el.getAttribute || !el.getAttribute('aria-describedby') || !el.getAttribute('aria-describedby').startsWith('ListPaneDataGrid'))) {
                el = el.parentElement;
            }

            if (!el) return;

            e.preventDefault();

            // Highlight the cell that was right-clicked
            this.highlightCell(el);

            const originalX = e.pageX;
            const originalY = e.pageY;

            const menuItems = [
                {
                    label: 'Copy',
                    icon: 'fas fa-copy',
                    action: (target) => {
                        const syntheticEvent = {
                            target: target,
                            pageX: originalX,
                            pageY: originalY,
                            preventDefault: () => {}
                        };
                        if (window.ScalePlusKeyboard?.copyInnerText) {
                            window.ScalePlusKeyboard.copyInnerText(syntheticEvent);
                        }
                    }
                }
            ];

            this.show(e.pageX, e.pageY, menuItems, el);
        }

        handleFavoritesRightClick(e) {
            if (e.button !== 2) return;

            if (!window.ScalePlusSettings) return;
            const enabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.RIGHT_CLICK_MENU);
            if (!enabled) return;

            let target = e.target;
            let favoriteLink = null;

            while (target && target !== document.body) {
                if (target.id === 'SearchPaneMenuFavoritesChooseSearch' || target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]')) {
                    favoriteLink = target.id === 'SearchPaneMenuFavoritesChooseSearch' ? target : target.closest('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                    break;
                }
                target = target.parentElement;
            }

            if (!favoriteLink) return;

            e.preventDefault();

            const filterText = favoriteLink.querySelector('.deletesavedsearchtext')?.textContent?.trim();
            if (!filterText) return;

            const formId = window.ScalePlusUtilities?.getFormIdFromUrl();
            const currentDefault = window.ScalePlusFavorites?.getDefaultFilter(formId);
            const isDefault = currentDefault === filterText;
            const isDefaultFilterEnabled = window.ScalePlusSettings.isEnabled(window.ScalePlusSettings.SETTINGS.DEFAULT_FILTER);

            const menuItems = [
                {
                    label: 'Open in New Tab',
                    icon: 'fas fa-external-link',
                    action: (target) => {
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

            if (isDefaultFilterEnabled) {
                menuItems.push({ separator: true });
                menuItems.push({
                    label: isDefault ? 'Remove Default' : 'Set as Default',
                    icon: isDefault ? 'far fa-star' : 'fas fa-star',
                    action: (target) => {
                        if (isDefault) {
                            window.ScalePlusFavorites?.clearDefaultFilter(formId);
                        } else {
                            window.ScalePlusFavorites?.setDefaultFilter(formId, filterText);
                        }
                        setTimeout(() => {
                            window.ScalePlusFavorites?.updateFavoritesStarIcon();
                            const savedSearchItems = document.querySelectorAll('a[id="SearchPaneMenuFavoritesChooseSearch"]');
                            savedSearchItems.forEach(item => {
                                const itemFilterText = item.querySelector('.deletesavedsearchtext')?.textContent?.trim();
                                if (itemFilterText) {
                                    const existingIcon = item.querySelector('.scaleplus-default-icon');
                                    if (existingIcon) {
                                        const newDefault = window.ScalePlusFavorites?.getDefaultFilter(formId);
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
                    const deleteBtn = favoriteLink.querySelector('.deletesavedsearchbutton');
                    if (deleteBtn) {
                        deleteBtn.click();
                    }
                }
            });

            this.show(e.pageX, e.pageY, menuItems, favoriteLink);
        }

        attachRightClickHandlers() {
            document.addEventListener('contextmenu', (e) => {
                if (!e.defaultPrevented) {
                    this.handleFavoritesRightClick(e);
                }

                if (!e.defaultPrevented) {
                    this.handleGridRightClick(e);
                }
            });
        }
    }

    window.ScalePlusContextMenu = new ScalePlusContextMenuClass();
    window.ScalePlusContextMenu.init();
})();

// ==UserScript==
// @name         Environment Label in Navbar
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Adds a small environment label to the top nav bar for different environments
// @updateURL    https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/EnviromentLabel.user.js
// @downloadURL  https://raw.githubusercontent.com/ShutterSeeker/scaleplus-userscripts/main/EnviromentLabel.user.js
// @author       Blake
// @match        *://*.byjasco.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const navBar = document.getElementById('topNavigationBar');
    if (!navBar) return;

    // Create a label element
    const label = document.createElement('div');
    const isProd = window.location.hostname === 'scale20.byjasco.com';
    const labelText = isProd ? 'PRODUCTION ENVIRONMENT' : 'QA ENVIRONMENT';
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
    `;

    // Insert it at the beginning of the navbar
    const header = navBar.querySelector('.navbar-header');
    if (header) {
        header.insertBefore(label, header.firstChild);
    }

    navBar.style.borderBottom = `6px solid ${borderColor}`;

})();

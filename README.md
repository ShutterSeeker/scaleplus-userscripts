---

# 🛠️ User Scripts for Enhanced Browsing

This repository contains a collection of user scripts designed to improve your workflow and browsing experience. These scripts are intended for use with the **Tampermonkey** browser extension.

---

## 🔧 How to Install Tampermonkey and Use These Scripts

1. **Install Tampermonkey Extension**
   - Go to the https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo and install the **Tampermonkey** extension.

2. **Enable User Scripts**
   - Click the **Manage extensions** in your browser toolbar.
   - Find Tamper monkey > click **Details**
   - In the top-right corner, enable **Developer Mode**.
   - Make sure **User Scripts** are turned on (toggle switch about halfway down the page).

3. **Restart Chrome**
   - Close and reopen Chrome to ensure all settings are applied.

4. **Install a Script**
   - Click on the `.js` file you want to install from this repository.
   - Click the **Raw** button on the top right of the file view.
   - You’ll be redirected to a Tampermonkey install page.
   - Click **Install**.

5. **Activate the Script**
   - Refresh any page where you want the script to take effect.

---

## 📜 Script Descriptions

### `EnviromentLabel.user.js`
Adds a banner at the top of the **Scale** interface to indicate whether you're in **Production** or **QA**. This helps prevent accidental changes in the wrong environment.

---

### `ScalePlus.user.js`
Enhances the **Scale** interface with keyboard and mouse shortcuts:
- Press **F5** or **Enter** to toggle **Stop** or **Play**.
- **Middle-click** anywhere in the results area to **copy text** instantly.

---

### `TabDuplicator.user.js`
Lets you duplicate the current browser tab with a keyboard shortcut:
- Press **Ctrl+D** to duplicate the tab.
- You can toggle this feature on/off or change the shortcut using **Ctrl+Shift+D**.

---

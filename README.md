# 🛠️ ScalePlus - Enhanced Scale Application Experience

ScalePlus is a comprehensive userscript that enhances the Scale application with powerful features and improved workflow. All functionality is consolidated into a single script with an intuitive settings interface.

![ScalePlus Settings](images/settings.png)

---

## 🔧 Installation

### Prerequisites
- **Tampermonkey** browser extension (available for Chrome, Firefox, Safari, Edge)
- Access to Scale application environments

### Install Steps
1. **Install Tampermonkey Extension**
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - Or search for "Tampermonkey" in your browser's extension store

2. **Enable Developer Mode (Important!)**
   - Click the **Extensions** icon in your browser toolbar
   - Find **Tampermonkey** and click **Details**
   - In the top-right corner, enable **Developer Mode**
   - Make sure **User Scripts** are turned on (toggle switch)

3. **Restart Browser**
   - Close and reopen your browser to ensure all settings are applied

4. **Install ScalePlus Script**
   - Click on `ScalePlus.user.js` in this repository
   - Click the **Raw** button to view the source
   - Tampermonkey will automatically prompt you to install
   - Click **Install**

5. **Configure Settings**
   - Navigate to any Scale page
   - Click the **"Configure workstation"** button (usually in the top navigation)
   - The ScalePlus settings modal will appear

---

## Feature Overview - Settings Walkthrough

ScalePlus features are organized into **Basic Settings** and **Advanced Settings** with toggle switches for easy control. Here's a complete walkthrough:

### Basic Settings

#### Always Show Search
- **Toggle**: `Always show search`
- **Description**: Automatically expands the search pane when pages load
- **Use Case**: Never accidentally hide your search filters again
- **Default**: Enabled

#### Custom Enter Behavior
- **Toggle**: `Custom Enter behavior`
- **Description**: Press Enter to toggle between Play/Stop actions
- **Use Case**: Quick keyboard control without mouse navigation
- **Default**: Enabled

#### Middle Click to Copy
- **Toggle**: `Middle click to copy`
- **Description**: Middle-click any grid item to copy its text content
- **Use Case**: Instantly copy container IDs, order numbers, or any displayed text
- **Default**: Enabled

### Advanced Settings

#### Custom F5 Behavior
- **Toggle**: `Custom F5 Behavior`
- **Description**: F5 triggers Play/Stop instead of page refresh
- **Use Case**: Prevent accidental page refreshes while working
- **Default**: Disabled

#### Tab Duplicator
- **Toggle**: `Tab Duplicator`
- **Description**: Duplicate current tab with keyboard shortcut
- **Keyboard Shortcut**: `Ctrl+D`
- **Use Case**: Quickly open multiple instances of the same form
- **Default**: Disabled

#### Default Filter
- **Toggle**: `Default Filter`
- **Description**: Set and automatically apply default saved searches
- **How it works**:
  - Click the star icon next to any saved search to set it as default
  - Filled star (★) = currently selected as default
  - Empty star (☆) = available to set as default
  - Click filled star to remove default state

![Default Filter Stars](images/favorites.png)

- **Auto-apply behavior**:
  - Automatically applies your default filter when visiting form URLs
  - Works with Clear Filters button (re-applies default after clearing)
  - Only triggers on direct form URLs (not with query parameters)
- **Default**: Enabled

#### Environment Labels
- **Toggle**: `Environment Labels`
- **Description**: Visual indicators showing current environment
- **Features**:
  - Color-coded banner at top of interface
  - **Production**: Red banner with "PRODUCTION ENVIRONMENT"
  - **QA**: Yellow banner with "QA ENVIRONMENT"
  - Customizable environment names in settings

![Environment Labels](images/enviroment.png)

- **Configuration**:
  - Set custom names for QA and Production environments
  - Names persist across browser sessions
- **Default**: Disabled

---

## Default State Management

The **Default Filter** feature provides intelligent automation:

### Setting a Default Filter
1. Open any Scale form with saved searches
2. Click the star icon (☆) next to your preferred saved search
3. The star becomes filled (★) indicating it's now the default

### Auto-Application Behavior
- **Page Load**: When you visit a form URL directly (e.g., `/scale/insights/2723`), your default filter automatically applies
- **Clear Filters**: After clicking "Clear Filters", your default filter re-applies automatically
- **Manual Override**: You can still manually select different filters anytime

### Managing Default States
- **Change Default**: Click any empty star (☆) to set a new default
- **Remove Default**: Click the filled star (★) to clear the default state
- **Per-Form Storage**: Each form remembers its own default filter independently

---

## Quick Start Guide

1. **Install** ScalePlus using the steps above
2. **Enable** desired features in the settings by clicking the person icon in top right then **Configure workstation**
![ScalePlus Settings](images/configure.png)
3. **Set Default Filters** by clicking stars next to your favorite saved searches
4. **Enjoy** enhanced productivity with keyboard shortcuts and automation!

---

## 🔧 Troubleshooting

### Settings Not Appearing
- Ensure you're on a Scale application page
- Click "Configure workstation" button in the navigation
- Refresh the page if needed

### Features Not Working
- Check that the corresponding toggle is enabled in settings
- Some features require saved searches to be present
- Try refreshing the page

### Default Filters Not Applying
- Verify the Default Filter toggle is enabled
- Ensure you have saved searches available
- Check browser console for any error messages

---

## Technical Details

- **Compatibility**: Works with both QA and Production Scale environments
- **Storage**: Uses localStorage for settings and default filter preferences
- **Performance**: Lightweight with minimal impact on page load times
- **Security**: No data transmission - all processing happens locally

---

## Contributing

Found a bug or have a feature request? Open an issue or submit a pull request!

---

*ScalePlus - Making Scale work better for you*

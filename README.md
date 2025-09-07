# 🛠️ ScalePlus - Enhanced Scale Application Experience

ScalePlus is a comprehensive userscript that enhances the Scale application with powerful features and improved workflow. All functionality is consolidated into a single script with an intuitive settings interface.

![ScalePlus Settings](images/settings.png)

---

## Quick Start Guide

1. **Install** ScalePlus using the steps below
2. **Enable** desired features in the settings by clicking the person icon in top right then **Configure workstation**
![ScalePlus Settings](images/configure.png)
3. **Set Default Filters** by clicking stars next to your favorite saved searches
4. **Enjoy** enhanced productivity with keyboard shortcuts and automation!

---

## Default State Management

![Default Filter Stars](images/favorites.png)

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

#### Environment Labels

![Environment Labels](images/enviroment.png)

- **Toggle**: `Environment Labels`
- **Description**: Visual indicators showing current environment
- **Features**:
  - Color-coded banner at top of interface
  - **Production**: Red banner with "PRODUCTION ENVIRONMENT"
  - **QA**: Yellow banner with "QA ENVIRONMENT"
  - Customizable environment names in settings
- **Configuration**:
  - Set custom names for QA and Production environments
  - Names persist across browser sessions

---

## 🔧 Installation

### Prerequisites
- **Tampermonkey** browser extension (available for Chrome, Firefox, Safari, Edge)
- Access to Scale application environments

### Install Steps
1. **Install Tampermonkey Extension**
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
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

// Data management module for the Resume Tailor extension
// Provides functionality for exporting and importing user data

// Export all extension data to a JSON file
function exportUserData() {
  chrome.storage.local.get(null, (data) => {
    if (!data || Object.keys(data).length === 0) {
      alert('No data to export');
      return;
    }
    
    // Create a sanitized version of the data to exclude binary data
    const exportData = {
      timestamp: Date.now(),
      version: chrome.runtime.getManifest().version,
      personalInfo: { ...data.personalInfo },
      extensionSettings: data.extensionSettings,
      resumeHistory: data.resumeHistory
    };
    
    // Remove binary data (resume and profile photo) to reduce file size
    if (exportData.personalInfo) {
      exportData.personalInfo.resume = exportData.personalInfo.resume ? '[BINARY_DATA]' : null;
      exportData.personalInfo.profilePhoto = exportData.personalInfo.profilePhoto ? '[BINARY_DATA]' : null;
    }
    
    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Create a Blob and download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create a temporary download link
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `resume-tailor-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    document.body.removeChild(downloadLink);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });
}

// Import user data from a JSON file
function importUserData(jsonFile) {
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importedData = JSON.parse(e.target.result);
      
      // Validate imported data
      if (!importedData || !importedData.version || !importedData.timestamp) {
        alert('Invalid backup file format');
        return;
      }
      
      // Ask for confirmation
      if (!confirm(`Are you sure you want to import this backup from ${new Date(importedData.timestamp).toLocaleString()}?\n\nThis will merge with your existing data. History entries will be added, and settings will be updated.`)) {
        return;
      }
      
      // Get current data to ensure we don't lose binary data
      chrome.storage.local.get(null, (currentData) => {
        // Prepare data to import
        const dataToImport = {};
        
        // Handle history entries - merge with existing
        if (importedData.resumeHistory && Array.isArray(importedData.resumeHistory)) {
          const currentHistory = currentData.resumeHistory || [];
          
          // Create a Set of existing history entry IDs (using composite key)
          const existingEntryKeys = new Set();
          currentHistory.forEach(entry => {
            const key = `${entry.jobId || ''}-${entry.timestamp || ''}-${entry.filename || ''}`;
            existingEntryKeys.add(key);
          });
          
          // Filter out duplicates and add new entries
          const newEntries = importedData.resumeHistory.filter(entry => {
            const key = `${entry.jobId || ''}-${entry.timestamp || ''}-${entry.filename || ''}`;
            return !existingEntryKeys.has(key);
          });
          
          // Merge histories
          dataToImport.resumeHistory = [...currentHistory, ...newEntries];
        }
        
        // Handle extension settings - replace existing
        if (importedData.extensionSettings) {
          dataToImport.extensionSettings = importedData.extensionSettings;
        }
        
        // Handle personal info - merge but preserve binary data
        if (importedData.personalInfo) {
          const currentPersonalInfo = currentData.personalInfo || {};
          
          // Create a merged version of personal info
          const mergedPersonalInfo = {
            ...currentPersonalInfo,
            ...importedData.personalInfo,
            // Preserve binary data from current data
            resume: currentPersonalInfo.resume,
            profilePhoto: currentPersonalInfo.profilePhoto
          };
          
          dataToImport.personalInfo = mergedPersonalInfo;
        }
        
        // Save the imported data
        chrome.storage.local.set(dataToImport, () => {
          alert('Data imported successfully. The page will now refresh.');
          // Reload the page to reflect changes
          setTimeout(() => location.reload(), 500);
        });
      });
      
    } catch (error) {
      console.error('Error importing data:', error);
      alert(`Error importing data: ${error.message}`);
    }
  };
  
  reader.readAsText(jsonFile);
}

// Initialize the data management UI when the DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Create container for data management UI
  const dataManagementContainer = document.createElement('div');
  dataManagementContainer.className = 'data-management-container';
  
  // Create data management section header
  const dataManagementHeader = document.createElement('h2');
  dataManagementHeader.textContent = 'Data Management';
  dataManagementContainer.appendChild(dataManagementHeader);
  
  // Create description
  const description = document.createElement('p');
  description.textContent = 'Export your settings and history to a file, or import from a previously exported file.';
  dataManagementContainer.appendChild(description);
  
  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'data-management-buttons';
  
  // Create export button
  const exportButton = document.createElement('button');
  exportButton.className = 'data-management-button export-button';
  exportButton.textContent = 'Export Data';
  exportButton.addEventListener('click', exportUserData);
  buttonsContainer.appendChild(exportButton);
  
  // Create import button and file input
  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.id = 'import-data-input';
  importInput.accept = '.json';
  importInput.style.display = 'none';
  importInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      importUserData(e.target.files[0]);
    }
  });
  
  const importButton = document.createElement('button');
  importButton.className = 'data-management-button import-button';
  importButton.textContent = 'Import Data';
  importButton.addEventListener('click', () => importInput.click());
  buttonsContainer.appendChild(importButton);
  
  // Add buttons to container
  dataManagementContainer.appendChild(buttonsContainer);
  
  // Add hidden file input to container
  dataManagementContainer.appendChild(importInput);
  
  // Add data management section to settings page
  const settingsPage = document.querySelector('#settings');
  if (settingsPage) {
    settingsPage.appendChild(dataManagementContainer);
    
    // Add styles for data management section
    const style = document.createElement('style');
    style.textContent = `
      .data-management-container {
        margin-top: 40px;
        padding: 20px;
        background: #f5f9ff;
        border-radius: 8px;
        border: 1px solid #e0e7ff;
      }
      
      .data-management-container h2 {
        margin-top: 0;
        color: #0070f3;
        font-size: 20px;
      }
      
      .data-management-buttons {
        display: flex;
        gap: 16px;
        margin-top: 20px;
      }
      
      .data-management-button {
        padding: 10px 16px;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
        font-size: 14px;
      }
      
      .export-button {
        background-color: #0070f3;
        color: white;
      }
      
      .export-button:hover {
        background-color: #0051b3;
      }
      
      .import-button {
        background-color: #f0f4f8;
        color: #4a5568;
        border: 1px solid #dbe2ef;
      }
      
      .import-button:hover {
        background-color: #e2e8f0;
      }
    `;
    document.head.appendChild(style);
  }
}); 
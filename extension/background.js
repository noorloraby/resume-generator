// Background script for Job Hunter extension

// Function to perform storage data integrity check
function checkStorageIntegrity() {
  console.log("Performing storage integrity check");

  chrome.storage.local.get(null, (data) => {
    // Check if we have any data at all
    if (!data || Object.keys(data).length === 0) {
      console.warn("No storage data found, this could indicate data loss");
      console.log("Re-initializing with default values");
      preserveUserData();
      return;
    }

    // Log what data we have for debugging
    console.log("Storage data summary:", {
      hasPersonalInfo: !!data.personalInfo,
      hasExtensionSettings: !!data.extensionSettings,
      historyEntryCount: data.resumeHistory ? data.resumeHistory.length : 0
    });

    // Make sure all required storage objects exist
    let needsRepair = false;

    if (!data.personalInfo) {
      console.warn("Missing personalInfo object - will repair");
      needsRepair = true;
    }

    if (!data.extensionSettings) {
      console.warn("Missing extensionSettings object - will repair");
      needsRepair = true;
    }

    if (!data.resumeHistory) {
      console.warn("Missing resumeHistory array - will repair");
      needsRepair = true;
    }

    if (needsRepair) {
      console.log("Storage needs repair - running data preservation routine");
      preserveUserData();
    } else {
      console.log("Storage integrity check passed - essential objects exist");
      // Still run migration to ensure all entry fields are up-to-date
      migrateHistoryEntries();
    }
  });
}

// Create a backup of all extension data
function backupData() {
  console.log("Creating data backup...");

  chrome.storage.local.get(null, (data) => {
    if (!data || Object.keys(data).length === 0) {
      console.warn("No data to backup");
      return;
    }

    // Create a backup object with timestamp
    const backup = {
      timestamp: Date.now(),
      data: data
    };

    // Store backup in local storage
    chrome.storage.local.set({
      dataBackup: backup
    }, () => {
      console.log("Data backup created successfully at", new Date(backup.timestamp).toLocaleString());
    });
  });
}

// Restore data from backup if needed
function restoreFromBackup() {
  console.log("Checking for data backup...");

  chrome.storage.local.get('dataBackup', (result) => {
    if (!result.dataBackup) {
      console.log("No backup found");
      return;
    }

    const backup = result.dataBackup;
    console.log(`Found backup from ${new Date(backup.timestamp).toLocaleString()}`);

    // Check if we have essential data objects
    const hasEssentialData =
      result.personalInfo !== undefined &&
      result.extensionSettings !== undefined &&
      result.resumeHistory !== undefined;

    if (!hasEssentialData) {
      console.log("Missing essential data, attempting restore from backup");

      // Extract the data from the backup
      const restoredData = backup.data;

      // We need to make sure we're not overwriting existing valid data
      chrome.storage.local.get(null, (currentData) => {
        // Prepare restored data
        const dataToRestore = {};

        // For each key in the backup, check if it's missing in current data
        for (const key in restoredData) {
          if (key !== 'dataBackup' && currentData[key] === undefined) {
            dataToRestore[key] = restoredData[key];
            console.log(`Restoring ${key} from backup`);
          }
        }

        // Only restore if we have something to restore
        if (Object.keys(dataToRestore).length > 0) {
          chrome.storage.local.set(dataToRestore, () => {
            console.log("Data restored successfully from backup");
          });
        } else {
          console.log("No data needs to be restored from backup");
        }
      });
    } else {
      console.log("All essential data present, no need to restore from backup");
    }
  });
}

// Schedule periodic backups
function schedulePeriodicBackups() {
  // Create initial backup
  backupData();

  // Set up periodic backups every hour
  setInterval(backupData, 60 * 60 * 1000);
}

// Extension startup handler
chrome.runtime.onStartup.addListener(() => {
  console.log("Extension startup detected");

  // First check if we need to restore data from backup
  restoreFromBackup();

  // Then check storage integrity
  checkStorageIntegrity();

  // Set up periodic backups
  schedulePeriodicBackups();
});

// Register an event listener that gets fired when the extension is first installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Job Hunter extension event:", details.reason);

  // Check if we need to restore from backup
  restoreFromBackup();

  // Different behavior based on installation reason
  if (details.reason === 'install') {
    console.log("New installation detected");

    // Initialize default settings for new installations only
    chrome.storage.local.set({
      personalInfo: {
        fullName: "",
        email: "",
        phoneNumber: "",
        location: "",
        linkedinUrl: "",
        resume: null,
        profilePhoto: null,
        useJobLocation: false // Default to using personal location
      },
      extensionSettings: {
        relevancyPower: 50, // Default to middle value 0-100
        resumeNameFormat: "{job_title}_Resume_{name}",
        templateChoice: "professional",
        saveLocation: "" // Default to empty string (will use Chrome's default download location)
      },
      resumeHistory: [] // Initialize empty history array
    });

    console.log("Default settings initialized for new installation");
  } else if (details.reason === 'update' || details.reason === 'chrome_update' || details.reason === 'browser_update') {
    console.log("Extension update detected");
    preserveUserData();
  } else {
    // For other cases like 'reload', preserve user data but ensure schema is up-to-date
    preserveUserData();
  }

  console.log("Job Hunter extension installation/update completed");
});

// Function to preserve user data during updates/reloads
function preserveUserData() {
  console.log("Preserving user data during update/reload");

  chrome.storage.local.get(null, (data) => {
    const hasData = Object.keys(data).length > 0;

    if (!hasData) {
      console.log("No existing data found, initializing defaults");
      // Initialize with defaults if no data exists
      chrome.storage.local.set({
        personalInfo: {
          fullName: "",
          email: "",
          phoneNumber: "",
          location: "",
          linkedinUrl: "",
          resume: null,
          profilePhoto: null,
          useJobLocation: false
        },
        extensionSettings: {
          relevancyPower: 50,
          resumeNameFormat: "{job_title}_Resume_{name}",
          templateChoice: "professional",
          saveLocation: ""
        },
        resumeHistory: []
      });
    } else {
      console.log("Existing data found, ensuring schema is up-to-date");

      // Create missing objects/properties if they don't exist
      const personalInfo = data.personalInfo || {};
      const extensionSettings = data.extensionSettings || {};
      const resumeHistory = data.resumeHistory || [];

      // Update schema with any missing properties, preserving existing values
      const updatedPersonalInfo = {
        fullName: personalInfo.fullName || "",
        email: personalInfo.email || "",
        phoneNumber: personalInfo.phoneNumber || "",
        location: personalInfo.location || "",
        linkedinUrl: personalInfo.linkedinUrl || "",
        resume: personalInfo.resume || null,
        profilePhoto: personalInfo.profilePhoto || null,
        useJobLocation: personalInfo.useJobLocation !== undefined ? personalInfo.useJobLocation : false
      };

      const updatedSettings = {
        relevancyPower: extensionSettings.relevancyPower !== undefined ? extensionSettings.relevancyPower : 50,
        resumeNameFormat: extensionSettings.resumeNameFormat || "{job_title}_Resume_{name}",
        templateChoice: extensionSettings.templateChoice || "professional",
        saveLocation: extensionSettings.saveLocation || ""
      };

      // Save updates without overwriting existing data
      chrome.storage.local.set({
        personalInfo: updatedPersonalInfo,
        extensionSettings: updatedSettings,
        resumeHistory: resumeHistory
      }, () => {
        console.log("User data preserved and schema updated");
        // Run migration for history entries after preserving the data
        migrateHistoryEntries();
      });
    }
  });
}

// Function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Function to save a history entry when a resume is generated successfully
function saveToResumeHistory(fileName, jobTitle, companyName, companyUrl, jobPostUrl, jobId) {
  console.log("Saving to resume history:", { fileName, jobTitle, companyName, jobPostUrl, jobId });

  chrome.storage.local.get('resumeHistory', function (data) {
    // Get existing history or initialize empty array
    const history = data.resumeHistory || [];

    // Create new history entry
    const newEntry = {
      filename: fileName,
      jobTitle: jobTitle,
      companyName: companyName,
      companyUrl: companyUrl,
      jobPostUrl: jobPostUrl,
      jobId: jobId,
      timestamp: Date.now()
    };

    // Add new entry to history
    history.push(newEntry);

    // Save updated history
    chrome.storage.local.set({ resumeHistory: history }, function () {
      console.log('Resume history updated');
    });
  });
}

// Function to check if a job has been applied to before
function checkJobInHistory(jobId) {
  console.log("Checking job history for job ID:", jobId);

  return new Promise((resolve) => {
    chrome.storage.local.get('resumeHistory', function (data) {
      const history = data.resumeHistory || [];
      console.log("Retrieved history entries:", history.length);

      // Find the most recent entry for this job ID
      const matchingEntries = history.filter(entry => entry.jobId === jobId);
      console.log("Found matching entries:", matchingEntries.length);

      if (matchingEntries.length > 0) {
        // Sort by timestamp, newest first
        const jobEntry = matchingEntries.sort((a, b) => b.timestamp - a.timestamp)[0];

        console.log("Found job entry in history:", jobEntry);
        resolve({
          found: true,
          jobTitle: jobEntry.jobTitle,
          companyName: jobEntry.companyName,
          filename: jobEntry.filename,
          applicationDate: new Date(jobEntry.timestamp).toLocaleString(),
          jobPostUrl: jobEntry.jobPostUrl
        });
      } else {
        console.log("No job entry found in history for ID:", jobId);
        resolve({ found: false });
      }
    });
  });
}

// Function to migrate existing history entries to new format
function migrateHistoryEntries() {
  console.log("Running history migration check");

  chrome.storage.local.get('resumeHistory', function (data) {
    if (!data.resumeHistory) {
      console.log("No history data found, migration not needed");
      return;
    }

    console.log(`Found ${data.resumeHistory.length} history entries to check for migration`);
    let needsMigration = false;
    let migratedCount = 0;

    // Check if any entries need migration
    const migratedHistory = data.resumeHistory.map(entry => {
      // Make a copy of the entry to avoid mutation issues
      const updatedEntry = { ...entry };
      let entryNeedsMigration = false;

      // Check for missing fields
      if (updatedEntry.companyUrl === undefined) {
        updatedEntry.companyUrl = "";
        entryNeedsMigration = true;
      }

      if (updatedEntry.jobPostUrl === undefined) {
        updatedEntry.jobPostUrl = "";
        entryNeedsMigration = true;
      }

      if (updatedEntry.jobId === undefined) {
        // Try to extract job ID from job post URL if available
        updatedEntry.jobId = extractJobIdFromUrl(updatedEntry.jobPostUrl || "");
        entryNeedsMigration = true;
      }

      // Check for timestamp field (added later in development)
      if (updatedEntry.timestamp === undefined) {
        // Use the current time as a fallback
        updatedEntry.timestamp = Date.now();
        entryNeedsMigration = true;
      }

      // Add migration count if this entry was updated
      if (entryNeedsMigration) {
        needsMigration = true;
        migratedCount++;
      }

      return updatedEntry;
    });

    // If any entries needed migration, save the updated history
    if (needsMigration) {
      console.log(`Migrating ${migratedCount} history entries to new format`);
      chrome.storage.local.set({ resumeHistory: migratedHistory }, function () {
        console.log('History entries successfully migrated to new format');
      });
    } else {
      console.log('All history entries are already in the current format, no migration needed');
    }
  });
}

// Helper function to extract job ID from URL
function extractJobIdFromUrl(url) {
  if (!url) return "";

  try {
    // Try to extract from currentJobId parameter
    const currentJobIdMatch = url.match(/currentJobId=(\d+)/);
    if (currentJobIdMatch && currentJobIdMatch[1]) {
      return currentJobIdMatch[1];
    }

    // Try to extract from job ID in the path
    const jobPathMatch = url.match(/\/jobs\/view\/(\d+)/);
    if (jobPathMatch && jobPathMatch[1]) {
      return jobPathMatch[1];
    }

    // Try to extract from job ID in the path (alternative format)
    const jobPathMatch2 = url.match(/\/jobs\/collections\/.*\/(\d+)/);
    if (jobPathMatch2 && jobPathMatch2[1]) {
      return jobPathMatch2[1];
    }

    // Try additional LinkedIn formats
    const jobDetailsMatch = url.match(/\/details\/(\d+)/);
    if (jobDetailsMatch && jobDetailsMatch[1]) {
      return jobDetailsMatch[1];
    }

    return "";
  } catch (error) {
    console.error("Error extracting job ID from URL:", error);
    return "";
  }
}

// Keep track of the current fetch operation
let currentFetchController = null;

// Initialize tab jobs tracking
const tabJobInfo = new Map();

// When a new tab is created or updated, check if it's a LinkedIn job page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && tab.url.includes('linkedin.com/jobs')) {
    console.log("LinkedIn job page loaded in tab:", tabId, tab.url);

    // Extract job ID from URL
    const jobId = extractJobIdFromUrl(tab.url);
    if (jobId) {
      console.log("Extracted job ID:", jobId, "for tab:", tabId);

      // Store the job ID for this tab
      tabJobInfo.set(tabId, { jobId, url: tab.url });

      // Check if the job has been applied to
      checkJobInHistory(jobId).then(result => {
        if (result.found) {
          console.log("Job found in history, updating indicator in tab:", tabId);
          // Update the indicator in the tab
          chrome.tabs.sendMessage(tabId, {
            action: "updateJobIndicator",
            jobHistory: result
          }).catch(error => {
            console.log("Error sending message to tab:", error);
          });
        }
      });
    }
  }
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Received message:", message.action, "from:", sender.tab ? "content script" : "popup");

  if (message.action === "extractJobDetails") {
    // Send a message to the active tab to extract job details
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      // Make sure we have an active tab and it's a LinkedIn URL
      if (tabs.length === 0) {
        sendResponse({
          success: false,
          error: "No active tab found"
        });
        return;
      }

      const currentTab = tabs[0];
      const url = currentTab.url || "";

      // Check if we're on LinkedIn (more permissive matching)
      if (!url.includes('linkedin.com')) {
        sendResponse({
          success: false,
          error: "Not on LinkedIn"
        });
        return;
      }

      // Execute the content script if needed
      chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        function: () => {
          return typeof extractJobDetails === 'function';
        }
      }, (results) => {
        const contentScriptExists = results && results[0] && results[0].result;

        // If the content script is not injected, inject it first
        if (!contentScriptExists) {
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js']
          }, () => {
            // After injection, send the message to get job details
            chrome.tabs.sendMessage(currentTab.id, { action: "getJobDetails" }, (response) => {
              sendResponse(response || { success: false, error: "No response from content script" });
            });
          });
        } else {
          // Content script already exists, just send the message
          chrome.tabs.sendMessage(currentTab.id, { action: "getJobDetails" }, (response) => {
            sendResponse(response || { success: false, error: "No response from content script" });
          });
        }
      });

      return true; // Keep the channel open for async response
    });

    return true; // Required for async sendResponse
  }

  if (message.action === "checkJobHistory") {
    // This message comes from the content script when checking if a job has been applied to
    const jobId = message.jobId;
    console.log("Received checkJobHistory for job ID:", jobId);

    if (!jobId) {
      console.log("No job ID provided, returning not found");
      sendResponse({ found: false });
      return false;
    }

    // Check if the job has been applied to before
    checkJobInHistory(jobId).then(result => {
      console.log("Job history check result:", result);
      // Send the result back to the content script
      sendResponse(result);

      // If the job has been applied to, update the indicator
      if (result.found && sender.tab) {
        console.log("Sending updateJobIndicator to tab:", sender.tab.id);
        chrome.tabs.sendMessage(sender.tab.id, {
          action: "updateJobIndicator",
          jobHistory: result
        }).catch(error => {
          console.log("Error sending updateJobIndicator message:", error);
        });
      }
    });

    return true; // Required for async sendResponse
  }

  if (message.action === "checkJobInHistory") {
    // Check if a job has been applied to before
    const jobId = message.jobId;
    console.log("Received checkJobInHistory for job ID:", jobId);

    if (!jobId) {
      console.log("No job ID provided, returning not found");
      sendResponse({ found: false });
      return false;
    }

    checkJobInHistory(jobId).then(result => {
      console.log("Job history check result:", result);
      sendResponse(result);

      // If this came from a tab and the job was found, update the indicator
      if (result.found && sender.tab) {
        console.log("Sending updateJobIndicator to tab:", sender.tab.id);
        setTimeout(() => {
          chrome.tabs.sendMessage(sender.tab.id, {
            action: "updateJobIndicator",
            jobHistory: result
          }).catch(error => {
            console.log("Error sending updateJobIndicator message:", error);
          });
        }, 500);
      }
    });

    return true; // Required for async sendResponse
  }

  if (message.action === "cancelResumeGeneration") {
    console.log('Cancelling resume generation...');

    // Cancel the current fetch request if it exists
    if (currentFetchController) {
      currentFetchController.abort();
      currentFetchController = null;
      console.log('Fetch request aborted');
    }

    // We don't need to send a response for this action
    return false;
  }

  if (message.action === "checkRequestStatus") {
    console.log('Checking request status...');
    sendResponse({
      isActive: currentFetchController !== null
    });
    return false;
  }

  if (message.action === "generateResume") {
    console.log('Starting resume generation process...');
    // Get user's personal information before calling the API
    chrome.storage.local.get(['personalInfo', 'extensionSettings'], async function (data) {
      console.log('Retrieved personal information and settings:', data);
      const personalInfo = data.personalInfo || {};
      const extensionSettings = data.extensionSettings || {};

      // Check if personal info has been validated (this should be done already in popup.js)
      if (!personalInfo.fullName || !personalInfo.email ||
        !personalInfo.phoneNumber || !personalInfo.location ||
        !personalInfo.resume) {
        console.error('Missing required personal information');
        sendResponse({
          success: false,
          error: "Missing required personal information"
        });
        return;
      }

      try {
        console.log('Preparing form data for API request...');
        // Prepare form data
        const formData = new FormData();
        formData.append('name', personalInfo.fullName);
        formData.append('email', personalInfo.email);
        formData.append('phone', personalInfo.phoneNumber);
        formData.append('linkedin_link', personalInfo.linkedinUrl || '');

        // Determine which location to use based on user preference
        const useJobLocation = personalInfo.useJobLocation || false;
        const jobLocation = message.jobDetails.jobLocation || '';

        // Use job location if preference is enabled and job location is available
        // Otherwise fall back to user's personal location
        let locationToUse = '';

        if (useJobLocation && jobLocation && jobLocation !== 'Unknown Location') {
          // Auto-detect is on and job location is available
          locationToUse = jobLocation;
          console.log('Using location from job posting:', locationToUse);
        } else if (personalInfo.location && personalInfo.location.trim() !== '') {
          // Fall back to user's personal location
          locationToUse = personalInfo.location;
          console.log('Using user-defined location:', locationToUse);
        } else if (useJobLocation) {
          // Auto-detect is on but job location is not available and no user location
          console.warn('Could not detect job location and no user location is set');
          // This is a valid case now - we'll proceed with a blank location
          locationToUse = '';
        } else {
          // This case should not happen due to validation, but just in case
          console.error('No location available - this should have been caught by validation');
          locationToUse = '';
        }

        formData.append('location', locationToUse);
        formData.append('job_description', message.jobDetails.jobDescription);

        // Convert base64 resume to Blob
        console.log('Converting resume to Blob...');
        const byteCharacters = atob(personalInfo.resume.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const resumeBlob = new Blob([byteArray], { type: 'application/pdf' });
        formData.append('resume_file', resumeBlob, 'resume.pdf');

        console.log('Sending API request...');
        // Create an AbortController for this request
        currentFetchController = new AbortController();
        const signal = currentFetchController.signal;

        // Call the API with the signal
        const response = await fetch('https://resume-generator.tna.wardksa.com/generate-resume', {
          method: 'POST',
          body: formData,
          signal: signal
        });

        // Clear the current controller since request is complete
        currentFetchController = null;

        console.log('API response received:', response);
        if (!response.ok) {
          throw new Error('Failed to generate resume');
        }

        // Get the PDF file from the response
        console.log('Processing response blob...');
        const blob = await response.blob();

        console.log('Received blob size:', blob.size, 'bytes');
        console.log('Blob type:', blob.type);

        // Convert blob to array buffer
        console.log('Converting blob to array buffer...');
        const arrayBuffer = await blob.arrayBuffer();
        const base64Data = arrayBufferToBase64(arrayBuffer);
        const dataUrl = `data:${blob.type};base64,${base64Data}`;

        // Save the file using chrome.downloads API
        console.log('Starting download with chrome.downloads API...');
        const jobTitle = message.jobDetails.jobTitle || 'Job';
        const cleanJobTitle = jobTitle.replace(/[^\w]/g, '_');

        // Use company details directly from the extracted job details
        let companyName = message.jobDetails.companyName || "Unknown Company";
        let companyUrl = message.jobDetails.companyUrl || "";
        let jobPostUrl = message.jobDetails.url || "";
        let jobId = message.jobDetails.jobId || "";

        // Get the user's settings for file naming format
        const nameFormat = extensionSettings.resumeNameFormat || '{job_title}_Resume_{name}';

        // Replace placeholders in name format
        let fileName = nameFormat
          .replace('{job_title}', cleanJobTitle)
          .replace('{name}', personalInfo.fullName.replace(/\s+/g, '_'))
          .replace('{company}', companyName.replace(/[^\w]/g, '_'));

        // Add .pdf extension if not present
        if (!fileName.toLowerCase().endsWith('.pdf')) {
          fileName += '.pdf';
        }

        // Add directory if specified in settings
        if (extensionSettings.saveLocation && extensionSettings.saveLocation.trim() !== '') {
          const folderName = extensionSettings.saveLocation.trim()
            .replace(/[^a-zA-Z0-9_\-]/g, '_'); // Sanitize folder name
          fileName = `${folderName}/${fileName}`;
        }

        // Download the file using data URL
        chrome.downloads.download({
          url: dataUrl,
          filename: fileName,
          saveAs: false
        }, (downloadId) => {
          console.log('Download initiated with ID:', downloadId);

          if (chrome.runtime.lastError) {
            console.error('Download error:', chrome.runtime.lastError);
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message
            });
          } else {
            console.log('Download successful');

            // Save the resume generation to history with company URL and job post URL
            saveToResumeHistory(fileName, jobTitle, companyName, companyUrl, jobPostUrl, jobId);

            // Show notification to inform user
            chrome.notifications.create({
              type: 'basic',
              iconUrl: 'assets/icons/icon128.png',
              title: 'Resume Generated',
              message: `Your tailored resume for "${jobTitle}" has been downloaded successfully.`,
              priority: 2
            });

            // Send success response back to the popup
            sendResponse({
              success: true,
              downloadComplete: true
            });

            // Update generation status in storage regardless of popup state
            chrome.storage.local.set({
              generationStatus: 'success',
              lastGeneratedAt: new Date().toISOString()
            }, () => {
              console.log('Generation status updated to success in storage');
            });

            // If this is a tab we're tracking, update the tab info and notify the content script
            if (sender.tab) {
              console.log("Notifying content script about new application for job ID:", jobId);

              // Store the updated job info for this tab
              tabJobInfo.set(sender.tab.id, { jobId, url: jobPostUrl });

              // Check job history again to get the complete details
              checkJobInHistory(jobId).then(result => {
                if (result.found) {
                  // Notify the content script to update the indicator
                  chrome.tabs.sendMessage(sender.tab.id, {
                    action: "updateJobIndicator",
                    jobHistory: result
                  }).catch(error => {
                    console.log("Error sending updateJobIndicator message after resume generation:", error);
                  });
                }
              });
            }
          }
        });
      } catch (error) {
        console.error('Error generating resume:', error);

        // Clear the current controller
        currentFetchController = null;

        // Check if this was an abort error
        if (error.name === 'AbortError') {
          console.log('Request was aborted by user');

          // Update storage with cancelled status
          chrome.storage.local.set({
            generationStatus: 'cancelled',
            lastGeneratedAt: new Date().toISOString()
          });

          sendResponse({
            success: false,
            error: "Operation cancelled by user",
            cancelled: true
          });
          return;
        }

        // Update storage with error status
        chrome.storage.local.set({
          generationStatus: 'error',
          lastGeneratedAt: new Date().toISOString(),
          lastError: error.message
        });

        // Show error notification
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'assets/icons/icon128.png',
          title: 'Resume Generation Failed',
          message: `There was a problem generating your resume: ${error.message}`,
          priority: 2
        });

        sendResponse({
          success: false,
          error: error.message
        });
      }
    });

    return true; // Required for async sendResponse
  }
}); 
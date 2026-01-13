// Popup script for Job Hunter extension

document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const jobTitleElement = document.getElementById('detected-job-title');
  const generateButton = document.getElementById('generate-cv-btn');
  const coverLetterButton = document.getElementById('write-cover-letter-btn');
  const autoApplyButton = document.getElementById('auto-apply-btn');
  const loadingSection = document.getElementById('loading');
  const downloadSection = document.getElementById('download-section');
  const downloadButton = document.getElementById('download-cv-btn');
  
  // Add error message container to popup.html if it doesn't exist
  let errorContainer = document.getElementById('error-container');
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.className = 'error-container';
    errorContainer.style.display = 'none';
    document.querySelector('.popup-container').appendChild(errorContainer);
  }
  
  // Current job details
  let currentJobDetails = null;
  
  // Set initial loading state for job title
  jobTitleElement.textContent = "Detecting job...";
  
  // Always extract job details when popup opens to get the most current job
  extractJobDetails();
  
  // Check if we have generation status info to display
  chrome.storage.local.get(['generationStatus', 'lastGeneratedAt'], function(data) {
    const generationStatus = data.generationStatus;
    const lastGeneratedAt = data.lastGeneratedAt ? new Date(data.lastGeneratedAt) : null;
    const now = new Date();
    
    // Calculate time difference in minutes
    const timeDiffMinutes = lastGeneratedAt ? 
      Math.floor((now - lastGeneratedAt) / (1000 * 60)) : 0;
    
    console.log('Generation status:', generationStatus, 
              'Last generated:', lastGeneratedAt,
              'Time diff (minutes):', timeDiffMinutes);
    
    // If generation was happening less than 30 minutes ago, check its state
    if (lastGeneratedAt && timeDiffMinutes < 30) {
      if (generationStatus === 'loading') {
        // Check if it's still actually loading or if the status wasn't updated
        checkAPIRequestStatus();
      } else if (generationStatus === 'success') {
        // Resume was successfully generated
        showSuccessMessage();
      } else if (generationStatus === 'error') {
        // There was an error generating the resume
        showErrorMessage(data.lastError || 'Unknown error occurred');
      } else if (generationStatus === 'cancelled') {
        // Generation was cancelled
        showCancelledMessage();
      }
    } else {
      // Reset generation status if it's been more than 30 minutes
      if (generationStatus === 'loading') {
        chrome.storage.local.set({ generationStatus: null });
      }
    }
  });
  
  // Function to extract job details
  function extractJobDetails(refresh = false) {
    // Show loading indicator while extracting job details
    if (!refresh) {
      jobTitleElement.textContent = "Detecting job...";
    }
    
    // Try to extract job details
    chrome.runtime.sendMessage({action: "extractJobDetails"}, function(response) {
      console.log("Job extraction response:", response);
      
      if (response && response.success) {
        // If this is a refresh, keep the UI state but update the job location
        if (refresh) {
          // Just update location in the current job details
          currentJobDetails.jobLocation = response.jobLocation;
          console.log("Updated job location to:", response.jobLocation);
          
          // Cache the updated job details
          chrome.storage.local.set({currentJobDetails: currentJobDetails});
          
          // Remove location indicator if it exists
          const locationIndicator = document.getElementById('location-indicator');
          if (locationIndicator) {
            locationIndicator.remove();
          }
        } else {
          // Full update for new job
          currentJobDetails = response;
          // Update UI with job title
          jobTitleElement.textContent = response.jobTitle;
          
          // Cache the job details
          chrome.storage.local.set({currentJobDetails: response});
          
          // Enable buttons
          enableButtons();
        }
      } else {
        const errorMsg = response ? response.error : "Unknown error";
        console.error("Error extracting job details:", errorMsg);
        
        // Only update UI if this is not a refresh
        if (!refresh) {
          // If we're not on LinkedIn, show a helpful message
          if (errorMsg === "Not on LinkedIn") {
            jobTitleElement.textContent = "Not on a LinkedIn Job Page";
          } else {
            // Try to give a more helpful error message
            jobTitleElement.textContent = "No Job Detected";
            console.log("Please navigate to a LinkedIn job posting and try again");
          }
          
          disableButtons();
        }
      }
    });
  }
  
  // Generate CV button click handler
  generateButton.addEventListener('click', function() {
    if (!currentJobDetails) {
      alert("No job detected. Please navigate to a LinkedIn job posting and try again.");
      return;
    }
    
    // Hide any previous error message
    errorContainer.style.display = 'none';
    
    // Validate required personal information before proceeding
    chrome.storage.local.get('personalInfo', function(data) {
      const personalInfo = data.personalInfo || {};
      const missingFields = validatePersonalInfo(personalInfo);
      
      if (missingFields.length > 0) {
        // Display error message with missing fields
        showValidationError(missingFields);
        return;
      }
      
      // If auto-detect location is enabled, refresh job details to ensure we have the latest location
      if (personalInfo.useJobLocation) {
        // First show loading
        generateButton.style.display = 'none';
        coverLetterButton.style.display = 'none';
        autoApplyButton.style.display = 'none';
        
        // Clear and show loading section with a message about extracting location
        loadingSection.innerHTML = '<div class="spinner"></div><p>Extracting job details...</p>';
        loadingSection.style.display = 'block';
        
        // Re-extract job details then continue to resume generation
        chrome.runtime.sendMessage({action: "extractJobDetails"}, function(response) {
          if (response && response.success) {
            // Update job location in current job details
            currentJobDetails.jobLocation = response.jobLocation;
            console.log("Updated job location for resume generation:", response.jobLocation);
            
            // Continue with resume generation
            startResumeGeneration(currentJobDetails);
          } else {
            // Error extracting job details
            loadingSection.style.display = 'none';
            errorContainer.innerHTML = `
              <p class="error-message">Failed to extract job details. Please try again.</p>
              <button id="try-again" class="button primary-button">Try Again</button>
            `;
            errorContainer.style.display = 'block';
            
            // Add event listener to try again button
            document.getElementById('try-again').addEventListener('click', function() {
              errorContainer.style.display = 'none';
              restoreButtons();
            });
          }
        });
      } else {
        // All required fields are filled - proceed with generation
        startResumeGeneration(currentJobDetails);
      }
    });
  });
  
  // Function to show success message
  function showSuccessMessage() {
    // Get the folder name from settings if available
    chrome.storage.local.get('extensionSettings', function(data) {
      const extensionSettings = data.extensionSettings || {};
      const folderInfo = extensionSettings.saveLocation && extensionSettings.saveLocation.trim() !== '' 
        ? ` to ${extensionSettings.saveLocation} folder` 
        : '';
      
      errorContainer.innerHTML = `
        <p class="success-message">Your resume has been successfully generated and downloaded${folderInfo}!</p>
        <button id="generate-another" class="button primary-button">Generate Another</button>
      `;
      errorContainer.style.display = 'block';
      errorContainer.className = 'error-container success';
      
      // Add event listener to generate another button
      document.getElementById('generate-another').addEventListener('click', function() {
        errorContainer.style.display = 'none';
        errorContainer.className = 'error-container';
        restoreButtons();
        // Clear the generation status
        chrome.storage.local.set({generationStatus: null});
      });
    });
  }
  
  // Function to validate personal information
  function validatePersonalInfo(personalInfo) {
    // Define all required fields
    const requiredFields = [
      { key: 'fullName', label: 'Full Name' },
      { key: 'email', label: 'Email' },
      { key: 'phoneNumber', label: 'Phone Number' },
      { key: 'resume', label: 'Uploaded CV' }
    ];
    
    // Only require location if auto-detect is disabled
    if (!personalInfo.useJobLocation) {
      requiredFields.push({ key: 'location', label: 'Location' });
    }
    
    const missingFields = [];
    
    for (const field of requiredFields) {
      // Check if the field is empty or null
      if (!personalInfo[field.key] || 
          (typeof personalInfo[field.key] === 'string' && personalInfo[field.key].trim() === '')) {
        missingFields.push(field.label);
      }
    }
    
    return missingFields;
  }
  
  // Function to show validation error
  function showValidationError(missingFields) {
    const fieldsList = missingFields.join(', ');
    
    errorContainer.innerHTML = `
      <p class="error-message">Missing required information: ${fieldsList}</p>
      <button id="go-to-settings" class="button primary-button">Go to Settings</button>
    `;
    errorContainer.style.display = 'block';
    
    // Add event listener to the Go to Settings button
    document.getElementById('go-to-settings').addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Function to start the resume generation process
  function startResumeGeneration(jobDetails) {
    // Show loading state
    generateButton.style.display = 'none';
    coverLetterButton.style.display = 'none';
    autoApplyButton.style.display = 'none';
    
    // Clear and show loading section
    loadingSection.innerHTML = '<div class="spinner"></div><p>Extracting latest job details...</p>';
    loadingSection.style.display = 'block';
    
    // Always re-extract job details to ensure we have the most current information
    chrome.runtime.sendMessage({action: "extractJobDetails"}, function(response) {
      if (response && response.success) {
        // Update job details with the latest information
        currentJobDetails = response;
        
        // Cache the updated job details
        chrome.storage.local.set({currentJobDetails: currentJobDetails});
        
        // Update loading message
        loadingSection.innerHTML = '<div class="spinner"></div><p>Generating your tailored resume...</p>';
        
        // Add cancel button to loading section
        const cancelButton = document.createElement('button');
        cancelButton.id = 'cancel-generation';
        cancelButton.className = 'button cancel-button';
        cancelButton.textContent = 'Cancel';
        loadingSection.appendChild(cancelButton);
        
        // Display job location if auto-detect is enabled
        chrome.storage.local.get('personalInfo', function(data) {
          if (data.personalInfo && data.personalInfo.useJobLocation) {
            const locationInfoElement = document.createElement('p');
            locationInfoElement.className = 'location-info';
            
            if (currentJobDetails.jobLocation && currentJobDetails.jobLocation !== 'Unknown Location') {
              locationInfoElement.innerHTML = `Using job location: <strong>${currentJobDetails.jobLocation}</strong>`;
            } else if (data.personalInfo.location && data.personalInfo.location.trim() !== '') {
              locationInfoElement.innerHTML = `Using fallback location: <strong>${data.personalInfo.location}</strong>`;
            } else {
              locationInfoElement.textContent = 'No location detected or provided';
            }
            
            loadingSection.appendChild(locationInfoElement);
          }
        });
        
        // Set generation status to loading
        chrome.storage.local.set({
          generationStatus: 'loading',
          lastGeneratedAt: new Date().toISOString()
        });
        
        // Hide any previous error messages
        errorContainer.style.display = 'none';
        
        // Setup cancel button
        cancelButton.addEventListener('click', function() {
          // Send cancel request to background script
          chrome.runtime.sendMessage({
            action: "cancelResumeGeneration"
          });
          
          // Hide loading and show error
          loadingSection.style.display = 'none';
          errorContainer.innerHTML = `
            <p class="error-message">Resume generation was cancelled.</p>
            <button id="try-again" class="button primary-button">Try Again</button>
          `;
          errorContainer.style.display = 'block';
          
          // Add event listener to try again button
          document.getElementById('try-again').addEventListener('click', function() {
            errorContainer.style.display = 'none';
            startResumeGeneration(currentJobDetails);
          });
          
          // Set generation status to cancelled
          chrome.storage.local.set({
            generationStatus: 'cancelled',
            lastGeneratedAt: new Date().toISOString()
          });
          
          // Restore buttons
          restoreButtons();
        });
        
        // Send request to generate CV with the latest job details
        chrome.runtime.sendMessage({
          action: "generateResume", 
          jobDetails: currentJobDetails
        }, function(response) {
          // Hide loading
          loadingSection.style.display = 'none';
          
          // Check the generation status
          chrome.storage.local.get('generationStatus', function(statusData) {
            // If status is 'cancelled', don't update UI (already handled by cancel button)
            if (statusData.generationStatus === 'cancelled') {
              return;
            }
            
            if (response && response.success) {
              // Set generation status to success
              chrome.storage.local.set({generationStatus: 'success'});
              
              // Show success message instead of download button
              showSuccessMessage();
            } else {
              // Set generation status to error
              chrome.storage.local.set({generationStatus: 'error'});
              
              // Handle specific error responses
              if (response && response.error === "Missing required personal information") {
                // Show validation error with missing fields
                errorContainer.innerHTML = `
                  <p class="error-message">Some required personal information is missing. Please complete your profile.</p>
                  <button id="go-to-settings" class="button primary-button">Go to Settings</button>
                `;
                errorContainer.style.display = 'block';
                
                // Add event listener to the Go to Settings button
                document.getElementById('go-to-settings').addEventListener('click', function() {
                  chrome.runtime.openOptionsPage();
                });
              } else {
                // Generic error
                errorContainer.innerHTML = `
                  <p class="error-message">Failed to generate resume. Please try again later.</p>
                  <button id="try-again" class="button primary-button">Try Again</button>
                `;
                errorContainer.style.display = 'block';
                
                // Add event listener to try again button
                document.getElementById('try-again').addEventListener('click', function() {
                  errorContainer.style.display = 'none';
                  startResumeGeneration(currentJobDetails);
                });
              }
              
              // Restore buttons
              restoreButtons();
            }
          });
        });
      } else {
        // Error extracting job details
        loadingSection.style.display = 'none';
        errorContainer.innerHTML = `
          <p class="error-message">Failed to extract job details. Please try again.</p>
          <button id="try-again" class="button primary-button">Try Again</button>
        `;
        errorContainer.style.display = 'block';
        
        // Add event listener to try again button
        document.getElementById('try-again').addEventListener('click', function() {
          errorContainer.style.display = 'none';
          restoreButtons();
        });
      }
    });
  }
  
  // Cover letter button click handler
  coverLetterButton.addEventListener('click', function() {
    alert('Cover letter generation is coming soon!');
  });
  
  // Auto apply button click handler
  autoApplyButton.addEventListener('click', function() {
    alert('Auto apply functionality is coming soon!');
  });
  
  // Helper function to disable buttons when not on a job page
  function disableButtons() {
    generateButton.disabled = true;
    generateButton.classList.add('disabled');
    coverLetterButton.disabled = true;
    coverLetterButton.classList.add('disabled');
    autoApplyButton.disabled = true;
    autoApplyButton.classList.add('disabled');
  }
  
  // Helper function to enable buttons
  function enableButtons() {
    generateButton.disabled = false;
    generateButton.classList.remove('disabled');
    coverLetterButton.disabled = false;
    coverLetterButton.classList.remove('disabled');
    autoApplyButton.disabled = false;
    autoApplyButton.classList.remove('disabled');
  }
  
  // Helper function to restore buttons to visible state
  function restoreButtons() {
    generateButton.style.display = 'block';
    coverLetterButton.style.display = 'block';
    autoApplyButton.style.display = 'block';
  }
  
  // Function to check the actual status of any API request
  function checkAPIRequestStatus() {
    chrome.runtime.sendMessage({ action: "checkRequestStatus" }, function(response) {
      if (response && response.isActive) {
        // Request is still active, show loading state
        generateButton.style.display = 'none';
        coverLetterButton.style.display = 'none';
        autoApplyButton.style.display = 'none';
        loadingSection.style.display = 'block';
      } else {
        // Request is not active but status wasn't updated, assume it completed or failed
        chrome.storage.local.set({ generationStatus: null });
        restoreButtons();
      }
    });
  }
  
  // Function to show error message
  function showErrorMessage(errorMsg) {
    errorContainer.innerHTML = `
      <p class="error-message">Resume generation failed: ${errorMsg}</p>
      <button id="try-again" class="button primary-button">Try Again</button>
    `;
    errorContainer.style.display = 'block';
    
    // Add event listener to try again button
    document.getElementById('try-again').addEventListener('click', function() {
      errorContainer.style.display = 'none';
      startResumeGeneration(currentJobDetails);
    });
  }
  
  // Function to show cancelled message
  function showCancelledMessage() {
    errorContainer.innerHTML = `
      <p class="error-message">Resume generation was cancelled.</p>
      <button id="try-again" class="button primary-button">Try Again</button>
    `;
    errorContainer.style.display = 'block';
    
    // Add event listener to try again button
    document.getElementById('try-again').addEventListener('click', function() {
      errorContainer.style.display = 'none';
      chrome.storage.local.set({ generationStatus: null });
      startResumeGeneration(currentJobDetails);
    });
  }
}); 
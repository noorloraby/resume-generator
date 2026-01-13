// Settings page script for Job Hunter extension

document.addEventListener('DOMContentLoaded', function() {
  // Tab switching functionality
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and contents
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      tab.classList.add('active');
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // CV upload handling
  const cvUploadArea = document.getElementById('cv-upload-area');
  const cvFileInput = document.getElementById('uploadCV');
  const cvFilename = document.getElementById('cv-filename');
  
  cvUploadArea.addEventListener('click', () => {
    cvFileInput.click();
  });
  
  cvFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      cvFilename.textContent = file.name;
      // Store CV file in chrome.storage (base64 encoded)
      const reader = new FileReader();
      reader.onload = function(e) {
        const base64Data = e.target.result;
        chrome.storage.local.get('personalInfo', function(data) {
          const personalInfo = data.personalInfo || {};
          personalInfo.resume = base64Data;
          chrome.storage.local.set({ personalInfo });
        });
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Profile photo upload handling
  const uploadPhotoBtn = document.getElementById('upload-photo-btn');
  const profilePhotoInput = document.getElementById('profilePhoto');
  const profilePreview = document.getElementById('profile-preview');
  
  uploadPhotoBtn.addEventListener('click', () => {
    profilePhotoInput.click();
  });
  
  profilePhotoInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        profilePreview.src = e.target.result;
        // Store photo in chrome.storage
        chrome.storage.local.get('personalInfo', function(data) {
          const personalInfo = data.personalInfo || {};
          personalInfo.profilePhoto = e.target.result;
          chrome.storage.local.set({ personalInfo });
        });
      };
      reader.readAsDataURL(file);
    }
  });
  
  // Template selection
  const templateOptions = document.querySelectorAll('.template-option');
  let selectedTemplate = 'professional'; // Default template
  
  templateOptions.forEach(option => {
    option.addEventListener('click', () => {
      templateOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
      selectedTemplate = option.getAttribute('data-template');
    });
  });
  
  // Job location auto-detection toggle
  const useJobLocationToggle = document.getElementById('use-job-location');
  const locationInput = document.getElementById('location');
  
  // Update location field based on toggle state
  function updateLocationFieldState() {
    if (useJobLocationToggle.checked) {
      locationInput.style.opacity = '0.7';
      locationInput.setAttribute('data-original-placeholder', locationInput.placeholder);
      locationInput.placeholder = "Fallback when job location unavailable";
      
      // Add helper text if it doesn't exist
      let helperText = document.getElementById('location-helper-text');
      if (!helperText) {
        helperText = document.createElement('p');
        helperText.id = 'location-helper-text';
        helperText.className = 'toggle-description';
        helperText.style.margin = '5px 0 0 0';
        helperText.textContent = "Your location will be used as a fallback if job location detection fails";
        locationInput.parentNode.insertBefore(helperText, locationInput.nextSibling);
      }
    } else {
      locationInput.style.opacity = '1';
      if (locationInput.hasAttribute('data-original-placeholder')) {
        locationInput.placeholder = locationInput.getAttribute('data-original-placeholder');
      } else {
        locationInput.placeholder = "City, State";
      }
      
      // Remove helper text if it exists
      const helperText = document.getElementById('location-helper-text');
      if (helperText) {
        helperText.remove();
      }
    }
  }
  
  // Set initial state
  updateLocationFieldState();
  
  // Add event listener for toggle changes
  useJobLocationToggle.addEventListener('change', updateLocationFieldState);
  
  // Load saved settings
  loadSavedSettings();
  
  // Save settings button
  const saveButton = document.getElementById('save-settings');
  const successMessage = document.getElementById('success-message');
  
  saveButton.addEventListener('click', () => {
    saveSettings().then(() => {
      successMessage.style.display = 'block';
      setTimeout(() => {
        successMessage.style.display = 'none';
      }, 3000);
    });
  });
  
  // Function to load saved settings
  function loadSavedSettings() {
    chrome.storage.local.get(['personalInfo', 'extensionSettings'], function(data) {
      // Load personal info
      if (data.personalInfo) {
        document.getElementById('fullName').value = data.personalInfo.fullName || '';
        document.getElementById('email').value = data.personalInfo.email || '';
        document.getElementById('phoneNumber').value = data.personalInfo.phoneNumber || '';
        document.getElementById('location').value = data.personalInfo.location || '';
        document.getElementById('linkedinUrl').value = data.personalInfo.linkedinUrl || '';
        
        // Set auto-detect job location toggle
        document.getElementById('use-job-location').checked = data.personalInfo.useJobLocation || false;
        
        // Display profile photo if exists
        if (data.personalInfo.profilePhoto) {
          profilePreview.src = data.personalInfo.profilePhoto;
        }
        
        // Display CV filename if exists
        if (data.personalInfo.resume) {
          cvFilename.textContent = 'CV uploaded';
        }
      }
      
      // Load extension settings
      if (data.extensionSettings) {
        document.getElementById('relevancyPower').value = data.extensionSettings.relevancyPower || 50;
        document.getElementById('resumeNameFormat').value = data.extensionSettings.resumeNameFormat || '{job_title}_Resume_{name}';
        
        // Load save location if set
        if (data.extensionSettings.saveLocation) {
          document.getElementById('saveLocation').value = data.extensionSettings.saveLocation;
        }
        
        // Set active template
        const template = data.extensionSettings.templateChoice || 'professional';
        templateOptions.forEach(option => {
          option.classList.remove('active');
          if (option.getAttribute('data-template') === template) {
            option.classList.add('active');
            selectedTemplate = template;
          }
        });
      }
    });
  }
  
  // Function to save settings
  function saveSettings() {
    return new Promise((resolve) => {
      const personalInfo = {
        fullName: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        location: document.getElementById('location').value,
        linkedinUrl: document.getElementById('linkedinUrl').value,
        useJobLocation: document.getElementById('use-job-location').checked,
        // resume and profilePhoto are saved when files are uploaded
      };
      
      const extensionSettings = {
        relevancyPower: document.getElementById('relevancyPower').value,
        resumeNameFormat: document.getElementById('resumeNameFormat').value,
        templateChoice: selectedTemplate,
        saveLocation: document.getElementById('saveLocation').value
      };
      
      // Get existing data to preserve resume and profilePhoto if they exist
      chrome.storage.local.get('personalInfo', function(data) {
        if (data.personalInfo) {
          if (data.personalInfo.resume) {
            personalInfo.resume = data.personalInfo.resume;
          }
          if (data.personalInfo.profilePhoto) {
            personalInfo.profilePhoto = data.personalInfo.profilePhoto;
          }
        }
        
        // Save all settings
        chrome.storage.local.set({
          personalInfo,
          extensionSettings
        }, function() {
          resolve();
        });
      });
    });
  }
}); 
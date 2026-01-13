// Content script for Job Hunter extension
// This script will extract job details from LinkedIn

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getJobDetails") {
    const jobDetails = extractJobDetails();
    sendResponse(jobDetails);
  } else if (message.action === "checkJobHistory") {
    // Check if the current job has been applied to before
    const jobId = extractJobId();
    console.log("content.js: Got checkJobHistory request, extracted job ID:", jobId);
    
    if (jobId) {
      chrome.runtime.sendMessage({
        action: "checkJobInHistory",
        jobId: jobId
      }, function(response) {
        console.log("content.js: Received checkJobInHistory response:", response);
        sendResponse(response);
      });
      return true; // Keep the channel open for async response
    } else {
      console.log("content.js: No job ID found");
      sendResponse({ found: false });
    }
  }
});

// Function to extract job ID from LinkedIn URL
function extractJobId() {
  try {
    const url = window.location.href;
    console.log("content.js: Extracting job ID from URL:", url);
    
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
    
    return null;
  } catch (error) {
    console.error("Error extracting job ID:", error);
    return null;
  }
}

// Function to extract job title and description from LinkedIn
function extractJobDetails() {
  try {
    // More comprehensive selectors for LinkedIn job pages (multiple possible selectors)
    const possibleJobTitleSelectors = [
      '.job-details-jobs-unified-top-card__job-title',
      '.topcard__title',
      '.jobs-unified-top-card__job-title',
      'h1.t-24', // More generic LinkedIn heading
      'h2.job-title',
      '.jobs-details-top-card__job-title'
    ];
    
    const possibleJobDescriptionSelectors = [
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.description__text',
      '.jobs-description',
      '#job-details',
      '.jobs-details__main-content'
    ];
    
    // New selectors for job location
    const possibleJobLocationSelectors = [
      '.job-details-jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__tertiary-description-container span.tvm__text'
    ];
    
    // New selectors for company information
    const possibleCompanyNameSelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link'
    ];
    
    // Try to find job title using different selectors
    let jobTitleElement = null;
    for (const selector of possibleJobTitleSelectors) {
      jobTitleElement = document.querySelector(selector);
      if (jobTitleElement) break;
    }
    
    // Try to find job description using different selectors
    let jobDescriptionElement = null;
    for (const selector of possibleJobDescriptionSelectors) {
      jobDescriptionElement = document.querySelector(selector);
      if (jobDescriptionElement) break;
    }
    
    // Try to find job location using different selectors
    let jobLocationElement = null;
    for (const selector of possibleJobLocationSelectors) {
      jobLocationElement = document.querySelector(selector);
      if (jobLocationElement) break;
    }
    
    // Try to find company information using different selectors
    let companyNameElement = null;
    for (const selector of possibleCompanyNameSelectors) {
      companyNameElement = document.querySelector(selector);
      if (companyNameElement) break;
    }
    
    // Extract text content or use fallbacks
    let jobTitle = "Unknown Job Title";
    let jobDescription = "No description available";
    let jobLocation = "Unknown Location";
    let companyName = "Unknown Company";
    let companyUrl = "";
    
    if (jobTitleElement) {
      jobTitle = jobTitleElement.textContent.trim();
    }
    
    if (jobDescriptionElement) {
      jobDescription = jobDescriptionElement.textContent.trim();
    }
    
    if (jobLocationElement) {
      jobLocation = jobLocationElement.textContent.trim();
      // Clean up location text (remove "Remote", etc.)
      jobLocation = jobLocation.replace(/Remote/i, '').trim();
      // If the location has comma, keep only city and state/country
      if (jobLocation.includes(',')) {
        const locationParts = jobLocation.split(',');
        if (locationParts.length >= 2) {
          jobLocation = locationParts.slice(0, 3).join(',').trim();
        }
      }
    }
    
    if (companyNameElement) {
      // Extract company name
      companyName = companyNameElement.textContent.trim();
      
      // Extract company URL if it's a link element
      if (companyNameElement.tagName.toLowerCase() === 'a' && companyNameElement.href) {
        companyUrl = companyNameElement.href;
      } else {
        // If the company name element is not a link, look for a link inside it
        const companyLink = companyNameElement.querySelector('a');
        if (companyLink && companyLink.href) {
          companyUrl = companyLink.href;
        }
      }
    }
    
    // Debug info
    console.log("Job Hunter: Extracted job title:", jobTitle);
    console.log("Job Hunter: Extracted job location:", jobLocation);
    console.log("Job Hunter: Extracted company name:", companyName);
    console.log("Job Hunter: Extracted company URL:", companyUrl);
    console.log("Job Hunter: Extracted description length:", jobDescription.length);

    // Get the current job post URL
    const jobPostUrl = window.location.href;
    
    // Extract job ID
    const jobId = extractJobId();
    console.log("Job Hunter: Extracted job ID:", jobId);

    return {
      success: true,
      jobTitle: jobTitle,
      jobDescription: jobDescription,
      jobLocation: jobLocation,
      companyName: companyName,
      companyUrl: companyUrl,
      url: jobPostUrl,
      jobId: jobId
    };
  } catch (error) {
    console.error("Error extracting job details:", error);
    return {
      success: false,
      error: "Failed to extract job details: " + error.message
    };
  }
}

// Notify jobIndicator.js that we're ready
console.log("content.js: Script loaded and ready");

// Check if we should show the job indicator when the page loads
window.addEventListener('load', () => {
  console.log("content.js: Page loaded, triggering job history check");
  const jobId = extractJobId();
  if (jobId) {
    chrome.runtime.sendMessage({
      action: "checkJobInHistory",
      jobId: jobId
    }, function(response) {
      console.log("content.js: Initial job history check response:", response);
      // We'll let jobIndicator.js handle showing the indicator
    });
  }
});
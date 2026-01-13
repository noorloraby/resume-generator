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
      }, function (response) {
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
    // Updated selectors for LinkedIn job pages (January 2026)
    const possibleJobTitleSelectors = [
      // Primary: the h1 inside job title container
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      // Fallbacks
      'h1.t-24.t-bold',
      'h1.t-24',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.topcard__title',
      '.t-24.job-details-jobs-unified-top-card__job-title'
    ];

    const possibleJobDescriptionSelectors = [
      // Primary: the job details container
      '#job-details',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.jobs-description__content',
      '.jobs-description',
      '.description__text'
    ];

    // Updated selectors for job location
    const possibleJobLocationSelectors = [
      // Primary: first tvm__text span in tertiary description
      '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text:first-child',
      '.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text',
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.topcard__flavor--bullet'
    ];

    // Updated selectors for company information
    const possibleCompanyNameSelectors = [
      // Primary: company name link
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.jobs-company__box a[href*="/company/"]'
    ];

    // Try to find job title using different selectors
    let jobTitleElement = null;
    let jobTitle = "Unknown Job Title";

    for (const selector of possibleJobTitleSelectors) {
      jobTitleElement = document.querySelector(selector);
      if (jobTitleElement) {
        // Get direct text content, handling nested elements
        jobTitle = jobTitleElement.innerText || jobTitleElement.textContent;
        jobTitle = jobTitle.trim();
        if (jobTitle && jobTitle !== "Unknown Job Title") {
          console.log("Job Hunter: Found title with selector:", selector);
          break;
        }
      }
    }

    // Try to find job description using different selectors
    let jobDescriptionElement = null;
    let jobDescription = "No description available";

    for (const selector of possibleJobDescriptionSelectors) {
      jobDescriptionElement = document.querySelector(selector);
      if (jobDescriptionElement) {
        jobDescription = jobDescriptionElement.innerText || jobDescriptionElement.textContent;
        jobDescription = jobDescription.trim();
        if (jobDescription && jobDescription.length > 50) {
          console.log("Job Hunter: Found description with selector:", selector);
          break;
        }
      }
    }

    // Try to find job location using different selectors
    let jobLocationElement = null;
    let jobLocation = "Unknown Location";

    for (const selector of possibleJobLocationSelectors) {
      jobLocationElement = document.querySelector(selector);
      if (jobLocationElement) {
        jobLocation = jobLocationElement.innerText || jobLocationElement.textContent;
        jobLocation = jobLocation.trim();
        // Clean up location text
        jobLocation = jobLocation.replace(/Remote/i, '').trim();
        if (jobLocation && jobLocation !== "Unknown Location" && !jobLocation.includes('day ago') && !jobLocation.includes('applicant')) {
          console.log("Job Hunter: Found location with selector:", selector);
          break;
        }
      }
    }

    // If location still contains unwanted text, try to extract just the location part
    if (jobLocation.includes('·')) {
      jobLocation = jobLocation.split('·')[0].trim();
    }

    // Try to find company information using different selectors
    let companyNameElement = null;
    let companyName = "Unknown Company";
    let companyUrl = "";

    for (const selector of possibleCompanyNameSelectors) {
      companyNameElement = document.querySelector(selector);
      if (companyNameElement) {
        companyName = companyNameElement.innerText || companyNameElement.textContent;
        companyName = companyName.trim();

        // Extract company URL if it's a link element
        if (companyNameElement.tagName.toLowerCase() === 'a' && companyNameElement.href) {
          companyUrl = companyNameElement.href;
        } else {
          // If the company name element is not a link, look for a link inside it
          const companyLink = companyNameElement.querySelector('a');
          if (companyLink && companyLink.href) {
            companyUrl = companyLink.href;
            companyName = companyLink.innerText || companyLink.textContent;
            companyName = companyName.trim();
          }
        }

        if (companyName && companyName !== "Unknown Company") {
          console.log("Job Hunter: Found company with selector:", selector);
          break;
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
    }, function (response) {
      console.log("content.js: Initial job history check response:", response);
      // We'll let jobIndicator.js handle showing the indicator
    });
  }
});
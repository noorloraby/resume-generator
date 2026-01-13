// Job Indicator script for Resume Tailor extension
// This script will be injected into LinkedIn job pages to show if a job has been applied to before

// Create and inject the indicator element
function createJobIndicator() {
  // Check if the indicator already exists
  if (document.getElementById('resume-tailor-indicator')) {
    return document.getElementById('resume-tailor-indicator');
  }
  
  // Create the indicator container
  const indicator = document.createElement('div');
  indicator.id = 'resume-tailor-indicator';
  indicator.className = 'resume-tailor-indicator';
  
  // Create the indicator content
  const content = document.createElement('div');
  content.className = 'resume-tailor-indicator-content';
  
  // Create the icon
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('assets/icons/icon48.png');
  icon.alt = 'Resume Tailor';
  icon.className = 'resume-tailor-indicator-icon';
  
  // Create the text container
  const textContainer = document.createElement('div');
  textContainer.className = 'resume-tailor-indicator-text';
  
  // Create the title
  const title = document.createElement('div');
  title.className = 'resume-tailor-indicator-title';
  title.textContent = 'Previously Applied';
  
  // Create the details
  const details = document.createElement('div');
  details.className = 'resume-tailor-indicator-details';
  
  // Create the close button
  const closeButton = document.createElement('button');
  closeButton.className = 'resume-tailor-indicator-close';
  closeButton.innerHTML = '&times;';
  closeButton.title = 'Close';
  closeButton.addEventListener('click', () => {
    indicator.style.display = 'none';
  });
  
  // Assemble the indicator
  textContainer.appendChild(title);
  textContainer.appendChild(details);
  content.appendChild(icon);
  content.appendChild(textContainer);
  indicator.appendChild(content);
  indicator.appendChild(closeButton);
  
  // Add the indicator to the page
  document.body.appendChild(indicator);
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .resume-tailor-indicator {
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border: 2px solid #0070f3;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 112, 243, 0.15);
      z-index: 9999;
      max-width: 400px;
      width: calc(100% - 40px);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      display: none;
      padding: 16px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: slideIn 0.5s ease-out;
      box-sizing: border-box;
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    .resume-tailor-indicator:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 28px rgba(0, 112, 243, 0.2);
    }
    
    .resume-tailor-indicator-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      width: 100%;
    }
    
    .resume-tailor-indicator-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      padding: 4px;
      background: rgba(0, 112, 243, 0.1);
      flex-shrink: 0;
    }
    
    .resume-tailor-indicator-text {
      flex: 1;
      min-width: 0; /* Enable text truncation */
      overflow: hidden;
    }
    
    .resume-tailor-indicator-title {
      font-weight: 700;
      font-size: 16px;
      color: #0070f3;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .resume-tailor-indicator-title::before {
      content: "✓";
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #0070f3;
      color: white;
      border-radius: 50%;
      font-size: 12px;
      flex-shrink: 0;
    }
    
    .resume-tailor-indicator-details {
      font-size: 14px;
      color: #4a5568;
      line-height: 1.5;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    
    .resume-tailor-indicator-details > div {
      margin-bottom: 4px;
      overflow: hidden;
    }
    
    .resume-tailor-indicator-details > div:last-child {
      margin-bottom: 0;
    }
    
    .resume-tailor-indicator-close {
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      color: #718096;
      font-size: 20px;
      cursor: pointer;
      padding: 4px;
      line-height: 1;
      border-radius: 50%;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      flex-shrink: 0;
    }
    
    .resume-tailor-indicator-close:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #2d3748;
    }
    
    .resume-tailor-indicator-link {
      color: #0070f3;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      position: relative;
      padding: 0 2px;
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      vertical-align: bottom;
    }
    
    .resume-tailor-indicator-link:hover {
      color: #0051b3;
    }
    
    .resume-tailor-indicator-link::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      width: 100%;
      height: 2px;
      background: #0070f3;
      transform: scaleX(0);
      transform-origin: right;
      transition: transform 0.3s ease;
    }
    
    .resume-tailor-indicator-link:hover::after {
      transform: scaleX(1);
      transform-origin: left;
    }
    
    @media (max-width: 768px) {
      .resume-tailor-indicator {
        top: 10px;
        right: 10px;
        left: 10px;
        width: calc(100% - 20px);
        max-width: none;
      }
    }
  `;
  document.head.appendChild(style);
  
  return indicator;
}

// Update the indicator with job history information
function updateJobIndicator(jobHistory) {
  console.log("Updating job indicator with history:", jobHistory);
  const indicator = createJobIndicator();
  const details = indicator.querySelector('.resume-tailor-indicator-details');
  
  if (!jobHistory || !jobHistory.found) {
    indicator.style.display = 'none';
    return;
  }
  
  // Show the indicator
  indicator.style.display = 'flex';
  
  // Update the details
  details.innerHTML = `
    <div>You applied for <span class="resume-tailor-indicator-link">${jobHistory.jobTitle}</span> at <span class="resume-tailor-indicator-link">${jobHistory.companyName}</span> on ${jobHistory.applicationDate}</div>
    <div>Generated CV: <span class="resume-tailor-indicator-link">${jobHistory.filename}</span></div>
  `;
  
  // Add click handlers for the links
  const links = details.querySelectorAll('.resume-tailor-indicator-link');
  links.forEach(link => {
    link.style.cursor = 'pointer';
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // If it's the job title or company name, open the job post URL
      if (link.textContent === jobHistory.jobTitle || link.textContent === jobHistory.companyName) {
        if (jobHistory.jobPostUrl) {
          window.open(jobHistory.jobPostUrl, '_blank');
        }
      } else if (link.textContent === jobHistory.filename) {
        // If it's the filename, we could potentially open the file
        // This would require additional functionality to locate the file
        console.log('Opening file:', jobHistory.filename);
      }
    });
  });
}

// Check job history and update indicator
function checkJobHistory() {
  console.log("Checking job history for current page...");
  const jobId = extractJobId();
  console.log("Extracted job ID:", jobId);
  
  if (!jobId) {
    console.log("No job ID found, hiding indicator if present");
    const indicator = document.getElementById('resume-tailor-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
    return;
  }
  
  // Send message to background script to check history
  chrome.runtime.sendMessage({
    action: "checkJobInHistory",
    jobId: jobId
  }, (response) => {
    console.log("Received job history check response:", response);
    if (response && response.found) {
      updateJobIndicator(response);
    } else {
      // Hide the indicator if the job hasn't been applied to
      const indicator = document.getElementById('resume-tailor-indicator');
      if (indicator) {
        indicator.style.display = 'none';
      }
    }
  });
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateJobIndicator") {
    console.log("Received updateJobIndicator message:", message);
    updateJobIndicator(message.jobHistory);
    sendResponse({ success: true });
  }
});

// Check if we're on a LinkedIn job page
function isLinkedInJobPage() {
  return window.location.href.includes('linkedin.com/jobs/');
}

// Extract job ID from URL - reimplement from content.js for direct use
function extractJobId() {
  try {
    const url = window.location.href;
    
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
    
    return null;
  } catch (error) {
    console.error("Error extracting job ID:", error);
    return null;
  }
}

// Initialize the indicator when the page loads
if (isLinkedInJobPage()) {
  console.log("On LinkedIn job page, initializing job indicator...");
  
  // Check immediately
  setTimeout(checkJobHistory, 1000);
  
  // Wait for the page to fully load
  window.addEventListener('load', () => {
    console.log("Page loaded, checking job history...");
    checkJobHistory();
  });
  
  // Also check when the URL changes (for single-page applications)
  let lastUrl = window.location.href;
  console.log("Setting up URL change observer...");
  
  // Use both mutation observer and regular interval checking
  const observer = new MutationObserver(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("URL changed from", lastUrl, "to", currentUrl);
      lastUrl = currentUrl;
      
      // Only check if we're still on a LinkedIn job page
      if (isLinkedInJobPage()) {
        console.log("Still on LinkedIn job page, checking job history...");
        // Delay slightly to allow page to update
        setTimeout(checkJobHistory, 500);
      }
    }
  });
  
  // Start observing the document with the configured parameters
  observer.observe(document, { subtree: true, childList: true });
  
  // Also check periodically for URL changes that might be missed by the observer
  setInterval(() => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      console.log("URL changed (detected by interval) from", lastUrl, "to", currentUrl);
      lastUrl = currentUrl;
      
      // Only check if we're still on a LinkedIn job page
      if (isLinkedInJobPage()) {
        console.log("Still on LinkedIn job page, checking job history...");
        checkJobHistory();
      }
    }
  }, 2000);
} 
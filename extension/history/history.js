// History page script
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('search-input');
  const historyTableBody = document.getElementById('history-table-body');
  const emptyHistoryMessage = document.getElementById('empty-history');
  const clearHistoryButton = document.getElementById('clear-history');
  
  // Load history data from localStorage
  function loadHistoryData() {
    return new Promise((resolve) => {
      chrome.storage.local.get('resumeHistory', function(data) {
        const history = data.resumeHistory || [];
        resolve(history);
      });
    });
  }
  
  // Format date for display
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString();
  }
  
  // Clear all table rows
  function clearTable() {
    historyTableBody.innerHTML = '';
  }
  
  // Create hyperlink element
  function createLinkElement(text, url, className) {
    const link = document.createElement('a');
    link.textContent = text;
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = className;
    link.title = text;
    
    // Add tooltip with the URL
    link.setAttribute('data-url', url);
    
    return link;
  }
  
  // Render history data into the table
  function renderHistoryData(historyData) {
    clearTable();
    
    if (historyData.length === 0) {
      emptyHistoryMessage.style.display = 'block';
      return;
    }
    
    emptyHistoryMessage.style.display = 'none';
    
    // Sort history by date (newest first)
    const sortedHistory = [...historyData].sort((a, b) => b.timestamp - a.timestamp);
    
    // Create and append table rows
    sortedHistory.forEach((entry, index) => {
      const row = document.createElement('tr');
      
      // CV Filename
      const filenameCell = document.createElement('td');
      filenameCell.textContent = entry.filename;
      filenameCell.className = 'filename-column';
      filenameCell.title = entry.filename;
      
      // Job Title - as clickable link if URL is available
      const jobTitleCell = document.createElement('td');
      jobTitleCell.className = 'job-title-column';
      
      if (entry.jobPostUrl) {
        const jobTitleLink = createLinkElement(entry.jobTitle, entry.jobPostUrl, 'job-link');
        jobTitleCell.appendChild(jobTitleLink);
      } else {
        jobTitleCell.textContent = entry.jobTitle;
        jobTitleCell.title = entry.jobTitle;
      }
      
      // Company Name - as clickable link if URL is available
      const companyCell = document.createElement('td');
      companyCell.className = 'company-column';
      
      if (entry.companyUrl) {
        const companyLink = createLinkElement(entry.companyName, entry.companyUrl, 'company-link');
        companyCell.appendChild(companyLink);
      } else {
        companyCell.textContent = entry.companyName;
        companyCell.title = entry.companyName;
      }
      
      // Date
      const dateCell = document.createElement('td');
      dateCell.textContent = formatDate(entry.timestamp);
      dateCell.className = 'date-column';
      
      // Actions
      const actionsCell = document.createElement('td');
      
      // Delete button
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'action-button';
      deleteButton.dataset.index = index;
      deleteButton.addEventListener('click', function() {
        deleteHistoryEntry(index);
      });
      
      actionsCell.appendChild(deleteButton);
      
      // Append cells to row
      row.appendChild(filenameCell);
      row.appendChild(jobTitleCell);
      row.appendChild(companyCell);
      row.appendChild(dateCell);
      row.appendChild(actionsCell);
      
      // Append row to table body
      historyTableBody.appendChild(row);
    });
  }
  
  // Filter history data based on search input
  function filterHistoryData(historyData, searchTerm) {
    if (!searchTerm) {
      return historyData;
    }
    
    searchTerm = searchTerm.toLowerCase();
    
    return historyData.filter(entry => 
      entry.filename.toLowerCase().includes(searchTerm) ||
      entry.jobTitle.toLowerCase().includes(searchTerm) ||
      entry.companyName.toLowerCase().includes(searchTerm)
    );
  }
  
  // Delete a specific history entry
  async function deleteHistoryEntry(index) {
    const history = await loadHistoryData();
    
    // Sort history by date (newest first) to match display order
    const sortedHistory = [...history].sort((a, b) => b.timestamp - a.timestamp);
    
    // Get the entry to delete from the sorted array
    const entryToDelete = sortedHistory[index];
    
    // Find and remove the entry from the original history array
    const updatedHistory = history.filter(entry => 
      !(entry.timestamp === entryToDelete.timestamp && 
        entry.filename === entryToDelete.filename &&
        entry.jobTitle === entryToDelete.jobTitle)
    );
    
    // Save updated history
    chrome.storage.local.set({resumeHistory: updatedHistory}, function() {
      // Refresh the display
      const searchTerm = searchInput.value.trim();
      const filteredHistory = filterHistoryData(updatedHistory, searchTerm);
      renderHistoryData(filteredHistory);
    });
  }
  
  // Clear all history
  async function clearAllHistory() {
    if (confirm('Are you sure you want to clear all resume generation history?')) {
      chrome.storage.local.set({resumeHistory: []}, function() {
        renderHistoryData([]);
      });
    }
  }
  
  // Initialize the page
  async function initPage() {
    const historyData = await loadHistoryData();
    renderHistoryData(historyData);
    
    // Set up search input listener
    searchInput.addEventListener('input', async function() {
      const searchTerm = this.value.trim();
      const historyData = await loadHistoryData();
      const filteredHistory = filterHistoryData(historyData, searchTerm);
      renderHistoryData(filteredHistory);
    });
    
    // Set up clear history button
    clearHistoryButton.addEventListener('click', clearAllHistory);
  }
  
  // Start the page initialization
  initPage();
}); 
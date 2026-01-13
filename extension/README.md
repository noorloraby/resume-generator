# Job Hunter Chrome Extension

A Chrome extension that helps job seekers generate tailored resumes from LinkedIn job postings.

## Features

- Auto-detect job details from LinkedIn
- Generate tailored resumes based on job descriptions
- Create cover letters
- Track job applications
- Customize your resume template

## Setup Instructions

### Development Setup

1. Clone this repository
2. Open Chrome browser
3. Go to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the `client-side-extension` folder
7. The extension should now appear in your Chrome toolbar

### Using the Extension

1. Navigate to a LinkedIn job posting
2. Click the Job Hunter icon in your Chrome toolbar
3. The extension will extract the job title and description
4. Click "Generate Tailored CV" to create a customized resume
5. Once generated, click "Download CV" to save your tailored resume

### Settings

Click the "Settings" link in the extension popup to:
- Add your personal information
- Upload your base resume/CV
- Set your preferences for resume generation
- Select your preferred resume template

## Project Structure

```
client-side-extension/
├── assets/
│   ├── icons/           # Extension icons
│   └── templates/       # Resume template previews
├── css/                 # CSS styling files
├── popup/               # Main extension popup UI
├── settings/            # Settings page
├── background.js        # Background script
├── content.js           # Content script for LinkedIn job data extraction
├── manifest.json        # Extension manifest
└── README.md            # This file
```

## Required Permissions

- `activeTab`: To access the current LinkedIn job page
- `storage`: To save your personal information and preferences
- `scripting`: To extract job details from LinkedIn
- `downloads`: To allow downloading of generated resumes

## Future Enhancements

- AI Cover Letter Generation
- Job Application Tracker
- Auto-Fill Job Applications
- Multiple CV Support
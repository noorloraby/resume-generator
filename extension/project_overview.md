# 📌 Resume Generator Chrome Extension  

## 🔹 Overview  
This Chrome extension helps job seekers generate **tailored resumes** directly from LinkedIn job postings. It extracts the **job title and description**, combines them with the user's resume, and sends the data to an API to generate a customized CV optimized for the job. The user can then download the generated resume.  

## 🔹 Core Features  
✅ **Auto-detect job details** (Extract job title & description from LinkedIn).  
✅ **Send data to API** (Sends job details + user’s CV for optimization).  
✅ **Settings Page** (Stores personal info & preferences).  
✅ **Resume Relevancy Slider** (Adjusts how closely the CV matches the job).  
✅ **Custom Resume Naming** (Supports placeholders like `{job_title}`).  
✅ **Resume Template Selection** (Users can choose a preferred format).  
✅ **Loading Animation** (Displays progress while generating the CV).  
✅ **Download Generated CV** (Once the API returns the result).  

## 🔹 User Interface Structure  

### **🔹 Popup UI (Main Interface)**
- Displays the **extracted job title**.  
- Shows a **"Generate Tailored CV"** button.  
- Shows a **loading animation** while processing.  
- Displays a **"Download CV"** button once the resume is ready.  

### **🔹 Settings Page**  
The settings page has two main tabs:  

1️⃣ **Personal Info Tab** (Stores user details for resume generation)  
   - Name  
   - Location  
   - Phone Number  
   - Email  
   - LinkedIn Profile  
   - Upload Resume/CV  
   - Upload CV Picture (optional, used in some templates)
   - a preview of the profile picture if exists  

2️⃣ **Extension Settings Tab** (Customization options)  
   - **Relevancy Power Slider** (Adjusts how aggressively the CV matches the job).  
   - **Generated CV Name Format** (Supports placeholders like `{job_title}`).  
   - **Preferred Resume Template** (Users can preview & select a resume design).  

## 🔹 Technical Requirements  

### **🔹 Tech Stack**  
- **Manifest v3** (Chrome Extension)  
- **Content Scripts** (Extract job details from LinkedIn)  
- **Popup UI** (React or Vanilla JS with HTML/CSS)  
- **Background Script** (Handles API requests & processes data)  
- **Local Storage (`chrome.storage.local`)** (Saves user settings)  
- **API Communication** (Sends job details + CV to generate a tailored resume)  

### **🔹 Required Chrome Extension Permissions**  
- `activeTab` (Access currently open LinkedIn job page)  
- `storage` (Save user preferences in Chrome storage)  
- `scripting` (Inject content script for data extraction)  
- `downloads` (Allow users to download generated CVs)  

## 🔹 Workflow Overview  

1️⃣ **User opens a LinkedIn job posting.**  
2️⃣ **The extension detects & extracts the job title + description.**  
3️⃣ **User clicks "Generate Tailored CV".**  
4️⃣ **The extension sends job details + stored resume to an API.**  
5️⃣ **A loading animation appears while processing.**  
6️⃣ **Once complete, the "Download CV" button appears.**  
7️⃣ **User downloads the optimized CV.**  

---

## 🔹 Future Enhancements (Optional)  
🚀 **AI Cover Letter Generation** (Generate a cover letter).  
🚀 **Job Application Tracker** (Track applied jobs with timestamps).    
🚀 **Auto-Fill Job Applications** (Autofill LinkedIn/Indeed job forms).  
🚀 **Multiple CV Support** (Allow users to store & switch between different resumes).  

---

## 🔹 Next Steps  
1️⃣ **Set up the basic Chrome extension structure (`manifest.json`).**  
2️⃣ **Develop content script to extract job title & description from LinkedIn.**  
3️⃣ **Build popup UI with a button to generate the tailored CV.**  
4️⃣ **Create settings page for personal info & preferences.**  
5️⃣ **Integrate API for CV generation.**  
6️⃣ **Implement download functionality & improve UI.**  
7️⃣ **Test, debug, and optimize performance.**  

# Resume Generator (Job Hunter)

A Chrome extension integrated with a server-side API that generates **tailored resumes** from LinkedIn job postings. The extension extracts job details from LinkedIn, combines them with your resume, and uses AI to generate an optimized CV in PDF format.

---

## 🔹 Project Structure

```
resume-generator/
├── README.md
├── bugs.txt
│
├── server/                          # FastAPI backend
│   ├── .env.example                 # Environment config template
│   ├── requirements.txt
│   ├── resume_generator_api.py      # Main API
│   ├── template.tex                 # LaTeX template
│   └── resume-generator.service     # Systemd service file
│
└── extension/                       # Chrome extension
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── popup/
    ├── settings/
    └── ...
```

---

## 🔹 How It Works

```
┌─────────────────────┐          ┌─────────────────────┐
│   Chrome Extension  │  ──────► │    FastAPI Server   │
│   (Client-Side)     │  HTTP    │   (Server-Side)     │
└─────────────────────┘          └─────────────────────┘
         │                                │
         ▼                                ▼
   LinkedIn Jobs                 Groq AI / OpenRouter
   (Data Extraction)             (configurable provider)
                                          │
                                          ▼
                               LaTeX → PDF Generation
                                   (pdflatex)
```

1. User opens a LinkedIn job posting
2. Extension extracts job details (title, description, company)
3. User clicks "Generate Tailored CV"
4. Extension sends data to server with user's base resume
5. Server calls AI provider (Groq or OpenRouter) to generate LaTeX content
6. Server compiles LaTeX to PDF and returns it
7. User downloads the tailored resume

---

## 🔹 Quick Start: Server Deployment

### Prerequisites

- **Python 3.10+**
- **TeX Live** (for `pdflatex`):
  ```bash
  sudo apt update
  sudo apt install texlive-full
  ```

### Step 1: Setup

```bash
cd server

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# OR: venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys:

```env
# AI Provider: "groq" or "openrouter"
AI_PROVIDER=groq

# Groq Configuration
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=meta-llama/llama-4-maverick

# OpenRouter Configuration (alternative)
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=meta-llama/llama-4-maverick:free
```

### Step 3: Run Server

```bash
uvicorn resume_generator_api:app --host 0.0.0.0 --port 8000
```

**Health check:** `http://localhost:8000/health`

### Step 4: Production Deployment (Optional)

#### Option A: Docker (Recommended)

```bash
cd server

# Create .env file
cp .env.example .env
# Edit .env with your API key

# Build and run with docker-compose
docker-compose up -d

# Check logs
docker-compose logs -f
```

The container includes TeX Live and all dependencies. Access at `http://your-server:8000`

#### Option B: Systemd

Copy and enable the systemd service:

```bash
sudo cp resume-generator.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now resume-generator
```

---

## 🔹 Chrome Extension Setup

### Update Server Endpoint

Edit `extension/background.js` line ~702:

```javascript
const response = await fetch('https://your-server.com/generate-resume', {
```

### Load in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/` folder
4. Configure settings (personal info, upload CV)

---

## 🔹 Configuration Reference

| Variable | Location | Description |
|----------|----------|-------------|
| `AI_PROVIDER` | `.env` | `groq` or `openrouter` |
| `GROQ_API_KEY` | `.env` | API key from [Groq Console](https://console.groq.com/) |
| `OPENROUTER_API_KEY` | `.env` | API key from [OpenRouter](https://openrouter.ai/) |
| Server URL | `background.js:702` | API endpoint for extension |

---

## 🔹 API Endpoints

### `POST /generate-resume`

Generate a tailored resume PDF.

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Full name |
| `email` | string | Email address |
| `phone` | string | Phone number |
| `linkedin_link` | string | LinkedIn URL |
| `location` | string | Location |
| `job_description` | string | Job description text |
| `resume_file` | file | Base resume (PDF/DOCX) |

**Response:** PDF file

### `GET /health`

Check server status and configured AI provider.

---

## 🔹 Logs & Debugging

- **Server logs:** `server/api.log`
- **Systemd logs:** `sudo journalctl -u resume-generator -f`
- **Extension logs:** Chrome DevTools → Extensions → Service Worker

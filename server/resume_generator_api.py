#!/usr/bin/env python3
import os
import tempfile
import asyncio
import shutil
import logging
from typing import List, Optional
import uuid
import time
import re
import requests
import PyPDF2
from docx import Document
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup Logging
LOG_FILE = os.path.join(os.path.dirname(__file__), 'api.log')
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Resume Generator API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Provider Configuration
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq").lower()
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "meta-llama/llama-4-maverick:free")
OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

# Log configuration on startup
logger.info(f"AI Provider: {AI_PROVIDER}")
logger.info(f"GROQ_API_KEY configured: {'Yes' if GROQ_API_KEY else 'No (MISSING!)'}")
logger.info(f"GROQ_MODEL: {GROQ_MODEL}")

# Template and output paths
TEMPLATE_PATH = "template.tex"
OUTPUT_DIR = "generated_resumes"

# Ensure output dir exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Initialize Groq client if using Groq provider
groq_client = None
if AI_PROVIDER == "groq":
    if not GROQ_API_KEY:
        logger.error("GROQ_API_KEY environment variable is not set! AI generation will fail.")
    else:
        try:
            from groq import Groq
            groq_client = Groq(api_key=GROQ_API_KEY)
            logger.info("Groq client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")


def call_ai_api(system_prompt: str, user_prompt: str) -> str:
    """
    Call the configured AI provider (Groq or OpenRouter) and return the response.
    """
    if AI_PROVIDER == "groq":
        return call_groq_api(system_prompt, user_prompt)
    else:
        return call_openrouter_api(system_prompt, user_prompt)


def call_groq_api(system_prompt: str, user_prompt: str) -> str:
    """Call Groq API and return the response content."""
    if not groq_client:
        raise ValueError("Groq client not initialized. Check GROQ_API_KEY.")
    
    logger.info(f"Calling Groq API with model: {GROQ_MODEL}")
    
    completion = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_completion_tokens=1500,
        top_p=1,
        stream=False
    )
    
    return completion.choices[0].message.content.strip()


def call_openrouter_api(system_prompt: str, user_prompt: str) -> str:
    """Call OpenRouter API and return the response content."""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://resume-generator-app.com",
        "X-Title": "Resume Generator"
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        "max_tokens": 1500,
        "temperature": 0.3,
        "stream": False
    }
    
    logger.info(f"Calling OpenRouter API with model: {OPENROUTER_MODEL}")
    response = requests.post(OPENROUTER_API_URL, headers=headers, json=payload)
    response.raise_for_status()
    data = response.json()
    
    if "choices" not in data:
        if "error" in data and "message" in data["error"]:
            raise ValueError(f"API error: {data['error']['message']}")
        raise ValueError("Invalid API response")
    
    return data["choices"][0]["message"]["content"].strip()


@app.middleware("http")
async def log_requests(request: Request, call_next):
    # Skip logging for health check endpoint to reduce noise
    if request.url.path == "/health":
        return await call_next(request)
    
    logger.info(f"New request: {request.method} {request.url}")
    try:
        response = await call_next(request)
        logger.info(f"Completed request with status code {response.status_code}")
        return response
    except Exception as e:
        logger.exception("Unhandled error in request:")
        raise

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request, exc):
    logger.error(f"HTTPException: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    logger.error(f"Validation error: {exc}")
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc)}
    )

async def extract_text_from_file(file_path: str) -> str:
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".pdf":
            with open(file_path, "rb") as f:
                reader = PyPDF2.PdfReader(f)
                return "\n".join([p.extract_text() or "" for p in reader.pages])
        elif ext == ".docx":
            doc = Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")
    except Exception as e:
        logger.exception("Error extracting text from file:")
        raise HTTPException(status_code=500, detail=f"File extraction error: {str(e)}")

# Define resume sections and their requirements
RESUME_SECTIONS = [
    {
        "name": "Professional Summary",
        "required": True,
        "validation": lambda x: "\\section{Professional Summary}" in x and len(x.split('\n')) >= 3
    },
    {
        "name": "Technical Skills",
        "required": True,
        "validation": lambda x: "\\subsection{Technical Skills}" in x
    },
    {
        "name": "Education",
        "required": True,
        "validation": lambda x: "\\section{Education}" in x
    },
    {
        "name": "Certifications",
        "required": False,
        "validation": lambda x: "\\section{Certifications}" in x
    },
    {
        "name": "Experience",
        "required": True,
        "validation": lambda x: "\\section{Experience}" in x and "\\begin{itemize}" in x
    },
    {
        "name": "Projects",
        "required": False,
        "validation": lambda x: "\\section{Projects}" in x
    },
    {
        "name": "Languages and Personal Info",
        "required": False,
        "validation": lambda x: "\\section{Languages and Personal Info}" in x
    }
]

async def generate_section(section_name: str, job_description: str, resume_content: str) -> str:
    """Generate a single section of the resume using the configured AI provider."""
    logger.info(f"Generating section: {section_name}")
    
    system = """
    You are a LaTeX resume generator that only outputs LaTeX-formatted content for a specific resume section.

    - Output must be STRICTLY LaTeX code (no text, explanations, or placeholders).
    - Output ONLY the requested section with its content.
    - Maintain consistent bullet formatting: action verb + metric + tool/keyword.
    - If GPA is not included in the input, remove it entirely from the Education section.
    - Embed soft skills inside Experience or Summary — do NOT list soft skills in a separate section.
    """
    
    section_prompts = {
        "Professional Summary": f"""
        Generate ONLY the Professional Summary section for a resume in LaTeX format.
        
        - Output must start with \\section{{Professional Summary}}
        - 4–5 lines starting with [Job Title from JD]
        - Use 7+ job description primary keywords, 2–3 soft skills in context
        - Example: "[JD Job Title] with 3+ years in [Keyword 1], [Keyword 2], delivering [Achievement]. Strong in [Soft Skill 1] and [Soft Skill 2]."
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """,
        
        "Technical Skills": f"""
        Generate ONLY the Technical Skills subsection for a resume in LaTeX format.
        
        - Output must start with \\subsection{{Technical Skills}}
        - Include user-provided technical skills + job description-relevant tools
        - Use "Familiar with" for skills that appear less prominently in the resume
        - Format as a clean, readable list or paragraph
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """,
        
        "Education": f"""
        Generate ONLY the Education section for a resume in LaTeX format.
        
        - Output must start with \\section{{Education}}
        - Format each entry as:
          \\textbf{{Degree Name}} \\hfill \\textit{{Graduation Year}} \\\\
          \\textit{{University Name}} \\hfill \\textit{{GPA: X.X}} (remove if not provided)
        - Include bullets for relevant coursework, notable projects or honors if available
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """,
        
        "Certifications": f"""
        Generate ONLY the Certifications section for a resume in LaTeX format.
        
        - Output must start with \\section{{Certifications}}
        - List all certifications with bullet points or commas
        - If no certifications are found in the resume, output a minimal section with placeholder text
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """,
        
        "Experience": f"""
        Generate ONLY the Experience section for a resume in LaTeX format.
        
        - Output must start with \\section{{Experience}}
        - Format each role as:
          \\textbf{{Position}} | \\textit{{Company}} \\hfill \\textit{{Month Year -- Month Year}}
          \\begin{{itemize}}
            \\item Use action verbs, metrics, and keywords
            \\item No punctuation at end of bullet unless full sentence
            \\item Include at least one metric-driven result like "Improved system uptime by 40%..."
          \\end{{itemize}}
        - Incorporate relevant keywords from the job description
        - Emphasize achievements and quantifiable results
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """,
        
        "Projects": f"""
        Generate ONLY the Projects section for a resume in LaTeX format.
        
        - Output must start with \\section{{Projects}}
        - Format each project as:
          Title | Tools Used\\\\\\n\\begin{{itemize}}
        - Include 1–2 bullets per project highlighting value or technologies used
        - If no projects are found in the resume, output a minimal section with placeholder text
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """,
        
        "Languages and Personal Info": f"""
        Generate ONLY the Languages and Personal Info section for a resume in LaTeX format.
        
        - Output must start with \\section{{Languages and Personal Info}}
        - Include only if relevant (e.g., Driving License, Languages)
        - Do NOT include date of birth, marital status, or religion
        - If no relevant information is found, output a minimal section with placeholder text
        
        Job Description:
        {job_description}
        
        Resume Content:
        {resume_content}
        """
    }
    
    if section_name not in section_prompts:
        logger.error(f"Unknown section: {section_name}")
        raise ValueError(f"Unknown section: {section_name}")
    
    prompt = section_prompts[section_name]
    
    # Add retry mechanism
    max_retries = 3
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Sending request for section {section_name} to {AI_PROVIDER} API (attempt {attempt+1}/{max_retries})")
            
            content = call_ai_api(system, prompt)
            
            logger.info(f"API Response received for section {section_name}")

            # Extract LaTeX content if wrapped in code blocks
            if "```" in content:
                blocks = re.findall(r"```(?:latex)?(.*?)```", content, re.DOTALL)
                content = blocks[0].strip() if blocks else content

            # Basic validation
            section_info = next((s for s in RESUME_SECTIONS if s["name"] == section_name), None)
            if section_info and not section_info["validation"](content):
                logger.warning(f"Section {section_name} failed validation")
                if attempt < max_retries - 1:
                    continue
                else:
                    return generate_fallback_section(section_name)

            logger.info(f"Successfully generated section: {section_name}")
            return content
            
        except Exception as e:
            logger.warning(f"API attempt {attempt+1} for section {section_name} failed: {str(e)}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
                retry_delay *= 2  # Exponential backoff
                continue
            else:
                logger.warning(f"Using fallback for section {section_name}")
                return generate_fallback_section(section_name)

def generate_fallback_section(section_name: str) -> str:
    """Generate a fallback section if the API fails"""
    fallbacks = {
        "Professional Summary": "\\section{Professional Summary}\nI am a results-driven professional with experience and skills relevant to the position. My background includes achievements in relevant areas with a focus on delivering exceptional results.",
        
        "Technical Skills": "\\subsection{Technical Skills}\nRelevant technical skills for the position, including programming languages, tools, and methodologies.",
        
        "Education": "\\section{Education}\n\\textbf{Relevant Degree} \\hfill \\textit{Graduation Year}\\\\\n\\textit{University Name}",
        
        "Certifications": "\\section{Certifications}\n\\begin{itemize}\n\\item Relevant certification\n\\end{itemize}",
        
        "Experience": "\\section{Experience}\n\\textbf{Position} | \\textit{Company} \\hfill \\textit{Date Range}\\\\\n\\begin{itemize}\n\\item Professional experience relevant to the position\n\\item Skills and achievements in previous roles\n\\end{itemize}",
        
        "Projects": "\\section{Projects}\n\\textbf{Project Name} | Tools Used\\\\\n\\begin{itemize}\n\\item Description of project and technologies used\n\\end{itemize}",
        
        "Languages and Personal Info": "\\section{Languages and Personal Info}\nLanguages: English\n"
    }
    
    return fallbacks.get(section_name, f"\\section{{{section_name}}}\nInformation not available.")

async def generate_ai_resume(job_description: str, resume_content: str) -> str:
    """Generate a complete resume by creating each section separately and combining them"""
    logger.info("Starting section-by-section resume generation")
    
    # Generate each section concurrently
    section_tasks = []
    for section in RESUME_SECTIONS:
        if section["required"] or section["name"] in resume_content:
            task = generate_section(section["name"], job_description, resume_content)
            section_tasks.append(task)
    
    # Wait for all sections to complete
    sections_content = await asyncio.gather(*section_tasks, return_exceptions=True)
    
    # Process results and handle any exceptions
    final_content = []
    for i, content in enumerate(sections_content):
        section_name = RESUME_SECTIONS[i]["name"] if i < len(RESUME_SECTIONS) else f"Section {i}"
        if isinstance(content, Exception):
            logger.error(f"Error generating section {section_name}: {str(content)}")
            if RESUME_SECTIONS[i]["required"]:
                final_content.append(generate_fallback_section(section_name))
        else:
            final_content.append(content)
    
    # Combine all sections
    complete_resume = "\n\n".join(final_content)
    
    # Validate the complete resume
    if "\\section" not in complete_resume:
        logger.error("Generated resume lacks valid LaTeX sections")
        return generate_fallback_resume(resume_content)
    
    return complete_resume

def sanitize_latex_simple(text: str) -> str:
    """
    Escapes ONLY # $ % & if they're not already escaped.
    Does NOT touch other special characters or LaTeX environments.
    """
    chars_to_escape = ['#', '$', '%', '&']
    
    for char in chars_to_escape:
        text = re.sub(rf'(?<!\\)\{char}', rf'\{char}', text)
    
    return text


def generate_fallback_resume(resume_content: str) -> str:
    """Generate a basic resume if API fails"""
    logger.info("Generating fallback resume template")
    
    latex = """\\section{Professional Summary}
I am a results-driven professional with experience and skills relevant to the position. My background includes achievements in relevant areas with a focus on delivering exceptional results.

\\section{Experience}
\\begin{itemize}
\\item Professional with relevant experience in the industry
\\item Skilled at problem-solving and delivering solutions
\\item Experienced in working with teams and stakeholders
\\end{itemize}

\\section{Skills}
\\begin{itemize}
\\item Technical skills relevant to the position
\\item Communication and collaboration skills
\\item Problem-solving and analytical abilities
\\end{itemize}

\\section{Education}
\\begin{itemize}
\\item Relevant degree or certification
\\end{itemize}
"""
    return latex

async def generate_pdf_from_latex(latex: str, output_pdf: str, template_path: str) -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_tex_path = os.path.join(temp_dir, "resume.tex")
        shutil.copy(template_path, temp_tex_path)

        with open(temp_tex_path, "a") as f:
            f.write("\n" + latex)

        for _ in range(2):
            proc = await asyncio.create_subprocess_exec(
                "pdflatex",
                "-interaction=nonstopmode",
                "resume.tex",
                cwd=temp_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await proc.communicate()

            if proc.returncode != 0:
                error_log = stdout.decode() + "\n" + stderr.decode()
                logger.error(f"LaTeX compile error:\n{error_log}")
                raise HTTPException(status_code=500, detail="PDF generation failed")

        final_pdf = os.path.join(temp_dir, "resume.pdf")
        shutil.copy(final_pdf, output_pdf)
        return output_pdf

@app.post("/generate-resume", response_class=FileResponse)
async def generate_resume(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    linkedin_link: str = Form(...),
    location: str = Form(...),
    job_description: str = Form(...),
    resume_file: UploadFile = File(...)
):
    session_id = str(uuid.uuid4())
    tex_filename = f"{name}_{session_id}.tex"
    pdf_filename = f"{name}_{session_id}.pdf"
    tex_path = os.path.join(OUTPUT_DIR, tex_filename)
    pdf_path = os.path.join(OUTPUT_DIR, pdf_filename)

    logger.info(f"Processing resume for {name}")
    logger.info(f"job description: {job_description}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(resume_file.filename)[1]) as tmp:
        content = await resume_file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        resume_text = await extract_text_from_file(tmp_path)
        ai_content = await generate_ai_resume(job_description, resume_text)

        with open(TEMPLATE_PATH, "r") as f:
            template = f.read()

        template_filled = template.replace("{Name}", name)\
            .replace("{Email}", email)\
            .replace("{Phone}", phone)\
            .replace("{LinkedinLink}", linkedin_link)\
            .replace("{Location}", location)\
            .replace("{AI Content}", sanitize_latex_simple(ai_content))

        with open(tex_path, "w") as f:
            f.write(template_filled)

        await generate_pdf_from_latex(ai_content, pdf_path, tex_path)

        logger.info(f"Resume generated for {name}, file saved as {pdf_filename}")
        return FileResponse(path=pdf_path, filename=pdf_filename, media_type="application/pdf")

    except Exception as e:
        logger.exception("Failed to generate resume:")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

    finally:
        os.remove(tmp_path)


@app.get("/health")
async def health_check():
    """Health check endpoint to verify server and AI provider status."""
    return {
        "status": "healthy",
        "ai_provider": AI_PROVIDER,
        "model": GROQ_MODEL if AI_PROVIDER == "groq" else OPENROUTER_MODEL
    }

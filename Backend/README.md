# CvScan Backend - Setup & Running Guide

This directory contains the Python Flask backend for the CvScan AI resume analysis platform.

## Tech Stack
* **Web Framework**: Flask 3.1.3 (with `flask-cors` for cross-origin communication)
* **ORM & Database**: Flask-SQLAlchemy 3.1.1 (supporting SQLite and MySQL/PyMySQL)
* **AI Engine**: Google GenAI SDK (`google-genai` 2.8.0 with Gemini 2.5 Flash)
* **Parser**: pypdf (v6.12.2)

---

## Getting Started

### 1. Requirements
* Python 3.13 or newer (tested with Python 3.13)
* Standard tools: virtualenv/pip

### 2. Install Dependencies
Initialize a virtual environment (if not already done) and install packages:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Unix/macOS
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

### 3. Environment Variables
Create a file named `.env` in the `Backend/` root directory. Use `.env.example` as a starting template:
```env
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=sqlite:///cvscan.db
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```
* `CORS_ALLOWED_ORIGINS` can be updated to point to production URLs when deploying.

### 4. Database Setup & Initialization
By default, the application runs on SQLite (`instance/cvscan.db`). If switching to MySQL:
1. Setup a MySQL database instance.
2. Edit `DATABASE_URL` in `.env` to match `mysql+pymysql://username:password@host:3306/db_name`.
3. SQLAlchemy will create the tables automatically upon launching the application.

### 5. Running the Application
Launch the Flask development server:
```bash
python app.py
```
This runs the local server on `http://127.0.0.1:5000/`.

---

## Project Structure
* [app.py](file:///c:/Projects/CvScan/Backend/app.py) — Core routing, CORS config, controller endpoints, and Gemini client initialization.
* [models.py](file:///c:/Projects/CvScan/Backend/models.py) — SQLAlchemy models (`ResumeScan`).
* [schemas.py](file:///c:/Projects/CvScan/Backend/schemas.py) — Pydantic response models for structured LLM parsing validation.
* [tests/](file:///c:/Projects/CvScan/Backend/tests/) — Dev/diagnostics testing directory.

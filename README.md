# CvScan - AI Resume Analyzer & Career Coach

CvScan is an intelligent resume scanning and career coaching platform. It extracts text from PDF resumes, performs ATS-readiness analysis against target roles or job descriptions using the Gemini 2.5 Flash model, generates shareable scorecards, and provides an interactive AI career coaching assistant.

---

## 🏗️ Project Architecture

The application is split into three main components:

```
                  ┌─────────────────────────┐
                  │   React Frontend (Vite) │
                  └────────────┬────────────┘
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│ Python Flask Backend  │             │   Node.js Backend     │
│  (Resume Scan & AI)   │             │   (Chat History)      │
└───────────┬───────────┘             └───────────┬───────────┘
            │                                     │
            ▼                                     ▼
┌───────────────────────┐             ┌───────────────────────┐
│     SQLite/MySQL      │             │      MySQL DB         │
└───────────────────────┘             └───────────────────────┘
```

1. **Frontend (React + Vite + Tailwind CSS):** A responsive, responsive user interface for uploading resumes, viewing detailed scorecards, sharing results via unique URLs, and chatting with the AI career coach.
2. **Python Backend (Flask):** Core application server. It processes PDF files, handles PDF text extraction, interacts with the Google Gemini API to analyze the resume, and manages shared scan scorecards.
3. **Node.js Backend (Express + MySQL):** Handles persistence and retrieval of chat message histories.

---

## 📁 Repository Structure

```
CvScan/
├── Frontend/           # React + Vite client-side app
├── Backend/            # Flask server (Resume scanner & core AI API)
├── node-backend/       # Node.js Express server (Chat history microservice)
├── Database/           # SQL database schemas & setup scripts
└── README.md           # This project guide
```

---

## 🚀 Local Setup & Run Guide

Follow these step-by-step instructions to get the entire project running on a new development environment.

### 📋 Prerequisites

Ensure you have the following installed on your machine:
* **Node.js** (v18 or higher) & **npm**
* **Python 3.10+** & **pip**
* **MySQL Server** (running locally or remotely)

---

### 1. Clone the Repository

```bash
git clone https://github.com/sakshi-y17/CvScan.git
cd CvScan
```

---

### 2. Database Setup

1. Open your MySQL client and run the database initialization script located at `Database/db.sql`:
   ```bash
   mysql -u root -p < Database/db.sql
   ```
   *This creates a database named `cvscan_db` along with the necessary tables and indexes.*

---

### 3. Setup the Python Backend (Flask)

The Flask backend handles PDF extraction and Gemini AI analysis.

1. Navigate to the `Backend` directory:
   ```bash
   cd Backend
   ```
2. Create and activate a virtual environment:
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up your environment variables by copying `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
5. Edit `.env` to configure your **Gemini API Key** and DB credentials:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   DATABASE_URL=sqlite:///cvscan.db  # Use SQLite locally or change to MySQL url
   ```
6. Run the Flask application:
   ```bash
   python app.py
   ```
   *The Flask backend will start on `http://127.0.0.1:5000`.*

---

### 4. Setup the Node.js Backend (Express)

The Node backend handles saving and retrieving chat history.

1. Navigate to the `node-backend` directory:
   ```bash
   cd ../node-backend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `node-backend` folder:
   ```env
   PORT=5001
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=cvscan_db
   ```
   *(Note: Running on port `5001` avoids conflict with the Flask server running on port `5000`)*
4. Start the Node.js server:
   ```bash
   npm start
   ```
   *The Express backend will start on `http://localhost:5001`.*

---

### 5. Setup the React Frontend (Vite)

1. Navigate to the `Frontend` directory:
   ```bash
   cd ../Frontend
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend will run at `http://localhost:5173`.*

---



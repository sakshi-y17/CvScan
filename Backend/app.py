import json
import os
import secrets
import string
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from flask import Flask, jsonify, request
from flask_cors import CORS
from google import genai
from google.genai import types
from pypdf import PdfReader

from models import db, ResumeScan
from schemas import ChatResponse, ScanResult


GEMINI_MODEL = "gemini-2.5-flash"


def get_genai_client():
    """
    Create the Gemini client only when an AI route needs it.

    Complexity: O(1) time and space. Lazy initialization keeps health checks
    usable even when GEMINI_API_KEY is absent during local diagnostics.
    """
    api_key = os.environ.get("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set.")

    return genai.Client(api_key=api_key)


def extract_pdf_text(uploaded_file):
    """
    Read the uploaded PDF stream directly in memory and concatenate page text.

    Complexity: O(p + n) time, where p is page count and n is extracted text
    length. Space is O(n). This avoids disk writes and keeps uploads stateless.
    """
    reader = PdfReader(uploaded_file.stream)
    page_text = []

    for page in reader.pages:
        extracted_page = page.extract_text() or ""
        if extracted_page.strip():
            page_text.append(extracted_page.strip())

    return "\n\n".join(page_text)


def build_scan_prompt(extracted_text, job_description, target_role):
    """
    Build the recruiter analysis prompt from resume text, target role, and JD.

    Complexity: O(r + j + t) time and space, where r is resume length, j is
    JD length, and t is target role length.
    Centralizing prompt construction makes later tuning safer and testable.
    """
    return f"""
Analyze this candidate resume against the target role and target job description.

Return only JSON matching the provided schema:
- overall_score: integer 0-100
- red_flags: list of ATS or formatting issues
- missing_keywords: list of critical missing role keywords
- bullet_fixes: weak original bullets with stronger optimized rewrites

Rules:
- Act like an expert technical recruiter and ATS analyst.
- If no job description is provided, score against the target role and general ATS readiness.
- Provide exactly 3 bullet_fixes when weak bullet points are available.
- Optimized bullets must use strong action verbs and measurable impact when possible.
- Do not invent experience, employers, degrees, certifications, or tools not supported by the resume.

Target role or career objective:
{target_role or "No target role provided."}

Resume text:
{extracted_text}

Target job description:
{job_description or "No target job description provided."}
""".strip()


def create_app():
    app = Flask(__name__)

    # Database connection configuration
    db_url = os.environ.get("DATABASE_URL", "sqlite:///cvscan.db")
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    elif db_url.startswith("mysql://"):
        db_url = db_url.replace("mysql://", "mysql+pymysql://", 1)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    # Configure CORS origins from environment variable
    cors_allowed_origins = os.environ.get(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")

    CORS(
        app,
        resources={
            r"/api/v1/*": {
                "origins": cors_allowed_origins
            }
        },
    )

    @app.get("/api/v1/health")
    def health_check():
        """Return a lightweight signal that the Flask API is running."""
        return jsonify({"status": "healthy", "service": "CvScan.ai"})

    @app.post("/api/v1/scan")
    def scan_resume():
        """
        Accept a PDF resume, extract text, and return structured AI analysis.

        Complexity: O(p + n + m + a) time, where p is PDF page count, n is
        extracted text length, m is mock job catalog size, and a is AI response
        size. Space is O(n + m + a). This keeps uploads stream-first and outputs
        schema-first while adding deterministic mock job matching.
        """
        if "resume" not in request.files:
            return jsonify({"status": "error", "message": "Missing required resume file."}), 400

        resume_file = request.files["resume"]

        if not resume_file.filename:
            return jsonify({"status": "error", "message": "Resume file name is empty."}), 400

        if not resume_file.filename.lower().endswith(".pdf"):
            return jsonify({"status": "error", "message": "Only PDF resumes are supported."}), 400

        job_description = request.form.get("job_description", "")
        target_role = request.form.get("target_role", "")

        try:
            extracted_text = extract_pdf_text(resume_file)
        except Exception as error:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Unable to parse the uploaded PDF.",
                        "detail": str(error),
                    }
                ),
                400,
            )

        try:
            client = get_genai_client()
            prompt = build_scan_prompt(extracted_text, job_description, target_role)

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "You are an expert technical recruiter and ATS analyst. "
                        "Use the candidate resume, target role, and JD "
                        "to produce evidence-based structured JSON only."
                    ),
                    response_mime_type="application/json",
                    response_schema=ScanResult,
                    temperature=0.2,
                ),
            )

            scan_result = ScanResult.model_validate_json(response.text)

        except RuntimeError as error:
            return jsonify({"status": "error", "message": str(error)}), 500
        except Exception as error:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Unable to generate structured AI scan result.",
                        "detail": str(error),
                    }
                ),
                502,
            )

        # Generate collision-safe alphanumeric slug
        alphabet = string.ascii_letters + string.digits
        share_slug = None
        max_attempts = 10
        attempt = 0
        try:
            while attempt < max_attempts:
                candidate_slug = "".join(secrets.choice(alphabet) for _ in range(8))
                if not ResumeScan.query.filter_by(share_slug=candidate_slug).first():
                    share_slug = candidate_slug
                    break
                attempt += 1
            
            if not share_slug:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Failed to generate a unique share slug after multiple attempts.",
                        }
                    ),
                    500,
                )

            new_scan = ResumeScan(
                share_slug=share_slug,
                target_role=target_role,
                overall_score=scan_result.overall_score,
                raw_analysis=scan_result.model_dump_json()
            )
            db.session.add(new_scan)
            db.session.commit()
        except Exception as error:
            db.session.rollback()
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Database transaction failed.",
                        "detail": str(error),
                    }
                ),
                500,
            )

        result_payload = scan_result.model_dump()
        result_payload["share_slug"] = share_slug

        return jsonify(result_payload), 200

    @app.post("/api/v1/chat")
    def career_chat():
        """
        Generate a short career-coach reply from chat history and resume context.

        Complexity: O(h + c + t + a) time and space, where h is message history
        size, c is resume context size, t is target role length, and a is response
        size. A separate endpoint keeps chat iteration independent from scanning.
        """
        payload = request.get_json(silent=True) or {}
        message_history = payload.get("message_history", [])
        resume_context = payload.get("resume_context", {})
        target_role = payload.get("target_role", "")

        try:
            client = get_genai_client()
            prompt = f"""
Guide this student toward landing their target role.

Keep the reply short, practical, and conversational. Use the scan context and
message history. Do not claim to apply to jobs or browse LinkedIn.

Target role:
{target_role or "No target role provided."}

Resume/scan context:
{json.dumps(resume_context, indent=2)}

Message history:
{json.dumps(message_history, indent=2)}
""".strip()

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=(
                        "You are an AI career coach for early-career technical candidates. "
                        "Give concise, specific, supportive guidance."
                    ),
                    response_mime_type="application/json",
                    response_schema=ChatResponse,
                    temperature=0.4,
                ),
            )

            chat_response = ChatResponse.model_validate_json(response.text)

        except RuntimeError as error:
            return jsonify({"status": "error", "message": str(error)}), 500
        except Exception as error:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Unable to generate career coach reply.",
                        "detail": str(error),
                    }
                ),
                502,
            )

        return app.response_class(
            response=chat_response.model_dump_json(),
            status=200,
            mimetype="application/json",
        )

    @app.get("/api/v1/share/<string:slug>")
    def get_shared_scan(slug):
        """
        Query a saved scan by its unique share_slug.

        Complexity:
        - Time: O(1) database B-Tree index lookup.
        - Space: O(k) space for returning the deserialized dictionary.
        """
        scan = ResumeScan.query.filter_by(share_slug=slug).first()
        if not scan:
            return jsonify({"error": "Profile scorecard not found"}), 404

        try:
            analysis_dict = json.loads(scan.raw_analysis)
            analysis_dict["share_slug"] = scan.share_slug
            analysis_dict["target_role"] = scan.target_role
            return jsonify(analysis_dict), 200
        except Exception as error:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Failed to decode saved scan data.",
                        "detail": str(error),
                    }
                ),
                500,
            )

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)

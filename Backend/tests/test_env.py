import os
from pathlib import Path
from dotenv import load_dotenv

backend_dir = Path(__file__).resolve().parent.parent
load_dotenv(backend_dir / ".env")
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    masked = api_key[:4] + "..." + api_key[-4:] if len(api_key) > 8 else "..."
    print(f"Success! GEMINI_API_KEY is loaded: {masked}")
else:
    print("Failure: GEMINI_API_KEY not found in environment after load_dotenv().")

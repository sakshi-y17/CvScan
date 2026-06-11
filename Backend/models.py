import os
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

# Instantiate SQLAlchemy core object
db = SQLAlchemy()

class ResumeScan(db.Model):
    """
    Model representing a completed resume scan and analysis history.
    
    Index Complexity:
    - O(1) average lookup time on share_slug due to unique B-Tree indexing.
    """
    __tablename__ = "resume_scans"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    share_slug = db.Column(db.String(8), unique=True, index=True, nullable=False)
    target_role = db.Column(db.String(255), nullable=False)
    overall_score = db.Column(db.Integer, nullable=False)
    raw_analysis = db.Column(db.Text, nullable=False)  # Serialized JSON payload from LLM
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

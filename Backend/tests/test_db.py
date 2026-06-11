import json
from app import create_app
from models import db, ResumeScan

def test_db():
    app = create_app()
    with app.app_context():
        print("Database successfully initialized. Tables created.")
        # Insert a dummy record
        dummy_scan = ResumeScan(
            share_slug="abc123xy",
            target_role="Software Engineer",
            overall_score=85,
            raw_analysis=json.dumps({
                "overall_score": 85,
                "red_flags": ["Missing contact info"],
                "missing_keywords": ["SQL", "Docker"],
                "bullet_fixes": []
            })
        )
        db.session.add(dummy_scan)
        db.session.commit()
        print("Dummy record added to database.")

        # Query it back
        retrieved = ResumeScan.query.filter_by(share_slug="abc123xy").first()
        if retrieved:
            print("Successfully retrieved record from DB:")
            print(f"Slug: {retrieved.share_slug}")
            print(f"Role: {retrieved.target_role}")
            print(f"Score: {retrieved.overall_score}")
            print(f"Analysis: {retrieved.raw_analysis}")
            
            # Clean up
            db.session.delete(retrieved)
            db.session.commit()
            print("Dummy record deleted successfully.")
        else:
            print("Failed to retrieve dummy record!")

if __name__ == "__main__":
    test_db()

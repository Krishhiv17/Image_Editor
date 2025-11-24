"""
Verify list_photos logic and SAS token generation.
"""
from app.database import SessionLocal
from app.models import Photo, User
from app.schemas.photo import PhotoResponse
from app.services.blob_service import blob_service
from app.config import settings

def verify_list_photos():
    db = SessionLocal()
    try:
        print(f"Checking all photos in DB...")
        
        # Get photos
        photos = db.query(Photo).all()
        
        for p in photos:
            print(f"\nPhoto: {p.filename}")
            print(f"DB Blob URL: {p.blob_url}")
            print(f"Blob Name: {p.blob_name}")
            
            # Simulate list_photos logic
            response = PhotoResponse.model_validate(p)
            
            if p.blob_name:
                sas_token = blob_service.generate_read_sas_token(
                    settings.blob_container_originals,
                    p.blob_name
                )
                print(f"Generated SAS Token: {sas_token[:20]}...")
                final_url = f"{response.blob_url}{sas_token}"
                print(f"Final URL: {final_url}")
                
                # Try to download
                import requests
                print("Attempting to download...")
                r = requests.get(final_url)
                print(f"Status Code: {r.status_code}")
                if r.status_code == 200:
                    print(f"✅ Download successful! Size: {len(r.content)} bytes")
                else:
                    print(f"❌ Download failed: {r.text[:100]}")
            
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_list_photos()

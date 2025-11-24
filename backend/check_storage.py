"""
Check Azure Blob Storage container permissions and blob existence.
"""
from azure.storage.blob import BlobServiceClient
from app.config import settings
import sys

def check_storage():
    try:
        blob_service_client = BlobServiceClient.from_connection_string(
            settings.azure_storage_connection_string
        )
        
        container_name = settings.blob_container_originals
        container_client = blob_service_client.get_container_client(container_name)
        
        print(f"Checking container: {container_name}")
        
        # Check container existence
        if not container_client.exists():
            print(f"❌ Container '{container_name}' does not exist!")
            return
            
        # Get container properties (includes public access level)
        props = container_client.get_container_properties()
        print(f"✅ Container exists")
        print(f"🔒 Public Access: {props.public_access}")
        
        # List blobs
        print("\nListing blobs in container:")
        blobs = list(container_client.list_blobs())
        for blob in blobs:
            print(f" - {blob.name} ({blob.size} bytes)")
            
        if not blobs:
            print(" (No blobs found)")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_storage()

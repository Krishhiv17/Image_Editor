"""
Configure CORS for Azure Blob Storage to allow browser uploads.
"""
from azure.storage.blob import BlobServiceClient, CorsRule
from app.config import settings

# Initialize Blob Service Client
blob_service_client = BlobServiceClient.from_connection_string(
    settings.azure_storage_connection_string
)

# Define CORS rules
cors_rule = CorsRule(
    allowed_origins=['http://localhost:3000', 'https://*.azurewebsites.net'],
    allowed_methods=['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'OPTIONS'],
    allowed_headers=['*'],
    exposed_headers=['*'],
    max_age_in_seconds=3600
)

try:
    # Set CORS rules for Blob service
    blob_service_client.set_service_properties(cors=[cors_rule])
    print("✅ CORS rules configured successfully!")
    print("\nConfigured rules:")
    print(f"  - Allowed origins: {cors_rule.allowed_origins}")
    print(f"  - Allowed methods: {cors_rule.allowed_methods}")
    print(f"  - Max age: {cors_rule.max_age_in_seconds}s")
    
except Exception as e:
    print(f"❌ Failed to configure CORS: {e}")

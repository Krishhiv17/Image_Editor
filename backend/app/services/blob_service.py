"""
Azure Blob Storage service for managing file uploads and downloads.
"""
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions, ContentSettings
from app.config import settings
from datetime import datetime, timedelta
from typing import Optional
import uuid


class BlobService:
    """Service for interacting with Azure Blob Storage."""
    
    def __init__(self):
        """Initialize Blob Service Client."""
        self.blob_service_client = BlobServiceClient.from_connection_string(
            settings.azure_storage_connection_string
        )
        self.account_name = settings.azure_storage_account_name
        self.account_key = settings.azure_storage_account_key
    
    def generate_unique_blob_name(self, user_id: str, filename: str) -> str:
        """
        Generate unique blob name with user folder structure.
        
        Format: {user_id}/{year}/{month}/{unique_id}_{filename}
        """
        now = datetime.utcnow()
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = filename.replace(" ", "_")
        
        blob_name = f"{user_id}/{now.year}/{now.month:02d}/{unique_id}_{safe_filename}"
        return blob_name
    
    def generate_read_sas_token(
        self,
        container_name: str,
        blob_name: str,
        expiry_minutes: int = 60
    ) -> str:
        """
        Generate SAS token for reading a blob.
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            expiry_minutes: Token expiry in minutes (default 60)
            
        Returns:
            SAS token string (starts with ?)
        """
        sas_token = generate_blob_sas(
            account_name=self.account_name,
            account_key=self.account_key,
            container_name=container_name,
            blob_name=blob_name,
            permission=BlobSasPermissions(read=True),
            expiry=datetime.utcnow() + timedelta(minutes=expiry_minutes)
        )
        return "?" + sas_token

    def generate_upload_sas_url(
        self,
        container_name: str,
        blob_name: str,
        expiry_minutes: int = 60
    ) -> str:
        """
        Generate SAS URL for uploading a blob.
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            expiry_minutes: Token expiry in minutes (default 60)
            
        Returns:
            Full SAS URL for uploading
        """
        # Generate SAS token with write permission
        sas_token = generate_blob_sas(
            account_name=self.account_name,
            account_key=self.account_key,
            container_name=container_name,
            blob_name=blob_name,
            permission=BlobSasPermissions(write=True, create=True),
            expiry=datetime.utcnow() + timedelta(minutes=expiry_minutes)
        )
        
        # Construct full URL
        blob_url = f"https://{self.account_name}.blob.core.windows.net/{container_name}/{blob_name}?{sas_token}"
        return blob_url
    
    def get_blob_url(self, container_name: str, blob_name: str) -> str:
        """
        Get public URL for a blob (for variants container with public access).
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            
        Returns:
            Public blob URL
        """
        return f"https://{self.account_name}.blob.core.windows.net/{container_name}/{blob_name}"
    
    def get_blob_bytes(self, container_name: str, blob_name: str) -> bytes:
        """
        Download blob as bytes.
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            
        Returns:
            Blob content as bytes
        """
        blob_client = self.blob_service_client.get_blob_client(
            container=container_name,
            blob=blob_name
        )
        return blob_client.download_blob().readall()
    
    def delete_blob(self, container_name: str, blob_name: str) -> bool:
        """
        Delete a blob.
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            
        Returns:
            True if deletion was successful, False otherwise.
        """
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )
            blob_client.delete_blob()
            return True
        except Exception:
            return False

    def upload_bytes(self, container_name: str, blob_name: str, data: bytes, content_type: str = "application/octet-stream"):
        """
        Upload bytes to a blob.
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            data: The bytes data to upload.
            content_type: The content type of the blob (e.g., "image/jpeg", "application/pdf").
        """
        blob_client = self.blob_service_client.get_blob_client(container_name, blob_name)
        blob_client.upload_blob(data, overwrite=True, content_settings=ContentSettings(content_type=content_type))
    
    def blob_exists(self, container_name: str, blob_name: str) -> bool:
        """
        Check if a blob exists.
        
        Args:
            container_name: Name of the container
            blob_name: Name of the blob
            
        Returns:
            True if blob exists
        """
        try:
            blob_client = self.blob_service_client.get_blob_client(
                container=container_name,
                blob=blob_name
            )
            return blob_client.exists()
        except Exception:
            return False


# Singleton instance
blob_service = BlobService()

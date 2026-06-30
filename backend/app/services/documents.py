import io
import uuid
from datetime import datetime

from fastapi import UploadFile
from minio import Minio

from app.config import get_settings
from app.models.document import Document
from app.models.enums import DocumentStatus
from app.services.repositories.documents import DocumentRepository
from app.utils.celery_app import celery_app

settings = get_settings()

class DocumentService:
    def __init__(self, minio_client: Minio, doc_repo: DocumentRepository):
        self.minio = minio_client
        self.doc_repo = doc_repo

    async def upload_document(
        self, 
        project_id: uuid.UUID, 
        file: UploadFile
    ) -> Document:
        """
        Uploads a document to MinIO and creates a database record.
        """
        # Read file contents
        content = await file.read()
        file_size = len(content)
        
        # Generate MinIO object name
        object_name = f"projects/{project_id}/{uuid.uuid4()}_{file.filename}"
        
        # Upload to MinIO
        self.minio.put_object(
            bucket_name=settings.minio_bucket,
            object_name=object_name,
            data=io.BytesIO(content),
            length=file_size,
            content_type=file.content_type
        )
        
        # Create SQL record
        document = Document(
            project_id=project_id,
            filename=file.filename or "unknown",
            mime_type=file.content_type,
            file_size=file_size,
            content_sha256="TODO_SHA256",  # Compute actual sha256 in real app
            status=DocumentStatus.PENDING,
            minio_object_name=object_name,
        )
        
        created_doc = await self.doc_repo.create(document)
        
        # Dispatch Event to EventBus
        celery_app.send_task(
            "app.events.document_uploaded",
            kwargs={"document_id": str(created_doc.id)}
        )
        
        return created_doc

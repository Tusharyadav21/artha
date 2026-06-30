from minio import Minio
from minio.error import S3Error

from app.config import get_settings

settings = get_settings()

minio_client = Minio(
    settings.minio_url,
    access_key=settings.minio_access_key,
    secret_key=settings.minio_secret_key,
    secure=settings.minio_secure,
)

def ensure_bucket_exists():
    """Ensure the default bucket exists on startup."""
    try:
        found = minio_client.bucket_exists(settings.minio_bucket)
        if not found:
            minio_client.make_bucket(settings.minio_bucket)
    except S3Error as err:
        # In a real app, you might want to log this properly
        print(f"Error checking/creating MinIO bucket: {err}")

# You can call ensure_bucket_exists() during app startup (lifespan)

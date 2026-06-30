from celery import shared_task
from app.utils.celery_app import celery_app

@celery_app.task(name="app.events.document_uploaded")
def handle_document_uploaded(document_id: str):
    """Event handler for 'Document Uploaded'. Dispatches to specific workers."""
    print(f"[EventBus] Received Document Uploaded event for {document_id}")
    # Dispatch to specific workers
    celery_app.send_task("app.workers.embedding", kwargs={"document_id": document_id})
    celery_app.send_task("app.workers.ocr", kwargs={"document_id": document_id})
    return {"status": "dispatched", "document_id": document_id}

@celery_app.task(name="app.workers.embedding")
def embedding_worker(document_id: str):
    """Worker responsible only for text extraction, chunking, and embedding."""
    import time
    print(f"[EmbeddingWorker] Processing document {document_id}")
    time.sleep(1)
    return {"status": "embedded", "document_id": document_id}

@celery_app.task(name="app.workers.ocr")
def ocr_worker(document_id: str):
    """Worker responsible only for OCR on images and PDFs."""
    import time
    print(f"[OCRWorker] Processing document {document_id}")
    time.sleep(1)
    return {"status": "ocr_complete", "document_id": document_id}

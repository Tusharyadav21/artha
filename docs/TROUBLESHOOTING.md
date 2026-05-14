# Troubleshooting Guide 🔍

This guide covers common issues and their solutions when setting up or running Agentic RAG.

## 🐳 Docker Issues

### Error: `connection refused` to Ollama
- **Cause**: The backend container cannot reach the Ollama service on your host.
- **Solution**: 
  - Ensure Ollama is running (`ollama serve`).
  - Verify that `OLLAMA_BASE_URL` in your `.env` is set to `http://host.docker.internal:11434`.
  - On Linux, you may need to use your host's actual IP address or use `--network="host"`.

### Containers keep restarting
- **Cause**: Usually a misconfigured database or Redis URL.
- **Solution**: Check logs using `docker compose logs -f backend`. Look for "Connection error" or "Auth failed".

## 🤖 Ollama & Model Issues

### Response is very slow
- **Cause**: Running a model that is too large for your hardware.
- **Solution**: 
  - Try a smaller model like `qwen2.5:0.5b` or `phi3`.
  - Ensure Ollama has access to your GPU (if available).

### Error: `model not found`
- **Cause**: The model hasn't been pulled yet.
- **Solution**: Run `ollama pull qwen2.5:3b` and `ollama pull nomic-embed-text` on your host machine.

## 📄 Document Ingestion Issues

### Documents stay in `pending` or `processing` status
- **Cause**: The `arq` worker is not running or cannot connect to Redis.
- **Solution**:
  - Check worker logs: `docker compose logs -f worker`.
  - Ensure Redis is healthy: `docker compose ps`.

### Parsing errors for PDFs
- **Cause**: Some PDFs are scanned (images) and require OCR, which is not yet supported.
- **Solution**: Ensure your PDFs are text-searchable. Support for OCR is on the roadmap.

## 🔐 Authentication Issues

### Cannot login after fresh install
- **Cause**: DB migrations might not have been applied.
- **Solution**: Run `docker compose exec backend alembic upgrade head`.

---

## 🆘 Still Need Help?
If you can't find a solution here, please search our [GitHub Issues](https://github.com/Tusharyadav21/agentic_rag/issues) or open a new one.

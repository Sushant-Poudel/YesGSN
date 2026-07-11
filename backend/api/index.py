"""Vercel serverless entrypoint - re-exports the FastAPI app.

Vercel's Python runtime auto-detects an ASGI `app` object in files under
api/. server.py's routes all live one directory up, so it needs to be on
sys.path before the absolute imports inside it (e.g. `from routes.auth
import ...`) will resolve.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from server import app  # noqa: E402

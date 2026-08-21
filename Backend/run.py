import os
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

backend_dir = Path(__file__).resolve().parent
workspace_dir = backend_dir.parent

if str(workspace_dir) not in sys.path:
    sys.path.insert(0, str(workspace_dir))
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app
import uvicorn

if __name__ == "__main__":
    print("[INFO] Starting RoadSense AI FastAPI Server on http://127.0.0.1:8000 ...")
    uvicorn.run(app, host="127.0.0.1", port=8000)


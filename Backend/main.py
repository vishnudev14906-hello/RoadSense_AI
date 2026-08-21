import os
import sys
from pathlib import Path

# Ensure root paths are in sys.path
CURRENT_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = CURRENT_DIR.parent

if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))
if str(WORKSPACE_DIR) not in sys.path:
    sys.path.insert(0, str(WORKSPACE_DIR))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    print("[INFO] Starting RoadSense AI FastAPI Server on http://127.0.0.1:8000 ...")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

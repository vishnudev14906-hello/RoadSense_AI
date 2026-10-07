import os
import sys
from pathlib import Path

# Add root and Backend directories to sys.path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "Backend"

if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Import the core FastAPI application from Backend
from Backend.app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"[INFO] RoadSense AI Production Server starting on http://{host}:{port} ...")
    uvicorn.run("main:app", host=host, port=port, reload=False)
